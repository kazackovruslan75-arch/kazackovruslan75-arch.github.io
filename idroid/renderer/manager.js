// Окно «Менеджер экземпляров» + мастер первой установки.
const path = require('path');
const { ipc, ipcRenderer, h, toast, sheet, confirmBox, titlebar, applyTheme, fmtBytes, ICONS, icon } = require(path.join(__dirname, 'ui.js'));
const { mountSettings } = require(path.join(__dirname, 'settings.js'));

const app = document.getElementById('app');
let info = null;
let store = null;
let states = {};
let installing = null; // { image, progress }

const STATE_LABEL = {
  stopped: ['Выключен', ''], starting: ['Запуск…', 'orange'], booting: ['Загрузка Android…', 'orange'],
  running: ['Работает', 'green'], stopping: ['Выключение…', 'orange'],
};

async function init() {
  [info, store, states] = await Promise.all([ipc('app:info'), ipc('store:get'), ipc('emu:states')]);
  applyTheme(store.ui.theme);
  render();
}

function render() {
  app.innerHTML = '';
  app.append(titlebar('iDroid Player — Менеджер экземпляров'));
  if (!store.setupDone || !store.instances.length) app.append(wizard());
  else app.append(managerView());
}

// ---------------- Мастер ----------------
let wizStep = 0;
const wiz = { mode: 'download', sdkPath: '', image: null, accel: null };

function wizard() {
  const root = h('div', { class: 'wizard' });
  const box = h('div', { class: 'wiz' });
  root.append(box);
  const steps = h('div', { class: 'steps' }, [0, 1, 2, 3].map((i) => h('i', { class: i === wizStep ? 'on' : '' })));
  box.append(steps);

  if (wizStep === 0) {
    box.append(
      h('div', { class: 'wiz-hero' },
        h('img', { src: '../assets/icon.png' }),
        h('h1', {}, 'iDroid Player'),
        h('p', {}, 'Android-эмулятор для Windows и Linux с Google Play, поддержкой 64- и 32-битных приложений и интерфейсом в стиле iOS.')),
      h('div', { class: 'feature-grid' },
        feature('apk', '#30d158', 'Google Play из коробки'),
        feature('cpu', '#0a84ff', 'x64 и x32 приложения, ARM-трансляция'),
        feature('fps', '#ff9f0a', 'Снятие лимита FPS до 240'),
        feature('gamepad', '#5e5ce6', 'Раскладка клавиш для игр'),
        feature('layers', '#bf5af2', 'Несколько экземпляров'),
        feature('palette', '#ff375f', 'Домашний экран и иконки iOS')),
      h('div', { class: 'wiz-foot' }, h('span'), h('button', { class: 'btn primary', onclick: () => go(1) }, 'Продолжить')));
  }

  if (wizStep === 1) {
    const accelCell = h('div', { class: 'cell' }, h('div', { class: 'ic', style: { background: '#8e8e93' }, html: ICONS.cpu }),
      h('div', { class: 'lbl' }, 'Аппаратная виртуализация', h('small', {}, 'Проверка…')));
    ipc('accel:check').then((r) => {
      wiz.accel = r;
      accelCell.querySelector('.ic').style.background = r.ok ? '#30d158' : r.ok === false ? '#ff453a' : '#ff9f0a';
      accelCell.querySelector('small').textContent = r.text;
    });
    const detected = [];
    const opt = (mode, title, sub) => h('div', { class: 'cell opt' + (wiz.mode === mode ? ' on' : ''), onclick: () => { wiz.mode = mode; render(); } },
      h('div', { class: 'radio' }), h('div', { class: 'lbl' }, title, h('small', {}, sub)));
    const sdkBox = h('div');
    ipc('sdk:status').then((s) => {
      detected.push(...s.detected);
      if (wiz.mode === 'existing' && !wiz.sdkPath && detected[0]) wiz.sdkPath = detected[0];
      sdkBox.innerHTML = '';
      if (wiz.mode === 'existing') {
        sdkBox.append(h('div', { class: 'group', style: { marginTop: '10px' } },
          h('div', { class: 'cell' }, h('div', { class: 'lbl' }, 'Папка SDK', h('small', {}, wiz.sdkPath || 'не выбрана')),
            h('button', { class: 'btn', onclick: async () => { const p = await ipc('sdk:choose'); if (p) { wiz.sdkPath = p; render(); } } }, 'Выбрать…')),
          ...detected.filter((d) => d !== wiz.sdkPath).map((d) => h('div', { class: 'cell link', onclick: () => { wiz.sdkPath = d; render(); } },
            h('div', { class: 'lbl' }, 'Найден SDK', h('small', {}, d))))));
      }
    });
    box.append(
      h('div', { class: 'wiz-hero' }, h('h1', {}, 'Подготовка'), h('p', {}, 'Эмулятору нужна виртуализация процессора и компоненты Android SDK.')),
      h('div', { class: 'group' }, accelCell),
      h('div', { class: 'group-title' }, 'Компоненты Android'),
      h('div', { class: 'group noicon' },
        opt('download', 'Скачать автоматически', `Эмулятор, ADB и образ Android в ${info.defaultSdk}`),
        opt('existing', 'Использовать установленный Android SDK', 'Например, из Android Studio — недостающие части докачаются')),
      sdkBox,
      h('div', { class: 'wiz-foot' },
        h('button', { class: 'btn', onclick: () => go(0) }, 'Назад'),
        h('button', {
          class: 'btn primary',
          onclick: async () => {
            if (wiz.mode === 'existing' && !wiz.sdkPath) return toast('Выберите папку SDK', 'err');
            store = await ipc('store:patch', { sdkPath: wiz.mode === 'existing' ? wiz.sdkPath : '' });
            info = await ipc('app:info');
            go(2);
          },
        }, 'Продолжить')));
  }

  if (wizStep === 2) {
    if (!wiz.image) wiz.image = info.images.find((i) => i.recommended).path;
    box.append(
      h('div', { class: 'wiz-hero' }, h('h1', {}, 'Версия Android'), h('p', {}, 'Все образы содержат Google Play. Другую версию можно добавить позже как новый экземпляр.')),
      imagePicker(wiz.image, (p) => { wiz.image = p; render(); }),
      h('div', { class: 'wiz-foot' },
        h('button', { class: 'btn', onclick: () => go(1) }, 'Назад'),
        h('button', { class: 'btn primary', onclick: () => { go(3); startInstall(wiz.image, true); } }, 'Установить')));
  }

  if (wizStep === 3) {
    box.append(
      h('div', { class: 'wiz-hero' }, h('h1', {}, 'Установка'), h('p', {}, 'Загрузка ~1,5 ГБ. Можно свернуть окно — установка продолжится.')),
      progressView(),
      h('div', { class: 'wiz-foot' },
        h('button', { class: 'btn', onclick: () => { ipc('sdk:cancel'); go(2); } }, 'Отмена'),
        installing ? h('span') : h('button', { class: 'btn primary', onclick: () => { startInstall(wiz.image, true); render(); } }, 'Повторить')));
  }
  return root;
}

function feature(ic, color, text) {
  return h('div', { class: 'feature' }, h('div', { class: 'ic', style: { background: color }, html: ICONS[ic] }), text);
}

function go(step) { wizStep = step; render(); }

function imagePicker(value, onPick) {
  return h('div', { class: 'group noicon' }, info.images.map((img) =>
    h('div', { class: 'cell opt' + (value === img.path ? ' on' : ''), onclick: () => onPick(img.path) },
      h('div', { class: 'radio' }),
      h('div', { class: 'lbl' }, img.title, h('small', {}, img.note)),
      img.recommended && h('span', { class: 'badge green' }, 'Рекомендуется'))));
}

function progressView() {
  const p = (installing && installing.progress) || {};
  const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
  const phase = p.phase === 'extract' ? 'Распаковка' : p.phase === 'done' ? 'Готово' : p.phase === 'error' ? 'Ошибка' : 'Загрузка';
  return h('div', { class: 'group', id: 'progress' },
    h('div', { class: 'cell', style: { flexDirection: 'column', alignItems: 'stretch', gap: '10px', padding: '16px' } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '14px' } },
        h('b', {}, `${phase}${p.name ? ': ' + p.name : ''}`),
        h('span', { style: { color: 'var(--text2)' } }, p.steps ? `шаг ${p.step} из ${p.steps}` : '')),
      h('div', { class: 'progress' }, h('div', { style: { width: (p.phase === 'extract' || p.phase === 'done' ? 100 : pct) + '%' } })),
      h('div', { style: { fontSize: '12.5px', color: p.phase === 'error' ? 'var(--red)' : 'var(--text2)' } },
        p.phase === 'error' ? p.error : p.total ? `${fmtBytes(p.done)} из ${fmtBytes(p.total)} · ${pct}%` : 'Подготовка…')));
}

ipcRenderer.on('sdk:progress', (e, p) => {
  if (!installing) return;
  installing.progress = p;
  const el = document.getElementById('progress');
  if (el) el.replaceWith(progressView());
});

async function startInstall(image, fromWizard, force = false) {
  installing = { image, progress: {} };
  try {
    await ipc('sdk:install', image, force);
    installing = null;
    if (fromWizard) {
      const portrait = false;
      await ipc('instance:create', { image, ...(portrait ? { width: 1080, height: 1920, dpi: 420 } : {}) });
      store = await ipc('store:patch', { setupDone: true });
      toast('Готово! Нажмите «Запустить»');
      render();
    }
    return true;
  } catch (e) {
    const msg = /abort/i.test(e.message) ? 'Установка отменена' : e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
    if (installing) installing.progress = { phase: 'error', error: msg };
    const el = document.getElementById('progress');
    if (el) el.replaceWith(progressView());
    toast(msg, 'err');
    installing = null;
    return false;
  }
}

// ---------------- Менеджер ----------------
function managerView() {
  const root = h('div', { class: 'main' });
  const running = Object.values(states).filter((s) => s !== 'stopped').length;
  root.append(h('div', { class: 'main-head' },
    h('h1', {}, 'Экземпляры'),
    running ? h('button', { class: 'btn danger', onclick: stopAll }, h('span', { class: 'svgi', html: ICONS.stop }), 'Остановить все') : null,
    h('button', { class: 'btn', onclick: startAll }, h('span', { class: 'svgi', html: ICONS.play }), 'Запустить все'),
    h('button', { class: 'btn primary', onclick: newInstance }, h('span', { class: 'svgi', html: ICONS.plus }), 'Новый экземпляр')));
  const cards = h('div', { class: 'cards' });
  for (const inst of store.instances) cards.append(card(inst));
  root.append(cards);
  if (installing) root.append(h('div', { class: 'group-title' }, 'Установка'), progressView());
  return root;
}

function card(inst) {
  const st = states[inst.id] || 'stopped';
  const [label, kind] = STATE_LABEL[st] || [st, ''];
  const img = info.images.find((i) => i.path === inst.image) || { title: inst.image, api: '?' };
  const ver = { 30: '11', 33: '13', 34: '14' }[img.api] || img.api;
  const active = st !== 'stopped';
  return h('div', { class: 'card' },
    h('div', { class: 'card-top' },
      h('div', { class: 'card-icon', style: { background: active ? 'linear-gradient(180deg,#5af578,#1dc03f)' : 'linear-gradient(180deg,#4fd1ff,#0a84ff)' } }, String(ver)),
      h('div', { style: { flex: 1, minWidth: 0 } },
        h('div', { class: 'card-name' }, inst.name),
        h('div', { class: 'card-sub' }, img.title)),
      h('span', { class: 'badge ' + kind }, label)),
    h('div', { class: 'card-specs' },
      h('span', { class: 'badge' }, `${inst.cpu} ядер`),
      h('span', { class: 'badge' }, `${Math.round(inst.ram / 1024 * 10) / 10} ГБ ОЗУ`),
      h('span', { class: 'badge' }, `${inst.width}×${inst.height}`),
      h('span', { class: 'badge' + (inst.fpsUnlimited ? ' orange' : '') }, inst.fpsUnlimited ? 'FPS ∞' : `${inst.fpsLimit} FPS`),
      inst.ecoMode && h('span', { class: 'badge green' }, 'Эко')),
    h('div', { class: 'card-actions' },
      active
        ? h('button', { class: 'btn primary', onclick: () => ipc('emu:open', inst.id) }, 'Открыть')
        : h('button', { class: 'btn green', onclick: () => start(inst) }, h('span', { class: 'svgi', html: ICONS.play }), 'Запустить'),
      active && h('button', { class: 'btn danger', onclick: () => ipc('emu:stop', inst.id) }, 'Стоп'),
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn iconbtn', title: 'Настройки', onclick: () => openSettings(inst), html: ICONS.gear }),
      h('button', { class: 'btn iconbtn', title: 'Клонировать', onclick: () => clone(inst), html: ICONS.copy }),
      h('button', { class: 'btn iconbtn danger', title: 'Удалить', onclick: () => remove(inst), html: ICONS.trash })));
}

async function start(inst) {
  const st = await ipc('sdk:status', inst.image);
  if (!st.emulator || !st.adb || !st.image) {
    toast('Докачиваю недостающие компоненты…');
    render();
    if (!(await startInstall(inst.image, false))) return;
  }
  try {
    await ipc('emu:start', inst.id);
  } catch (e) {
    toast(e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, ''), 'err');
  }
}

async function startAll() {
  for (const inst of store.instances) if ((states[inst.id] || 'stopped') === 'stopped') await start(inst);
}
async function stopAll() {
  for (const inst of store.instances) if ((states[inst.id] || 'stopped') !== 'stopped') ipc('emu:stop', inst.id);
}

async function clone(inst) {
  if (states[inst.id] && states[inst.id] !== 'stopped') return toast('Остановите экземпляр перед клонированием', 'err');
  await ipc('instance:clone', inst.id);
  toast('Экземпляр скопирован');
}

async function remove(inst) {
  if (!(await confirmBox(`Удалить «${inst.name}»?`, 'Все данные Android в этом экземпляре будут удалены без возможности восстановления.', 'Удалить', true))) return;
  await ipc('instance:delete', inst.id);
}

function newInstance() {
  let image = info.images.find((i) => i.recommended).path;
  let orient = 'landscape';
  const name = h('input', { class: 'ios', placeholder: `iDroid ${store.instances.length + 1}`, style: { width: '220px' } });
  const body = h('div');
  const draw = () => {
    body.innerHTML = '';
    body.append(
      h('div', { class: 'group-title' }, 'Имя'),
      h('div', { class: 'group noicon' }, h('div', { class: 'cell' }, h('div', { class: 'lbl' }, 'Название'), name)),
      h('div', { class: 'group-title' }, 'Тип устройства'),
      h('div', { class: 'group noicon' },
        ...[['landscape', 'Планшет / игры', '1600×900 · 240 DPI, альбомная'], ['portrait', 'Телефон', '1080×1920 · 420 DPI, книжная']].map(([k, t, s]) =>
          h('div', { class: 'cell opt' + (orient === k ? ' on' : ''), onclick: () => { orient = k; draw(); } }, h('div', { class: 'radio' }), h('div', { class: 'lbl' }, t, h('small', {}, s))))),
      h('div', { class: 'group-title' }, 'Android'),
      imagePicker(image, (p) => { image = p; draw(); }));
  };
  draw();
  sheet('Новый экземпляр', body, {
    done: 'Создать', cancel: 'Отмена',
    onDone: async () => {
      const opts = { image };
      if (name.value.trim()) opts.name = name.value.trim();
      if (orient === 'portrait') Object.assign(opts, { width: 1080, height: 1920, dpi: 420 });
      await ipc('instance:create', opts);
      const st = await ipc('sdk:status', image);
      if (!st.image || !st.emulator || !st.adb) startInstall(image, false).then(() => render());
    },
  });
}

function openSettings(inst) {
  const body = h('div', { style: { height: '100%' } });
  const ctx = {
    inst: { ...inst },
    ui: { ...store.ui },
    info,
    running: (states[inst.id] || 'stopped') === 'running',
    saveInst: (p) => ipc('instance:update', inst.id, p),
    saveUi: async (p) => { store = await ipc('store:patch', { ui: p }); applyTheme(store.ui.theme); },
    restart: () => ipc('emu:restart', inst.id),
    wipe: async () => { await ipc('instance:wipe', inst.id); toast('Данные сброшены'); },
    reinstall: () => { startInstall(inst.image, false, true); toast('Переустановка запущена'); },
    adb: (args) => ipc('adb', inst.id, args),
  };
  ipc('emu:ports', inst.id).then((p) => { ctx.ports = p; });
  sheet(`Настройки — ${inst.name}`, body, { wide: true });
  mountSettings(body, ctx);
}

ipcRenderer.on('store:changed', (e, d) => {
  store = d;
  applyTheme(store.ui.theme);
  if (!document.querySelector('.sheet-bg')) render();
  else if (store.setupDone && document.querySelector('.cards')) document.querySelector('.main').replaceWith(managerView());
});
ipcRenderer.on('emu:state', (e, id, state, extra) => {
  states[id] = state;
  if (state === 'stopped' && extra && extra.code && !extra.wasRunning) {
    toast('Эмулятор завершился с ошибкой. Откройте журнал в настройках → Дополнительно.', 'err');
  }
  const main = document.querySelector('.main');
  if (main) main.replaceWith(managerView());
});
ipcRenderer.on('emu:error', (e, id, msg) => toast(msg, 'err'));

init();
