// Общие помощники для окон.
const { ipcRenderer } = require('electron');
const { ICONS } = require(require('path').join(__dirname, 'glyphs.js'));

const ipc = (ch, ...a) => ipcRenderer.invoke(ch, ...a);

function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
}

const icon = (name) => h('span', { class: 'svgi', html: ICONS[name] || '' });

function toast(text, kind = '') {
  let box = document.getElementById('toasts');
  if (!box) { box = h('div', { id: 'toasts' }); document.body.append(box); }
  const t = h('div', { class: 'toast ' + kind }, text);
  box.append(t);
  setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; }, 2800);
  setTimeout(() => t.remove(), 3200);
}

function sheet(title, body, { done = 'Готово', onDone, cancel, wide } = {}) {
  const bg = h('div', { class: 'sheet-bg' });
  const close = () => bg.remove();
  const s = h('div', { class: 'sheet', style: wide ? { width: 'min(980px, calc(100vw - 32px))', height: 'calc(100vh - 60px)' } : {} },
    h('div', { class: 'sheet-head' },
      h('button', { class: 'btn plain', onclick: close }, cancel || ''),
      h('h3', {}, title),
      h('button', { class: 'btn plain', style: { fontWeight: 700 }, onclick: async () => { if (onDone && (await onDone()) === false) return; close(); } }, done)),
    h('div', { class: 'sheet-body', style: wide ? { padding: 0, flex: 1 } : {} }, body));
  bg.append(s);
  bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(); });
  document.body.append(bg);
  return { close, el: s };
}

function confirmBox(title, text, okText = 'OK', danger = false) {
  return new Promise((resolve) => {
    const bg = h('div', { class: 'sheet-bg' });
    const done = (v) => { bg.remove(); resolve(v); };
    bg.append(h('div', { class: 'sheet', style: { width: '300px', textAlign: 'center', background: 'var(--glass)', backdropFilter: 'blur(30px)' } },
      h('div', { style: { padding: '20px 18px 16px' } },
        h('div', { style: { fontWeight: 700, fontSize: '16px', marginBottom: '6px' } }, title),
        h('div', { style: { fontSize: '13px', color: 'var(--text2)', lineHeight: 1.4 } }, text)),
      h('div', { style: { display: 'flex', borderTop: '1px solid var(--sep)' } },
        h('button', { class: 'btn plain', style: { flex: 1, borderRadius: 0, padding: '12px' }, onclick: () => done(false) }, 'Отмена'),
        h('button', { class: 'btn plain', style: { flex: 1, borderRadius: 0, padding: '12px', fontWeight: 700, color: danger ? 'var(--red)' : 'var(--blue)', borderLeft: '1px solid var(--sep)' }, onclick: () => done(true) }, okText))));
    document.body.append(bg);
  });
}

function titlebar(title, { extra = [], maxBtn = true } = {}) {
  return h('div', { class: 'titlebar' },
    h('img', { class: 'logo', src: '../assets/icon.png' }),
    h('div', { class: 'title' }, title),
    ...extra,
    h('button', { class: 'wbtn', title: 'Свернуть', onclick: () => ipc('win:action', 'min'), html: ICONS.min }),
    maxBtn && h('button', { class: 'wbtn', title: 'Развернуть', onclick: () => ipc('win:action', 'max'), html: ICONS.max }),
    h('button', { class: 'wbtn close', title: 'Закрыть', onclick: () => ipc('win:action', 'close'), html: ICONS.close }));
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark';
}

const fmtBytes = (n) => {
  if (!n) return '0 Б';
  const u = ['Б', 'КБ', 'МБ', 'ГБ'];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return (n / 1024 ** i).toFixed(i ? 1 : 0) + ' ' + u[i];
};

module.exports = { ipc, ipcRenderer, h, icon, toast, sheet, confirmBox, titlebar, applyTheme, fmtBytes, ICONS };
