// Lógica de los ejercicios "de tablero libre" (recoger estrellas, comer piezas):
// la pieza del niño se mueve sola y las piezas rivales se quedan quietas.
// Sin DOM: también la usa `verify.mjs` para comprobar que cada ejercicio tiene solución.
import type { PieceSymbol } from 'chess.js';

export const FILES = 'abcdefgh';

/** Casilla "e4" → índice 0..63 (a1 = 0, h8 = 63). */
export const idx = (sq: string) => FILES.indexOf(sq[0]) + (Number(sq[1]) - 1) * 8;
export const name = (i: number) => FILES[i % 8] + String(Math.floor(i / 8) + 1);

export interface FreePiece {
  type: PieceSymbol;
  sq: number;
}

export interface FreeBoard {
  mine: FreePiece[]; // piezas blancas del niño
  enemies: FreePiece[]; // piezas negras quietas
}

const DIRS: Record<string, [number, number][]> = {
  r: [[1, 0], [-1, 0], [0, 1], [0, -1]],
  b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  n: [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]],
};
DIRS.q = [...DIRS.r, ...DIRS.b];
DIRS.k = DIRS.q;

const SLIDES: Record<string, boolean> = { r: true, b: true, q: true };

function at(f: number, r: number) {
  return f >= 0 && f < 8 && r >= 0 && r < 8 ? f + r * 8 : -1;
}

/**
 * Casillas a las que puede ir una pieza blanca.
 * `occ`: qué hay en cada casilla ('w' propia, 'b' rival, 'K' rey rival que no se puede comer).
 */
export function pieceMoves(type: PieceSymbol, from: number, occ: Map<number, string>): number[] {
  const f0 = from % 8;
  const r0 = Math.floor(from / 8);
  const out: number[] = [];
  if (type === 'p') {
    const one = at(f0, r0 + 1);
    if (one >= 0 && !occ.has(one)) {
      out.push(one);
      const two = at(f0, r0 + 2);
      if (r0 === 1 && two >= 0 && !occ.has(two)) out.push(two);
    }
    for (const df of [-1, 1]) {
      const c = at(f0 + df, r0 + 1);
      if (c >= 0 && occ.get(c) === 'b') out.push(c);
    }
    return out;
  }
  for (const [df, dr] of DIRS[type]) {
    let f = f0 + df;
    let r = r0 + dr;
    while (true) {
      const s = at(f, r);
      if (s < 0) break;
      const o = occ.get(s);
      if (o === 'b') out.push(s);
      if (o) break;
      out.push(s);
      if (!SLIDES[type]) break;
      f += df;
      r += dr;
    }
  }
  return out;
}

/** Casillas que ataca una pieza negra (incluidas las de sus compañeras: las defiende). */
export function enemyAttacks(p: FreePiece, occ: Map<number, string>): number[] {
  const f0 = p.sq % 8;
  const r0 = Math.floor(p.sq / 8);
  if (p.type === 'p') return [at(f0 - 1, r0 - 1), at(f0 + 1, r0 - 1)].filter((s) => s >= 0);
  const out: number[] = [];
  for (const [df, dr] of DIRS[p.type]) {
    let f = f0 + df;
    let r = r0 + dr;
    while (true) {
      const s = at(f, r);
      if (s < 0) break;
      out.push(s);
      if (!SLIDES[p.type] || occ.has(s)) break;
      f += df;
      r += dr;
    }
  }
  return out;
}

/**
 * Casillas atacadas por las piezas rivales que quedan. Se calculan sin las piezas
 * del niño, para que la casilla marcada en rojo sea exactamente donde no puede pararse.
 */
export function attackedBy(enemies: FreePiece[]): Map<number, FreePiece> {
  const occ = new Map<number, string>();
  for (const e of enemies) occ.set(e.sq, 'b');
  const out = new Map<number, FreePiece>();
  for (const e of enemies) for (const s of enemyAttacks(e, occ)) if (!out.has(s)) out.set(s, e);
  return out;
}

export function occupancy(b: FreeBoard): Map<number, string> {
  const occ = new Map<number, string>();
  for (const e of b.enemies) occ.set(e.sq, e.type === 'k' ? 'K' : 'b');
  for (const m of b.mine) occ.set(m.sq, 'w');
  return occ;
}

/** Movimientos posibles de la pieza `i` del niño, respetando las casillas atacadas si `safe`. */
export function legalFree(b: FreeBoard, i: number, safe: boolean): number[] {
  const occ = occupancy(b);
  const moves = pieceMoves(b.mine[i].type, b.mine[i].sq, occ);
  if (!safe) return moves;
  const att = attackedBy(b.enemies);
  return moves.filter((s) => !att.has(s));
}

/** Aplica un movimiento y devuelve el tablero nuevo (corona en dama automáticamente). */
export function applyFree(b: FreeBoard, i: number, to: number): { board: FreeBoard; captured?: FreePiece; promoted: boolean } {
  const captured = b.enemies.find((e) => e.sq === to);
  const mine = b.mine.map((p) => ({ ...p }));
  const promoted = mine[i].type === 'p' && to >= 56;
  mine[i].sq = to;
  if (promoted) mine[i].type = 'q';
  return { board: { mine, enemies: b.enemies.filter((e) => e !== captured) }, captured, promoted };
}

export interface FreeGoal {
  stars: number[]; // casillas con estrella
  eatAll: boolean; // además hay que comerse todas las piezas rivales
  safe: boolean; // no se puede parar en casillas atacadas
}

/** Mínimo de movimientos para cumplir el objetivo (búsqueda en anchura). -1 si no tiene solución. */
export function minMoves(start: FreeBoard, goal: FreeGoal): number {
  const key = (b: FreeBoard, mask: number) =>
    b.mine.map((p) => p.type + p.sq).join(',') + '|' + b.enemies.map((e) => e.sq).join(',') + '|' + mask;
  const done = (b: FreeBoard, mask: number) =>
    mask === (1 << goal.stars.length) - 1 && (!goal.eatAll || b.enemies.length === 0);
  const starMask = (b: FreeBoard, mask: number) => {
    for (const p of b.mine) {
      const k = goal.stars.indexOf(p.sq);
      if (k >= 0) mask |= 1 << k;
    }
    return mask;
  };
  let frontier: [FreeBoard, number][] = [[start, starMask(start, 0)]];
  const seen = new Set([key(start, frontier[0][1])]);
  for (let depth = 0; depth < 60; depth++) {
    const next: [FreeBoard, number][] = [];
    for (const [b, mask] of frontier) {
      if (done(b, mask)) return depth;
      for (let i = 0; i < b.mine.length; i++) {
        for (const to of legalFree(b, i, goal.safe)) {
          const nb = applyFree(b, i, to).board;
          const nm = starMask(nb, mask);
          const k = key(nb, nm);
          if (seen.has(k)) continue;
          seen.add(k);
          next.push([nb, nm]);
        }
      }
    }
    if (!next.length) return -1;
    frontier = next;
  }
  return -1;
}
