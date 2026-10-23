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
    this.size = null;
  }

  // Поток кадров RGBA с автоматическим переподключением.
  stream(size, onFrame, onStatus) {
    this.size = size;
    this.onFrame = onFrame;
    this.onStatus = onStatus || (() => {});
    this.restartStream();
  }

  resize(size) {
    if (this.size && size.width === this.size.width && size.height === this.size.height) return;
    this.size = size;
    this.restartStream();
  }

  restartStream() {
    if (this.call) { const c = this.call; this.call = null; try { c.cancel(); } catch (_) { /* ignore */ } }
    if (this.closed) return;
    clearTimeout(this.retryT);
    const call = this.client.streamScreenshot({ format: 'RGBA8888', width: this.size.width, height: this.size.height, display: 0 });
    this.call = call;
    let got = false;
    call.on('data', (img) => {
      if (!got) { got = true; this.onStatus('streaming'); }
      const f = img.format || {};
      const w = f.width || img.width;
      const hgt = f.height || img.height;
      if (w && hgt && img.image && img.image.length >= w * hgt * 4) this.onFrame(img.image, w, hgt);
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
    this.client.sendTouch({ touches, display: 0 }, () => {});
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
