// Хранилище настроек: JSON-файл в каталоге данных пользователя.
const fs = require('fs');
const path = require('path');

const DEFAULT_INSTANCE = {
  name: 'iDroid',
  image: 'system-images;android-30;google_apis_playstore;x86_64',
  cpu: 4,
  ram: 4096,
  width: 1600,
  height: 900,
  dpi: 240,
  gpu: 'auto',
  vulkan: false,
  fpsUnlimited: false,
  fpsLimit: 60,
  showFps: false,
  ecoMode: false,
  ecoFps: 15,
  audio: true,
  mic: false,
  quickBoot: true,
  bootAnim: false,
  embedded: true,
  dataSize: 8,
  dns: '',
  proxy: '',
  autoRotate: true,
  mouseSensitivity: 1.0,
  overlayOpacity: 0.6,
  showKeyHints: true,
};

const DEFAULTS = {
  sdkPath: '',
  setupDone: false,
  ui: {
    iosHome: true,
    playIcons: true,
    iosSystemIcons: true,
    iconStyle: 'ios26',
    wallpaper: 'aurora',
    theme: 'dark',
    dock: ['com.android.vending', 'com.android.chrome', 'com.android.settings', 'com.google.android.youtube'],
  },
  instances: [],
  keymaps: {},
};

class Store {
  constructor(dir) {
    this.file = path.join(dir, 'idroid-settings.json');
    this.data = JSON.parse(JSON.stringify(DEFAULTS));
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      this.data = { ...this.data, ...raw, ui: { ...this.data.ui, ...(raw.ui || {}) } };
      this.data.instances = (this.data.instances || []).map((i) => ({ ...DEFAULT_INSTANCE, ...i }));
    } catch (_) { /* первый запуск */ }
  }

  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }

  get() { return this.data; }

  patch(p) {
    for (const [k, v] of Object.entries(p)) {
      if (k === 'ui') this.data.ui = { ...this.data.ui, ...v };
      else this.data[k] = v;
    }
    this.save();
    return this.data;
  }

  instance(id) { return this.data.instances.find((i) => i.id === id); }

  createInstance(opts = {}) {
    const used = new Set(this.data.instances.map((i) => i.slot));
    let slot = 0;
    while (used.has(slot)) slot++;
    const inst = {
      ...DEFAULT_INSTANCE,
      ...opts,
      id: 'inst' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      slot,
    };
    if (!opts.name) inst.name = slot === 0 ? 'iDroid' : `iDroid ${slot + 1}`;
    this.data.instances.push(inst);
    this.save();
    return inst;
  }

  updateInstance(id, patch) {
    const inst = this.instance(id);
    if (!inst) throw new Error('Экземпляр не найден');
    const { id: _i, slot: _s, ...rest } = patch;
    Object.assign(inst, rest);
    this.save();
    return inst;
  }

  deleteInstance(id) {
    this.data.instances = this.data.instances.filter((i) => i.id !== id);
    delete this.data.keymaps[id];
    this.save();
  }

  getKeymaps(id) { return this.data.keymaps[id] || {}; }

  setKeymap(id, pkg, controls) {
    this.data.keymaps[id] = this.data.keymaps[id] || {};
    if (controls && controls.length) this.data.keymaps[id][pkg] = controls;
    else delete this.data.keymaps[id][pkg];
    this.save();
  }
}

module.exports = { Store, DEFAULT_INSTANCE };
