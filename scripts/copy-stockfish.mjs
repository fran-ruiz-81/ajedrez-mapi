// Copia Stockfish (versión lite, un solo hilo) a public/ para servirlo como archivo estático.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const src = join(dirname(require.resolve('stockfish/package.json')));
const dest = 'public/stockfish';
mkdirSync(dest, { recursive: true });
for (const f of ['bin/stockfish-19-lite-single.js', 'bin/stockfish-19-lite-single.wasm', 'Copying.txt']) {
  copyFileSync(join(src, f), join(dest, f.replace('bin/', '')));
}
console.log('Stockfish copiado a', dest);
