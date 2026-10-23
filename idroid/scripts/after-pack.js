// electron-builder afterPack: на Linux запускаем приложение через скрипт-обёртку с --no-sandbox.
// Иначе AppImage падает сразу при старте в Ubuntu 23.10+ (AppArmor запрещает песочницу Chromium)
// и при запуске от root. Флаг нужно передать в командной строке — из JS уже поздно.
const fs = require('fs');
const path = require('path');

exports.default = async function afterPack(ctx) {
  if (ctx.electronPlatformName !== 'linux') return;
  const name = ctx.packager.executableName;
  const bin = path.join(ctx.appOutDir, name);
  const real = bin + '.bin';
  if (fs.existsSync(real)) return;
  fs.renameSync(bin, real);
  fs.writeFileSync(bin, `#!/bin/sh
HERE="$(dirname "$(readlink -f "$0")")"
exec "$HERE/${name}.bin" --no-sandbox "$@"
`);
  fs.chmodSync(bin, 0o755);
};
