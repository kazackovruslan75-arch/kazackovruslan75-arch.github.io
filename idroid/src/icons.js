// Иконки и названия приложений из Google Play (кэшируются на диске).
const fs = require('fs');
const path = require('path');

class IconCache {
  constructor(dir, fetchFn) {
    this.file = path.join(dir, 'icon-cache.json');
    this.fetch = fetchFn;
    this.pending = new Map();
    try { this.data = JSON.parse(fs.readFileSync(this.file, 'utf8')); } catch (_) { this.data = {}; }
  }

  save() {
    clearTimeout(this.t);
    this.t = setTimeout(() => {
      try { fs.writeFileSync(this.file, JSON.stringify(this.data)); } catch (_) { /* ignore */ }
    }, 500);
  }

  async lookup(pkg) {
    const cached = this.data[pkg];
    // Неудачные запросы повторяем не чаще раза в сутки.
    if (cached && (cached.icon || Date.now() - cached.at < 86400000)) return cached;
    if (this.pending.has(pkg)) return this.pending.get(pkg);
    const job = this.fetchPlay(pkg)
      .catch(() => ({ icon: null, label: null }))
      .then((r) => {
        this.data[pkg] = { ...r, at: Date.now() };
        this.save();
        this.pending.delete(pkg);
        return this.data[pkg];
      });
    this.pending.set(pkg, job);
    return job;
  }

  async fetchPlay(pkg) {
    const res = await this.fetch(`https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}&hl=ru`);
    if (!res.ok) return { icon: null, label: null };
    const html = await res.text();
    const unesc = (s) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
    let label = null;
    const t = html.match(/<meta property="og:title" content="([^"]+)"/) || html.match(/<title[^>]*>([^<]+)<\/title>/);
    if (t) label = unesc(t[1]).split(/\s[–-]\s(?:Apps|Приложения)/)[0].trim();
    let src = null;
    const img = html.match(/<img[^>]+itemprop="image"[^>]+src="([^"]+)"/) || html.match(/<img[^>]+src="([^"]+)"[^>]+itemprop="image"/);
    if (img) src = img[1];
    if (!src) {
      const og = html.match(/<meta property="og:image" content="([^"]+)"/);
      if (og) src = og[1];
    }
    let icon = null;
    if (src) {
      src = unesc(src).replace(/=[swh]\d+[^/]*$/, '') + '=s192';
      const ir = await this.fetch(src);
      if (ir.ok) {
        const buf = Buffer.from(await ir.arrayBuffer());
        icon = `data:${ir.headers.get('content-type') || 'image/png'};base64,${buf.toString('base64')}`;
      }
    }
    return { icon, label };
  }
}

module.exports = { IconCache };
