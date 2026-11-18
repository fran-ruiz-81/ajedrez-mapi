// Los motores: el propio (en un Worker) y Stockfish, con el propio de reserva.
import { progress } from './app';
import type { ScoredMove } from './engine';
import { adjustRival } from './level';
import type { Rival } from './rivals';
import { bestMove, isStockfishReady } from './stockfish';
import { wait } from './ui';

// ───────────────────────── Motor propio en un Worker ─────────────────────────

const ownWorker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' });
let reqId = 0;
const pending = new Map<number, (m: ScoredMove) => void>();
ownWorker.onmessage = (e) => {
  pending.get(e.data.id)?.(e.data.move);
  pending.delete(e.data.id);
};
export function askOwn(msg: Record<string, unknown>): Promise<ScoredMove> {
  const id = ++reqId;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    ownWorker.postMessage({ id, ...msg });
  });
}

const parseUci = (u: string) => ({
  from: u.slice(0, 2),
  to: u.slice(2, 4),
  promotion: u.length > 4 ? u[4] : undefined,
});

/** Motor propio sin despistes: el que juega si Stockfish no está (rápido también en el móvil). */
export const FALLBACK = { depth: 1, noise: 0, blunder: 0, qDepth: 2 };

/**
 * Pide la jugada a Stockfish, pero sin hacer esperar al niño mientras se descarga:
 * si aún no está listo y tarda más de 2,5 s, esa jugada la hace el motor propio.
 */
async function stockfishOr(fen: string, opts: { skill: number; depth: number }): Promise<string | null> {
  const sf = bestMove(fen, opts);
  if (isStockfishReady()) return sf;
  const r = await Promise.race([sf, wait(2500).then(() => 'late' as const)]);
  return r === 'late' ? null : r;
}

export async function computerMove(fen: string, rival: Rival) {
  const e = adjustRival(rival.engine, progress.course);
  if (e.kind === 'sf') {
    const uci = await stockfishOr(fen, { skill: e.skill, depth: e.depth });
    if (uci) return parseUci(uci);
    return askOwn({ kind: 'pick', fen, level: FALLBACK });
  }
  return askOwn({ kind: 'pick', fen, level: e.level });
}

export async function hintMove(fen: string) {
  const uci = await stockfishOr(fen, { skill: 20, depth: 10 });
  if (uci) return parseUci(uci);
  return askOwn({ kind: 'hint', fen });
}

