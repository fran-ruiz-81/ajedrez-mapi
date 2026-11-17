// Genera `data.ts` con los retos. No hace falta ejecutarlo para jugar: el resultado ya está guardado.
//
//  - La mayoría salen de la base de puzzles de Lichess (CC0, https://database.lichess.org/#puzzles):
//    se filtran por tema, popularidad y rating bajo, y se repartan de fácil a difícil.
//  - Los de "¡Sálvala!" (salvar una pieza atacada) los crea este script con posiciones sencillas
//    en las que solo hay una casilla segura.
//  - Todos pasan por `verifyPuzzle` (Stockfish con MultiPV) antes de guardarse.
//
// Uso:
//   curl -s https://database.lichess.org/lichess_db_puzzle.csv.zst | head -c 30000000 | zstd -dc > puzzles.csv
//   node src/puzzles/build.mjs puzzles.csv
import fs from 'node:fs';
import { Chess } from 'chess.js';
import { COLLECTIONS } from './collections.ts';
import { openEngine } from './sf-node.mjs';
import { verifyPuzzle } from './verify.mjs';

const csv = process.argv[2];
if (!csv) {
  console.error('Uso: node src/puzzles/build.mjs <lichess_db_puzzle.csv>');
  process.exit(1);
}

// Generador pseudoaleatorio con semilla: el resultado es siempre el mismo.
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20261117);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ───────── Lichess ─────────
const rows = fs
  .readFileSync(csv, 'utf8')
  .split('\n')
  .slice(1)
  .map((l) => l.split(','))
  .filter((c) => c.length >= 10)
  .map((c) => ({
    lid: c[0],
    fen: c[1],
    moves: c[2].split(' '),
    rating: +c[3],
    rd: +c[4],
    pop: +c[5],
    plays: +c[6],
    themes: new Set(c[7].split(' ')),
    pieces: c[1].split(' ')[0].replace(/[^a-zA-Z]/g, '').length,
  }))
  .filter((r) => r.pop >= 88 && r.plays >= 500 && r.rd < 90);
const has = (r, ...t) => t.some((x) => r.themes.has(x));
const firstKidCheck = (r) => {
  const c = new Chess(r.fen);
  c.move(r.moves[0]);
  c.move(r.moves[1]);
  return c.inCheck();
};

/** Filtro y rango de rating de cada colección que sale de Lichess. */
const SOURCES = {
  mate1: { n: 12, min: 400, max: 1000, maxPieces: 18, f: (r) => has(r, 'mateIn1') },
  free: { n: 12, min: 400, max: 1000, maxPieces: 22, f: (r) => has(r, 'hangingPiece') && has(r, 'oneMove') },
  checkwin: { n: 10, min: 500, max: 1150, maxPieces: 22, f: (r) => has(r, 'short') && has(r, 'fork', 'skewer') && !has(r, 'mate') && firstKidCheck(r) },
  mate2: { n: 10, min: 700, max: 1300, maxPieces: 24, f: (r) => has(r, 'mateIn2') },
  fork: { n: 10, min: 600, max: 1200, maxPieces: 24, f: (r) => has(r, 'fork') && has(r, 'short') && !has(r, 'mate') && !firstKidCheck(r) },
  pin: { n: 10, min: 700, max: 1300, maxPieces: 26, f: (r) => has(r, 'pin') && has(r, 'short') && !has(r, 'mate') },
  material2: {
    n: 10, min: 700, max: 1250, maxPieces: 26,
    f: (r) => has(r, 'short') && has(r, 'crushing', 'advantage') && !has(r, 'mate', 'fork', 'pin', 'skewer'),
  },
  mate3: { n: 10, min: 900, max: 1600, maxPieces: 28, f: (r) => has(r, 'mateIn3') },
  combo: { n: 10, min: 1000, max: 1600, maxPieces: 28, f: (r) => has(r, 'long') && !has(r, 'mate') },
};

const sf = await openEngine();
const used = new Set();
const out = {};

for (const col of COLLECTIONS) {
  if (col.id === 'save') {
    out.save = await buildSave(col, 10);
    continue;
  }
  const src = SOURCES[col.id];
  const cands = rows
    .filter((r) => r.rating >= src.min && r.rating <= src.max && r.pieces <= src.maxPieces && r.moves.length === 2 * col.kidMoves && !used.has(r.lid))
    .filter(src.f)
    .sort((a, b) => a.rating - b.rating);
  console.log(`\n${col.title}: ${cands.length} candidatos`);
  // se reparte en tramos de rating para que vayan de fácil a difícil
  const chosen = [];
  for (let k = 0; k < src.n; k++) {
    const bucket = cands.slice(Math.floor((k * cands.length) / src.n), Math.floor(((k + 1) * cands.length) / src.n));
    let tries = 0;
    for (const r of shuffle(bucket)) {
      if (tries++ >= 25) break;
      const p = { id: `lc-${r.lid}`, fen: r.fen, setup: r.moves[0], moves: r.moves.slice(1), rating: r.rating };
      const errs = await verifyPuzzle(sf, p, col);
      if (errs.length) continue;
      chosen.push(p);
      used.add(r.lid);
      console.log(`  ✅ ${p.id} (${r.rating}, ${r.pieces} piezas)`);
      break;
    }
  }
  out[col.id] = chosen.sort((a, b) => a.rating - b.rating);
}

// ───────── "¡Sálvala!": posiciones creadas aquí ─────────
async function buildSave(col, n) {
  const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  const files = 'abcdefgh';
  const sq = (f, r) => files[f] + (r + 1);
  const all = [];
  for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) all.push(sq(f, r));
  const types = ['n', 'b', 'r'];
  const cap = { n: 4, b: 2, r: 4 };
  const t0 = Date.now();
  const found = [];
  let attempts = 0;
  while (found.length < n && attempts < 3000000) {
    attempts++;
    // variedad: un tope de retos por tipo de pieza
    // (los alfiles salen muy pocas veces: si tarda mucho, se quita el tope)
    const type = attempts > 250000 ? pick(types) : pick(types.filter((t) => found.filter((f) => f.type === t).length < cap[t]));
    const c = new Chess();
    c.clear();
    const free = new Set(all);
    const place = (piece, color, s) => {
      if (!free.has(s)) return false;
      if (piece === 'p' && (s[1] === '1' || s[1] === '8')) return false;
      free.delete(s);
      return c.put({ type: piece, color }, s);
    };
    const randSq = () => pick([...free]);
    if (!place('k', 'w', randSq()) || !place('k', 'b', randSq())) continue;
    // en el borde tiene menos casillas: así es más fácil que solo haya una segura
    const edge = [...free].filter((s) => 'ah'.includes(s[0]) || '18'.includes(s[1]));
    const pSq = rand() < 0.6 ? pick(edge) : randSq();
    place(type, 'w', pSq);
    // atacante que vale menos
    const attType = pick(['p', 'n', 'b', 'r'].filter((t) => VALUE[t] < VALUE[type]));
    if (c.attackers(pSq, 'b').length) continue; // que no la ataque el rey
    const cand = [...free].filter((s) => {
      if (attType === 'p' && (s[1] === '1' || s[1] === '8')) return false;
      c.put({ type: attType, color: 'b' }, s);
      const ok = c.attackers(pSq, 'b').includes(s);
      c.remove(s);
      return ok;
    });
    if (!cand.length) continue;
    place(attType, 'b', pick(cand));
    for (let i = 0, k = 2 + Math.floor(rand() * 3); i < k; i++) place(pick(['p', 'p', 'n', 'b', 'r']), 'b', randSq());
    for (let i = 0, k = Math.floor(rand() * 3); i < k; i++) place('p', 'w', randSq());
    const fen = c.fen();
    let pos;
    try {
      pos = new Chess(fen);
    } catch {
      continue;
    }
    if (pos.inCheck() || pos.isGameOver()) continue;
    const kb = pos.board().flat().find((x) => x?.type === 'k' && x.color === 'b').square;
    if (pos.isAttacked(kb, 'w')) continue;
    // casillas a las que puede ir la pieza
    const moves = pos.moves({ verbose: true });
    const own = moves.filter((m) => m.from === pSq);
    if (own.length < 3) continue;
    const safe = own.filter((m) => {
      pos.move(m);
      const ok = !pos.isAttacked(m.to, 'b');
      pos.undo();
      return ok;
    });
    // pocas casillas seguras; que sea la única buena lo decide Stockfish (verifyPuzzle)
    if (safe.length < 1 || safe.length > 2) continue;
    // nada que comer: solo hay que salvarla
    if (moves.some((m) => m.captured)) continue;
    if (pos.attackers(pSq, 'b').some((s) => pos.get(s).type === 'k')) continue; // que no la ataque el rey
    const lines = await sf.analyse(pos.fen(), { depth: 12, multipv: 1 });
    const best = lines[0]?.move;
    if (!best || best.slice(0, 2) !== pSq) continue;
    const p = { id: `nino-save-${found.length + 1}`, fen: pos.fen(), moves: [best], options: own.length, type };
    const errs = await verifyPuzzle(sf, p, col);
    if (errs.length) continue;
    found.push(p);
    console.log(`  ✅ ${p.id}: ${p.fen} ${p.moves[0]} (${own.length} casillas, ${attempts} intentos, ${Math.round((Date.now() - t0) / 1000)} s)`);
  }
  // de menos opciones (fácil) a más (difícil), variando la pieza
  return found
    .sort((a, b) => a.options - b.options)
    .map(({ options: _o, type: _t, ...p }, i) => ({ ...p, id: `nino-save-${i + 1}` }));
}

sf.quit();

const body = Object.entries(out)
  .map(([k, list]) => `  ${k}: [\n${list.map((p) => `    ${JSON.stringify(p)},`).join('\n')}\n  ],`)
  .join('\n');
fs.writeFileSync(
  new URL('./data.ts', import.meta.url),
  `// GENERADO por build.mjs: no editar a mano (o volver a pasar verify.mjs).
// Retos "lc-*": base de puzzles de Lichess (https://database.lichess.org/#puzzles), dominio público (CC0).
// Retos "nino-*": creados para este juego.
// fen: posición inicial · setup: jugada previa del rival (se anima al empezar) · moves: niño, rival, niño…
export interface Puzzle {
  id: string;
  fen: string;
  setup?: string;
  moves: string[];
  rating?: number;
}

export const PUZZLES: Record<string, Puzzle[]> = {
${body}
};
`,
);
console.log('\nGuardado data.ts:', Object.entries(out).map(([k, v]) => `${k}=${v.length}`).join(' '));
process.exit(0);
