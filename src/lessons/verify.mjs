// Comprueba que todos los ejercicios de las lecciones tienen solución y muestra el mínimo
// de movimientos de cada uno. Uso: node src/lessons/verify.mjs  (Node 23+ entiende TypeScript)
import { Chess } from 'chess.js';
import { LESSONS, parsePiece, POINTS } from './data.ts';
import { attackedBy, idx, legalFree, minMoves, name } from './engine.ts';

let errors = 0;
const fail = (msg) => {
  errors++;
  console.log('   ❌ ' + msg);
};
const toFree = (list = []) => list.map((s) => { const p = parsePiece(s); return { type: p.type, sq: idx(p.sq) }; });

for (const [li, lesson] of LESSONS.entries()) {
  console.log(`\n${li + 1}. ${lesson.title} (${lesson.exercises.length} ejercicios)`);
  if (lesson.exercises.length < 3 || lesson.exercises.length > 5) fail('debe tener de 3 a 5 ejercicios');
  for (const [ei, ex] of lesson.exercises.entries()) {
    const tag = `   ${ei + 1}) ${ex.text}`;
    console.log(tag);
    if (ex.kind === 'free') {
      const board = { mine: toFree(ex.mine), enemies: toFree(ex.enemies) };
      const all = [...board.mine, ...board.enemies].map((p) => p.sq);
      if (new Set(all).size !== all.length) fail('dos piezas en la misma casilla');
      const stars = (ex.stars ?? []).map(idx);
      const att = attackedBy(board.enemies);
      if (ex.safe) for (const m of board.mine) if (att.has(m.sq)) fail(`pieza del niño atacada al empezar en ${name(m.sq)}`);
      for (const s of stars) {
        if (all.includes(s)) fail(`estrella en casilla ocupada ${name(s)}`);
        if (ex.safe && att.has(s)) fail(`estrella en casilla atacada ${name(s)}`);
      }
      if (ex.best) {
        const caps = board.mine.flatMap((_, i) =>
          legalFree(board, i, !!ex.safe).flatMap((to) => board.enemies.filter((e) => e.sq === to)),
        );
        const vals = caps.map((c) => POINTS[c.type]);
        const max = Math.max(...vals);
        if (!caps.length) fail('no hay nada que comer');
        else if (vals.filter((v) => v === max).length !== 1) fail('la mejor captura no es única');
        console.log(`      → mínimo 1 (comer ${caps.find((c) => POINTS[c.type] === max).type} en ${name(caps.find((c) => POINTS[c.type] === max).sq)}; opciones ${vals.join(',')})`);
      } else {
        if (!stars.length && !ex.eatAll) fail('sin objetivo');
        const min = minMoves(board, { stars, eatAll: !!ex.eatAll, safe: !!ex.safe });
        if (min < 1) fail(`sin solución (min=${min})`);
        console.log(`      → mínimo ${min}`);
      }
    } else {
      let chess;
      try {
        chess = new Chess(ex.fen);
      } catch (e) {
        fail('FEN no válido: ' + e.message);
        continue;
      }
      if (chess.turn() !== 'w') fail('deben mover las blancas');
      const moves = chess.moves({ verbose: true });
      const ok = moves.filter((m) => {
        if (ex.goal === 'castle') return m.isKingsideCastle() || m.isQueensideCastle();
        if (ex.goal === 'escape') {
          if (ex.how === 'capture') return !!m.captured;
          if (ex.how === 'move') return m.piece === 'k';
          return true;
        }
        chess.move(m);
        const r = ex.goal === 'mate' ? chess.isCheckmate() : chess.inCheck();
        chess.undo();
        return r;
      });
      if (ex.goal === 'escape' && !chess.inCheck()) fail('el rey blanco debería estar en jaque');
      if (ex.goal !== 'escape' && chess.inCheck()) fail('el rey blanco no debería estar en jaque');
      if (!ok.length) fail('sin solución');
      console.log(`      → mínimo 1 (soluciones: ${ok.map((m) => m.san).join(' ')})`);
    }
  }
}
console.log(errors ? `\n${errors} problema(s)` : '\nTodo correcto ✅');
process.exit(errors ? 1 : 0);
