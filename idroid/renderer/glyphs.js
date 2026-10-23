// Векторные иконки интерфейса и iOS-иконки системных приложений.
const P = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;

const ICONS = {
  gear: P('<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  keyboard: P('<rect x="2" y="6" width="20" height="12" rx="2.5"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6"/>'),
  gamepad: P('<path d="M6 11h4M8 9v4M15 12h.01M18 10h.01"/><path d="M17.3 5H6.7a4 4 0 0 0-4 3.6l-.7 6.1A3 3 0 0 0 5 18c1 0 1.9-.5 2.4-1.3L9 14h6l1.6 2.7A2.8 2.8 0 0 0 19 18a3 3 0 0 0 3-3.3l-.7-6.1A4 4 0 0 0 17.3 5z"/>'),
  fullscreen: P('<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>'),
  volUp: P('<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>'),
  volDown: P('<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>'),
  rotate: P('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>'),
  camera: P('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>'),
  apk: P('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>'),
  folder: P('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'),
  location: P('<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'),
  layers: P('<path d="m12 2 10 5-10 5L2 7l10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>'),
  back: P('<path d="M15 18 9 12l6-6"/>'),
  home: P('<rect x="5" y="5" width="14" height="14" rx="4.5"/>'),
  recents: P('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 9h16"/>'),
  eco: P('<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.4 5.1-6"/>'),
  more: P('<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>'),
  close: P('<path d="M18 6 6 18M6 6l12 12"/>'),
  min: P('<path d="M5 12h14"/>'),
  max: P('<rect x="5" y="5" width="14" height="14" rx="2"/>'),
  play: P('<path d="m6 4 14 8-14 8z" fill="currentColor"/>'),
  stop: P('<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>'),
  plus: P('<path d="M12 5v14M5 12h14"/>'),
  copy: P('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  trash: P('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'),
  cpu: P('<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4"/>'),
  memory: P('<rect x="2" y="7" width="20" height="10" rx="1.5"/><path d="M6 7V4M10 7V4M14 7V4M18 7V4M6 17v3M18 17v3M6 11h2M10 11h2M14 11h2"/>'),
  display: P('<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>'),
  gpu: P('<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>'),
  fps: P('<path d="M12 14l4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0"/>'),
  sound: P('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
  power: P('<path d="M18.4 6.6a9 9 0 1 1-12.8 0M12 2v10"/>'),
  info: P('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'),
  search: P('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
  shake: P('<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M3 8v8M21 8v8"/>'),
  restart: P('<path d="M1 4v6h6"/><path d="M3.5 15a9 9 0 1 0 2.1-9.4L1 10"/>'),
  check: P('<path d="M20 6 9 17l-5-5"/>'),
  log: P('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>'),
  chev: P('<path d="m9 18 6-6-6-6"/>'),
  palette: P('<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 0 0 0 20c.9 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.8-1.7 1.7-1.7h2A5.6 5.6 0 0 0 22 11c0-5-4.5-9-10-9z"/>'),
  mouse: P('<rect x="6" y="3" width="12" height="18" rx="6"/><path d="M12 7v4"/>'),
  network: P('<path d="M5 12.6a10 10 0 0 1 14 0M1.4 9a15 15 0 0 1 21.2 0M8.5 16.4a5 5 0 0 1 7 0M12 20h.01"/>'),
  phone: P('<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>'),
  pin: P('<path d="M12 17v5M9 10.8V4h6v6.8l3 3.2v2H6v-2z"/>'),
  target: P('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>'),
  dpad: P('<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>'),
  tap: P('<circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="9"/>'),
  repeat: P('<path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>'),
  swipe: P('<path d="M4 12h14M14 7l5 5-5 5"/>'),
  fire: P('<path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4 1-7 1-9z"/>'),
  scope: P('<circle cx="12" cy="12" r="8"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6"/>'),
  export: P('<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>'),
  import: P('<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M8 11l4 4 4-4M12 15V2"/>'),
  windows: P('<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>'),
  record: P('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor"/>'),
  top: P('<path d="M12 19V5M5 12l7-7 7 7"/>'),
  wifi: '<svg viewBox="0 0 18 13" fill="currentColor"><path d="M9 2.4c2.5 0 4.8 1 6.5 2.6l1.3-1.3A11 11 0 0 0 9 .5 11 11 0 0 0 1.2 3.7L2.5 5A9.2 9.2 0 0 1 9 2.4zm0 3.7c1.5 0 2.9.6 3.9 1.5l1.3-1.3A7.4 7.4 0 0 0 9 4.2c-2 0-3.8.8-5.2 2.1l1.3 1.3c1-.9 2.4-1.5 3.9-1.5zm0 3.7c-.6 0-1.1.2-1.5.6L9 12l1.5-1.6c-.4-.4-.9-.6-1.5-.6z"/></svg>',
  battery: '<svg viewBox="0 0 27 13" fill="none"><rect x=".5" y=".5" width="23" height="12" rx="3.5" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="18" height="9" rx="2" fill="currentColor"/><path d="M25 4.5v4a2 2 0 0 0 0-4z" fill="currentColor" opacity=".4"/></svg>',
  signal: '<svg viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>',
};

// iOS-иконки системных приложений Android (белый символ на градиенте).
const W = (d, extra = '') => `<svg viewBox="0 0 60 60" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
const APP_ICONS = {
  'com.android.vending': { bg: 'linear-gradient(180deg,#1ad1ff,#0a6cff)', label: 'Play Маркет', svg: W('<path d="M21 24h18l-2 17H23z" fill="rgba(255,255,255,.18)"/><path d="M25 24v-3a5 5 0 0 1 10 0v3"/><path d="m27 31 7 4-7 4z" fill="#fff" stroke="none"/>') },
  'com.android.chrome': { bg: 'linear-gradient(180deg,#fff,#e6e6eb)', label: 'Chrome', svg: W('<circle cx="30" cy="30" r="19" stroke="#1e8bff" stroke-width="2.6"/><path d="m38 22-5 11-11 5 5-11z" fill="#ff3b30" stroke="none"/><path d="m22 38 5-11 6 6z" fill="#c7c7cc" stroke="none"/><path d="M30 13v4M30 43v4M13 30h4M43 30h4" stroke="#1e8bff" stroke-width="1.8"/>') },
  'com.android.settings': { bg: 'linear-gradient(180deg,#a5a5ad,#6c6c73)', label: 'Настройки', svg: W('<circle cx="30" cy="30" r="7"/><path d="M30 12v6M30 42v6M12 30h6M42 30h6M17.3 17.3l4.2 4.2M38.5 38.5l4.2 4.2M17.3 42.7l4.2-4.2M38.5 21.5l4.2-4.2"/><circle cx="30" cy="30" r="14" stroke-width="2.4" opacity=".7"/>') },
  'com.google.android.youtube': { bg: 'linear-gradient(180deg,#ff5148,#e00000)', label: 'YouTube', svg: W('<rect x="13" y="18" width="34" height="24" rx="8" fill="#fff" stroke="none"/><path d="m27 24 9 6-9 6z" fill="#e00000" stroke="none"/>') },
  'com.google.android.gm': { bg: 'linear-gradient(180deg,#3fb0ff,#1a6bff)', label: 'Почта', svg: W('<rect x="13" y="18" width="34" height="24" rx="4"/><path d="m14 20 16 12 16-12"/>') },
  'com.google.android.apps.maps': { bg: 'linear-gradient(180deg,#7be495,#2cbf5c)', label: 'Карты', svg: W('<path d="M30 46s-11-10-11-19a11 11 0 0 1 22 0c0 9-11 19-11 19z" fill="#ff3b30" stroke="#fff"/><circle cx="30" cy="27" r="4" fill="#fff" stroke="none"/>') },
  'com.google.android.dialer': { bg: 'linear-gradient(180deg,#5af578,#1dc03f)', label: 'Телефон', svg: W('<path d="M44 37.5v5a3.3 3.3 0 0 1-3.6 3.3 33 33 0 0 1-14.4-5.1A32.5 32.5 0 0 1 16 30.7a33 33 0 0 1-5.1-14.5A3.3 3.3 0 0 1 14.2 12.6h5a3.3 3.3 0 0 1 3.3 2.9 21 21 0 0 0 1.2 4.7 3.3 3.3 0 0 1-.8 3.5l-2.1 2.1a26.7 26.7 0 0 0 10 10l2.1-2.1a3.3 3.3 0 0 1 3.5-.8 21 21 0 0 0 4.7 1.2 3.3 3.3 0 0 1 2.9 3.4z" fill="#fff" stroke="none"/>') },
  'com.google.android.apps.messaging': { bg: 'linear-gradient(180deg,#5af578,#1dc03f)', label: 'Сообщения', svg: W('<path d="M30 14c-10 0-18 6.5-18 14.5 0 4.6 2.7 8.7 6.8 11.3L17 46l7.3-3.6c1.8.4 3.7.6 5.7.6 10 0 18-6.5 18-14.5S40 14 30 14z" fill="#fff" stroke="none"/>') },
  'com.google.android.contacts': { bg: 'linear-gradient(180deg,#d9d9de,#a7a7ae)', label: 'Контакты', svg: W('<circle cx="30" cy="24" r="7" fill="#fff" stroke="none"/><path d="M17 45c1.5-7 7-10 13-10s11.5 3 13 10" fill="#fff" stroke="none"/>') },
  'com.android.camera2': { bg: 'linear-gradient(180deg,#d9d9de,#8e8e93)', label: 'Камера', svg: W('<path d="M14 23h7l3-5h12l3 5h7v20H14z" fill="#3a3a3c" stroke="none"/><circle cx="30" cy="32" r="7" stroke="#fff"/>') },
  'com.google.android.GoogleCamera': { alias: 'com.android.camera2' },
  'com.google.android.apps.photos': { bg: '#fff', label: 'Фото', svg: '<svg viewBox="0 0 60 60"><g transform="translate(30 30)">' + ['#ff9500', '#ffcc00', '#34c759', '#5ac8fa', '#007aff', '#af52de', '#ff2d55', '#ff3b30'].map((c, i) => `<ellipse cx="0" cy="-9" rx="5.5" ry="10" fill="${c}" opacity=".85" transform="rotate(${i * 45})"/>`).join('') + '</g></svg>' },
  'com.android.deskclock': { bg: '#000', label: 'Часы', svg: '<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="20" fill="#fff"/><path d="M30 30V17M30 30l9 5" stroke="#000" stroke-width="2.6" stroke-linecap="round"/><path d="M30 30 21 39" stroke="#ff9500" stroke-width="1.4"/><circle cx="30" cy="30" r="1.8" fill="#ff9500"/></svg>' },
  'com.google.android.calendar': { bg: '#fff', label: 'Календарь', calendar: true },
  'com.google.android.calculator': { bg: 'linear-gradient(180deg,#3a3a3c,#1c1c1e)', label: 'Калькулятор', svg: '<svg viewBox="0 0 60 60"><circle cx="22" cy="22" r="6" fill="#a5a5a5"/><circle cx="38" cy="22" r="6" fill="#ff9f0a"/><circle cx="22" cy="38" r="6" fill="#5c5c5e"/><circle cx="38" cy="38" r="6" fill="#ff9f0a"/></svg>' },
  'com.google.android.documentsui': { bg: '#fff', label: 'Файлы', svg: '<svg viewBox="0 0 60 60"><path d="M12 19a3 3 0 0 1 3-3h10l4 4h16a3 3 0 0 1 3 3v19a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3z" fill="#1a8cff"/><path d="M12 25h36v17a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3z" fill="#4fb1ff"/></svg>' },
  'com.google.android.apps.nbu.files': { alias: 'com.google.android.documentsui' },
  'com.google.android.googlequicksearchbox': { bg: '#fff', label: 'Google', svg: '<svg viewBox="0 0 60 60"><path d="M44 30.4c0-1-.1-2-.3-2.9H30v5.5h7.9a6.8 6.8 0 0 1-2.9 4.4v3.7h4.7c2.8-2.6 4.3-6.3 4.3-10.7z" fill="#4285f4"/><path d="M30 44.5c3.9 0 7.2-1.3 9.6-3.5l-4.7-3.6c-1.3.9-3 1.4-4.9 1.4-3.8 0-7-2.5-8.1-6h-4.8v3.8a14.5 14.5 0 0 0 12.9 7.9z" fill="#34a853"/><path d="M21.9 32.8a8.7 8.7 0 0 1 0-5.6v-3.8h-4.8a14.5 14.5 0 0 0 0 13z" fill="#fbbc05"/><path d="M30 21.3c2.1 0 4 .7 5.5 2.2l4.1-4.1A14.5 14.5 0 0 0 17.1 23.4l4.8 3.8c1.1-3.4 4.3-5.9 8.1-5.9z" fill="#ea4335"/></svg>' },
  'com.google.android.apps.youtube.music': { bg: 'linear-gradient(180deg,#ff6b8b,#fa233b)', label: 'Музыка', svg: W('<path d="M26 40V20l14-3v20" /><circle cx="22" cy="40" r="4.5" fill="#fff"/><circle cx="36" cy="37" r="4.5" fill="#fff"/>') },
  'com.google.android.apps.docs': { bg: 'linear-gradient(180deg,#ffe066,#ffcc00)', label: 'Диск', svg: W('<path d="M24 14h12l11 19-6 10H19l-6-10z" stroke="#7a5b00" stroke-width="2.6"/><path d="M24 14 30 24M13 33h22M41 43l-6-10" stroke="#7a5b00" stroke-width="2.6"/>') },
  'com.google.android.apps.wellbeing': { bg: 'linear-gradient(180deg,#5856d6,#3634a3)', label: 'Экранное время', svg: W('<path d="M30 14v16l10 6"/><circle cx="30" cy="30" r="16"/>') },
  'com.android.stk': { bg: 'linear-gradient(180deg,#8e8e93,#636366)', label: 'SIM-меню', svg: W('<path d="M20 14h14l8 8v24H20z"/><rect x="25" y="29" width="12" height="10" rx="1.5"/>') },
};

function appIcon(pkg) {
  let d = APP_ICONS[pkg];
  if (d && d.alias) d = APP_ICONS[d.alias];
  return d || null;
}

function hashColor(str) {
  const palette = [
    ['#ff5e62', '#ff2a4d'], ['#ffb347', '#ff7b00'], ['#ffd94d', '#ffb800'], ['#5ff08a', '#16c247'],
    ['#4fd1ff', '#0a84ff'], ['#7c7bff', '#4a3aff'], ['#c86bff', '#9b26ff'], ['#ff7ac4', '#ff2d8a'],
    ['#4ae3c8', '#00b39b'], ['#9aa4b2', '#5b6675'],
  ];
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [a, b] = palette[h % palette.length];
  return `linear-gradient(180deg,${a},${b})`;
}

module.exports = { ICONS, APP_ICONS, appIcon, hashColor };
