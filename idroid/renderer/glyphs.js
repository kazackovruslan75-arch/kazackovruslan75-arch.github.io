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

// Иконки системных приложений в стиле iOS (свои рисунки, без ассетов Apple).
// Эффект Liquid Glass (iOS 26) добавляется поверх CSS-слоями, см. .ios26 в player.css.
const S = (body, defs = '') => `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${body}</svg>`;
const LG = (id, a, b, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const RG = (id, a, b) => `<radialGradient id="${id}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`;
const grad = (a, b) => `linear-gradient(180deg,${a},${b})`;
const range = (n) => Array.from({ length: n }, (_, i) => i);

const gearSvg = (() => {
  const teeth = (r, n, w, h, fill) => range(n).map((i) => `<rect x="${30 - w / 2}" y="${30 - r - h / 2}" width="${w}" height="${h}" rx="1.2" fill="${fill}" transform="rotate(${(360 / n) * i} 30 30)"/>`).join('');
  return S(
    teeth(19, 30, 3.2, 6, '#4b4b50') + '<circle cx="30" cy="30" r="19" fill="url(#gr1)"/>' +
    '<circle cx="30" cy="30" r="15.5" fill="#3a3a3e"/>' + teeth(9, 12, 2.6, 13, '#d9d9de') +
    '<circle cx="30" cy="30" r="9.5" fill="url(#gr2)"/><circle cx="30" cy="30" r="4.2" fill="#5a5a60"/>',
    LG('gr1', '#e9e9ee', '#8d8d94') + LG('gr2', '#f4f4f7', '#a9a9b0'));
})();

const clockSvg = S(
  '<circle cx="30" cy="30" r="23" fill="#fff"/>' +
  range(12).map((i) => `<rect x="29.3" y="8.6" width="1.4" height="${i % 3 ? 2.6 : 4}" rx=".7" fill="#1c1c1e" transform="rotate(${i * 30} 30 30)"/>`).join('') +
  '<path d="M30 30 30 15" stroke="#1c1c1e" stroke-width="2.6" stroke-linecap="round"/><path d="M30 30 40.5 35" stroke="#1c1c1e" stroke-width="2.6" stroke-linecap="round"/>' +
  '<path d="M30 30 20 42" stroke="#ff9500" stroke-width="1.2" stroke-linecap="round"/><circle cx="30" cy="30" r="2" fill="#ff9500"/><circle cx="30" cy="30" r=".8" fill="#fff"/>');

const compassSvg = S(
  '<circle cx="30" cy="30" r="22" fill="url(#cp1)"/>' +
  range(36).map((i) => `<rect x="29.6" y="9.5" width=".8" height="${i % 3 ? 2 : 3.4}" fill="#fff" opacity=".9" transform="rotate(${i * 10} 30 30)"/>`).join('') +
  '<path d="M41 19 32.2 32.2 27.8 27.8z" fill="#ff3b30"/><path d="M19 41 27.8 27.8 32.2 32.2z" fill="#f2f2f7"/><circle cx="30" cy="30" r="1.4" fill="#fff"/>',
  RG('cp1', '#5ad1ff', '#0a5fe0'));

const APP_ICONS = {
  'com.android.vending': { bg: grad('#25c9ff', '#0a5ff0'), label: 'Play Маркет', svg: S(
    '<path d="M24 25v-4.5a6 6 0 0 1 12 0V25" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/>' +
    '<path d="M17 24h26l-2.2 19.5a3.4 3.4 0 0 1-3.4 3H22.6a3.4 3.4 0 0 1-3.4-3z" fill="#fff"/><path d="m27 31 8.5 4.8L27 40.6z" fill="#0a7cff"/>') },
  'com.android.chrome': { bg: grad('#ffffff', '#e9ebef'), label: 'Chrome', svg: compassSvg },
  'com.android.settings': { bg: grad('#b9b9c0', '#7a7a82'), label: 'Настройки', svg: gearSvg },
  'com.google.android.youtube': { bg: grad('#ff4d47', '#d40000'), label: 'YouTube', svg: S(
    '<rect x="12" y="18" width="36" height="25" rx="8" fill="#fff"/><path d="m27 24.5 9.5 6-9.5 6z" fill="#e00000"/>') },
  'com.google.android.gm': { bg: grad('#46c6ff', '#0a63ff'), label: 'Почта', svg: S(
    '<rect x="11" y="17" width="38" height="26" rx="4.5" fill="#fff"/><path d="m12.5 19.5 17.5 13 17.5-13" fill="none" stroke="#2a8cff" stroke-width="2.4" stroke-linejoin="round"/>') },
  'com.google.android.apps.maps': { bg: grad('#dcf6d4', '#a6e09a'), label: 'Карты', svg: S(
    '<path d="M-4 47 64 21" stroke="#fff" stroke-width="10"/><path d="M-4 47 64 21" stroke="#ffd60a" stroke-width="2.4"/>' +
    '<path d="M27 -4 35 64" stroke="#fff" stroke-width="7"/><path d="M27 -4 35 64" stroke="#3a9bff" stroke-width="3.4"/>' +
    '<circle cx="43" cy="16" r="8" fill="#0a84ff" stroke="#fff" stroke-width="2"/><path d="m43 11 3.6 9-3.6-2-3.6 2z" fill="#fff"/>') },
  'com.google.android.dialer': { bg: grad('#64f383', '#18bd3c'), label: 'Телефон', svg: S(
    '<path d="M43.5 37.4v4.8a3.2 3.2 0 0 1-3.5 3.2 31.7 31.7 0 0 1-13.8-4.9 31.2 31.2 0 0 1-9.6-9.6 31.7 31.7 0 0 1-4.9-13.9 3.2 3.2 0 0 1 3.2-3.5h4.8a3.2 3.2 0 0 1 3.2 2.8c.2 1.5.6 3 1.1 4.5a3.2 3.2 0 0 1-.7 3.4l-2 2a25.6 25.6 0 0 0 9.6 9.6l2-2a3.2 3.2 0 0 1 3.4-.7c1.5.5 3 .9 4.5 1.1a3.2 3.2 0 0 1 2.8 3.2z" fill="#fff"/>') },
  'com.google.android.apps.messaging': { bg: grad('#64f383', '#18bd3c'), label: 'Сообщения', svg: S(
    '<path d="M30 13.5c-10.2 0-18.5 6.7-18.5 15 0 4.8 2.8 9 7.1 11.8-.4 2.4-1.6 4.6-3.3 6.2 3.4 0 6.4-1.2 8.5-3 2 .5 4 .8 6.2.8 10.2 0 18.5-6.7 18.5-15S40.2 13.5 30 13.5z" fill="#fff"/>') },
  'com.google.android.contacts': { bg: grad('#e6e6eb', '#a9a9b1'), label: 'Контакты', svg: S(
    '<rect x="14" y="10" width="32" height="40" rx="5" fill="#f7f7f9"/><rect x="46" y="15" width="3" height="7" rx="1.5" fill="#ff9500"/><rect x="46" y="24" width="3" height="7" rx="1.5" fill="#34c759"/><rect x="46" y="33" width="3" height="7" rx="1.5" fill="#0a84ff"/>' +
    '<circle cx="30" cy="25" r="6.5" fill="#a3a3aa"/><path d="M19 42c1.2-6 5.6-8.6 11-8.6S39.8 36 41 42z" fill="#a3a3aa"/>') },
  'com.android.camera2': { bg: grad('#ececf0', '#9d9da4'), label: 'Камера', svg: S(
    '<path d="M22.5 19.5 25 15.5h10l2.5 4H45a4 4 0 0 1 4 4V42a4 4 0 0 1-4 4H15a4 4 0 0 1-4-4V23.5a4 4 0 0 1 4-4z" fill="#2c2c2e"/>' +
    '<circle cx="30" cy="32.5" r="9.5" fill="#48484c"/><circle cx="30" cy="32.5" r="7.2" fill="url(#cm1)"/><circle cx="27.4" cy="30" r="1.8" fill="#fff" opacity=".75"/><circle cx="42" cy="24" r="1.6" fill="#ffd60a"/>',
    RG('cm1', '#5e6bff', '#0b0b1a')) },
  'com.google.android.apps.photos': { bg: grad('#ffffff', '#f2f2f5'), label: 'Фото', svg: S('<g transform="translate(30 30)">' +
    ['#ff9500', '#ffcc00', '#34c759', '#30b0c7', '#0a84ff', '#5e5ce6', '#bf5af2', '#ff2d55'].map((c, i) =>
      `<ellipse cx="0" cy="-10" rx="6" ry="10.5" fill="${c}" opacity=".88" style="mix-blend-mode:multiply" transform="rotate(${i * 45})"/>`).join('') + '</g>') },
  'com.android.deskclock': { bg: grad('#2c2c2e', '#000000'), label: 'Часы', svg: clockSvg },
  'com.google.android.calendar': { bg: grad('#ffffff', '#f4f4f6'), label: 'Календарь', calendar: true },
  'com.google.android.calculator': { bg: grad('#5a5a5f', '#1c1c1e'), label: 'Калькулятор', svg: S(
    '<rect x="13" y="13" width="15" height="15" rx="7.5" fill="#d4d4d2"/><rect x="32" y="13" width="15" height="15" rx="7.5" fill="#ff9f0a"/>' +
    '<rect x="13" y="32" width="15" height="15" rx="7.5" fill="#505055"/><rect x="32" y="32" width="15" height="15" rx="7.5" fill="#ff9f0a"/>' +
    '<path d="M39.5 17v7M36 20.5h7M17 39.5h7M36.2 38h6.6M36.2 41.4h6.6" stroke="#fff" stroke-width="1.9" stroke-linecap="round"/><path d="M17.5 18.4h6" stroke="#1c1c1e" stroke-width="1.9" stroke-linecap="round"/>') },
  'com.google.android.documentsui': { bg: grad('#ffffff', '#f2f2f5'), label: 'Файлы', svg: S(
    '<path d="M10 18a4 4 0 0 1 4-4h10.5l4.5 4.5H46a4 4 0 0 1 4 4V42a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z" fill="#1e7dff"/><path d="M10 24h40v18a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z" fill="url(#fl1)"/>',
    LG('fl1', '#6cc4ff', '#2f95ff')) },
  'com.google.android.googlequicksearchbox': { bg: grad('#ffffff', '#f2f2f5'), label: 'Google', svg: S('<path d="M44 30.4c0-1-.1-2-.3-2.9H30v5.5h7.9a6.8 6.8 0 0 1-2.9 4.4v3.7h4.7c2.8-2.6 4.3-6.3 4.3-10.7z" fill="#4285f4"/><path d="M30 44.5c3.9 0 7.2-1.3 9.6-3.5l-4.7-3.6c-1.3.9-3 1.4-4.9 1.4-3.8 0-7-2.5-8.1-6h-4.8v3.8a14.5 14.5 0 0 0 12.9 7.9z" fill="#34a853"/><path d="M21.9 32.8a8.7 8.7 0 0 1 0-5.6v-3.8h-4.8a14.5 14.5 0 0 0 0 13z" fill="#fbbc05"/><path d="M30 21.3c2.1 0 4 .7 5.5 2.2l4.1-4.1A14.5 14.5 0 0 0 17.1 23.4l4.8 3.8c1.1-3.4 4.3-5.9 8.1-5.9z" fill="#ea4335"/>') },
  'com.google.android.apps.youtube.music': { bg: grad('#ff6a84', '#f5213f'), label: 'Музыка', svg: S(
    '<path d="M25 19.5 42 15.8v19.7a5.2 5.2 0 1 1-2.6-4.5V22.4L27.6 25v14.3A5.2 5.2 0 1 1 25 34.8z" fill="#fff"/>') },
  'com.google.android.apps.docs': { bg: grad('#ffe46a', '#ffc400'), label: 'Диск', svg: S(
    '<path d="M24 14h12l11 19-6 10H19l-6-10z" fill="none" stroke="#7a5b00" stroke-width="2.6" stroke-linejoin="round"/><path d="M24 14 30 24M13 33h22M41 43l-6-10" stroke="#7a5b00" stroke-width="2.6" stroke-linecap="round"/>') },
  'com.google.android.apps.wellbeing': { bg: grad('#6e6cf0', '#3634a3'), label: 'Экранное время', svg: S(
    '<path d="M30 12a18 18 0 1 1-18 18" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M30 12a18 18 0 0 0-18 18" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round"/>') },
  'com.google.android.keep': { bg: grad('#ffffff', '#f4f4f6'), label: 'Заметки', svg: S(
    '<path d="M0 0h60v17H0z" fill="url(#nt1)"/><path d="M0 17h60" stroke="#d6a800" stroke-width=".8"/>' +
    [27, 35, 43, 51].map((y) => `<path d="M7 ${y}h46" stroke="#cfcfd4" stroke-width="1.1" stroke-dasharray="1.6 2.2"/>`).join(''),
    LG('nt1', '#ffe066', '#ffc300')) },
  'com.google.android.apps.tasks': { bg: grad('#ffffff', '#f4f4f6'), label: 'Напоминания', svg: S(
    [['#0a84ff', 17], ['#ff3b30', 30], ['#ff9500', 43]].map(([c, y]) =>
      `<circle cx="17" cy="${y}" r="4.6" fill="none" stroke="${c}" stroke-width="1.8"/><circle cx="17" cy="${y}" r="2.6" fill="${c}"/><path d="M26 ${y}h22" stroke="#d1d1d6" stroke-width="1.6" stroke-linecap="round"/>`).join('')) },
  'com.google.android.apps.books': { bg: grad('#ffad42', '#ff7300'), label: 'Книги', svg: S(
    '<path d="M30 20.5c-4.4-3-10.4-4.1-17-3.3v24c6.6-.8 12.6.3 17 3.3 4.4-3 10.4-4.1 17-3.3v-24c-6.6-.8-12.6.3-17 3.3z" fill="#fff"/><path d="M30 20.5v23.8" stroke="#ff8a1a" stroke-width="1.6"/>') },
  'com.google.android.apps.tachyon': { bg: grad('#64f383', '#18bd3c'), label: 'Видеозвонки', svg: S(
    '<rect x="11" y="20" width="26" height="20" rx="5.5" fill="#fff"/><path d="M38.5 27.5 49 21.6v16.8l-10.5-5.9z" fill="#fff"/>') },
  'com.google.android.apps.adm': { bg: grad('#4fe07f', '#17ad4b'), label: 'Локатор', svg: S(
    '<circle cx="30" cy="30" r="19" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.6"/><circle cx="30" cy="30" r="12.5" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.6"/>' +
    '<circle cx="30" cy="30" r="7" fill="#fff"/><circle cx="30" cy="30" r="3.4" fill="#1fbf55"/>') },
  'com.google.android.apps.fitness': { bg: grad('#ffffff', '#f4f4f6'), label: 'Здоровье', svg: S(
    '<path d="M30 46S12 35.5 12 23.5A9.5 9.5 0 0 1 30 18a9.5 9.5 0 0 1 18 5.5C48 35.5 30 46 30 46z" fill="url(#ht1)"/>',
    LG('ht1', '#ff6b93', '#ff2d55')) },
  'com.google.android.apps.chromecast.app': { bg: grad('#ffffff', '#f4f4f6'), label: 'Дом', svg: S(
    '<path d="M30 11.5 9.5 29.5h5.5V47h30V29.5h5.5z" fill="url(#hm1)" stroke-linejoin="round"/><rect x="26" y="34" width="8" height="13" rx="1.5" fill="#fff"/>',
    LG('hm1', '#ffb640', '#ff8200')) },
  'com.google.android.play.games': { bg: grad('#e66bff', '#a127ff'), label: 'Игры', svg: S(
    '<path d="m30 12.5 5.2 11.2 12.2 1.4-9 8.4 2.4 12.1L30 39.5l-10.8 6.1 2.4-12.1-9-8.4 12.2-1.4z" fill="#fff" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>') },
  'com.google.android.apps.translate': { bg: grad('#2c2c2e', '#050505'), label: 'Переводчик', svg: S(
    '<rect x="9" y="12" width="25" height="21" rx="6" fill="#0a84ff"/><path d="m14 36 2-3h6z" fill="#0a84ff"/><text x="21.5" y="28.5" font-family="-apple-system,Segoe UI,Arial" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">A</text>' +
    '<rect x="26" y="27" width="25" height="21" rx="6" fill="#fff"/><path d="m46 51-2-3h-6z" fill="#fff"/><text x="38.5" y="43" font-family="Noto Sans CJK SC,Microsoft YaHei,sans-serif" font-size="12" font-weight="700" fill="#1c1c1e" text-anchor="middle">文</text>') },
  'com.google.android.apps.recorder': { bg: grad('#2c2c2e', '#000000'), label: 'Диктофон', svg: S(
    '<path d="M8 30h44" stroke="#fff" stroke-opacity=".25" stroke-width="1"/>' +
    [4, 8, 14, 22, 12, 28, 18, 32, 24, 14, 20, 9, 16, 6, 3].map((hgt, i) => `<rect x="${9.5 + i * 2.8}" y="${30 - hgt / 2}" width="1.5" height="${hgt}" rx=".75" fill="#ff3b30"/>`).join('') +
    '<path d="M31 12v36" stroke="#fff" stroke-width="1.3"/>') },
  'com.google.android.apps.walletnfcrel': { bg: grad('#2c2c2e', '#000000'), label: 'Кошелёк', svg: S(
    '<rect x="11" y="12" width="38" height="13" rx="3" fill="#0a84ff"/><rect x="11" y="17" width="38" height="13" rx="3" fill="#30d158"/><rect x="11" y="22" width="38" height="13" rx="3" fill="#ff9f0a"/><rect x="11" y="27" width="38" height="13" rx="3" fill="#ff453a"/>' +
    '<path d="M11 33h10.5a8.5 8.5 0 0 0 17 0H49v11a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3z" fill="#3a3a3c"/>') },
  'com.google.android.apps.wear.companion': { bg: grad('#2c2c2e', '#000000'), label: 'Часы Wear', svg: S(
    '<path d="M23 10h14l1.5 7h-17zM23 50h14l1.5-7h-17z" fill="#636366"/><rect x="18" y="16" width="24" height="28" rx="8" fill="none" stroke="#fff" stroke-width="2.8"/><rect x="42" y="25" width="2.6" height="6" rx="1.3" fill="#fff"/>') },
  'com.google.android.apps.weather': { bg: grad('#4fb6ff', '#1a6fe6'), label: 'Погода', svg: S(
    '<circle cx="23" cy="23" r="9" fill="url(#sn1)"/><path d="M20 43.5h21a7.5 7.5 0 0 0 .8-15 10 10 0 0 0-19-1.8A8.4 8.4 0 0 0 20 43.5z" fill="#fff"/>',
    LG('sn1', '#ffe45c', '#ffb800')) },
  'com.google.android.apps.googleassistant': { bg: 'linear-gradient(145deg,#ff5f9e,#7a5cf5 60%,#3a7bff)', label: 'Ассистент', svg: S(
    '<rect x="18" y="12" width="22" height="22" rx="5" fill="#fff" opacity=".55" transform="rotate(45 29 23)"/><rect x="20" y="24" width="22" height="22" rx="5" fill="#fff" transform="rotate(45 31 35)"/>') },
  'com.android.stk': { bg: grad('#8e8e93', '#636366'), label: 'SIM-меню', svg: S(
    '<path d="M20 13h14l8 8v26H20z" fill="none" stroke="#fff" stroke-width="2.8" stroke-linejoin="round"/><rect x="25" y="29" width="12" height="10" rx="1.5" fill="#fff"/>') },
};

// Одинаковые приложения AOSP/Google под разными пакетами.
const ALIASES = {
  'com.google.android.GoogleCamera': 'com.android.camera2', 'com.android.camera': 'com.android.camera2',
  'com.google.android.apps.nbu.files': 'com.google.android.documentsui', 'com.android.documentsui': 'com.google.android.documentsui',
  'com.android.contacts': 'com.google.android.contacts', 'com.android.dialer': 'com.google.android.dialer',
  'com.android.messaging': 'com.google.android.apps.messaging', 'com.android.calendar': 'com.google.android.calendar',
  'com.android.calculator2': 'com.google.android.calculator', 'com.android.gallery3d': 'com.google.android.apps.photos',
  'com.google.android.apps.photosgo': 'com.google.android.apps.photos', 'com.android.music': 'com.google.android.apps.youtube.music',
  'com.google.android.apps.meetings': 'com.google.android.apps.tachyon', 'com.android.soundrecorder': 'com.google.android.apps.recorder',
  'com.google.android.wearable.app': 'com.google.android.apps.wear.companion', 'com.google.android.apps.wearables.maestro.companion': 'com.google.android.apps.wear.companion',
  'com.google.android.apps.googleassistant': 'com.google.android.apps.googleassistant', 'com.android.browser': 'com.android.chrome',
  'com.google.android.apps.healthdata': 'com.google.android.apps.fitness', 'com.google.android.deskclock': 'com.android.deskclock',
};

function appIcon(pkg) {
  return APP_ICONS[pkg] || APP_ICONS[ALIASES[pkg]] || null;
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
