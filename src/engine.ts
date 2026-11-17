import { Chess, type Move, type PieceSymbol } from 'chess.js';
import { PIECE_VALUES } from './pieces';

// Tablas sencillas de posición (desde el punto de vista de las blancas, fila 8 primero).
// Animan a ocupar el centro, sacar piezas y no dejar el rey en medio.
const PST: Partial<Record<PieceSymbol, number[]>> = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
  ],
};

const MATE = 100000;

/** Evaluación desde el punto de vista del bando que mueve. */
export function evaluate(chess: Chess): number {
  let score = 0;
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (!p) continue;
      const table = PST[p.type];
      const idx = p.color === 'w' ? r * 8 + f : (7 - r) * 8 + f;
      const v = PIECE_VALUES[p.type] + (table ? table[idx] : 0);
      score += p.color === 'w' ? v : -v;
    }
  }
  return chess.turn() === 'w' ? score : -score;
}

function orderMoves(moves: Move[]): Move[] {
  const key = (m: Move) =>
    (m.captured ? 10 * PIECE_VALUES[m.captured] - PIECE_VALUES[m.piece] / 10 : 0) +
    (m.promotion ? 800 : 0);
  return moves.sort((a, b) => key(b) - key(a));
}

let nodes = 0;

function quiesce(chess: Chess, alpha: number, beta: number, depth: number): number {
  nodes++;
  const stand = evaluate(chess);
  if (depth === 0 || stand >= beta) return stand;
  if (stand > alpha) alpha = stand;
  const caps = orderMoves(chess.moves({ verbose: true }).filter((m) => m.captured));
  for (const m of caps) {
    chess.move(m);
    const s = -quiesce(chess, -beta, -alpha, depth - 1);
    chess.undo();
    if (s >= beta) return s;
    if (s > alpha) alpha = s;
  }
  return alpha;
}

// Nota: no se comprueba la repetición de jugadas (es muy costosa en chess.js);
// para los rivales fáciles no importa.
function negamax(chess: Chess, depth: number, alpha: number, beta: number, ply: number, qDepth: number): number {
  nodes++;
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return chess.inCheck() ? -MATE + ply : 0;
  if (depth === 0) return quiesce(chess, alpha, beta, qDepth);
  let best = -Infinity;
  for (const m of orderMoves(moves)) {
    chess.move(m);
    const s = -negamax(chess, depth - 1, -beta, -alpha, ply + 1, qDepth);
    chess.undo();
    if (s > best) best = s;
    if (s > alpha) alpha = s;
    if (alpha >= beta) break;
  }
  return best;
}

export interface ScoredMove {
  san: string;
  from: string;
  to: string;
  promotion?: string;
  score: number;
}

/** Puntúa todas las jugadas legales con una búsqueda a la profundidad dada. */
export function scoreMoves(fen: string, depth: number, qDepth = 2): ScoredMove[] {
  const chess = new Chess(fen);
  nodes = 0;
  const out: ScoredMove[] = [];
  for (const m of orderMoves(chess.moves({ verbose: true }))) {
    chess.move(m);
    const score = -negamax(chess, depth - 1, -Infinity, Infinity, 1, qDepth);
    chess.undo();
    out.push({ san: m.san, from: m.from, to: m.to, promotion: m.promotion, score });
  }
  return out.sort((a, b) => b.score - a.score);
}

export interface Level {
  depth: number;
  noise: number; // cuánto "se despista" (en centésimas de peón)
  blunder: number; // probabilidad de hacer una jugada al azar
  qDepth: number; // cuántas capturas seguidas mira al final
}

/** Elige la jugada del ordenador según el nivel del rival. */
export function pickMove(fen: string, level: Level): ScoredMove {
  const chess = new Chess(fen);
  const legal = chess.moves({ verbose: true });
  if (Math.random() < level.blunder) {
    const m = legal[Math.floor(Math.random() * legal.length)];
    return { san: m.san, from: m.from, to: m.to, promotion: m.promotion, score: 0 };
  }
  const scored = scoreMoves(fen, level.depth, level.qDepth);
  // nunca pasa por alto un mate en 1 (salvo en el nivel más fácil)
  if (scored[0].score > MATE - 10 && level.depth > 1) return scored[0];
  let best = scored[0];
  let bestNoisy = -Infinity;
  for (const s of scored) {
    const noisy = s.score + (Math.random() * 2 - 1) * level.noise;
    if (noisy > bestNoisy) {
      bestNoisy = noisy;
      best = s;
    }
  }
  return best;
}

export function lastNodeCount() {
  return nodes;
}

export const MATE_SCORE = MATE;
