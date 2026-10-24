// Создание и обновление AVD без avdmanager: пишем <name>.ini и <name>.avd/config.ini напрямую.
const fs = require('fs');
const path = require('path');
const { imageInfo } = require('./sdk');

function avdName(inst) { return 'idroid_' + inst.id; }

function readIni(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+?)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function writeIni(file, obj) {
  const body = Object.entries(obj).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
  fs.writeFileSync(file, body);
}

function gpuMode(inst) {
  // «Авто» = аппаратный рендер: он быстрее всего. Если драйвер его не вытянет,
  // эмулятор упадёт при старте и перезапустится в безопасном (программном) режиме.
  if (inst.gpu === 'auto') return 'host';
  return inst.gpu;
}

// Частота кадров дисплея гостевой системы. «Без лимита» — 240 Гц, выше эмулятор не поддерживает.
function refreshRate(inst) {
  return inst.fpsUnlimited ? 240 : Math.max(30, Math.min(240, Number(inst.fpsLimit) || 60));
}

function ensureAvd(avdHome, inst) {
  const name = avdName(inst);
  const dir = path.join(avdHome, name + '.avd');
  fs.mkdirSync(dir, { recursive: true });
  const img = imageInfo(inst.image);
  const [, platform, tag, abi] = inst.image.split(';');
  writeIni(path.join(avdHome, name + '.ini'), {
    'avd.ini.encoding': 'UTF-8',
    path: dir,
    'path.rel': `avd/${name}.avd`,
    target: platform,
  });
  const cfgFile = path.join(dir, 'config.ini');
  const prev = readIni(cfgFile);
  const cfg = {
    ...prev,
    AvdId: name,
    'avd.ini.displayname': inst.name,
    'avd.ini.encoding': 'UTF-8',
    'PlayStore.enabled': 'true',
    'abi.type': abi,
    'hw.cpu.arch': abi === 'x86' ? 'x86' : 'x86_64',
    'image.sysdir.1': `system-images/${platform}/${tag}/${abi}/`,
    'tag.id': tag,
    'tag.display': 'Google Play',
    'hw.cpu.ncore': String(inst.cpu),
    // 32-битный образ не может адресовать больше ~3 ГБ.
    'hw.ramSize': String(abi === 'x86' ? Math.min(inst.ram, 3072) : inst.ram),
    'vm.heapSize': String(Math.min(576, Math.max(256, Math.round(inst.ram / 8)))),
    'hw.lcd.width': String(inst.width),
    'hw.lcd.height': String(inst.height),
    'hw.lcd.density': String(inst.dpi),
    'hw.lcd.vsync': String(refreshRate(inst)),
    'hw.initialOrientation': inst.width >= inst.height ? 'landscape' : 'portrait',
    'hw.gpu.enabled': 'yes',
    'hw.gpu.mode': gpuMode(inst),
    'hw.keyboard': 'yes',
    'hw.mainKeys': 'no',
    'hw.audioInput': inst.mic ? 'yes' : 'no',
    'hw.audioOutput': inst.audio ? 'yes' : 'no',
    'hw.accelerometer': 'yes',
    'hw.gyroscope': 'yes',
    'hw.sensors.orientation': 'yes',
    'hw.gps': 'yes',
    'hw.battery': 'yes',
    'hw.camera.back': 'emulated',
    'hw.camera.front': 'emulated',
    // Отдельный образ SD-карты (его создаёт avdmanager) не нужен: /sdcard в Android 11+ — внутренняя память.
    'hw.sdCard': 'no',
    'disk.dataPartition.size': `${inst.dataSize}G`,
    'fastboot.forceColdBoot': inst.quickBoot ? 'no' : 'yes',
    'fastboot.forceFastBoot': inst.quickBoot ? 'yes' : 'no',
    showDeviceFrame: 'no',
    'skin.dynamic': 'yes',
    'skin.name': `${inst.width}x${inst.height}`,
    'skin.path': '_no_skin',
    'image.androidVersion.api': String(img.api || ''),
  };
  writeIni(cfgFile, cfg);
  return name;
}

function deleteAvd(avdHome, inst) {
  const name = avdName(inst);
  fs.rmSync(path.join(avdHome, name + '.avd'), { recursive: true, force: true });
  fs.rmSync(path.join(avdHome, name + '.ini'), { force: true });
}

function cloneAvd(avdHome, from, to) {
  const src = path.join(avdHome, avdName(from) + '.avd');
  const dst = path.join(avdHome, avdName(to) + '.avd');
  if (!fs.existsSync(src)) return;
  fs.cpSync(src, dst, {
    recursive: true,
    filter: (p) => !/\.lock$|snapshots|hardware-qemu\.ini|multiinstance/.test(p),
  });
}

module.exports = { avdName, ensureAvd, deleteAvd, cloneAvd, gpuMode, refreshRate };
