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

function init(): Promise<boolean> {
  if (ready) return ready;
  ready = (async () => {
    try {
      worker = new Worker(`${import.meta.env.BASE_URL}stockfish/stockfish-19-lite-single.js`);
      worker.onmessage = (e: MessageEvent) => listener?.(String(e.data));
      worker.onerror = () => listener?.('__error__');
      const ok = waitFor((l) => l === 'uciok' || l === '__error__', 15000);
      send('uci');
      const line = await ok;
      if (line !== 'uciok') throw new Error('stockfish no responde');
      return true;
    } catch {
      worker?.terminate();
      worker = null;
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
    await isReady;
    const done = waitFor((l) => l.startsWith('bestmove'), 20000);
    send(`position fen ${fen}`);
    send(`go depth ${opts.depth}`);
    const line = await done;
    const m = line?.split(' ')[1];
    return m && m !== '(none)' ? m : null;
  });
  queue = job.catch(() => null);
  return job;
}
