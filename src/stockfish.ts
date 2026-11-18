// Conexión con Stockfish (corre en un Web Worker y habla el protocolo UCI).
// Si no carga (navegador antiguo, sin conexión la primera vez...), devuelve null
// y el juego usa el motor propio.

let worker: Worker | null = null;
let ready: Promise<boolean> | null = null;
let listener: ((line: string) => void) | null = null;
let queue: Promise<unknown> = Promise.resolve();

function send(cmd: string) {
  worker?.postMessage(cmd);
}

function waitFor(pred: (line: string) => boolean, timeoutMs: number): Promise<string | null> {
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      listener = null;
      resolve(null);
    }, timeoutMs);
    listener = (line) => {
      if (pred(line)) {
        clearTimeout(t);
        listener = null;
        resolve(line);
      }
    };
  });
}

/** Descarta el motor (colgado o caído); la próxima petición lo vuelve a arrancar. */
function reset() {
  loaded = false;
  worker?.terminate();
  worker = null;
  ready = null;
  listener = null;
}

let loaded = false;

/** true cuando Stockfish ya está descargado y responde. */
export const isStockfishReady = () => loaded;

function init(): Promise<boolean> {
  if (ready) return ready;
  ready = (async () => {
    try {
      worker = new Worker(`${import.meta.env.BASE_URL}stockfish/stockfish-19-lite-single.js`);
      worker.onmessage = (e: MessageEvent) => listener?.(String(e.data));
      worker.onerror = () => {
        listener?.('__error__');
        reset();
      };
      // 60 s: incluye descargar ~1,2 MB; con mala cobertura puede tardar (mientras, juega el motor propio)
      const ok = waitFor((l) => l === 'uciok' || l === '__error__', 60000);
      send('uci');
      const line = await ok;
      if (line !== 'uciok') throw new Error('stockfish no responde');
      loaded = true;
      return true;
    } catch {
      reset(); // que se pueda reintentar más tarde en lugar de perderlo para toda la sesión
      return false;
    }
  })();
  return ready;
}

/** Empieza a descargar el motor en segundo plano. */
export function preloadStockfish() {
  void init();
}

export interface SfOptions {
  skill: number; // 0 (flojo) a 20 (máximo)
  depth: number;
}

/** Devuelve la mejor jugada en formato UCI (p. ej. "e2e4", "e7e8q"), o null si no hay motor. */
export function bestMove(fen: string, opts: SfOptions): Promise<string | null> {
  const job = queue.then(async () => {
    if (!(await init())) return null;
    send(`setoption name Skill Level value ${opts.skill}`);
    send('ucinewgame');
    const isReady = waitFor((l) => l === 'readyok', 5000);
    send('isready');
    if (!(await isReady)) {
      reset();
      return null;
    }
    const done = waitFor((l) => l.startsWith('bestmove'), 20000);
    send(`position fen ${fen}`);
    send(`go depth ${opts.depth}`);
    let line = await done;
    if (!line) {
      // tarda demasiado (p. ej. el móvil suspendió la app): pararlo para que su
      // respuesta no llegue tarde y se confunda con la de otra posición
      const stopped = waitFor((l) => l.startsWith('bestmove'), 1500);
      send('stop');
      line = await stopped;
      if (!line) reset();
    }
    const m = line?.split(' ')[1];
    return m && m !== '(none)' ? m : null;
  });
  queue = job.catch(() => null);
  return job;
}
