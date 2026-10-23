// Панель настроек экземпляра (как в BlueStacks, оформление iOS).
const path = require('path');
const { h, ICONS, ipc, toast, confirmBox } = require(path.join(__dirname, 'ui.js'));

const RESTART_KEYS = new Set(['cpu', 'ram', 'width', 'height', 'dpi', 'gpu', 'vulkan', 'fpsLimit', 'fpsUnlimited',
  'audio', 'mic', 'quickBoot', 'bootAnim', 'embedded', 'dataSize', 'dns', 'proxy', 'image']);

const RES_LANDSCAPE = [[1280, 720, 'HD'], [1600, 900, 'HD+'], [1920, 1080, 'Full HD'], [2560, 1440, 'QHD']];
const RES_PORTRAIT = [[720, 1280, 'HD'], [900, 1600, 'HD+'], [1080, 1920, 'Full HD'], [1080, 2400, 'FHD+ 20:9'], [1440, 2560, 'QHD']];
const PROFILES = {
  eco: { cpu: 2, ram: 2048, label: 'Экономный' },
  balanced: { cpu: 4, ram: 4096, label: 'Сбалансированный' },
  high: { cpu: 6, ram: 6144, label: 'Высокий' },
  ultra: { cpu: 8, ram: 8192, label: 'Максимальный' },
};

const WALLPAPERS = {
  aurora: 'radial-gradient(120% 90% at 10% 10%, #ff6a88 0%, transparent 55%), radial-gradient(110% 80% at 90% 20%, #6a5cff 0%, transparent 55%), radial-gradient(120% 100% at 50% 100%, #00c6ff 0%, transparent 60%), #120a2a',
  sunset: 'linear-gradient(160deg, #ff9a56 0%, #ff5e7e 45%, #7a3cff 100%)',
  ocean: 'linear-gradient(170deg, #0f2027 0%, #203a43 40%, #2c90b8 100%)',
  mint: 'radial-gradient(100% 80% at 20% 0%, #a8ffcf 0%, transparent 60%), linear-gradient(180deg, #2bd4a4, #0a7a8c)',
  graphite: 'radial-gradient(100% 70% at 50% 0%, #4a4a52 0%, #111114 70%)',
  bloom: 'radial-gradient(80% 60% at 30% 30%, #ffd36e 0%, transparent 60%), radial-gradient(90% 70% at 80% 70%, #ff4f9a 0%, transparent 60%), #2a0f3a',
  dusk: 'linear-gradient(180deg, #232526 0%, #414345 50%, #ff8a5c 120%)',
  sky: 'linear-gradient(180deg, #74c0fc 0%, #a5d8ff 50%, #e7f5ff 100%)',
};

function sw(checked, onChange, disabled) {
  const inp = h('input', { type: 'checkbox' });
  inp.checked = !!checked;
  inp.disabled = !!disabled;
  inp.addEventListener('change', () => onChange(inp.checked));
  return h('label', { class: 'switch', style: disabled ? { opacity: .4 } : {} }, inp, h('span'));
}

function seg(options, value, onChange, disabled) {
  return h('div', { class: 'seg', style: disabled ? { opacity: .4, pointerEvents: 'none' } : {} },
    options.map(([v, label]) => h('button', { class: String(v) === String(value) ? 'on' : '', onclick: () => onChange(v) }, label)));
}

function cell(ic, color, label, control, sub) {
  return h('div', { class: 'cell' },
    ic && h('div', { class: 'ic', style: { background: color }, html: ICONS[ic] || '' }),
    h('div', { class: 'lbl' }, label, sub && h('small', {}, sub)),
    control);
}

function group(title, cells, foot, noicon) {
  return [
    title && h('div', { class: 'group-title' }, title),
    h('div', { class: 'group' + (noicon ? ' noicon' : '') }, cells.filter(Boolean)),
    foot && h('div', { class: 'group-foot' }, foot),
  ];
}

const SECTIONS = [
  ['perf', 'Производительность', 'cpu', '#0a84ff'],
  ['fps', 'Частота кадров', 'fps', '#ff9f0a'],
  ['display', 'Дисплей', 'display', '#bf5af2'],
  ['graphics', 'Графика', 'gpu', '#30d158'],
  ['device', 'Устройство', 'phone', '#8e8e93'],
  ['sound', 'Звук', 'sound', '#ff375f'],
  ['network', 'Сеть', 'network', '#64d2ff'],
  ['controls', 'Управление', 'gamepad', '#5e5ce6'],
  ['ui', 'Интерфейс iOS', 'palette', '#0a84ff'],
  ['advanced', 'Дополнительно', 'gear', '#636366'],
  ['about', 'О программе', 'info', '#8e8e93'],
];

/**
 * ctx: { inst, ui, info, running, saveInst(patch), saveUi(patch), restart(), wipe(), reinstall(), adb(args) }
 */
function mountSettings(root, ctx, startSection = 'perf') {
  let current = startSection;
  let needRestart = false;
  root.innerHTML = '';
  const nav = h('div', { class: 'settings-nav' });
  const pane = h('div', { class: 'settings-pane' });
  root.append(h('div', { class: 'settings-layout' }, nav, pane));

  async function set(patch) {
    if (ctx.running && Object.keys(patch).some((k) => RESTART_KEYS.has(k) && ctx.inst[k] !== patch[k])) needRestart = true;
    Object.assign(ctx.inst, patch);
    try { await ctx.saveInst(patch); } catch (e) { toast(e.message, 'err'); }
    render();
  }
  async function setUi(patch) {
    Object.assign(ctx.ui, patch);
    await ctx.saveUi(patch);
    render();
  }

  function renderNav() {
    nav.innerHTML = '';
    for (const [id, label, ic, color] of SECTIONS) {
      nav.append(h('div', { class: 'navitem' + (id === current ? ' on' : ''), onclick: () => { current = id; render(); } },
        h('div', { class: 'ic', style: { background: color }, html: ICONS[ic] }), label));
    }
  }

  function render() {
    renderNav();
    const scroll = pane.scrollTop;
    pane.innerHTML = '';
    const sec = SECTIONS.find((s) => s[0] === current);
    pane.append(h('h2', {}, sec[1]));
    if (needRestart) {
      pane.append(h('div', { class: 'restart-note' }, 'Часть изменений вступит в силу после перезапуска',
        ctx.restart && h('button', { class: 'btn', onclick: () => { needRestart = false; ctx.restart(); render(); } }, 'Перезапустить')));
    }
    pane.append(...[].concat(...BUILDERS[current](ctx.inst, ctx, set, setUi)).filter(Boolean));
    pane.scrollTop = scroll;
  }

  render();
  return { render, go: (id) => { current = id; render(); } };
}

const BUILDERS = {
  perf(inst, ctx, set) {
    const maxCpu = Math.max(1, ctx.info.cpuCount);
    const maxRam = ctx.info.totalMem;
    const profile = Object.entries(PROFILES).find(([, p]) => p.cpu === inst.cpu && p.ram === inst.ram);
    const cpuOpts = [1, 2, 3, 4, 6, 8, 12, 16].filter((n) => n <= maxCpu).map((n) => [n, String(n)]);
    const ramOpts = [1536, 2048, 3072, 4096, 6144, 8192, 12288, 16384].filter((n) => n <= maxRam * 0.75)
      .map((n) => [n, n >= 2048 ? `${n / 1024} ГБ` : `${(n / 1024).toFixed(1)} ГБ`]);
    return [
      group('Режим', [
        cell('cpu', '#0a84ff', 'Профиль производительности',
          seg([...Object.entries(PROFILES).filter(([, p]) => p.cpu <= maxCpu && p.ram <= maxRam * 0.75).map(([k, p]) => [k, p.label]), ['custom', 'Свой']],
            profile ? profile[0] : 'custom', (v) => { if (PROFILES[v]) set({ cpu: PROFILES[v].cpu, ram: PROFILES[v].ram }); })),
      ], `На этом ПК: ${ctx.info.cpuCount} потоков ЦП, ${Math.round(maxRam / 1024)} ГБ ОЗУ.`),
      group('Ресурсы', [
        cell('cpu', '#5e5ce6', 'Ядра процессора', seg(cpuOpts, inst.cpu, (v) => set({ cpu: Number(v) }))),
        cell('memory', '#30d158', 'Оперативная память', seg(ramOpts, inst.ram, (v) => set({ ram: Number(v) }))),
      ]),
      group('Эко-режим', [
        cell('eco', '#30d158', 'Эко-режим', sw(inst.ecoMode, (v) => set({ ecoMode: v })), 'Снижает частоту отрисовки окна, экономит ЦП/ГП в фоне'),
        cell(null, null, 'Кадров в секунду в эко-режиме', seg([[5, '5'], [10, '10'], [15, '15'], [30, '30']], inst.ecoFps, (v) => set({ ecoFps: Number(v) }), !inst.ecoMode)),
      ], 'Удобно для фарма в нескольких экземплярах одновременно.'),
    ];
  },

  fps(inst, ctx, set) {
    return [
      group('Лимит FPS', [
        cell('fps', '#ff9f0a', 'Без лимита FPS', sw(inst.fpsUnlimited, (v) => set({ fpsUnlimited: v })), 'Снимает ограничение 60 кадров: дисплей 240 Гц, VSync в Android отключён'),
        cell('display', '#ff9f0a', 'Частота кадров', seg([[30, '30'], [60, '60'], [90, '90'], [120, '120'], [144, '144'], [165, '165'], [240, '240']],
          inst.fpsUnlimited ? 240 : inst.fpsLimit, (v) => set({ fpsLimit: Number(v) }), inst.fpsUnlimited)),
        cell('info', '#8e8e93', 'Показывать FPS', sw(inst.showFps, (v) => set({ showFps: v })), 'Счётчик кадров в углу экрана'),
      ], 'Выставляйте частоту не выше частоты вашего монитора. Игре также нужно разрешить высокий FPS в её настройках.'),
    ];
  },

  display(inst, ctx, set) {
    const landscape = inst.width >= inst.height;
    const presets = landscape ? RES_LANDSCAPE : RES_PORTRAIT;
    const cur = `${inst.width}x${inst.height}`;
    const isPreset = presets.some(([w, hh]) => `${w}x${hh}` === cur);
    const sel = h('select', { class: 'ios' },
      presets.map(([w, hh, n]) => h('option', { value: `${w}x${hh}` }, `${w} × ${hh} (${n})`)),
      h('option', { value: 'custom' }, 'Своё…'));
    sel.value = isPreset ? cur : 'custom';
    sel.addEventListener('change', () => {
      if (sel.value === 'custom') { set({ width: inst.width + 0, height: inst.height }); return; }
      const [w, hh] = sel.value.split('x').map(Number);
      set({ width: w, height: hh });
    });
    const wIn = h('input', { class: 'ios', type: 'number', min: 320, max: 3840, value: inst.width, style: { width: '86px' } });
    const hIn = h('input', { class: 'ios', type: 'number', min: 320, max: 3840, value: inst.height, style: { width: '86px' } });
    const applyCustom = () => {
      const w = Math.max(320, Math.min(3840, Number(wIn.value) || inst.width));
      const hh = Math.max(320, Math.min(3840, Number(hIn.value) || inst.height));
      set({ width: w - (w % 2), height: hh - (hh % 2) });
    };
    wIn.addEventListener('change', applyCustom);
    hIn.addEventListener('change', applyCustom);
    const dpiOpts = [[160, '160'], [240, '240'], [320, '320'], [400, '400'], [480, '480']];
    return [
      group('Ориентация', [
        cell('rotate', '#bf5af2', 'Ориентация экрана',
          seg([['landscape', 'Альбомная (планшет)'], ['portrait', 'Книжная (телефон)']], landscape ? 'landscape' : 'portrait', (v) => {
            if ((v === 'landscape') !== landscape) set({ width: inst.height, height: inst.width });
          })),
        cell('rotate', '#5e5ce6', 'Автоповорот окна', sw(inst.autoRotate, (v) => set({ autoRotate: v })), 'Окно поворачивается, когда приложение меняет ориентацию'),
      ]),
      group('Разрешение', [
        cell('display', '#bf5af2', 'Разрешение экрана', sel),
        cell(null, null, 'Своё разрешение', h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, wIn, '×', hIn)),
        cell(null, null, 'Плотность пикселей (DPI)', h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } },
          seg(dpiOpts, inst.dpi, (v) => set({ dpi: Number(v) })),
          (() => { const i = h('input', { class: 'ios', type: 'number', min: 120, max: 640, value: inst.dpi, style: { width: '70px' } }); i.addEventListener('change', () => set({ dpi: Math.max(120, Math.min(640, Number(i.value) || 240)) })); return i; })())),
      ], 'Рекомендуется 1600×900 / 240 DPI для игр и 1080×1920 / 420 DPI для телефонных приложений.'),
    ];
  },

  graphics(inst, ctx, set) {
    const win = ctx.info.platform === 'win32';
    const opts = [['auto', 'Авто'], ['host', 'Аппаратный (GPU)']];
    if (win) opts.push(['angle_indirect', 'ANGLE (DirectX)']);
    opts.push(['swiftshader_indirect', 'Программный']);
    return [
      group('Движок', [
        cell('gpu', '#30d158', 'Режим графики', seg(opts, inst.gpu, (v) => set({ gpu: v }))),
        cell('gpu', '#0a84ff', 'Vulkan', sw(inst.vulkan, (v) => set({ vulkan: v })), 'Нужен для некоторых новых игр, требует свежих драйверов'),
      ], 'Если экран чёрный или игра вылетает — попробуйте ANGLE или программный режим.'),
      group('Окно', [
        cell('windows', '#636366', 'Встроенный экран', sw(inst.embedded, (v) => set({ embedded: v })),
          'Выкл. — эмулятор откроется в своём окне (запасной вариант, если не работает встроенный)'),
      ]),
    ];
  },

  device(inst, ctx, set) {
    const name = h('input', { class: 'ios', value: inst.name, style: { width: '200px' } });
    name.addEventListener('change', () => set({ name: name.value.trim() || inst.name }));
    const img = (ctx.info.images.find((i) => i.path === inst.image) || { title: inst.image });
    const abi = h('span', { class: 'val' }, ctx.running ? '…' : 'запустите эмулятор');
    if (ctx.running && ctx.adb) {
      ctx.adb(['shell', 'getprop ro.product.cpu.abilist']).then((s) => { abi.textContent = s.trim().split(',').join(', '); }).catch(() => { abi.textContent = '—'; });
    }
    return [
      group('Устройство', [
        cell('phone', '#8e8e93', 'Имя экземпляра', name),
        cell('info', '#0a84ff', 'Система', h('span', { class: 'val' }, img.title)),
        cell('cpu', '#5e5ce6', 'Поддерживаемые ABI', abi, 'x86_64 / x86 — родные, arm64-v8a / armeabi-v7a — через трансляцию ARM'),
      ]),
      group('Хранилище', [
        cell('folder', '#ff9f0a', 'Внутренняя память', seg([[4, '4 ГБ'], [8, '8 ГБ'], [16, '16 ГБ'], [32, '32 ГБ'], [64, '64 ГБ']], inst.dataSize, (v) => set({ dataSize: Number(v) })),
          'Увеличение применяется после перезапуска, уменьшение — только после сброса данных'),
      ]),
      group('Запуск', [
        cell('power', '#30d158', 'Быстрый запуск', sw(inst.quickBoot, (v) => set({ quickBoot: v })), 'Сохраняет состояние при выключении и стартует за секунды'),
        cell('play', '#ff9f0a', 'Анимация загрузки', sw(inst.bootAnim, (v) => set({ bootAnim: v }))),
      ]),
    ];
  },

  sound(inst, ctx, set) {
    return [
      group('Звук', [
        cell('sound', '#ff375f', 'Звук', sw(inst.audio, (v) => set({ audio: v }))),
        cell('sound', '#ff9f0a', 'Микрофон', sw(inst.mic, (v) => set({ mic: v })), 'Передавать микрофон ПК в Android'),
      ]),
    ];
  },

  network(inst, ctx, set) {
    const dns = h('input', { class: 'ios', placeholder: 'например 1.1.1.1,8.8.8.8', value: inst.dns, style: { width: '220px' } });
    dns.addEventListener('change', () => set({ dns: dns.value.trim() }));
    const proxy = h('input', { class: 'ios', placeholder: 'http://host:port', value: inst.proxy, style: { width: '220px' } });
    proxy.addEventListener('change', () => set({ proxy: proxy.value.trim() }));
    return [
      group('Сеть', [
        cell('network', '#64d2ff', 'DNS-серверы', dns),
        cell('network', '#0a84ff', 'HTTP-прокси', proxy),
      ], 'Оставьте пустым, чтобы использовать настройки ПК.'),
    ];
  },

  controls(inst, ctx, set) {
    const range = (v, min, max, step, onCh) => {
      const r = h('input', { type: 'range', class: 'ios-range', min, max, step, value: v });
      const out = h('span', { class: 'val', style: { width: '38px', textAlign: 'right' } }, String(v));
      r.addEventListener('input', () => { out.textContent = r.value; });
      r.addEventListener('change', () => onCh(Number(r.value)));
      return h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, r, out);
    };
    const keys = [
      ['Ctrl + Shift + A', 'Редактор управления'], ['F11', 'Полноэкранный режим'], ['Ctrl + Shift + H', 'Домой'],
      ['Esc / Ctrl + Shift + B', 'Назад'], ['Ctrl + Shift + R', 'Недавние приложения'], ['Ctrl + Shift + S', 'Скриншот'],
      ['Ctrl + Shift + O', 'Повернуть экран'], ['Ctrl + Shift + I', 'Настройки'], ['Ctrl + Shift + F', 'Эко-режим'],
      ['Ctrl + Shift + K', 'Показать/скрыть подсказки клавиш'], ['Ctrl + Shift + ↑ / ↓', 'Громкость'],
    ];
    return [
      group('Игровое управление', [
        cell('keyboard', '#5e5ce6', 'Подсказки клавиш на экране', sw(inst.showKeyHints, (v) => set({ showKeyHints: v }))),
        cell('palette', '#bf5af2', 'Прозрачность подсказок', range(inst.overlayOpacity, 0.1, 1, 0.05, (v) => set({ overlayOpacity: v }))),
        cell('mouse', '#0a84ff', 'Чувствительность обзора мышью', range(inst.mouseSensitivity, 0.2, 4, 0.1, (v) => set({ mouseSensitivity: v }))),
      ], 'Схему клавиш для каждой игры настраивают на панели «Управление» справа от экрана эмулятора.'),
      group('Горячие клавиши', keys.map(([k, d]) => cell(null, null, d, h('span', { class: 'badge' }, k))), null, true),
    ];
  },

  ui(inst, ctx, set, setUi) {
    const ui = ctx.ui;
    const walls = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '14px' } },
      Object.entries(WALLPAPERS).map(([k, bg]) => h('div', {
        onclick: () => setUi({ wallpaper: k }),
        style: {
          aspectRatio: '16/10', borderRadius: '12px', background: bg, cursor: 'pointer',
          outline: ui.wallpaper === k ? '3px solid var(--blue)' : '1px solid var(--sep)', outlineOffset: '2px',
        },
      })));
    return [
      group('Домашний экран', [
        cell('home', '#0a84ff', 'Домашний экран iOS', sw(ui.iosHome, (v) => setUi({ iosHome: v })), 'Сетка иконок, док и строка состояния в стиле iOS вместо лаунчера Android'),
        cell('palette', '#ff9f0a', 'iOS-иконки системных приложений', sw(ui.iosSystemIcons, (v) => setUi({ iosSystemIcons: v }))),
        cell('apk', '#30d158', 'Иконки приложений из Google Play', sw(ui.playIcons, (v) => setUi({ playIcons: v })), 'Загружаются один раз и хранятся локально'),
      ]),
      group('Обои', [walls]),
      group('Оформление', [
        cell('palette', '#5e5ce6', 'Тема окна', seg([['dark', 'Тёмная'], ['light', 'Светлая']], ui.theme, (v) => setUi({ theme: v }))),
      ]),
    ];
  },

  advanced(inst, ctx) {
    return [
      group('Android SDK', [
        cell('folder', '#636366', 'Папка SDK', h('span', { class: 'val', style: { fontSize: '12px', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, ctx.info.sdkPath)),
        ctx.reinstall && cell('restart', '#0a84ff', 'Переустановить эмулятор и образ', h('button', { class: 'btn', onclick: () => ctx.reinstall() }, 'Переустановить')),
      ]),
      group('Отладка', [
        cell('log', '#8e8e93', 'Журнал эмулятора', h('button', { class: 'btn', onclick: () => ipc('emu:log', inst.id) }, 'Открыть')),
        ctx.ports && cell('network', '#64d2ff', 'ADB', h('span', { class: 'val' }, `adb connect 127.0.0.1:${ctx.ports.console + 1}  ·  ${ctx.ports.serial}`)),
      ], 'К эмулятору можно подключиться из Android Studio или scrcpy через ADB.'),
      group('Сброс', [
        cell('trash', '#ff453a', 'Сбросить данные Android', h('button', {
          class: 'btn danger',
          onclick: async () => {
            if (await confirmBox('Сбросить данные?', 'Все установленные приложения и аккаунты в этом экземпляре будут удалены.', 'Сбросить', true)) ctx.wipe && ctx.wipe();
          },
        }, 'Сбросить')),
      ]),
    ];
  },

  about(inst, ctx) {
    return [
      h('div', { style: { textAlign: 'center', padding: '24px 0 8px' } },
        h('img', { src: '../assets/icon.png', style: { width: '96px', height: '96px', borderRadius: '22px', boxShadow: '0 10px 30px rgba(0,0,0,.4)' } }),
        h('div', { style: { fontSize: '22px', fontWeight: 700, marginTop: '12px' } }, 'iDroid Player'),
        h('div', { style: { color: 'var(--text2)', marginTop: '4px' } }, `Версия ${ctx.info.version} · ${ctx.info.platform === 'win32' ? 'Windows' : 'Linux'}`)),
      group(null, [
        cell('cpu', '#0a84ff', 'Движок', h('span', { class: 'val' }, 'Android Emulator (QEMU) + gRPC')),
        cell('apk', '#30d158', 'Магазин приложений', h('span', { class: 'val' }, 'Google Play')),
        cell('layers', '#bf5af2', 'Архитектуры', h('span', { class: 'val' }, 'x86_64 · x86 · arm64 · armv7')),
      ]),
    ];
  },
};

module.exports = { mountSettings, WALLPAPERS, RESTART_KEYS };
