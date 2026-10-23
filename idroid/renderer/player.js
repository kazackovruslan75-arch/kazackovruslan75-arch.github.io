// Окно эмулятора: экран, домашний экран iOS, правая панель инструментов и редактор управления.
const path = require('path');
const { ipc, ipcRenderer, h, toast, sheet, applyTheme, ICONS } = require(path.join(__dirname, 'ui.js'));
const { EmuLink } = require(path.join(__dirname, 'stream.js'));
const { KeymapEngine, TYPES, TEMPLATES, keyLabel } = require(path.join(__dirname, 'keymap.js'));
const { Springboard } = require(path.join(__dirname, 'springboard.js'));
const { mountSettings } = require(path.join(__dirname, 'settings.js'));

const ID = new URLSearchParams(location.search).get('id');
const $ = (id) => document.getElementById(id);
const stage = $('stage');
const screenEl = $('screen');
const cv = $('cv');
const ctx2d = cv.getContext('2d', { alpha: false, desynchronized: true });

let info; let store; let inst; let ports;
let link = null;
let emuState = 'starting';
let rotation = 0; // 0..3, ориентация гостевого дисплея (SurfaceOrientation)
let fgPkg = '';
let keymaps = {};
let schemeKey = 'default';
let frame = null;
let lastDraw = 0;
let frames = 0;
let fpsT = performance.now();
let recorder = null;
let pollT = null;

const km = new KeymapEngine({
  overlay: $('overlay'),
  surface: screenEl,
  viewSize: () => ({ w: screenEl.clientWidth || 1, h: screenEl.clientHeight || 1 }),
  toDevice: (u, v) => toDevice(u, v),
  touch: (t) => link && link.touch(t),
  getInst: () => inst,
});

const sb = new Springboard({
  root: $('springboard'),
  instId: ID,
  getUi: () => store.ui,
  saveUi: async (p) => { store = await ipc('store:patch', { ui: p }); sb.render(); },
  onLaunch: (a) => {
    ipc('adb', ID, ['shell', `am start -n ${a.pkg}/${a.activity} || monkey -p ${a.pkg} -c android.intent.category.LAUNCHER 1`]).catch((e) => toast(e.message, 'err'));
  },
  onVisible: (v) => {
    $('homebar').classList.toggle('on', !v && store.ui.iosHome);
    $('overlay').hidden = v && !km.editing;
    if (v) km.releaseAll();
  },
});

// ---------------- геометрия ----------------
const devW = () => inst.width;
const devH = () => inst.height;
const effRot = () => (inst.autoRotate ? rotation : 0);

// Нормированная точка в видимой (повёрнутой) области → координаты дисплея Android.
function toDevice(u, v) {
  const W = devW(); const H = devH();
  switch (effRot()) {
    case 1: return { x: W * (1 - v), y: H * u };
    case 2: return { x: W * (1 - u), y: H * (1 - v) };
    case 3: return { x: W * v, y: H * (1 - u) };
    default: return { x: W * u, y: H * v };
  }
}

function layout() {
  if (!inst) return;
  const r = effRot();
  const vw = r % 2 ? devH() : devW();
  const vh = r % 2 ? devW() : devH();
  const full = document.body.classList.contains('fullscreen');
  const pad = full ? 0 : 8;
  const aw = stage.clientWidth - pad * 2;
  const ah = stage.clientHeight - pad * 2;
  const s = Math.min(aw / vw, ah / vh);
  const sw = Math.floor(vw * s); const sh = Math.floor(vh * s);
  screenEl.style.width = sw + 'px';
  screenEl.style.height = sh + 'px';
  // Канвас — в ориентации панели, поворачиваем его CSS-трансформацией.
  const cw = r % 2 ? sh : sw; const ch = r % 2 ? sw : sh;
  cv.style.width = cw + 'px';
  cv.style.height = ch + 'px';
  cv.style.transform = `translate(-50%, -50%) rotate(${-90 * r}deg)`;
  if (link) {
    const dpr = window.devicePixelRatio || 1;
    const k = Math.min(1, (cw * dpr) / devW());
    const req = { width: Math.round(devW() * k), height: Math.round(devH() * k) };
    if (!link.size || Math.abs(req.width - link.size.width) / link.size.width > 0.12) link.resize(req);
  }
  km.render();
  if (sb.visible) sb.render();
}

new ResizeObserver(() => layout()).observe(stage);

// ---------------- поток кадров ----------------
function onFrame(buf, w, hgt) {
  frame = { buf, w, h: hgt };
  frames++;
}

function drawLoop(now) {
  requestAnimationFrame(drawLoop);
  if (now - fpsT >= 1000) {
    $('fps').textContent = `${Math.round((frames * 1000) / (now - fpsT))} FPS`;
    frames = 0; fpsT = now;
  }
  if (!frame || !inst) return;
  if (inst.ecoMode && now - lastDraw < 1000 / (inst.ecoFps || 15)) return;
  lastDraw = now;
  const { buf, w, h: hgt } = frame;
  frame = null;
  if (cv.width !== w || cv.height !== hgt) { cv.width = w; cv.height = hgt; }
  ctx2d.putImageData(new ImageData(new Uint8ClampedArray(buf.buffer, buf.byteOffset, w * hgt * 4), w, hgt), 0, 0);
  if (recorder) recorder.draw();
}
requestAnimationFrame(drawLoop);

function connect() {
  if (link) return;
  link = new EmuLink({ port: ports.grpc, protoPath: ports.proto });
  link.stream({ width: devW(), height: devH() }, onFrame, () => {});
  layout();
}

// ---------------- состояние эмулятора ----------------
function setBoot(text, err, actions = []) {
  const b = $('boot');
  if (text == null) { b.classList.add('hide'); return; }
  b.classList.remove('hide');
  b.classList.toggle('boot-err', !!err);
  $('bootText').textContent = text;
  const a = $('bootActions');
  a.innerHTML = '';
  a.append(...actions);
}

function onState(state, extra = {}) {
  emuState = state;
  if (state === 'booting' || state === 'starting') {
    setBoot(inst.embedded ? 'Загрузка Android…' : 'Эмулятор открыт в отдельном окне.\nЗагрузка Android…');
    connect();
  } else if (state === 'running') {
    connect();
    if (!inst.embedded) setBoot('Эмулятор работает в отдельном окне.\nПанель справа по-прежнему управляет им.');
    else setBoot(null);
    afterBoot();
  } else if (state === 'stopping') {
    setBoot('Выключение…');
  } else if (state === 'stopped') {
    stopPolling();
    const fail = extra.code && !extra.wasRunning;
    setBoot(fail ? `Эмулятор не запустился (код ${extra.code}).\n\n${extra.tail || ''}` : 'Эмулятор выключен', fail, [
      h('button', { class: 'btn primary', onclick: () => ipc('emu:start', ID, false).catch((e) => toast(e.message, 'err')) }, 'Запустить'),
      h('button', { class: 'btn', onclick: () => ipc('emu:log', ID) }, 'Журнал'),
      h('button', { class: 'btn', onclick: () => openSettings() }, 'Настройки'),
    ]);
  }
}

async function afterBoot() {
  await sb.detectLauncher();
  sb.refresh(true);
  startPolling();
  if (store.ui.iosHome) {
    await poll();
    if (!fgPkg || fgPkg === sb.launcherPkg) sb.show();
  }
}

function startPolling() {
  stopPolling();
  pollT = setInterval(poll, 1500);
}
function stopPolling() { clearInterval(pollT); pollT = null; }

let polling = false;
async function poll() {
  if (polling || emuState !== 'running') return;
  polling = true;
  try {
    const out = await ipc('adb', ID, ['shell', "dumpsys window | grep -m1 mCurrentFocus; dumpsys input | grep -m2 -E 'SurfaceOrientation|Viewport INTERNAL'"], { timeout: 6000 });
    const f = out.match(/mCurrentFocus=Window\{\S+ \S+ ([\w.]+)/);
    const pkg = f ? f[1] : '';
    const o = out.match(/SurfaceOrientation:\s*(\d)/) || out.match(/orientation=(\d)/);
    const rot = o ? Number(o[1]) & 3 : 0;
    if (rot !== rotation) { rotation = rot; layout(); }
    if (pkg && pkg !== fgPkg) {
      fgPkg = pkg;
      if (pkg === sb.launcherPkg) sb.show();
      else if (sb.visible && !/systemui|inputmethod|permissioncontroller/.test(pkg)) sb.hide();
      selectScheme();
    }
  } catch (_) { /* adb занят */ }
  polling = false;
}

// ---------------- раскладки ----------------
function selectScheme() {
  const key = keymaps[fgPkg] ? fgPkg : 'default';
  if (km.editing) return;
  if (key !== schemeKey || !km.controls.length) {
    schemeKey = key;
    km.setControls(keymaps[key] || []);
    renderPanel();
  }
}

async function saveScheme(key, controls) {
  await ipc('keymap:set', ID, key, controls);
  keymaps = await ipc('keymap:get', ID);
}

// ---------------- ввод мышью ----------------
let mouseDown = false;
function norm(e) {
  const r = screenEl.getBoundingClientRect();
  return { u: (e.clientX - r.left) / r.width, v: (e.clientY - r.top) / r.height };
}
function sendMouseTouch(e, down) {
  const { u, v } = norm(e);
  const p = toDevice(Math.max(0, Math.min(1, u)), Math.max(0, Math.min(1, v)));
  link && link.touch([{ x: Math.round(p.x), y: Math.round(p.y), identifier: 0, pressure: down ? 1024 : 0, touch_major: down ? 12 : 0 }]);
}

cv.addEventListener('mousedown', (e) => {
  if (km.aim) return;
  if (e.button === 0) { mouseDown = true; sendMouseTouch(e, true); }
});
window.addEventListener('mousemove', (e) => {
  if (km.aim) { km.mouseMove(e.movementX, e.movementY); return; }
  if (mouseDown) sendMouseTouch(e, true);
});
window.addEventListener('mouseup', (e) => {
  if (km.aim) return;
  if (e.button === 0 && mouseDown) { mouseDown = false; sendMouseTouch(e, false); }
});
screenEl.addEventListener('mousedown', (e) => { if (km.aim) { e.preventDefault(); km.mouseDown(e.button); } });
window.addEventListener('mouseup', (e) => { if (km.aim) km.mouseUp(e.button); });
cv.addEventListener('contextmenu', (e) => { e.preventDefault(); if (!km.aim && link) link.press('GoBack'); });
// Колесо → прокрутка свайпом.
let wheelBusy = false;
cv.addEventListener('wheel', async (e) => {
  e.preventDefault();
  if (wheelBusy || !link || km.aim) return;
  wheelBusy = true;
  const { u, v } = norm(e);
  const dv = Math.sign(e.deltaY) * -0.12;
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const p = toDevice(u, Math.max(0.02, Math.min(0.98, v + (dv * i) / steps)));
    link.touch([{ x: Math.round(p.x), y: Math.round(p.y), identifier: 0, pressure: 1024, touch_major: 12 }]);
    await new Promise((r) => setTimeout(r, 10));
  }
  const p = toDevice(u, Math.max(0.02, Math.min(0.98, v + dv)));
  link.touch([{ x: Math.round(p.x), y: Math.round(p.y), identifier: 0, pressure: 0 }]);
  wheelBusy = false;
}, { passive: false });

// ---------------- клавиатура ----------------
const HOTKEYS = {
  KeyA: () => togglePanel('keymap'), KeyH: () => goHome(), KeyB: () => back(), KeyR: () => link && link.press('AppSwitch'),
  KeyS: () => screenshot(), KeyO: () => rotate(), KeyI: () => openSettings(), KeyF: () => toggleEco(),
  KeyK: () => toggleHints(), ArrowUp: () => link && link.press('AudioVolumeUp'), ArrowDown: () => link && link.press('AudioVolumeDown'),
};

function typingInUi(e) {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'F11') { e.preventDefault(); ipc('win:action', 'fullscreen'); return; }
  if (e.ctrlKey && e.shiftKey && HOTKEYS[e.code]) { e.preventDefault(); HOTKEYS[e.code](); return; }
  if (typingInUi(e) || document.querySelector('.sheet-bg')) return;
  e.preventDefault();
  if (km.editing) {
    if (e.code === 'Delete' || (e.code === 'Backspace' && km.selected)) { km.removeSelected(); return; }
    if (e.code === 'Escape') { km.select(null); return; }
    km.assign(e.code);
    return;
  }
  if (!sb.visible && km.keyDown(e.code)) return;
  if (e.code === 'Escape') { if (km.aim) km.exitAim(); else back(); return; }
  if (sb.visible && e.key.length === 1) {
    const s = $('springboard').querySelector('.sb-search');
    if (s) { s.focus(); s.value += e.key; s.dispatchEvent(new Event('input')); }
    return;
  }
  if (link) link.key('keydown', e.key);
});
window.addEventListener('keyup', (e) => {
  if (typingInUi(e) || km.editing) return;
  if (km.keyUp(e.code)) return;
  if (link && e.code !== 'Escape') link.key('keyup', e.key);
});
window.addEventListener('blur', () => km.releaseAll());

// ---------------- действия ----------------
function back() { if (sb.visible) return; link && link.press('GoBack'); }
function goHome() {
  if (link) link.press('GoHome');
  if (store.ui.iosHome) sb.show();
}
async function rotate() {
  const next = rotation % 2 ? 0 : 1;
  await ipc('adb', ID, ['shell', `settings put system accelerometer_rotation 0; settings put system user_rotation ${next}`]).catch(() => {});
  setTimeout(poll, 400);
}
async function toggleEco() {
  inst = await ipc('instance:update', ID, { ecoMode: !inst.ecoMode });
  toast(inst.ecoMode ? `Эко-режим: ${inst.ecoFps} FPS` : 'Эко-режим выключен');
  renderSidebar();
}
async function toggleHints() {
  inst = await ipc('instance:update', ID, { showKeyHints: !inst.showKeyHints });
  km.render();
}

function uprightCanvas() {
  const r = effRot();
  const c = document.createElement('canvas');
  c.width = r % 2 ? cv.height : cv.width;
  c.height = r % 2 ? cv.width : cv.height;
  const g = c.getContext('2d');
  g.translate(c.width / 2, c.height / 2);
  g.rotate((-90 * r * Math.PI) / 180);
  g.drawImage(cv, -cv.width / 2, -cv.height / 2);
  return c;
}

async function screenshot() {
  if (!cv.width) return;
  const file = await ipc('file:screenshot', uprightCanvas().toDataURL('image/png'));
  const t = h('span', {}, 'Скриншот сохранён · ', h('a', { href: '#', style: { color: 'var(--blue)', pointerEvents: 'auto' }, onclick: () => ipc('shell:show', file) }, 'показать'));
  toast(t);
}

function toggleRecord() {
  if (recorder) { recorder.stop(); return; }
  const out = document.createElement('canvas');
  const g = out.getContext('2d');
  const chunks = [];
  const draw = () => {
    const r = effRot();
    const w = r % 2 ? cv.height : cv.width; const hh = r % 2 ? cv.width : cv.height;
    if (out.width !== w || out.height !== hh) { out.width = w; out.height = hh; }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.translate(w / 2, hh / 2);
    g.rotate((-90 * r * Math.PI) / 180);
    g.drawImage(cv, -cv.width / 2, -cv.height / 2);
  };
  draw();
  const mr = new MediaRecorder(out.captureStream(60), { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 12e6 });
  mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  mr.onstop = async () => {
    recorder = null;
    renderSidebar();
    const blob = new Blob(chunks, { type: 'video/webm' });
    const fr = new FileReader();
    fr.onload = async () => {
      const f = await ipc('dialog:save', { title: 'Сохранить запись', defaultPath: `iDroid-${Date.now()}.webm`, filters: [{ name: 'WebM', extensions: ['webm'] }] }, fr.result);
      if (f) toast('Запись сохранена');
    };
    fr.readAsDataURL(blob);
  };
  mr.start(1000);
  recorder = { draw, stop: () => mr.stop() };
  toast('Запись экрана началась');
  renderSidebar();
}

async function installApk(files) {
  if (!files || !files.length) files = await ipc('dialog:open', { title: 'Установить APK', properties: ['openFile', 'multiSelections'], filters: [{ name: 'Android', extensions: ['apk'] }] });
  if (!files.length) return;
  toast(`Установка ${files.length > 1 ? files.length + ' приложений' : files[0].split(/[\\/]/).pop()}…`);
  const res = await ipc('adb:install', ID, files);
  for (const r of res) toast(r.ok ? `Установлено: ${r.file}` : `${r.file}: ${r.error}`, r.ok ? '' : 'err');
  sb.refresh(true);
}

async function pushFiles(files) {
  if (!files || !files.length) files = await ipc('dialog:open', { title: 'Передать файлы в Android (Download)', properties: ['openFile', 'multiSelections'] });
  if (!files.length) return;
  try {
    await ipc('adb:push', ID, files);
    toast('Файлы скопированы в папку Download');
  } catch (e) { toast(e.message, 'err'); }
}

function locationSheet() {
  const lat = h('input', { class: 'ios', type: 'number', step: 'any', value: '55.7558', style: { width: '140px' } });
  const lon = h('input', { class: 'ios', type: 'number', step: 'any', value: '37.6173', style: { width: '140px' } });
  const presets = [['Москва', 55.7558, 37.6173], ['Санкт-Петербург', 59.9343, 30.3351], ['Киев', 50.4501, 30.5234], ['Минск', 53.9006, 27.559],
    ['Алматы', 43.2389, 76.8897], ['Нью-Йорк', 40.7128, -74.006], ['Лондон', 51.5072, -0.1276], ['Токио', 35.6762, 139.6503]];
  sheet('Местоположение', h('div', {},
    h('div', { class: 'group-title' }, 'Координаты'),
    h('div', { class: 'group noicon' },
      h('div', { class: 'cell' }, h('div', { class: 'lbl' }, 'Широта'), lat),
      h('div', { class: 'cell' }, h('div', { class: 'lbl' }, 'Долгота'), lon)),
    h('div', { class: 'group-title' }, 'Быстрый выбор'),
    h('div', { class: 'group noicon' }, presets.map(([n, a, b]) => h('div', { class: 'cell link', onclick: () => { lat.value = a; lon.value = b; } }, h('div', { class: 'lbl' }, n), h('span', { class: 'val' }, `${a}, ${b}`))))),
  {
    done: 'Применить', cancel: 'Отмена',
    onDone: async () => {
      await ipc('adb', ID, ['emu', 'geo', 'fix', String(Number(lon.value)), String(Number(lat.value))]).then(() => toast('Местоположение задано')).catch((e) => toast(e.message, 'err'));
    },
  });
}

async function shake() {
  const seq = ['18:0:9.8', '-18:0:9.8', '18:0:9.8', '-18:0:9.8', '0:9.8:0'];
  for (const s of seq) {
    await ipc('adb', ID, ['emu', 'sensor', 'set', 'acceleration', s]).catch(() => {});
    await new Promise((r) => setTimeout(r, 80));
  }
}

function moreMenu(anchor) {
  const r = anchor.getBoundingClientRect();
  const close = () => { pop.remove(); document.removeEventListener('mousedown', out); };
  const out = (e) => { if (!pop.contains(e.target)) close(); };
  const item = (ic, t, fn) => h('div', { class: 'pi', onclick: () => { close(); fn(); } }, h('span', { class: 'svgi', html: ICONS[ic] }), t);
  const pop = h('div', { class: 'popup', style: { right: window.innerWidth - r.left + 8 + 'px', top: Math.min(r.top, window.innerHeight - 330) + 'px' } },
    item('folder', 'Передать файлы в Android', () => pushFiles()),
    item('location', 'Местоположение', locationSheet),
    item('shake', 'Встряхнуть', shake),
    item('power', 'Кнопка питания', () => link && link.press('Power')),
    item('top', 'Поверх всех окон', async () => { const on = await ipc('win:action', 'top'); toast(on ? 'Окно закреплено поверх' : 'Закрепление снято'); }),
    item('restart', 'Перезапустить эмулятор', () => ipc('emu:restart', ID)),
    item('log', 'Журнал эмулятора', () => ipc('emu:log', ID)));
  document.body.append(pop);
  setTimeout(() => document.addEventListener('mousedown', out), 0);
}

// ---------------- правая панель ----------------
function tip(btn, text, keys) {
  let t = null;
  btn.addEventListener('mouseenter', () => {
    const r = btn.getBoundingClientRect();
    t = h('div', { class: 'tip' }, text, keys && h('kbd', {}, keys));
    document.body.append(t);
    t.style.top = r.top + r.height / 2 - t.offsetHeight / 2 + 'px';
    t.style.left = r.left - t.offsetWidth - 8 + 'px';
  });
  const rm = () => { if (t) t.remove(); t = null; };
  btn.addEventListener('mouseleave', rm);
  btn.addEventListener('click', rm);
  return btn;
}

let panelMode = null;
function renderSidebar() {
  const s = $('sidebar');
  s.innerHTML = '';
  const b = (ic, text, fn, keys, cls = '') => tip(h('button', { class: 'sb-btn ' + cls, html: ICONS[ic], onclick: (e) => fn(e.currentTarget) }), text, keys);
  s.append(
    b('keyboard', 'Управление игрой', () => togglePanel('keymap'), 'Ctrl+Shift+A', panelMode === 'keymap' ? 'on' : ''),
    b('fullscreen', 'Полноэкранный режим', () => ipc('win:action', 'fullscreen'), 'F11'),
    h('div', { class: 'sb-sep' }),
    b('volUp', 'Громкость +', () => link && link.press('AudioVolumeUp'), 'Ctrl+Shift+↑'),
    b('volDown', 'Громкость −', () => link && link.press('AudioVolumeDown'), 'Ctrl+Shift+↓'),
    b('rotate', 'Повернуть экран', rotate, 'Ctrl+Shift+O'),
    b('camera', 'Скриншот', screenshot, 'Ctrl+Shift+S'),
    b('record', 'Запись экрана', toggleRecord, null, recorder ? 'rec on' : ''),
    b('apk', 'Установить APK', () => installApk()),
    b('eco', inst.ecoMode ? 'Эко-режим включён' : 'Эко-режим', toggleEco, 'Ctrl+Shift+F', inst.ecoMode ? 'on' : ''),
    b('layers', 'Несколько экземпляров', () => ipc('win:action', 'manager')),
    b('more', 'Ещё', (el) => moreMenu(el)),
    h('div', { class: 'sb-spacer' }),
    b('back', 'Назад', back, 'Esc'),
    b('home', 'Домой', goHome, 'Ctrl+Shift+H'),
    b('recents', 'Недавние', () => link && link.press('AppSwitch'), 'Ctrl+Shift+R'),
    h('div', { class: 'sb-sep' }),
    b('gear', 'Настройки', () => openSettings(), 'Ctrl+Shift+I'));
}

function togglePanel(mode) {
  if (panelMode === mode) {
    if (km.editing) km.stopEdit(false);
    panelMode = null;
  } else {
    panelMode = mode;
  }
  $('panel').classList.toggle('open', !!panelMode);
  renderPanel();
  renderSidebar();
  setTimeout(layout, 300);
}

function appName(pkg) {
  const m = sb.meta[pkg];
  const a = sb.apps.find((x) => x.pkg === pkg);
  return (a && sb.label(a)) || (m && m.label) || pkg;
}

function renderPanel() {
  const p = $('panel');
  if (panelMode !== 'keymap') { p.innerHTML = ''; return; }
  const forApp = schemeKey !== 'default';
  const cur = fgPkg && fgPkg !== sb.launcherPkg ? fgPkg : '';
  const head = h('div', { class: 'panel-head' },
    h('h3', {}, 'Управление игрой'),
    h('small', {}, forApp ? `Схема для: ${appName(schemeKey)}` : 'Общая схема (для всех приложений)'));
  const body = h('div', { class: 'panel-body' });
  const foot = h('div', { class: 'panel-foot' });

  if (!km.editing) {
    body.append(
      h('div', { class: 'group noicon', style: { marginTop: '6px' } },
        h('div', { class: 'cell' }, h('div', { class: 'lbl' }, 'Управление включено'),
          (() => { const i = h('input', { type: 'checkbox' }); i.checked = km.enabled; i.onchange = () => { km.enabled = i.checked; km.releaseAll(); km.render(); }; return h('label', { class: 'switch' }, i, h('span')); })()),
        h('div', { class: 'cell' }, h('div', { class: 'lbl' }, 'Подсказки на экране'),
          (() => { const i = h('input', { type: 'checkbox' }); i.checked = inst.showKeyHints; i.onchange = () => toggleHints(); return h('label', { class: 'switch' }, i, h('span')); })())),
      h('div', { class: 'group-title', style: { margin: '16px 4px 6px' } }, `Элементы (${km.controls.length})`),
      controlList(),
      h('div', { class: 'group-title', style: { margin: '16px 4px 6px' } }, 'Схема'),
      h('div', { class: 'group noicon' },
        cur && !forApp && h('div', { class: 'cell link', onclick: async () => { await saveScheme(cur, km.controls); schemeKey = cur; renderPanel(); toast('Создана схема для приложения'); } },
          h('div', { class: 'lbl' }, 'Отдельная схема для этого приложения', h('small', {}, appName(cur)))),
        forApp && h('div', { class: 'cell link', onclick: async () => { await saveScheme(schemeKey, []); schemeKey = 'default'; km.setControls(keymaps.default || []); renderPanel(); } },
          h('div', { class: 'lbl', style: { color: 'var(--red)' } }, 'Удалить схему приложения', h('small', {}, 'Будет использоваться общая'))),
        h('div', { class: 'cell link', onclick: exportScheme }, h('div', { class: 'lbl' }, 'Экспорт в файл…')),
        h('div', { class: 'cell link', onclick: importScheme }, h('div', { class: 'lbl' }, 'Импорт из файла…'))));
    foot.append(h('button', { class: 'btn primary', onclick: () => { $('overlay').hidden = false; km.startEdit(); renderPanel(); } }, h('span', { class: 'svgi', html: ICONS.gamepad }), 'Редактировать'));
  } else {
    body.append(
      h('div', { class: 'hint' }, 'Добавьте элемент, перетащите его на нужное место экрана. Выделите элемент и нажмите клавишу (или ПКМ/СКМ), чтобы назначить её. Колёсико — размер крестовины/зоны обзора, Delete — удалить.'),
      h('div', { class: 'palette' }, Object.entries(TYPES).map(([k, t]) => h('div', { class: 'pal-item', title: t.hint, onclick: () => km.add(k) }, h('span', { html: ICONS[t.icon] }), t.label))),
      h('div', { class: 'group-title', style: { margin: '16px 4px 6px' } }, 'Шаблоны'),
      h('div', { class: 'group noicon' },
        [['shooter', 'Шутер (PUBG, CoD, Free Fire)'], ['moba', 'MOBA (Mobile Legends, Brawl Stars)'], ['runner', 'Раннер (Subway Surfers)']].map(([k, t]) =>
          h('div', { class: 'cell link', onclick: () => { km.setControls(TEMPLATES[k]); km.editing = true; km.render(); renderPanel(); } }, h('div', { class: 'lbl' }, t)))),
      h('div', { class: 'group-title', style: { margin: '16px 4px 6px' } }, `Элементы (${km.controls.length})`),
      controlList(),
      h('div', { style: { marginTop: '10px' } }, h('button', { class: 'btn danger', style: { width: '100%' }, onclick: () => { km.setControls([]); km.editing = true; km.render(); renderPanel(); } }, 'Очистить всё')));
    foot.append(
      h('button', { class: 'btn', onclick: () => { km.stopEdit(false); renderPanel(); } }, 'Отмена'),
      h('button', { class: 'btn primary', onclick: async () => { await saveScheme(schemeKey, km.controls); km.stopEdit(true); renderPanel(); toast('Схема управления сохранена'); } }, 'Сохранить'));
  }
  p.innerHTML = '';
  p.append(h('div', { class: 'panel-in' }, head, body, foot));
}

function controlList() {
  if (!km.controls.length) return h('div', { class: 'hint' }, 'Пока пусто. Нажмите «Редактировать», чтобы добавить клавиши.');
  return h('div', { class: 'group noicon km-list' }, km.controls.map((c, i) => {
    const keys = c.type === 'dpad' ? ['up', 'left', 'down', 'right'].map((k) => keyLabel(c.keys[k])).join(' ') : keyLabel(c.key);
    return h('div', {
      class: 'cell' + (km.selected && km.selected.index === i ? ' sel' : '') + (km.editing ? ' link' : ''),
      onclick: () => km.editing && km.select(i, c.type === 'dpad' ? 'up' : 'key'),
    },
    h('span', { class: 'svgi', style: { color: 'var(--blue)' }, html: ICONS[TYPES[c.type].icon] }),
    h('div', { class: 'lbl' }, TYPES[c.type].label),
    h('span', { class: 'badge' }, keys),
    km.editing && h('button', { class: 'btn plain', style: { padding: '2px 4px', color: 'var(--red)' }, onclick: (e) => { e.stopPropagation(); km.select(i); km.removeSelected(); } }, '✕'));
  }));
}
km.on(() => { if (panelMode === 'keymap') renderPanel(); });

async function exportScheme() {
  const data = 'data:application/json;base64,' + Buffer.from(JSON.stringify({ app: schemeKey, controls: km.controls }, null, 2)).toString('base64');
  const f = await ipc('dialog:save', { title: 'Экспорт схемы', defaultPath: `keymap-${schemeKey}.json`, filters: [{ name: 'JSON', extensions: ['json'] }] }, data);
  if (f) toast('Схема экспортирована');
}
async function importScheme() {
  const [f] = await ipc('dialog:open', { title: 'Импорт схемы', properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] });
  if (!f) return;
  try {
    const d = JSON.parse(require('fs').readFileSync(f, 'utf8'));
    const list = Array.isArray(d) ? d : d.controls;
    if (!Array.isArray(list)) throw new Error('Неверный формат');
    km.setControls(list);
    await saveScheme(schemeKey, list);
    toast('Схема импортирована');
  } catch (e) { toast(e.message, 'err'); }
}

// ---------------- настройки ----------------
function openSettings(section) {
  if (document.querySelector('.sheet-bg')) return;
  const body = h('div', { style: { height: '100%' } });
  const ctx = {
    inst: { ...inst },
    ui: { ...store.ui },
    info,
    ports,
    running: emuState === 'running',
    saveInst: async (p) => { inst = await ipc('instance:update', ID, p); },
    saveUi: async (p) => { store = await ipc('store:patch', { ui: p }); },
    restart: () => ipc('emu:restart', ID),
    wipe: async () => { await ipc('instance:wipe', ID); toast('Данные сброшены, запустите эмулятор заново'); },
    adb: (args) => ipc('adb', ID, args),
  };
  sheet(`Настройки — ${inst.name}`, body, { wide: true });
  mountSettings(body, ctx, section);
}

// ---------------- перетаскивание файлов ----------------
let dragDepth = 0;
window.addEventListener('dragenter', (e) => { e.preventDefault(); dragDepth++; document.body.classList.add('dragging'); });
window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; document.body.classList.remove('dragging'); } });
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault();
  dragDepth = 0;
  document.body.classList.remove('dragging');
  const files = [...e.dataTransfer.files].map((f) => require('electron').webUtils.getPathForFile(f)).filter(Boolean);
  const apks = files.filter((f) => /\.apk$/i.test(f));
  const other = files.filter((f) => !/\.apk$/i.test(f));
  if (apks.length) installApk(apks);
  if (other.length) pushFiles(other);
});

// ---------------- окно ----------------
function renderTitlebar() {
  const tb = $('titlebar');
  tb.innerHTML = '';
  const W = (ic, t, fn, cls = '') => h('button', { class: 'wbtn ' + cls, title: t, html: ICONS[ic], onclick: fn });
  tb.append(
    h('img', { class: 'logo', src: '../assets/icon.png' }),
    h('div', { class: 'title' }, `${inst.name} · ${(info.images.find((i) => i.path === inst.image) || {}).title || ''}`),
    inst.fpsUnlimited ? h('span', { class: 'tb-pill on' }, 'FPS ∞') : h('span', { class: 'tb-pill' }, `${inst.fpsLimit} FPS`),
    W('min', 'Свернуть', () => ipc('win:action', 'min')),
    W('max', 'Развернуть', () => ipc('win:action', 'max')),
    W('close', 'Закрыть (выключить эмулятор)', () => ipc('win:action', 'close'), 'close'));
}

ipcRenderer.on('fullscreen', (e, on) => { document.body.classList.toggle('fullscreen', on); setTimeout(layout, 50); });
ipcRenderer.on('emu:state', (e, id, state, extra) => { if (id === ID) onState(state, extra); });
ipcRenderer.on('emu:error', (e, id, msg) => { if (id === ID) toast(msg, 'err'); });
ipcRenderer.on('store:changed', (e, d) => {
  store = d;
  const ni = d.instances.find((i) => i.id === ID);
  if (!ni) return;
  const relayout = ni.autoRotate !== inst.autoRotate || ni.width !== inst.width || ni.height !== inst.height;
  inst = ni;
  applyTheme(store.ui.theme);
  $('fps').hidden = !inst.showFps;
  renderTitlebar();
  renderSidebar();
  if (relayout) layout();
  km.render();
  if (!store.ui.iosHome) sb.hide();
  else if (sb.visible) sb.render();
  $('homebar').classList.toggle('on', store.ui.iosHome && !sb.visible);
});
$('homebar').addEventListener('click', goHome);
screenEl.addEventListener('pointerdown', () => { if (document.activeElement && document.activeElement.blur && !$('springboard').contains(document.activeElement)) document.activeElement.blur(); });
document.addEventListener('pointerlockchange', () => document.body.classList.toggle('aiming', !!document.pointerLockElement));
window.addEventListener('beforeunload', () => { if (link) link.close(); });

async function init() {
  [info, store, ports, keymaps] = await Promise.all([ipc('app:info'), ipc('store:get'), ipc('emu:ports', ID), ipc('keymap:get', ID)]);
  inst = store.instances.find((i) => i.id === ID);
  applyTheme(store.ui.theme);
  document.title = inst.name;
  $('fps').hidden = !inst.showFps;
  $('homebar').classList.toggle('on', store.ui.iosHome);
  renderTitlebar();
  renderSidebar();
  km.setControls(keymaps.default || []);
  layout();
  const states = await ipc('emu:states');
  onState(states[ID] || 'stopped');
}

init();
