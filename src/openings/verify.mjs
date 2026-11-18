// Comprueba que todas las aperturas son legales, que tienen explicación en cada jugada
// del niño y que las longitudes por curso son las pactadas; y prueba el lector de notación.
// Uso: node src/openings/verify.mjs  (Node 23+ entiende TypeScript)
import { Chess } from 'chess.js';
import { OPENINGS, lineLength } from './data.ts';
import { formatLine, parseMoves } from './notation.ts';

let errors = 0;
const fail = (msg) => {
  errors++;
  console.log('   ❌ ' + msg);
};

const ids = new Set();
const count = { w: 0, b: 0 };
for (const op of OPENINGS) {
  count[op.color]++;
  const short = lineLength(op, 2);
  const long = lineLength(op, 4);
  console.log(`\n${op.emoji} ${op.name} (${op.color === 'w' ? 'blancas' : 'negras'}) · 1º-2º: ${short} · 3º+: ${long}`);
  console.log('   ' + formatLine(op.moves));
  if (ids.has(op.id)) fail('id repetido');
  ids.add(op.id);
  if (op.why.length !== op.moves.length) fail(`hay ${op.why.length} explicaciones para ${op.moves.length} jugadas`);
  if (short < 6 || short > 8) fail('la línea corta debe tener 6-8 jugadas');
  // una línea que acaba en mate (Mate del Pastor) puede ser más corta
  if (!op.moves.at(-1).endsWith('#') && (long < 10 || long > 12)) fail('la línea larga debe tener 10-12 jugadas');
  const mine = (n) => op.moves.slice(0, n).filter((_, i) => (i % 2 === 0) === (op.color === 'w')).length;
  if (mine(short) < 3 || mine(short) > 4) fail(`en la corta el niño hace ${mine(short)} jugadas (debe ser 3-4)`);
  const chess = new Chess();
  op.moves.forEach((m, i) => {
    try {
      const mv = chess.move(m);
      if (mv.san !== m) fail(`jugada ${i + 1}: «${m}» debería escribirse «${mv.san}»`);
    } catch {
      fail(`jugada ${i + 1} («${m}») ilegal`);
    }
    const isChild = (i % 2 === 0) === (op.color === 'w');
    if (isChild && !op.why[i]) fail(`falta la explicación de la jugada ${i + 1} («${m}»)`);
  });
  // ida y vuelta: lo que se escribe en español se vuelve a leer igual
  const back = parseMoves(formatLine(op.moves));
  if (!back.ok || back.moves.join() !== op.moves.join()) fail('no se relee bien su notación española');
}
console.log(`\nCon blancas: ${count.w} · con negras: ${count.b}`);

// ───────── Lector de notación ─────────
console.log('\nLector de notación:');
const cases = [
  ['1. e4 e5 2. Cf3 Cc6 3. Ac4 Ac5', ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']],
  ['1.e4 e5 2.Nf3 Nc6 3.Bb5', ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']],
  ['e4 e5 Nf3 Nf6 Bc4 Bc5 0-0 0-0', ['e4', 'e5', 'Nf3', 'Nf6', 'Bc4', 'Bc5', 'O-O', 'O-O']],
  ['1. d4 d5 2. c4 e6 3. Cc3 Cf6 4. Ag5 Ae7 5. e3 0-0 6. Cf3 Cbd7 7. Tc1', null],
  ['1. e4 e5 2. Cf3 Cc6 3. Ac4 Cf6 4. 0-0 Ae7 5. Te1 0-0 6. d3 d6 7. Rh1', null],
  ['1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. O-O Be7 5. Re1 O-O 6. d3 d6 7. Kh1', null],
  ['1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 5. Rf1', 'err'],
  ['1. e4 e5 2. Cf3 Cc6 3. Ac5', 'err'],
  ['1. e4 e5 2. Cf3 hola', 'err'],
  ['', 'err'],
];
for (const [text, want] of cases) {
  const r = parseMoves(text);
  const show = r.ok ? formatLine(r.moves) : `error: ${r.error}`;
  console.log(`   «${text}» → ${show}`);
  if (want === 'err' && r.ok) fail('debería dar error');
  if (want !== 'err' && !r.ok) fail('debería leerse bien');
  if (Array.isArray(want) && r.ok && r.moves.join() !== want.join()) fail(`esperaba ${want.join(' ')}`);
}
const r = parseMoves('1. e4 e5 2. Cf3 Cc6 3. Ac5');
if (!r.ok && !/jugada 3 de las blancas/.test(r.error)) fail('el error debe decir qué jugada falla');

console.log(errors ? `\n❌ ${errors} fallos` : '\n✅ Todo correcto');
process.exit(errors ? 1 : 0);
