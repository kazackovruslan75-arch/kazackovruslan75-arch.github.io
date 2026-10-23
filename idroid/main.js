// Главный процесс iDroid Player.
const { app, BrowserWindow, ipcMain, dialog, shell, net, Menu } = require('electron');
const fs = require('fs');
const path = require('path');
const { Store } = require('./src/store');
const sdk = require('./src/sdk');
const avd = require('./src/avd');
const { EmulatorManager, ports, serial } = require('./src/emulator');
const { IconCache } = require('./src/icons');

app.setName('iDroid Player');
const DATA = app.getPath('userData');
const store = new Store(DATA);
const defaultSdk = path.join(DATA, 'sdk');
const getSdk = () => store.get().sdkPath || defaultSdk;
const emu = new EmulatorManager({ getSdk, avdHome: path.join(DATA, 'avd'), logDir: path.join(DATA, 'logs') });
const icons = new IconCache(DATA, (url, opts) => net.fetch(url, opts));

let manager = null;
const players = new Map();
let installAbort = null;

const WEB_PREFS = {
  nodeIntegration: true,
  contextIsolation: false,
  sandbox: false,
  backgroundThrottling: false,
};

function broadcast(ch, ...args) {
  for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send(ch, ...args);
}

function createManager() {
  if (manager && !manager.isDestroyed()) { manager.show(); manager.focus(); return; }
  manager = new BrowserWindow({
    width: 1040, height: 700, minWidth: 820, minHeight: 560,
    frame: false, backgroundColor: '#0b0b10', show: false,
    title: 'iDroid Player',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: WEB_PREFS,
  });
  manager.loadFile(path.join(__dirname, 'renderer', 'manager.html'));
  manager.once('ready-to-show', () => manager.show());
  manager.on('closed', () => { manager = null; });
}

function playerSize(inst) {
  const landscape = inst.width >= inst.height;
  const h = landscape ? 720 : 860;
  const w = Math.round(h * (inst.width / inst.height));
  return { width: w + 64, height: h + 36 };
}

function openPlayer(inst) {
  const existing = players.get(inst.id);
  if (existing && !existing.isDestroyed()) { existing.show(); existing.focus(); return; }
  const { width, height } = playerSize(inst);
  const win = new BrowserWindow({
    width, height, minWidth: 420, minHeight: 320,
    frame: false, backgroundColor: '#000000', show: false,
    title: inst.name,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: WEB_PREFS,
  });
  win.loadFile(path.join(__dirname, 'renderer', 'player.html'), { query: { id: inst.id } });
  win.once('ready-to-show', () => win.show());
  win.on('enter-full-screen', () => win.webContents.send('fullscreen', true));
  win.on('leave-full-screen', () => win.webContents.send('fullscreen', false));
  win.on('closed', () => {
    players.delete(inst.id);
    const i = store.instance(inst.id);
    if (i && emu.state(i.id) !== 'stopped') emu.stop(i);
  });
  players.set(inst.id, win);
}

emu.on('state', (id, state, info) => broadcast('emu:state', id, state, info));
emu.on('log', (id, line) => broadcast('emu:log', id, line));
emu.on('error', (id, msg) => broadcast('emu:error', id, msg));

// ---------- IPC ----------
const handle = (ch, fn) => ipcMain.handle(ch, async (e, ...a) => fn(e, ...a));

handle('app:info', () => ({
  version: app.getVersion(),
  platform: process.platform,
  dataDir: DATA,
  defaultSdk,
  sdkPath: getSdk(),
  images: sdk.IMAGES,
  cpuCount: require('os').cpus().length,
  totalMem: Math.round(require('os').totalmem() / 1048576),
}));

handle('store:get', () => store.get());
handle('store:patch', (e, p) => { const d = store.patch(p); broadcast('store:changed', d); return d; });

handle('instance:create', (e, opts) => { const i = store.createInstance(opts); broadcast('store:changed', store.get()); return i; });
handle('instance:update', async (e, id, patch) => {
  const inst = store.updateInstance(id, patch);
  broadcast('store:changed', store.get());
  if (emu.state(id) === 'running') {
    // Без перезапуска применяем то, что можно.
    await emu.applyRuntimeSettings(inst).catch(() => {});
  }
  return inst;
});
handle('instance:delete', async (e, id) => {
  const inst = store.instance(id);
  if (!inst) return;
  if (emu.state(id) !== 'stopped') await emu.stop(inst);
  const w = players.get(id);
  if (w && !w.isDestroyed()) w.close();
  avd.deleteAvd(emu.avdHome, inst);
  store.deleteInstance(id);
  broadcast('store:changed', store.get());
});
handle('instance:clone', (e, id) => {
  const src = store.instance(id);
  const { id: _i, slot: _s, ...rest } = src;
  const copy = store.createInstance({ ...rest, name: src.name + ' (копия)' });
  avd.cloneAvd(emu.avdHome, src, copy);
  const km = store.getKeymaps(id);
  for (const [pkg, c] of Object.entries(km)) store.setKeymap(copy.id, pkg, c);
  broadcast('store:changed', store.get());
  return copy;
});
handle('instance:wipe', async (e, id) => {
  const inst = store.instance(id);
  if (emu.state(id) !== 'stopped') await emu.stop(inst);
  avd.deleteAvd(emu.avdHome, inst);
});

handle('sdk:status', (e, image) => ({ path: getSdk(), ...sdk.status(getSdk(), image), detected: sdk.detectExisting() }));
handle('sdk:install', async (e, image, force) => {
  if (installAbort) throw new Error('Установка уже идёт');
  installAbort = new AbortController();
  try {
    await sdk.installAll({
      sdk: getSdk(), imagePath: image, force,
      fetchFn: (url, opts) => net.fetch(url, opts),
      signal: installAbort.signal,
      onProgress: (p) => broadcast('sdk:progress', p),
    });
  } finally {
    installAbort = null;
  }
  return sdk.status(getSdk(), image);
});
handle('sdk:cancel', () => { if (installAbort) installAbort.abort(); });
handle('sdk:choose', async () => {
  const r = await dialog.showOpenDialog({ title: 'Папка Android SDK', properties: ['openDirectory', 'createDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});
handle('accel:check', () => emu.accelCheck());

handle('emu:start', async (e, id, openWindow = true) => {
  const inst = store.instance(id);
  if (!inst) throw new Error('Экземпляр не найден');
  await emu.start(inst);
  if (openWindow) openPlayer(inst);
});
handle('emu:open', (e, id) => openPlayer(store.instance(id)));
handle('emu:stop', (e, id) => emu.stop(store.instance(id)));
handle('emu:restart', async (e, id) => {
  const inst = store.instance(id);
  await emu.stop(inst);
  await emu.start(inst);
});
handle('emu:states', () => Object.fromEntries(store.get().instances.map((i) => [i.id, emu.state(i.id)])));
handle('emu:ports', (e, id) => {
  const inst = store.instance(id);
  return { ...ports(inst), serial: serial(inst), proto: sdk.tools(getSdk()).proto };
});
handle('emu:log', (e, id) => {
  const inst = store.instance(id);
  shell.openPath(emu.logFile(inst));
});

handle('adb', (e, id, args, opts) => emu.adb(store.instance(id), args, opts));
handle('adb:install', async (e, id, files) => {
  const inst = store.instance(id);
  const res = [];
  for (const f of files) {
    try {
      if (/\.xapk$|\.apks$/i.test(f)) throw new Error('Поддерживаются файлы .apk');
      await emu.adb(inst, ['install', '-r', '-g', f], { timeout: 10 * 60000 });
      res.push({ file: path.basename(f), ok: true });
    } catch (err) {
      res.push({ file: path.basename(f), ok: false, error: err.message });
    }
  }
  return res;
});
handle('adb:push', async (e, id, files) => {
  const inst = store.instance(id);
  for (const f of files) await emu.adb(inst, ['push', f, '/sdcard/Download/'], { timeout: 10 * 60000 });
  await emu.adb(inst, ['shell', 'am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///sdcard/Download/']).catch(() => {});
  return files.length;
});

handle('dialog:open', async (e, opts) => {
  const r = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), opts);
  return r.canceled ? [] : r.filePaths;
});
handle('dialog:save', async (e, opts, dataUrl) => {
  const r = await dialog.showSaveDialog(BrowserWindow.fromWebContents(e.sender), opts);
  if (r.canceled || !r.filePath) return null;
  const b64 = dataUrl.split(',')[1];
  fs.writeFileSync(r.filePath, Buffer.from(b64, 'base64'));
  return r.filePath;
});
handle('file:screenshot', (e, dataUrl) => {
  const dir = path.join(app.getPath('pictures'), 'iDroid');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `screenshot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`);
  fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  return file;
});
handle('shell:show', (e, p) => shell.showItemInFolder(p));
handle('shell:open', (e, url) => { if (/^https:\/\//.test(url)) shell.openExternal(url); });

handle('keymap:get', (e, id) => store.getKeymaps(id));
handle('keymap:set', (e, id, pkg, controls) => store.setKeymap(id, pkg, controls));

handle('icons:lookup', (e, pkgs) => {
  if (!store.get().ui.playIcons) return {};
  return Promise.all(pkgs.map((p) => icons.lookup(p).then((r) => [p, r]))).then(Object.fromEntries);
});

handle('win:action', (e, action) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (!w) return;
  if (action === 'min') w.minimize();
  else if (action === 'max') w.isMaximized() ? w.unmaximize() : w.maximize();
  else if (action === 'close') w.close();
  else if (action === 'fullscreen') w.setFullScreen(!w.isFullScreen());
  else if (action === 'top') { w.setAlwaysOnTop(!w.isAlwaysOnTop()); return w.isAlwaysOnTop(); }
  else if (action === 'manager') createManager();
  else if (action === 'devtools') w.webContents.toggleDevTools();
});
handle('win:resize-to', (e, w, h) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win && !win.isFullScreen() && !win.isMaximized()) win.setSize(Math.round(w), Math.round(h), true);
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createManager();
});

app.on('window-all-closed', () => {
  emu.stopAll();
  app.quit();
});
app.on('before-quit', () => emu.stopAll());
