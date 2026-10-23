// Запуск/остановка эмулятора и вызовы adb для каждого экземпляра.
const fs = require('fs');
const path = require('path');
const { spawn, execFile } = require('child_process');
const { EventEmitter } = require('events');
const sdk = require('./sdk');
const avd = require('./avd');

function ports(inst) {
  return { console: 5554 + inst.slot * 2, grpc: 8554 + inst.slot };
}

function serial(inst) { return `emulator-${ports(inst).console}`; }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class EmulatorManager extends EventEmitter {
  constructor({ getSdk, avdHome, logDir }) {
    super();
    this.getSdk = getSdk;
    this.avdHome = avdHome;
    this.logDir = logDir;
    this.running = new Map();
  }

  env() {
    const root = this.getSdk();
    return {
      ...process.env,
      ANDROID_SDK_ROOT: root,
      ANDROID_HOME: root,
      ANDROID_AVD_HOME: this.avdHome,
    };
  }

  state(id) {
    const r = this.running.get(id);
    return r ? r.state : 'stopped';
  }

  logFile(inst) { return path.join(this.logDir, `${inst.id}.log`); }

  args(inst, safe = false) {
    const p = ports(inst);
    if (safe) inst = { ...inst, gpu: 'swiftshader_indirect', quickBoot: false, vulkan: false };
    const a = [
      '-avd', avd.avdName(inst),
      '-port', String(p.console),
      '-grpc', String(p.grpc),
      '-gpu', avd.gpuMode(inst),
      '-netdelay', 'none',
      '-netspeed', 'full',
    ];
    if (inst.embedded) a.push('-qt-hide-window');
    if (!inst.bootAnim) a.push('-no-boot-anim');
    if (!inst.quickBoot) a.push('-no-snapshot-load');
    if (!inst.audio) a.push('-no-audio');
    a.push('-feature', inst.vulkan ? 'Vulkan' : '-Vulkan');
    if (inst.dns) a.push('-dns-server', inst.dns);
    if (inst.proxy) a.push('-http-proxy', inst.proxy);
    return a;
  }

  async start(inst, safe = false) {
    if (this.running.has(inst.id)) return;
    const root = this.getSdk();
    const t = sdk.tools(root);
    if (!fs.existsSync(t.emulator)) throw new Error('Эмулятор не установлен. Откройте мастер установки.');
    const st = sdk.status(root, inst.image);
    if (!st.image) throw new Error('Образ Android не установлен для этого экземпляра.');
    fs.mkdirSync(this.avdHome, { recursive: true });
    fs.mkdirSync(this.logDir, { recursive: true });
    avd.ensureAvd(this.avdHome, inst);

    const log = fs.createWriteStream(this.logFile(inst), { flags: safe ? 'a' : 'w' });
    const args = this.args(inst, safe);
    log.write(`> ${t.emulator} ${args.join(' ')}\n`);
    const proc = spawn(t.emulator, args, {
      cwd: path.dirname(t.emulator),
      env: this.env(),
      windowsHide: true,
    });
    const rec = { proc, state: 'starting', tail: [], started: Date.now() };
    this.running.set(inst.id, rec);
    const onData = (d) => {
      log.write(d);
      const lines = d.toString().split(/\r?\n/).filter(Boolean);
      rec.tail.push(...lines);
      rec.tail = rec.tail.slice(-40);
      for (const l of lines) if (/PANIC|FATAL/.test(l)) this.emit('log', inst.id, l);
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('error', (e) => {
      this.emit('error', inst.id, e.message);
    });
    proc.on('exit', (code, signal) => {
      log.end(`\n[exit ${code}${signal ? ' ' + signal : ''}]\n`);
      const wasRunning = rec.state === 'running';
      const crashed = !wasRunning && rec.state !== 'stopping' && (code !== 0 || signal);
      this.running.delete(inst.id);
      // Частые причины падения при старте — драйвер видеокарты и повреждённый снимок быстрого запуска.
      // Один раз пробуем безопасный режим: программная графика и холодная загрузка.
      if (crashed && !safe && Date.now() - rec.started < 120000) {
        this.emit('log', inst.id, 'Эмулятор упал при запуске — пробую безопасный режим (программная графика, холодный старт)');
        this.start(inst, true).catch((e) => this.emit('error', inst.id, e.message));
        return;
      }
      this.emit('state', inst.id, 'stopped', {
        code: code == null ? signal : code, wasRunning, crashed, tail: rec.tail.slice(-15).join('\n'),
      });
    });
    this.setState(inst.id, 'booting');
    this.waitBoot(inst, rec).catch((e) => this.emit('log', inst.id, e.message));
  }

  setState(id, state) {
    const r = this.running.get(id);
    if (r) r.state = state;
    this.emit('state', id, state, {});
  }

  async waitBoot(inst, rec) {
    const s = serial(inst);
    const started = Date.now();
    while (this.running.get(inst.id) === rec) {
      try {
        const out = await this.adb(inst, ['shell', 'getprop', 'sys.boot_completed'], { timeout: 5000 });
        if (out.trim() === '1') break;
      } catch (_) { /* ещё не поднялся */ }
      if (Date.now() - started > 8 * 60 * 1000) throw new Error(`${s}: таймаут загрузки`);
      await sleep(1500);
    }
    if (this.running.get(inst.id) !== rec) return;
    await this.applyRuntimeSettings(inst).catch(() => {});
    this.setState(inst.id, 'running');
  }

  // Настройки, которые применяются в уже загруженной системе (без перезапуска).
  async applyRuntimeSettings(inst) {
    const rate = avd.refreshRate(inst);
    const cmds = [
      // Ориентацию задаёт приложение, окно поворачивается само (как в BlueStacks).
      'settings put system accelerometer_rotation 0',
      `settings put system peak_refresh_rate ${rate}.0`,
      `settings put system min_refresh_rate ${inst.fpsUnlimited ? rate : 0}.0`,
      `setprop debug.egl.swapinterval ${inst.fpsUnlimited ? 0 : 1}`,
      'settings put global window_animation_scale 0.5',
      'settings put global transition_animation_scale 0.5',
    ];
    await this.adb(inst, ['shell', cmds.join(' ; ')], { timeout: 15000 });
  }

  async stop(inst) {
    const rec = this.running.get(inst.id);
    if (!rec) return;
    this.setState(inst.id, 'stopping');
    try { await this.adb(inst, ['emu', 'kill'], { timeout: 5000 }); } catch (_) { /* ignore */ }
    for (let i = 0; i < 20 && this.running.get(inst.id) === rec; i++) await sleep(500);
    if (this.running.get(inst.id) === rec) rec.proc.kill();
  }

  stopAll() {
    for (const [, r] of this.running) {
      try { r.proc.kill(); } catch (_) { /* ignore */ }
    }
  }

  adb(inst, args, { timeout = 60000, maxBuffer = 64 * 1024 * 1024 } = {}) {
    const t = sdk.tools(this.getSdk());
    const full = inst ? ['-s', serial(inst), ...args] : args;
    return new Promise((resolve, reject) => {
      execFile(t.adb, full, { env: this.env(), timeout, maxBuffer, windowsHide: true }, (err, stdout, stderr) => {
        if (err) reject(new Error((stderr || err.message || '').toString().trim()));
        else resolve(stdout.toString());
      });
    });
  }

  // Проверка аппаратной виртуализации (KVM / WHPX / AEHD).
  accelCheck() {
    const root = this.getSdk();
    const t = root ? sdk.tools(root) : null;
    return new Promise((resolve) => {
      if (!t || !fs.existsSync(t.emulator)) {
        if (process.platform === 'linux') {
          try {
            fs.accessSync('/dev/kvm', fs.constants.R_OK | fs.constants.W_OK);
            resolve({ ok: true, text: 'KVM доступен' });
          } catch (_) {
            resolve({
              ok: false,
              text: fs.existsSync('/dev/kvm')
                ? 'Нет доступа к /dev/kvm. Выполните: sudo usermod -aG kvm $USER и перезайдите в систему'
                : 'KVM не найден. Включите виртуализацию (VT-x/AMD-V) в BIOS и установите qemu-kvm',
            });
          }
        } else {
          resolve({ ok: null, text: 'Проверка будет выполнена после установки эмулятора' });
        }
        return;
      }
      execFile(t.emulator, ['-accel-check'], { env: this.env(), timeout: 20000, windowsHide: true }, (err, stdout, stderr) => {
        const text = (stdout + stderr).split(/\r?\n/).filter((l) => l && !/^accel:?$|^\d+$/.test(l.trim())).join(' ').trim();
        let hint = '';
        if (err && process.platform === 'win32') {
          hint = ' Включите «Платформу низкоуровневой оболочки Windows» (WHPX) в компонентах Windows или установите Android Emulator Hypervisor Driver.';
        } else if (err) {
          hint = ' Выполните: sudo usermod -aG kvm $USER';
        }
        resolve({ ok: !err, text: (text || (err ? 'Ускорение недоступно' : 'Ускорение доступно')) + hint });
      });
    });
  }
}

module.exports = { EmulatorManager, ports, serial };
