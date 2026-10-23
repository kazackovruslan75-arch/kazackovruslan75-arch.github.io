// Быстрая проверка: синтаксис всех модулей и разбор XML-репозитория SDK.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = ['main.js', ...['src', 'renderer', 'scripts'].flatMap((d) =>
  fs.readdirSync(path.join(root, d)).filter((f) => f.endsWith('.js')).map((f) => path.join(d, f)))];
for (const f of files) execFileSync(process.execPath, ['--check', path.join(root, f)]);

const { pickArchive } = require('../src/sdk');
const xml = `<sdk:sdk-repository xmlns:sdk="x"><channel id="channel-0">stable</channel><channel id="channel-1">beta</channel>
<remotePackage path="emulator"><revision><major>35</major><minor>1</minor></revision><channelRef ref="channel-0"/><archives>
<archive><complete><size>1</size><checksum type="sha1">aa</checksum><url>emu-linux.zip</url></complete><host-os>linux</host-os></archive>
<archive><complete><size>1</size><checksum type="sha1">bb</checksum><url>emu-windows.zip</url></complete><host-os>windows</host-os></archive>
</archives></remotePackage>
<remotePackage path="emulator"><revision><major>36</major></revision><channelRef ref="channel-1"/><archives>
<archive><complete><size>1</size><checksum type="sha1">cc</checksum><url>emu-beta.zip</url></complete></archive></archives></remotePackage>
</sdk:sdk-repository>`;
const a = pickArchive(xml, 'emulator', 'https://example/');
const want = process.platform === 'win32' ? 'https://example/emu-windows.zip' : 'https://example/emu-linux.zip';
if (a.url !== want) throw new Error(`pickArchive: ожидалось ${want}, получено ${a.url}`);
console.log(`OK: ${files.length} файлов, разбор репозитория SDK работает`);
