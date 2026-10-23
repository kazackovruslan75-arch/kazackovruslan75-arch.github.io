// Домашний экран в стиле iOS поверх Android: сетка иконок, док, поиск, строка состояния.
const path = require('path');
const { h, ICONS, ipc, toast, confirmBox } = require(path.join(__dirname, 'ui.js'));
const { appIcon, hashColor } = require(path.join(__dirname, 'glyphs.js'));
const { WALLPAPERS } = require(path.join(__dirname, 'settings.js'));

const HIDDEN = new Set([
  'com.android.launcher3', 'com.google.android.apps.nexuslauncher', 'com.android.emulator.smoketests',
  'com.google.android.apps.wallpaper', 'com.android.development', 'com.android.dev.tools',
]);

function humanize(pkg) {
  const parts = pkg.split('.').filter((p) => !['com', 'org', 'net', 'android', 'google', 'apps', 'app', 'mobile', 'ru', 'io'].includes(p));
  const s = (parts[parts.length - 1] || pkg).replace(/[_-]+/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

class Springboard {
  constructor({ root, instId, getUi, saveUi, onLaunch, onVisible }) {
    this.root = root;
    this.instId = instId;
    this.getUi = getUi;
    this.saveUi = saveUi;
    this.onLaunch = onLaunch;
    this.onVisible = onVisible || (() => {});
    this.apps = [];
    this.meta = {};
    this.visible = false;
    this.page = 0;
    this.query = '';
    this.lastRefresh = 0;
    this.launcherPkg = null;
    this.clock = setInterval(() => this.tick(), 10000);
    root.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  adb(cmd) { return ipc('adb', this.instId, ['shell', cmd], { timeout: 20000 }); }

  async detectLauncher() {
    try {
      const out = await this.adb('cmd package resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.HOME');
      const m = out.trim().split(/\r?\n/).pop().match(/^([\w.]+)\//);
      if (m) this.launcherPkg = m[1];
    } catch (_) { /* ignore */ }
    return this.launcherPkg;
  }

  async refresh(force = false) {
    if (!force && Date.now() - this.lastRefresh < 8000) return;
    this.lastRefresh = Date.now();
    let out = '';
    try {
      out = await this.adb('cmd package query-activities --brief -a android.intent.action.MAIN -c android.intent.category.LAUNCHER; echo ===; pm list packages -3');
    } catch (_) { return; }
    const [acts, users] = out.split('===');
    const userPkgs = new Set((users || '').split(/\r?\n/).map((l) => l.replace(/^package:/, '').trim()).filter(Boolean));
    const seen = new Set();
    const apps = [];
    for (const line of acts.split(/\r?\n/)) {
      const m = line.trim().match(/^([\w.]+)\/([\w.$]+)$/);
      if (!m || seen.has(m[1]) || HIDDEN.has(m[1]) || m[1] === this.launcherPkg) continue;
      seen.add(m[1]);
      const act = m[2].startsWith('.') ? m[1] + m[2] : m[2];
      apps.push({ pkg: m[1], activity: act, user: userPkgs.has(m[1]) });
    }
    this.apps = apps;
    this.render();
    // Иконки и названия из Google Play — в фоне.
    const need = apps.map((a) => a.pkg).filter((p) => !this.meta[p]);
    if (need.length) {
      ipc('icons:lookup', need).then((res) => {
        Object.assign(this.meta, res);
        this.render();
      }).catch(() => {});
    }
  }

  label(a) {
    const sys = appIcon(a.pkg);
    if (sys && sys.label) return sys.label;
    const m = this.meta[a.pkg];
    return (m && m.label) || humanize(a.pkg);
  }

  iconEl(a, size) {
    const ui = this.getUi();
    const sys = appIcon(a.pkg);
    const m = this.meta[a.pkg];
    const box = h('div', { class: 'sb-icon', style: { width: size + 'px', height: size + 'px' } });
    if (sys && (ui.iosSystemIcons || !(m && m.icon))) {
      box.style.background = sys.bg;
      if (sys.calendar) {
        box.style.fontSize = size * 0.17 + 'px';
        const d = new Date();
        box.append(h('div', { class: 'sb-cal' },
          h('div', { class: 'sb-cal-day' }, d.toLocaleDateString('ru-RU', { weekday: 'short' })),
          h('div', { class: 'sb-cal-num' }, String(d.getDate()))));
      } else box.innerHTML = sys.svg;
    } else if (m && m.icon) {
      box.append(h('img', { src: m.icon, draggable: 'false' }));
      box.classList.add('img');
    } else {
      box.style.background = hashColor(a.pkg);
      box.append(h('span', { class: 'sb-letter', style: { fontSize: size * 0.46 + 'px' } }, this.label(a).charAt(0).toUpperCase()));
    }
    return box;
  }

  show() {
    if (!this.getUi().iosHome) return;
    if (!this.visible) {
      this.visible = true;
      this.root.classList.add('show');
      this.onVisible(true);
      this.render();
    }
    this.refresh();
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;
    this.query = '';
    this.root.classList.remove('show');
    this.onVisible(false);
  }

  tick() {
    const t = this.root.querySelector('.sb-time');
    if (t) t.textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  launch(a, el) {
    if (el) {
      const r = el.getBoundingClientRect();
      const pr = this.root.getBoundingClientRect();
      this.root.style.setProperty('--ox', `${r.left + r.width / 2 - pr.left}px`);
      this.root.style.setProperty('--oy', `${r.top + r.height / 2 - pr.top}px`);
    }
    this.root.classList.add('launching');
    setTimeout(() => { this.root.classList.remove('launching'); this.hide(); }, 260);
    this.onLaunch(a);
  }

  menu(a, e) {
    this.closeMenu();
    const ui = this.getUi();
    const inDock = ui.dock.includes(a.pkg);
    const pr = this.root.getBoundingClientRect();
    const items = [
      [inDock ? 'Убрать из Dock' : 'Добавить в Dock', ICONS.pin, () => {
        const dock = inDock ? ui.dock.filter((p) => p !== a.pkg) : [...ui.dock.filter((p) => p !== a.pkg), a.pkg].slice(-6);
        this.saveUi({ dock });
      }],
      ['О приложении', ICONS.info, () => this.adb(`am start -a android.settings.APPLICATION_DETAILS_SETTINGS -d package:${a.pkg}`).then(() => this.hide())],
      ['Остановить', ICONS.stop, () => this.adb(`am force-stop ${a.pkg}`).then(() => toast(`${this.label(a)} остановлено`))],
      a.user && ['Удалить приложение', ICONS.trash, async () => {
        if (!(await confirmBox(`Удалить «${this.label(a)}»?`, 'Приложение и его данные будут удалены.', 'Удалить', true))) return;
        try {
          await ipc('adb', this.instId, ['uninstall', a.pkg]);
          toast('Приложение удалено');
          this.refresh(true);
        } catch (err) { toast(err.message, 'err'); }
      }, true],
    ].filter(Boolean);
    const m = h('div', { class: 'sb-menu', style: { left: Math.min(e.clientX - pr.left, pr.width - 230) + 'px', top: Math.min(e.clientY - pr.top, pr.height - 200) + 'px' } },
      h('div', { class: 'sb-menu-title' }, this.label(a)),
      items.map(([t, ic, fn, danger]) => h('div', { class: 'sb-menu-item' + (danger ? ' danger' : ''), onclick: () => { this.closeMenu(); fn(); } }, h('span', {}, t), h('i', { html: ic }))));
    this.root.append(m);
    this.root.classList.add('menu-open');
    setTimeout(() => document.addEventListener('mousedown', this.menuCloser = (ev) => { if (!m.contains(ev.target)) this.closeMenu(); }), 0);
  }

  closeMenu() {
    const m = this.root.querySelector('.sb-menu');
    if (m) m.remove();
    this.root.classList.remove('menu-open');
    if (this.menuCloser) document.removeEventListener('mousedown', this.menuCloser);
  }

  appTile(a, size, withLabel = true) {
    const tile = h('div', {
      class: 'sb-app', title: a.pkg,
      onclick: (e) => this.launch(a, e.currentTarget.querySelector('.sb-icon')),
      oncontextmenu: (e) => { e.preventDefault(); this.menu(a, e); },
    }, this.iconEl(a, size));
    if (withLabel) tile.append(h('div', { class: 'sb-label', style: { fontSize: Math.max(10, size * 0.18) + 'px', maxWidth: size * 1.35 + 'px' } }, this.label(a)));
    return tile;
  }

  render() {
    if (!this.visible) return;
    const ui = this.getUi();
    const R = this.root;
    const W = R.clientWidth || 800;
    const H = R.clientHeight || 600;
    R.style.background = WALLPAPERS[ui.wallpaper] || WALLPAPERS.aurora;
    R.innerHTML = '';
    const landscape = W > H;
    const scale = Math.min(W, H);
    const size = Math.round(Math.max(40, Math.min(92, scale * (landscape ? 0.115 : 0.15))));
    const statusH = Math.max(22, scale * 0.045);
    const dockH = size + size * 0.5;
    const cellW = size * 1.75;
    const cellH = size * 1.62;
    const cols = Math.max(3, Math.min(landscape ? 8 : 5, Math.floor((W - 40) / cellW)));
    const rows = Math.max(2, Math.floor((H - statusH - dockH - 70) / cellH));
    const perPage = cols * rows;

    // Строка состояния
    R.append(h('div', { class: 'sb-status', style: { height: statusH + 'px', fontSize: statusH * 0.6 + 'px' } },
      h('span', { class: 'sb-time' }, new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })),
      h('span', { class: 'sb-status-r' }, h('i', { html: ICONS.signal }), h('i', { html: ICONS.wifi }), h('i', { class: 'bat', html: ICONS.battery }))));

    const dockPkgs = ui.dock.filter((p) => this.apps.some((a) => a.pkg === p));
    const q = this.query.trim().toLowerCase();
    let list = this.apps.filter((a) => !dockPkgs.includes(a.pkg));
    list.sort((a, b) => Number(a.user) - Number(b.user) || this.label(a).localeCompare(this.label(b), 'ru'));
    if (q) list = this.apps.filter((a) => this.label(a).toLowerCase().includes(q) || a.pkg.includes(q));

    const pagesCount = Math.max(1, Math.ceil(list.length / perPage));
    this.page = Math.min(this.page, pagesCount - 1);
    const pages = h('div', { class: 'sb-pages' });
    for (let p = 0; p < pagesCount; p++) {
      const grid = h('div', { class: 'sb-grid', style: { gridTemplateColumns: `repeat(${cols}, ${cellW}px)`, gridAutoRows: cellH + 'px' } });
      for (const a of list.slice(p * perPage, (p + 1) * perPage)) grid.append(this.appTile(a, size));
      pages.append(h('div', { class: 'sb-page' }, grid));
    }
    pages.addEventListener('scroll', () => {
      const np = Math.round(pages.scrollLeft / pages.clientWidth);
      if (np !== this.page) { this.page = np; R.querySelectorAll('.sb-dots i').forEach((d, i) => d.classList.toggle('on', i === np)); }
    });
    pages.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      e.preventDefault();
      const np = Math.max(0, Math.min(pagesCount - 1, this.page + (e.deltaY > 0 ? 1 : -1)));
      pages.scrollTo({ left: np * pages.clientWidth, behavior: 'smooth' });
    }, { passive: false });
    R.append(pages);
    requestAnimationFrame(() => { pages.scrollLeft = this.page * pages.clientWidth; });

    if (!this.apps.length) {
      pages.append(h('div', { class: 'sb-empty' }, 'Загрузка приложений…'));
    }

    // Поиск + точки страниц
    const search = h('input', { class: 'sb-search', placeholder: 'Поиск', value: this.query, spellcheck: 'false' });
    search.addEventListener('input', () => {
      this.query = search.value;
      this.render();
      const s = this.root.querySelector('.sb-search');
      s.focus();
      s.setSelectionRange(s.value.length, s.value.length);
    });
    search.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && list[0]) this.launch(list[0]);
      if (e.key === 'Escape') { this.query = ''; this.render(); }
    });
    R.append(h('div', { class: 'sb-mid', style: { bottom: dockH + 18 + 'px' } },
      pagesCount > 1 && !q ? h('div', { class: 'sb-dots' }, Array.from({ length: pagesCount }, (_, i) => h('i', {
        class: i === this.page ? 'on' : '',
        onclick: () => pages.scrollTo({ left: i * pages.clientWidth, behavior: 'smooth' }),
      }))) : null,
      h('label', { class: 'sb-search-wrap' }, h('i', { html: ICONS.search }), search)));

    // Док
    const dock = h('div', { class: 'sb-dock', style: { height: dockH + 'px', padding: `0 ${size * 0.3}px`, gap: size * 0.38 + 'px' } });
    for (const p of dockPkgs) dock.append(this.appTile(this.apps.find((a) => a.pkg === p), size, false));
    if (!dockPkgs.length) dock.append(h('div', { class: 'sb-dock-hint' }, 'ПКМ по иконке → «Добавить в Dock»'));
    R.append(dock);
  }
}

module.exports = { Springboard };
