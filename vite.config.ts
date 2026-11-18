import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

/** Archivos de `public/` que la app necesita para funcionar sin conexión (Stockfish se guarda al usarlo). */
const PUBLIC_PRECACHE = ['./', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'fonts/baloo2-latin.woff2'];

/**
 * Genera `sw.js` en cada build a partir de `scripts/sw.template.js`, con la lista exacta
 * de archivos (llevan hash) y una versión: así el service worker puede guardar la app
 * entera al instalarse y borrar la versión anterior al publicar otra.
 */
function serviceWorker(): Plugin {
  return {
    name: 'service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const built = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      const files = [...new Set([...PUBLIC_PRECACHE, ...built])];
      const version = createHash('sha1').update(files.join('|')).digest('hex').slice(0, 10);
      const source = readFileSync('scripts/sw.template.js', 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(files));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

// base relativa: funciona tanto en usuario.github.io/repo como en local
export default defineConfig({
  base: './',
  worker: { format: 'es' },
  plugins: [serviceWorker()],
});
