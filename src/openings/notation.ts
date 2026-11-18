// Notación de las aperturas: leer lo que pega el padre (inglés o español) y
// describir jugadas con palabras. Sin imports relativos (lo usa verify.mjs).
import { Chess, type Move, type PieceSymbol } from 'chess.js';

const NAMES: Record<PieceSymbol, string> = { p: 'peón', n: 'caballo', b: 'alfil', r: 'torre', q: 'dama', k: 'rey' };
const art = (t: PieceSymbol) => (t === 'r' || t === 'q' ? 'la ' : 'el ') + NAMES[t];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** SAN inglés → notación española: Cf3, Ac4, Tc1, Dd1, Rf1, 0-0. */
export function toEs(san: string): string {
  const map: Record<string, string> = { N: 'C', B: 'A', R: 'T', Q: 'D', K: 'R' };
  return san
    .replace(/^[NBRQK]/, (m) => map[m])
    .replace(/=([NBRQ])/, (_, p: string) => '=' + map[p])
    .replace(/O-O-O/, '0-0-0')
    .replace(/O-O/, '0-0');
}

/** "1. e4 e5 2. Cf3 Cc6" (en español o en inglés). */
export function formatLine(moves: string[], es = true): string {
  return moves
    .map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}. ` : '') + (es ? toEs(m) : m))
    .join(' ');
}


export type ParseResult =
  | { ok: true; moves: string[] }
  | { ok: false; error: string; moves: string[] };

/** Quita números de jugada, resultados, comentarios y signos (!, ?, +, #). */
function tokenize(text: string): string[] {
  const clean = text
    .replace(/\{[^}]*\}/g, ' ') // comentarios PGN
    .replace(/\([^)]*\)/g, ' ') // variantes
    .replace(/\b(1-0|0-1|1\/2-1\/2|½-½)\b/g, ' ')
    .replace(/\*/g, ' ')
    .replace(/[–—]/g, '-');
  return clean
    .split(/\s+/)
    .flatMap((t) => t.split(/(?<=\.)(?=[^.])/)) // "1.e4" → "1." "e4"
    .map((t) => t.replace(/^\d+\.+/, '').replace(/[!?+#]+$/g, '').replace(/e\.p\.?$/i, ''))
    .filter((t) => t && !/^\d+$/.test(t) && !/^\.+$/.test(t));
}

/**
 * Convierte un token a candidatos en SAN inglés. La "R" es ambigua (torre en inglés,
 * rey en español): se prueban las dos y manda el idioma del resto de la línea.
 */
function candidates(tok: string, lang: 'es' | 'en' | '?'): string[] {
  let t = tok.replace(/^0-0-0$/, 'O-O-O').replace(/^0-0$/, 'O-O').replace(/^o-o-o$/i, 'O-O-O').replace(/^o-o$/i, 'O-O');
  if (/^O-O(-O)?$/.test(t)) return [t];
  // promoción en español (=D, =T, =A, =C)
  const promo = t.match(/^(.*[a-h][18])=?([QRBNDTAC])$/);
  if (promo) t = `${promo[1]}=${({ D: 'Q', T: 'R', A: 'B', C: 'N' } as Record<string, string>)[promo[2]] ?? promo[2]}`;
  const first = t[0];
  const es: Record<string, string> = { C: 'N', A: 'B', T: 'R', D: 'Q' };
  if (es[first]) return [es[first] + t.slice(1)];
  if (first === 'R') {
    const asKing = 'K' + t.slice(1);
    if (lang === 'es') return [asKing];
    if (lang === 'en') return [t];
    return [t, asKing];
  }
  return [t];
}

function detectLang(tokens: string[]): 'es' | 'en' | '?' {
  const es = tokens.some((t) => /^[CATD]/.test(t) || /=[DTAC]/.test(t));
  const en = tokens.some((t) => /^[NBQK]/.test(t) || /=[NBQ]/.test(t));
  if (es && !en) return 'es';
  if (en && !es) return 'en';
  return '?';
}

/** Lee una línea de jugadas en notación inglesa o española. Dice exactamente qué jugada falla. */
export function parseMoves(text: string): ParseResult {
  const tokens = tokenize(text);
  const moves: string[] = [];
  if (!tokens.length) return { ok: false, error: 'No hay jugadas. Escribe algo como «1. e4 e5 2. Cf3 Cc6».', moves };
  const lang = detectLang(tokens);
  const chess = new Chess();
  for (const tok of tokens) {
    const i = moves.length;
    let done: Move | null = null;
    for (const c of candidates(tok, lang)) {
      try {
        done = chess.move(c);
        break;
      } catch {
        /* probar la siguiente forma */
      }
    }
    if (!done) {
      const who = i % 2 === 0 ? 'blancas' : 'negras';
      const num = Math.floor(i / 2) + 1;
      const looksLikeMove = /^([KQRBNCATD]?[a-h]?[1-8]?x?[a-h][1-8](=?[QRBNDTAC])?|O-O(-O)?|0-0(-0)?)$/i.test(tok);
      const error = looksLikeMove
        ? `La jugada ${num} de las ${who} («${tok}») no se puede hacer en esa posición.`
        : `No entiendo «${tok}» (jugada ${num} de las ${who}). Usa notación como e4, Cf3, Ac4 o 0-0.`;
      return { ok: false, error, moves };
    }
    moves.push(done.san);
  }
  return { ok: true, moves };
}

/** Frase corta que describe una jugada: "El caballo sale a f3." */
export function describeMove(m: Move): string {
  if (m.isKingsideCastle() || m.isQueensideCastle()) return '¡Enroque! El rey se pone a salvo y la torre sale.';
  if (m.captured) return `${cap(art(m.piece))} se come ${art(m.captured)} de ${m.to}.`;
  if (m.piece === 'p') return `El peón avanza a ${m.to}.`;
  return `${cap(art(m.piece))} va a ${m.to}.`;
}

/** FEN tras jugar las primeras `n` jugadas. */
export function fenAfter(moves: string[], n = moves.length): string {
  const c = new Chess();
  for (const m of moves.slice(0, n)) c.move(m);
  return c.fen();
}
