// Установка компонентов Android SDK без Java/sdkmanager:
// читаем официальные XML-репозитории Google, скачиваем архивы, проверяем SHA-1 и распаковываем.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { XMLParser } = require('fast-xml-parser');
const extractZip = require('extract-zip');

const REPO_BASE = 'https://dl.google.com/android/repository/';
const MAIN_REPO = REPO_BASE + 'repository2-3.xml';
const SYSIMG_REPO = (tag) => `${REPO_BASE}sys-img/${tag}/sys-img2-3.xml`;

const IS_WIN = process.platform === 'win32';
const EXE = IS_WIN ? '.exe' : '';
const HOST_OS = IS_WIN ? 'windows' : process.platform === 'darwin' ? 'macosx' : 'linux';

// Образы, которые предлагаются пользователю.
const IMAGES = [
  {
    path: 'system-images;android-30;google_apis_playstore;x86_64',
    title: 'Android 11 · x64 + x32 · Google Play',
    note: 'Рекомендуется: 64- и 32-битные приложения (x86_64, x86, arm64-v8a, armeabi-v7a через трансляцию ARM)',
    api: 30, abi: 'x86_64', recommended: true,
  },
  {
    path: 'system-images;android-30;google_apis_playstore;x86',
    title: 'Android 11 · x32 · Google Play',
    note: 'Только 32-битные приложения (x86, armeabi-v7a). Меньше памяти, для слабых ПК',
    api: 30, abi: 'x86',
  },
  {
    path: 'system-images;android-33;google_apis_playstore;x86_64',
    title: 'Android 13 · x64 · Google Play',
    note: 'Новее, ARM-трансляция только для 64-битных ARM-приложений',
    api: 33, abi: 'x86_64',
  },
  {
    path: 'system-images;android-34;google_apis_playstore;x86_64',
    title: 'Android 14 · x64 · Google Play',
    note: 'Самая новая версия, нужен мощный ПК',
    api: 34, abi: 'x86_64',
  },
];

function imageInfo(pkgPath) {
  const known = IMAGES.find((i) => i.path === pkgPath);
  if (known) return known;
  const [, platform, tag, abi] = pkgPath.split(';');
  return { path: pkgPath, title: pkgPath, api: Number(String(platform).replace('android-', '')) || 0, abi, tag };
}

function pkgDir(sdk, pkgPath) {
  return path.join(sdk, ...pkgPath.split(';'));
}

function tools(sdk) {
  return {
    emulator: path.join(sdk, 'emulator', 'emulator' + EXE),
    adb: path.join(sdk, 'platform-tools', 'adb' + EXE),
    proto: path.join(sdk, 'emulator', 'lib', 'emulator_controller.proto'),
  };
}

function candidateSdkPaths() {
  const list = [];
  for (const k of ['ANDROID_SDK_ROOT', 'ANDROID_HOME']) if (process.env[k]) list.push(process.env[k]);
  if (IS_WIN) {
    if (process.env.LOCALAPPDATA) list.push(path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'));
  } else {
    list.push(path.join(os.homedir(), 'Android', 'Sdk'));
    list.push(path.join(os.homedir(), 'Library', 'Android', 'sdk'));
  }
  return [...new Set(list)];
}

function status(sdk, imagePath) {
  if (!sdk) return { emulator: false, adb: false, image: false };
  const t = tools(sdk);
  const imgDir = imagePath ? pkgDir(sdk, imagePath) : null;
  return {
    emulator: fs.existsSync(t.emulator),
    adb: fs.existsSync(t.adb),
    image: imgDir ? fs.existsSync(path.join(imgDir, 'system.img')) : false,
  };
}

function detectExisting() {
  return candidateSdkPaths().filter((p) => {
    const s = status(p);
    return s.emulator && s.adb;
  });
}

// ---------- репозиторий ----------

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  removeNSPrefix: true,
  isArray: (name) => ['remotePackage', 'archive', 'channel'].includes(name),
});

async function fetchText(fetchFn, url) {
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} при загрузке ${url}`);
  return res.text();
}

function revisionNum(r) {
  if (!r) return 0;
  return (Number(r.major) || 0) * 1e8 + (Number(r.minor) || 0) * 1e4 + (Number(r.micro) || 0);
}

// Находит архив пакета для текущей ОС на стабильном канале.
function pickArchive(xml, pkgPath, baseUrl) {
  const root = parser.parse(xml);
  const repo = root['sdk-repository'] || root['sdk-sys-img'] || Object.values(root).find((v) => v && v.remotePackage);
  if (!repo) throw new Error('Неизвестный формат репозитория');
  const channels = {};
  for (const c of repo.channel || []) channels[c['@id']] = String(c['#text'] || c).trim();
  const stableIds = Object.keys(channels).filter((k) => channels[k] === 'stable');
  const candidates = (repo.remotePackage || []).filter((p) => p['@path'] === pkgPath);
  let best = null;
  for (const p of candidates) {
    const ch = p.channelRef && p.channelRef['@ref'];
    if (ch && stableIds.length && !stableIds.includes(ch)) continue;
    for (const a of (p.archives && p.archives.archive) || []) {
      const hostOs = a['host-os'];
      const hostArch = a['host-arch'];
      if (hostOs && hostOs !== HOST_OS) continue;
      if (hostArch && !['x64', 'x86_64'].includes(hostArch)) continue;
      const c = a.complete;
      if (!c || !c.url) continue;
      const rev = revisionNum(p.revision);
      if (!best || rev > best.rev) {
        const sum = c.checksum;
        best = {
          rev,
          url: /^https?:/.test(c.url) ? c.url : baseUrl + c.url,
          size: Number(c.size) || 0,
          sha1: typeof sum === 'object' ? sum['#text'] : sum,
          name: p['display-name'] || pkgPath,
        };
      }
    }
  }
  if (!best) throw new Error(`Пакет ${pkgPath} не найден для ${HOST_OS}`);
  return best;
}

async function download(fetchFn, url, dest, size, onProgress, signal) {
  const res = await fetchFn(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status} при загрузке ${url}`);
  const total = Number(res.headers.get('content-length')) || size || 0;
  const out = fs.createWriteStream(dest);
  const hash = crypto.createHash('sha1');
  const reader = res.body.getReader();
  let done = 0;
  let last = 0;
  try {
    for (;;) {
      const { value, done: end } = await reader.read();
      if (end) break;
      const buf = Buffer.from(value);
      hash.update(buf);
      done += buf.length;
      if (!out.write(buf)) await new Promise((r) => out.once('drain', r));
      const now = Date.now();
      if (now - last > 200) { last = now; onProgress(done, total); }
    }
  } finally {
    await new Promise((r) => out.end(r));
  }
  onProgress(done, total);
  return hash.digest('hex');
}

function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }); }

// Устанавливает один пакет в sdk/<путь пакета>.
async function installPackage({ sdk, pkgPath, repoUrl, fetchFn, onProgress, signal }) {
  const baseUrl = repoUrl.slice(0, repoUrl.lastIndexOf('/') + 1);
  const xml = await fetchText(fetchFn, repoUrl);
  const arc = pickArchive(xml, pkgPath, baseUrl);
  const tmpDir = path.join(sdk, '.downloads');
  fs.mkdirSync(tmpDir, { recursive: true });
  const zip = path.join(tmpDir, path.basename(new URL(arc.url).pathname));
  onProgress({ phase: 'download', name: arc.name, done: 0, total: arc.size });
  const sha1 = await download(fetchFn, arc.url, zip, arc.size,
    (done, total) => onProgress({ phase: 'download', name: arc.name, done, total }), signal);
  if (arc.sha1 && sha1.toLowerCase() !== String(arc.sha1).toLowerCase()) {
    rmrf(zip);
    throw new Error(`Контрольная сумма не совпала для ${arc.name}`);
  }
  onProgress({ phase: 'extract', name: arc.name });
  const target = pkgDir(sdk, pkgPath);
  const staging = target + '.partial';
  rmrf(staging);
  fs.mkdirSync(staging, { recursive: true });
  await extractZip(zip, { dir: staging });
  // В архиве один каталог верхнего уровня (emulator/, platform-tools/, x86_64/ ...).
  const entries = fs.readdirSync(staging);
  const inner = entries.length === 1 && fs.statSync(path.join(staging, entries[0])).isDirectory()
    ? path.join(staging, entries[0]) : staging;
  rmrf(target);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.renameSync(inner, target);
  rmrf(staging);
  rmrf(zip);
  if (!IS_WIN) {
    for (const f of ['emulator', 'emulator-check', 'qemu/linux-x86_64/qemu-system-x86_64', 'adb', 'fastboot']) {
      const p = path.join(target, f);
      if (fs.existsSync(p)) fs.chmodSync(p, 0o755);
    }
  }
  fs.writeFileSync(path.join(target, '.idroid-package'), JSON.stringify({ path: pkgPath, url: arc.url }));
}

async function installAll({ sdk, imagePath, fetchFn, onProgress, signal, force = false }) {
  fs.mkdirSync(sdk, { recursive: true });
  // Эмулятор проверяет корректность SDK по наличию этих каталогов.
  fs.mkdirSync(path.join(sdk, 'platforms'), { recursive: true });
  const st = status(sdk, imagePath);
  const tag = imagePath.split(';')[2];
  const jobs = [];
  if (force || !st.adb) jobs.push({ pkgPath: 'platform-tools', repoUrl: MAIN_REPO });
  if (force || !st.emulator) jobs.push({ pkgPath: 'emulator', repoUrl: MAIN_REPO });
  if (force || !st.image) jobs.push({ pkgPath: imagePath, repoUrl: SYSIMG_REPO(tag) });
  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i];
    await installPackage({
      sdk, ...j, fetchFn, signal,
      onProgress: (p) => onProgress({ ...p, step: i + 1, steps: jobs.length }),
    });
  }
  onProgress({ phase: 'done' });
}

module.exports = {
  IMAGES, imageInfo, pkgDir, tools, status, detectExisting, installAll, pickArchive, IS_WIN, EXE,
};
