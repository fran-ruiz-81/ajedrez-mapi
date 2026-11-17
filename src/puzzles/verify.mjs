// Comprueba todos los retos con chess.js y Stockfish (lite, un hilo):
//  - la posición y todas las jugadas son legales (también las respuestas del rival);
//  - cada jugada del niño es la mejor de Stockfish y no hay otra igual de buena (MultiPV 2):
//      · retos de mate: es mate en las jugadas que quedan y la 2ª opción no mata igual de rápido;
//      · el resto: la 2ª opción es al menos 2 peones peor;
//  - los mates acaban en jaque mate y los de material ganan al menos 2 puntos.
// Uso: node src/puzzles/verify.mjs   (Node 23+ entiende TypeScript)
import { Chess } from 'chess.js';
import { fileURLToPath } from 'node:url';
import { COLLECTIONS } from './collections.ts';
import { openEngine, score } from './sf-node.mjs';

export const DEPTH = 18;
const GAP = 200; // centipeones de ventaja mínima sobre la 2ª mejor jugada
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export function material(chess, color) {
  let s = 0;
  for (const p of chess.board().flat()) if (p) s += (p.color === color ? 1 : -1) * VALUE[p.type];
  return s;
}

const uci = (m) => ({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] });

/** Devuelve la lista de problemas del reto (vacía si está bien). */
export async function verifyPuzzle(sf, p, col, depth = DEPTH) {
  const errs = [];
  let chess;
  try {
    chess = new Chess(p.fen);
  } catch (e) {
    return [`FEN no válido: ${e.message}`];
  }
  try {
    if (p.setup) chess.move(uci(p.setup));
  } catch {
    return [`jugada previa del rival ilegal: ${p.setup}`];
  }
  if (chess.isGameOver()) return ['la partida ya ha terminado'];
  const kid = chess.turn();
  if (p.moves.length !== 2 * col.kidMoves - 1) errs.push(`debe tener ${col.kidMoves} jugada(s) del niño (${p.moves.length} en total)`);
  const start = material(chess, kid);

  for (let i = 0; i < p.moves.length; i++) {
    const m = p.moves[i];
    if (i % 2 === 1) {
      // respuesta del rival
      try {
        chess.move(uci(m));
      } catch {
        errs.push(`respuesta del rival ilegal: ${m}`);
        return errs;
      }
      continue;
    }
    const left = (p.moves.length - i + 1) / 2; // jugadas del niño que quedan, contando esta
    const lines = await sf.analyse(chess.fen(), { depth, multipv: 2 });
    const [a, b] = lines;
    if (!a) return [...errs, 'Stockfish no devuelve jugadas'];
    if (a.move !== m) errs.push(`jugada ${i / 2 + 1}: Stockfish prefiere ${a.move} (${fmt(a)}) a ${m}`);
    if (col.goal === 'mate') {
      if (!(a.mate > 0 && a.mate <= left)) errs.push(`jugada ${i / 2 + 1}: no es mate en ${left} (${fmt(a)})`);
      if (b && b.mate !== null && b.mate > 0 && b.mate <= a.mate) errs.push(`jugada ${i / 2 + 1}: también mata ${b.move} (${fmt(b)})`);
    } else {
      if (b && score(a) - score(b) < GAP) errs.push(`jugada ${i / 2 + 1}: ${b.move} (${fmt(b)}) es casi tan buena como ${a.move} (${fmt(a)})`);
      const min = col.goal === 'save' ? -100 : GAP;
      if (score(a) < min) errs.push(`jugada ${i / 2 + 1}: no gana lo bastante (${fmt(a)})`);
    }
    let mv;
    try {
      const before = chess.fen();
      mv = chess.move(uci(m));
      if (i === 0 && col.goal === 'save') {
        // la pieza que se mueve estaba atacada por una pieza que vale menos (o sin defender)
        const c = new Chess(before);
        const attackers = c.attackers(mv.from, kid === 'w' ? 'b' : 'w');
        const cheaper = attackers.some((sq) => VALUE[c.get(sq).type] < VALUE[mv.piece]);
        const defended = c.attackers(mv.from, kid).length > 0;
        if (!attackers.length || (!cheaper && defended)) errs.push('la pieza que se mueve no estaba en peligro');
      }
    } catch {
      errs.push(`jugada ${i / 2 + 1} ilegal: ${m}`);
      return errs;
    }
    if (i === 0 && col.goal === 'free' && !mv.captured) errs.push('la solución no come nada');
    if (i === 0 && col.goal === 'checkwin' && !chess.inCheck()) errs.push('la primera jugada no es jaque');
  }
  if (col.goal === 'mate') {
    if (!chess.isCheckmate()) errs.push('no acaba en jaque mate');
  } else if (col.goal !== 'save' && material(chess, kid) - start < 2) {
    errs.push(`gana poco material (${material(chess, kid) - start})`);
  }
  return errs;
}

function fmt(l) {
  return l.mate !== null ? `mate ${l.mate}` : `${l.cp} cp`;
}

// ───────── Programa principal ─────────
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { PUZZLES } = await import('./data.ts');
  const sf = await openEngine();
  let errors = 0;
  let total = 0;
  const ids = new Set();
  for (const col of COLLECTIONS) {
    const list = PUZZLES[col.id] ?? [];
    console.log(`\n${col.emoji} ${col.title} (${list.length} retos, desde ${col.course}º)`);
    if (list.length < 8 || list.length > 12) {
      errors++;
      console.log('   ❌ cada colección debe tener de 8 a 12 retos');
    }
    for (const p of list) {
      total++;
      if (ids.has(p.id)) {
        errors++;
        console.log(`   ❌ ${p.id}: id repetido`);
      }
      ids.add(p.id);
      const errs = await verifyPuzzle(sf, p, col);
      if (errs.length) {
        errors += errs.length;
        console.log(`   ❌ ${p.id}: ${errs.join(' · ')}`);
      } else console.log(`   ✅ ${p.id}${p.rating ? ` (${p.rating})` : ''}: ${[p.setup, ...p.moves].filter(Boolean).join(' ')}`);
    }
  }
  sf.quit();
  console.log(`\n${total} retos.`, errors ? `${errors} problema(s) ❌` : 'Todo correcto ✅');
  process.exit(errors ? 1 : 0);
}
