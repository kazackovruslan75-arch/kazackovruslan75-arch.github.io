// Игровое управление: привязка клавиш и мыши к касаниям + визуальный редактор (как в BlueStacks).
const path = require('path');
const { h, ICONS } = require(path.join(__dirname, 'ui.js'));

const KEY_NAMES = {
  Space: 'Space', Enter: 'Enter', Tab: 'Tab', Backquote: '~', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']',
  Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', CapsLock: 'Caps',
  ShiftLeft: 'Shift', ShiftRight: 'R-Shift', ControlLeft: 'Ctrl', ControlRight: 'R-Ctrl', AltLeft: 'Alt', AltRight: 'R-Alt',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Backspace: '⌫', Delete: 'Del', Escape: 'Esc',
  MOUSE0: 'ЛКМ', MOUSE1: 'СКМ', MOUSE2: 'ПКМ', MOUSE3: 'M4', MOUSE4: 'M5',
};
function keyLabel(code) {
  if (!code) return '?';
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad/.test(code)) return 'Num' + code.slice(6);
  return code;
}

const TYPES = {
  tap: { label: 'Нажатие', icon: 'tap', hint: 'Клавиша → касание в точке' },
  dpad: { label: 'Крестовина', icon: 'dpad', hint: 'WASD → движение джойстика' },
  aim: { label: 'Обзор мышью', icon: 'scope', hint: 'Клавиша включает режим прицеливания мышью' },
  fire: { label: 'Стрельба', icon: 'fire', hint: 'ЛКМ в режиме обзора → касание' },
  repeat: { label: 'Повтор нажатий', icon: 'repeat', hint: 'Удержание → серия касаний' },
  swipe: { label: 'Свайп', icon: 'swipe', hint: 'Клавиша → свайп от точки к точке' },
};

const TEMPLATES = {
  shooter: [
    { type: 'dpad', keys: { up: 'KeyW', left: 'KeyA', down: 'KeyS', right: 'KeyD' }, x: 0.16, y: 0.72, r: 0.13 },
    { type: 'aim', key: 'Backquote', x: 0.68, y: 0.45, r: 0.18 },
    { type: 'fire', key: 'MOUSE0', x: 0.85, y: 0.62 },
    { type: 'tap', key: 'MOUSE2', x: 0.92, y: 0.45 },
    { type: 'tap', key: 'Space', x: 0.9, y: 0.82 },
    { type: 'tap', key: 'KeyC', x: 0.8, y: 0.9 },
    { type: 'tap', key: 'KeyR', x: 0.73, y: 0.88 },
    { type: 'tap', key: 'KeyF', x: 0.6, y: 0.62 },
    { type: 'tap', key: 'Digit1', x: 0.42, y: 0.9 },
    { type: 'tap', key: 'Digit2', x: 0.58, y: 0.9 },
  ],
  moba: [
    { type: 'dpad', keys: { up: 'KeyW', left: 'KeyA', down: 'KeyS', right: 'KeyD' }, x: 0.15, y: 0.73, r: 0.13 },
    { type: 'tap', key: 'Space', x: 0.88, y: 0.82 },
    { type: 'tap', key: 'KeyQ', x: 0.72, y: 0.86 },
    { type: 'tap', key: 'KeyE', x: 0.76, y: 0.68 },
    { type: 'tap', key: 'KeyR', x: 0.86, y: 0.6 },
    { type: 'tap', key: 'KeyF', x: 0.62, y: 0.9 },
    { type: 'tap', key: 'KeyB', x: 0.5, y: 0.92 },
  ],
  runner: [
    { type: 'swipe', key: 'ArrowUp', x: 0.5, y: 0.6, x2: 0.5, y2: 0.35 },
    { type: 'swipe', key: 'ArrowDown', x: 0.5, y: 0.4, x2: 0.5, y2: 0.65 },
    { type: 'swipe', key: 'ArrowLeft', x: 0.6, y: 0.5, x2: 0.35, y2: 0.5 },
    { type: 'swipe', key: 'ArrowRight', x: 0.4, y: 0.5, x2: 0.65, y2: 0.5 },
  ],
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clone = (o) => JSON.parse(JSON.stringify(o));

class KeymapEngine {
  /**
   * opts: overlay (элемент поверх экрана), surface (элемент для pointer lock),
   * viewSize() → {w,h} в px, toDevice(u,v) → {x,y}, touch(list), getInst()
   */
  constructor(opts) {
    Object.assign(this, opts);
    this.controls = [];
    this.enabled = true;
    this.editing = false;
    this.selected = null; // { index, part }
    this.held = new Set();
    this.timers = new Map();
    this.pool = [3, 4, 5, 6, 7, 8, 9];
    this.slotOf = new Map();
    this.aim = null;
    this.dpadOn = false;
    this.listeners = new Set();
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement !== this.surface && this.aim) this.exitAim();
    });
  }

  on(fn) { this.listeners.add(fn); }
  emit() { for (const f of this.listeners) f(); }

  setControls(list) {
    this.releaseAll();
    this.controls = clone(list || []);
    this.selected = null;
    this.render();
    this.emit();
  }

  // ---------- касания ----------
  send(id, u, v, down) {
    const p = this.toDevice(clamp(u, 0, 1), clamp(v, 0, 1));
    this.touch([{ x: Math.round(p.x), y: Math.round(p.y), identifier: id, pressure: down ? 1024 : 0, touch_major: down ? 12 : 0 }]);
  }

  takeSlot(key) {
    if (this.slotOf.has(key)) return this.slotOf.get(key);
    const id = this.pool.shift();
    if (id == null) return null;
    this.slotOf.set(key, id);
    return id;
  }

  freeSlot(key) {
    const id = this.slotOf.get(key);
    if (id == null) return;
    this.slotOf.delete(key);
    this.pool.push(id);
  }

  async tapAt(u, v) {
    const id = this.pool.shift();
    if (id == null) return;
    this.send(id, u, v, true);
    await sleep(40);
    this.send(id, u, v, false);
    this.pool.push(id);
  }

  releaseAll() {
    for (const t of this.timers.values()) clearInterval(t);
    this.timers.clear();
    for (const [k] of [...this.slotOf]) {
      const c = this.controlForSlotKey(k);
      if (c) this.send(this.slotOf.get(k), c.x, c.y, false);
      this.freeSlot(k);
    }
    if (this.dpadOn) { const d = this.controls.find((c) => c.type === 'dpad'); if (d) this.send(2, d.x, d.y, false); this.dpadOn = false; }
    this.held.clear();
    if (this.aim) this.exitAim();
  }

  controlForSlotKey(k) {
    const i = Number(String(k).split(':')[0]);
    return Number.isInteger(i) ? this.controls[i] : null;
  }

  // ---------- обработка ввода ----------
  hasBinding(code) {
    return this.controls.some((c) => c.key === code || (c.keys && Object.values(c.keys).includes(code)));
  }

  keyDown(code) {
    if (!this.enabled || this.editing || !this.controls.length) return false;
    if (!this.hasBinding(code)) return false;
    if (this.held.has(code)) return true;
    this.held.add(code);
    this.controls.forEach((c, i) => {
      if (c.type === 'dpad' && Object.values(c.keys).includes(code)) this.updateDpad(c);
      if (c.key !== code) return;
      if (c.type === 'tap' || (c.type === 'fire' && this.aim)) {
        const id = this.takeSlot(i + ':k');
        if (id != null) this.send(id, c.x, c.y, true);
      } else if (c.type === 'aim') {
        this.aim ? this.exitAim() : this.enterAim(c);
      } else if (c.type === 'repeat') {
        this.tapAt(c.x, c.y);
        this.timers.set(i, setInterval(() => this.tapAt(c.x, c.y), c.interval || 90));
      } else if (c.type === 'swipe') {
        this.swipe(c, i);
      }
    });
    return true;
  }

  keyUp(code) {
    if (!this.held.has(code)) return this.hasBinding(code) && this.enabled && !this.editing;
    this.held.delete(code);
    this.controls.forEach((c, i) => {
      if (c.type === 'dpad' && Object.values(c.keys).includes(code)) this.updateDpad(c);
      if (c.key !== code) return;
      if (c.type === 'tap' || c.type === 'fire') {
        const id = this.slotOf.get(i + ':k');
        if (id != null) { this.send(id, c.x, c.y, false); this.freeSlot(i + ':k'); }
      } else if (c.type === 'repeat') {
        clearInterval(this.timers.get(i));
        this.timers.delete(i);
      }
    });
    return true;
  }

  // Кнопки мыши участвуют в раскладке только в режиме обзора.
  mouseDown(btn) { return this.aim ? (this.keyDown('MOUSE' + btn), true) : false; }
  mouseUp(btn) { return this.aim ? (this.keyUp('MOUSE' + btn), true) : false; }

  updateDpad(c) {
    const k = c.keys;
    let dx = 0; let dy = 0;
    if (this.held.has(k.up)) dy -= 1;
    if (this.held.has(k.down)) dy += 1;
    if (this.held.has(k.left)) dx -= 1;
    if (this.held.has(k.right)) dx += 1;
    const { w, h: hh } = this.viewSize();
    if (!dx && !dy) {
      if (this.dpadOn) { this.send(2, c.x, c.y, false); this.dpadOn = false; }
      return;
    }
    const len = Math.hypot(dx, dy);
    const u = c.x + (dx / len) * c.r * (hh / w);
    const v = c.y + (dy / len) * c.r;
    if (!this.dpadOn) {
      this.dpadOn = true;
      this.send(2, c.x, c.y, true);
      setTimeout(() => { if (this.dpadOn) this.updateDpad(c); }, 30);
      return;
    }
    this.send(2, u, v, true);
  }

  async swipe(c, i) {
    const id = this.takeSlot(i + ':s');
    if (id == null) return;
    const steps = 8;
    this.send(id, c.x, c.y, true);
    for (let s = 1; s <= steps; s++) {
      await sleep(14);
      this.send(id, c.x + (c.x2 - c.x) * (s / steps), c.y + (c.y2 - c.y) * (s / steps), true);
    }
    await sleep(20);
    this.send(id, c.x2, c.y2, false);
    this.freeSlot(i + ':s');
  }

  enterAim(c) {
    this.aim = { c, u: c.x, v: c.y, recentering: false };
    this.surface.requestPointerLock();
    this.send(1, c.x, c.y, true);
    this.render();
    this.emit();
  }

  exitAim() {
    const a = this.aim;
    this.aim = null;
    if (a) this.send(1, a.u, a.v, false);
    for (const [k, id] of [...this.slotOf]) {
      const c = this.controlForSlotKey(k);
      if (c && c.type === 'fire') { this.send(id, c.x, c.y, false); this.freeSlot(k); }
    }
    if (document.pointerLockElement === this.surface) document.exitPointerLock();
    this.render();
    this.emit();
  }

  mouseMove(dx, dy) {
    const a = this.aim;
    if (!a || a.recentering) return;
    const { w, h: hh } = this.viewSize();
    const sens = (this.getInst().mouseSensitivity || 1) * 0.9;
    a.u += (dx * sens) / w;
    a.v += (dy * sens) / hh;
    const dist = Math.hypot((a.u - a.c.x) * (w / hh), a.v - a.c.y);
    if (dist > a.c.r || a.u <= 0.01 || a.u >= 0.99 || a.v <= 0.01 || a.v >= 0.99) {
      // Отпускаем палец и ставим заново в центр зоны обзора.
      a.recentering = true;
      this.send(1, a.u, a.v, false);
      setTimeout(() => {
        if (this.aim !== a) return;
        a.u = a.c.x; a.v = a.c.y;
        this.send(1, a.u, a.v, true);
        a.recentering = false;
      }, 12);
      return;
    }
    this.send(1, a.u, a.v, true);
  }

  // ---------- отображение ----------
  render() {
    const o = this.overlay;
    o.innerHTML = '';
    const inst = this.getInst();
    o.classList.toggle('editing', this.editing);
    if (!this.editing && (!inst.showKeyHints || !this.enabled)) return;
    o.style.setProperty('--km-opacity', this.editing ? 1 : inst.overlayOpacity);
    const { h: hh } = this.viewSize();
    this.controls.forEach((c, i) => {
      const sel = this.selected && this.selected.index === i;
      const base = { left: c.x * 100 + '%', top: c.y * 100 + '%' };
      if (c.type === 'dpad') {
        const d = c.r * 2 * hh;
        const part = (name, style) => h('div', {
          class: 'km-key km-sub' + (sel && this.selected.part === name ? ' waiting' : ''), style,
          onpointerdown: (e) => { if (this.editing) { e.stopPropagation(); this.select(i, name); } },
        }, keyLabel(c.keys[name]));
        o.append(h('div', { class: 'km-ctl km-dpad' + (sel ? ' sel' : ''), 'data-i': i, style: { ...base, width: d + 'px', height: d + 'px' } },
          part('up', { left: '50%', top: '0' }), part('down', { left: '50%', top: '100%' }),
          part('left', { left: '0', top: '50%' }), part('right', { left: '100%', top: '50%' }),
          h('div', { class: 'km-stick' })));
      } else if (c.type === 'aim') {
        const d = c.r * 2 * hh;
        o.append(h('div', { class: 'km-ctl km-aim' + (sel ? ' sel' : '') + (this.aim ? ' active' : ''), 'data-i': i, style: { ...base, width: d + 'px', height: d + 'px' } },
          h('div', { class: 'km-key' + (sel && this.selected.part === 'key' ? ' waiting' : '') }, keyLabel(c.key)),
          h('div', { class: 'km-aim-ic', html: ICONS.scope })));
      } else if (c.type === 'swipe') {
        o.append(h('div', { class: 'km-swipe-line', style: lineStyle(c, this.viewSize()) }));
        o.append(h('div', { class: 'km-ctl km-tap km-swipe-end' + (sel ? ' sel' : ''), 'data-i': i, 'data-part': 'end', style: { left: c.x2 * 100 + '%', top: c.y2 * 100 + '%' } }, '•'));
        o.append(h('div', { class: 'km-ctl km-tap' + (sel ? ' sel waiting' : ''), 'data-i': i, style: base }, keyLabel(c.key), h('i', { html: ICONS.swipe })));
      } else {
        o.append(h('div', {
          class: `km-ctl km-tap km-${c.type}` + (sel ? ' sel waiting' : '') + (c.type === 'fire' && !this.editing && !this.aim ? ' dim' : ''),
          'data-i': i, style: base,
        }, keyLabel(c.key), c.type === 'repeat' && h('i', { html: ICONS.repeat }), c.type === 'fire' && h('i', { html: ICONS.fire })));
      }
    });
    if (this.aim && !this.editing) o.append(h('div', { class: 'km-aim-banner' }, `Режим обзора · ${keyLabel(this.aim.c.key)} или Esc — выход`));
  }

  // ---------- редактор ----------
  startEdit() {
    this.releaseAll();
    this.editing = true;
    this.backup = clone(this.controls);
    this.render();
    this.bindEditor();
    this.emit();
  }

  stopEdit(save) {
    if (!save && this.backup) this.controls = this.backup;
    this.editing = false;
    this.selected = null;
    this.unbindEditor();
    this.render();
    this.emit();
  }

  add(type) {
    const n = this.controls.filter((c) => c.type === type).length;
    const off = (n % 5) * 0.04;
    const c = { type, x: 0.5 + off, y: 0.5 + off };
    if (type === 'dpad') Object.assign(c, { keys: { up: 'KeyW', left: 'KeyA', down: 'KeyS', right: 'KeyD' }, x: 0.17, y: 0.72, r: 0.13 });
    if (type === 'aim') Object.assign(c, { key: 'Backquote', x: 0.68, y: 0.45, r: 0.18 });
    if (type === 'fire') Object.assign(c, { key: 'MOUSE0', x: 0.85, y: 0.62 });
    if (type === 'tap') c.key = null;
    if (type === 'repeat') Object.assign(c, { key: null, interval: 90 });
    if (type === 'swipe') Object.assign(c, { key: null, x2: c.x + 0.15, y2: c.y });
    this.controls.push(c);
    this.select(this.controls.length - 1, type === 'dpad' ? 'up' : 'key');
  }

  select(index, part = 'key') {
    this.selected = index == null ? null : { index, part };
    this.render();
    this.emit();
  }

  removeSelected() {
    if (!this.selected) return;
    this.controls.splice(this.selected.index, 1);
    this.selected = null;
    this.render();
    this.emit();
  }

  assign(code) {
    if (!this.selected) return false;
    const c = this.controls[this.selected.index];
    if (!c) return false;
    if (c.type === 'dpad') {
      c.keys[this.selected.part] = code;
      const order = ['up', 'left', 'down', 'right'];
      const next = order[order.indexOf(this.selected.part) + 1];
      this.selected = next ? { index: this.selected.index, part: next } : null;
    } else {
      c.key = code;
      this.selected = null;
    }
    this.render();
    this.emit();
    return true;
  }

  bindEditor() {
    const o = this.overlay;
    let drag = null;
    this.onDown = (e) => {
      const el = e.target.closest('.km-ctl');
      if (!el) { this.select(null); return; }
      const i = Number(el.dataset.i);
      const part = el.dataset.part || null;
      const c = this.controls[i];
      if (!this.selected || this.selected.index !== i) this.select(i, c.type === 'dpad' ? 'up' : 'key');
      drag = { i, part, sx: e.clientX, sy: e.clientY, ox: part === 'end' ? c.x2 : c.x, oy: part === 'end' ? c.y2 : c.y };
      o.setPointerCapture(e.pointerId);
    };
    this.onMove = (e) => {
      if (!drag) return;
      const r = o.getBoundingClientRect();
      const c = this.controls[drag.i];
      const nx = clamp(drag.ox + (e.clientX - drag.sx) / r.width, 0, 1);
      const ny = clamp(drag.oy + (e.clientY - drag.sy) / r.height, 0, 1);
      if (drag.part === 'end') { c.x2 = nx; c.y2 = ny; } else {
        if (c.type === 'swipe') { c.x2 += nx - c.x; c.y2 += ny - c.y; }
        c.x = nx; c.y = ny;
      }
      this.render();
    };
    this.onUp = () => { if (drag) { drag = null; this.emit(); } };
    this.onWheel = (e) => {
      const el = e.target.closest('.km-dpad, .km-aim');
      if (!el) return;
      e.preventDefault();
      const c = this.controls[Number(el.dataset.i)];
      c.r = clamp(c.r * (e.deltaY < 0 ? 1.07 : 0.93), 0.05, 0.45);
      this.render();
    };
    o.addEventListener('pointerdown', this.onDown);
    o.addEventListener('pointermove', this.onMove);
    o.addEventListener('pointerup', this.onUp);
    o.addEventListener('wheel', this.onWheel, { passive: false });
    // Назначение кнопки мыши: ПКМ/СКМ по выделенному элементу.
    this.onMouseAssign = (e) => {
      if (!this.selected || e.button === 0) return;
      if (!e.target.closest('.km-ctl')) return;
      e.preventDefault();
      this.assign('MOUSE' + e.button);
    };
    o.addEventListener('mousedown', this.onMouseAssign);
    this.onCtx = (e) => e.preventDefault();
    o.addEventListener('contextmenu', this.onCtx);
  }

  unbindEditor() {
    const o = this.overlay;
    if (!this.onDown) return;
    o.removeEventListener('pointerdown', this.onDown);
    o.removeEventListener('pointermove', this.onMove);
    o.removeEventListener('pointerup', this.onUp);
    o.removeEventListener('wheel', this.onWheel);
    o.removeEventListener('mousedown', this.onMouseAssign);
    o.removeEventListener('contextmenu', this.onCtx);
    this.onDown = null;
  }
}

function lineStyle(c, { w, h: hh }) {
  const dx = (c.x2 - c.x) * w;
  const dy = (c.y2 - c.y) * hh;
  return {
    left: c.x * 100 + '%', top: c.y * 100 + '%', width: Math.hypot(dx, dy) + 'px',
    transform: `rotate(${Math.atan2(dy, dx)}rad)`,
  };
}

module.exports = { KeymapEngine, TYPES, TEMPLATES, keyLabel };
