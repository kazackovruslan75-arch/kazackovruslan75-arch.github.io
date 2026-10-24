// Связь с эмулятором по gRPC: поток кадров экрана и ввод (касания, клавиши).
const fs = require('fs');
const path = require('path');
const grpc = require('@grpc/grpc-js');
const loader = require('@grpc/proto-loader');

const FALLBACK_PROTO = path.join(__dirname, '..', 'proto', 'emulator_controller_min.proto');

function loadService(protoPath) {
  const opts = { keepCase: true, longs: Number, enums: String, defaults: true, oneofs: true };
  const tryLoad = (file) => {
    const def = loader.loadSync(file, { ...opts, includeDirs: [path.dirname(file)] });
    const pkg = grpc.loadPackageDefinition(def);
    return pkg.android.emulation.control.EmulatorController;
  };
  if (protoPath && fs.existsSync(protoPath)) {
    try { return tryLoad(protoPath); } catch (e) { console.warn('SDK proto не загрузился, используется встроенный', e); }
  }
  return tryLoad(FALLBACK_PROTO);
}

class EmuLink {
  constructor({ port, protoPath }) {
    this.port = port;
    const Service = loadService(protoPath);
    this.client = new Service(`127.0.0.1:${port}`, grpc.credentials.createInsecure(), {
      'grpc.max_receive_message_length': -1,
      'grpc.max_send_message_length': -1,
      'grpc.keepalive_time_ms': 10000,
    });
    this.call = null;
    this.closed = false;
    this.paused = false;
    this.size = null;
    this.format = 'RGBA8888';
    // Очередь касаний: не больше двух запросов «в полёте», движения одного пальца схлопываются.
    // Иначе мышь с частотой 1000 Гц забивает канал и ввод начинает отставать.
    this.touchQueue = [];
    this.inFlight = 0;
    this.down = new Set();
  }

  // Поток кадров (RGB888 для WebGL, RGBA8888 для 2D) с автоматическим переподключением.
  stream(size, onFrame, onStatus, format = 'RGBA8888') {
    this.size = size;
    this.format = format;
    this.onFrame = onFrame;
    this.onStatus = onStatus || (() => {});
    this.restartStream();
  }

  resize(size) {
    if (this.size && size.width === this.size.width && size.height === this.size.height) return;
    this.size = size;
    this.restartStream();
  }

  // Окно свёрнуто — кадры не нужны, не тратим на них ЦП.
  pause() {
    if (this.paused) return;
    this.paused = true;
    clearTimeout(this.retryT);
    if (this.call) { const c = this.call; this.call = null; try { c.cancel(); } catch (_) { /* ignore */ } }
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    if (this.size) this.restartStream();
  }

  restartStream() {
    if (this.call) { const c = this.call; this.call = null; try { c.cancel(); } catch (_) { /* ignore */ } }
    if (this.closed || this.paused) return;
    clearTimeout(this.retryT);
    const bpp = this.format === 'RGB888' ? 3 : 4;
    const call = this.client.streamScreenshot({ format: this.format, width: this.size.width, height: this.size.height, display: 0 });
    this.call = call;
    let got = false;
    call.on('data', (img) => {
      if (!got) { got = true; this.onStatus('streaming'); }
      const f = img.format || {};
      const w = f.width || img.width;
      const hgt = f.height || img.height;
      if (w && hgt && img.image && img.image.length >= w * hgt * bpp) this.onFrame(img.image, w, hgt);
    });
    const retry = () => {
      if (this.call !== call || this.closed) return;
      this.call = null;
      this.onStatus('waiting');
      this.retryT = setTimeout(() => this.restartStream(), 1000);
    };
    call.on('error', retry);
    call.on('end', retry);
  }

  touch(touches) {
    for (const t of touches) {
      const moving = t.pressure > 0;
      let merged = false;
      if (moving) {
        for (let i = this.touchQueue.length - 1; i >= 0; i--) {
          const q = this.touchQueue[i];
          if (q.identifier !== t.identifier) continue;
          if (q.pressure > 0 && q.moved) { this.touchQueue[i] = { ...t, moved: true }; merged = true; }
          break;
        }
      }
      // Первое касание пальца (down) не схлопывается, только последующие движения.
      if (!merged) this.touchQueue.push({ ...t, moved: moving && this.down.has(t.identifier) });
      if (moving) this.down.add(t.identifier); else this.down.delete(t.identifier);
    }
    this.pumpTouches();
  }

  pumpTouches() {
    while (this.inFlight < 2 && this.touchQueue.length) {
      const { moved, ...t } = this.touchQueue.shift();
      this.inFlight++;
      this.client.sendTouch({ touches: [t], display: 0 }, () => {
        this.inFlight--;
        this.pumpTouches();
      });
    }
  }

  key(eventType, key) {
    this.client.sendKey({ codeType: 'Usb', eventType, key }, () => {});
  }

  press(key) { this.key('keypress', key); }

  text(t) { this.client.sendKey({ codeType: 'Usb', eventType: 'keypress', text: t }, () => {}); }

  close() {
    this.closed = true;
    if (this.call) try { this.call.cancel(); } catch (_) { /* ignore */ }
    this.client.close();
  }
}

module.exports = { EmuLink };
