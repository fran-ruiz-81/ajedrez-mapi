// Stockfish (lite, un hilo) para scripts de Node: análisis con MultiPV.
// Uso: const sf = await openEngine(); const lines = await sf.analyse(fen, { depth: 16, multipv: 2 }); sf.quit();
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * Cada línea devuelta: { move: 'e2e4', pv: ['e2e4', ...], mate: number|null, cp: number|null }
 * (puntuación desde el punto de vista del bando que mueve).
 */
export async function openEngine() {
  let listener = () => {};
  const engine = require('stockfish')('lite-single', (line) => listener(String(line)));
  const waitFor = (send, test) =>
    new Promise((resolve) => {
      listener = (line) => test(line) && resolve(line);
      send();
    });
  // la carga del WASM tarda un poco: se espera a "uciok"/"readyok"
  await new Promise((r) => setTimeout(r, 50));
  await waitFor(() => engine.processCommand('uci'), (l) => l === 'uciok');
  await waitFor(() => engine.processCommand('isready'), (l) => l === 'readyok');

  async function analyse(fen, { depth = 16, multipv = 2 } = {}) {
    const best = new Map();
    engine.processCommand('ucinewgame');
    engine.processCommand(`setoption name MultiPV value ${multipv}`);
    engine.processCommand(`position fen ${fen}`);
    await waitFor(
      () => engine.processCommand(`go depth ${depth}`),
      (l) => {
        const m = l.match(/^info .*\bdepth (\d+) .*\bmultipv (\d+) .*\bscore (cp|mate) (-?\d+).* pv (.+)$/);
        if (m && !/\b(lowerbound|upperbound)\b/.test(l)) {
          const pv = m[5].trim().split(' ');
          best.set(Number(m[2]), { move: pv[0], pv, mate: m[3] === 'mate' ? Number(m[4]) : null, cp: m[3] === 'cp' ? Number(m[4]) : null });
        }
        return l.startsWith('bestmove');
      },
    );
    return [...best.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  }

  return { analyse, quit: () => engine.terminate?.() };
}

/** Puntuación comparable: los mates valen mucho (antes, más). */
export function score(line) {
  if (!line) return -100000;
  if (line.mate !== null) return line.mate > 0 ? 100000 - line.mate * 100 : -100000 - line.mate * 100;
  return line.cp;
}
