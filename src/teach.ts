// Ayudas para aprender: piezas en peligro y explicaciones sencillas de las jugadas.
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { PIECE_VALUES, PIECE_NAMES, withArticle } from './pieces';

const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
const feminine = (t: PieceSymbol) => t === 'r' || t === 'q';
/** "tu caballo", "su torre" */
const yours = (t: PieceSymbol) => 'tu ' + PIECE_NAMES[t];
const theirs = (t: PieceSymbol) => 'su ' + PIECE_NAMES[t];

/**
 * ¿Puede el rival ganar esta pieza? Sí si está atacada y nadie la defiende,
 * o si la ataca una pieza que vale menos.
 */
export function isHanging(chess: Chess, sq: Square): boolean {
  const p = chess.get(sq);
  if (!p || p.type === 'k') return false;
  const attackers = chess.attackers(sq, other(p.color));
  if (attackers.length === 0) return false;
  const defenders = chess.attackers(sq, p.color);
  if (defenders.length === 0) return true;
  const cheapest = Math.min(...attackers.map((a) => PIECE_VALUES[chess.get(a)!.type]));
  return cheapest < PIECE_VALUES[p.type];
}

/** Casillas con piezas del color dado que están en peligro. */
export function piecesInDanger(chess: Chess, color: Color): Square[] {
  const out: Square[] = [];
  for (const row of chess.board()) {
    for (const p of row) {
      if (p && p.color === color && isHanging(chess, p.square)) out.push(p.square);
    }
  }
  return out;
}

/** Explica con una frase corta por qué una jugada es buena. */
export function explainMove(fen: string, uci: { from: string; to: string; promotion?: string }): string {
  const chess = new Chess(fen);
  const me = chess.turn();
  const dangerBefore = new Set(piecesInDanger(chess, me));
  let move: Move;
  try {
    move = chess.move(uci);
  } catch {
    return '¡Prueba esta jugada!';
  }
  const piece = move.piece;

  if (chess.isCheckmate()) return '¡Es jaque mate! Con esta jugada ganas la partida. 🏆';
  if (move.promotion) return '¡Tu peón llega al final y se convierte en dama! 👑';

  if (move.captured) {
    const safe = !isHanging(chess, move.to);
    const recapturable = chess.attackers(move.to, other(me)).length > 0;
    if (!recapturable) return `¡Come ${theirs(move.captured)} gratis! Nadie puede comerte de vuelta.`;
    if (PIECE_VALUES[move.captured] > PIECE_VALUES[piece])
      return `Cambia ${yours(piece)} por ${theirs(move.captured)}, ¡que vale más!`;
    if (safe) return `Come ${theirs(move.captured)}. Tu ${PIECE_NAMES[piece]} queda protegid${feminine(piece) ? 'a' : 'o'}.`;
    return `Come ${theirs(move.captured)}.`;
  }

  if (dangerBefore.has(move.from as Square) && !isHanging(chess, move.to))
    return `${cap(yours(piece))} estaba en peligro. ¡Ponl${feminine(piece) ? 'a' : 'o'} a salvo!`;

  if (move.isKingsideCastle() || move.isQueensideCastle())
    return 'Enroca: tu rey se esconde y tu torre sale a jugar. 🏰';

  // ¿Protege alguna pieza que estaba en peligro?
  const dangerAfter = new Set(piecesInDanger(chess, me));
  for (const sq of dangerBefore) {
    if (sq !== move.from && !dangerAfter.has(sq)) {
      return `Protege ${yours(chess.get(sq)!.type)}, que estaba en peligro.`;
    }
  }

  if (chess.inCheck()) return '¡Da jaque al rey! El rival tendrá que defenderse.';

  // ¿Ataca algo valioso?
  const target = threatened(chess, move.to as Square, me);
  if (target) return `Ataca ${theirs(target)}. ¡A ver cómo se defiende!`;

  if ((piece === 'n' || piece === 'b') && (move.from[1] === '1' || move.from[1] === '8'))
    return `Saca ${yours(piece)}: las piezas juegan mejor fuera de casa.`;
  if (piece === 'p' && ['d4', 'e4', 'd5', 'e5'].includes(move.to))
    return 'Pon un peón en el centro del tablero. ¡El centro es muy importante!';

  return `Mueve ${yours(piece)} a ${move.to}. ¡Es una buena jugada!`;
}

/** Pieza enemiga más valiosa que la pieza en `sq` ataca y puede ganar. */
function threatened(chess: Chess, sq: Square, me: Color): PieceSymbol | null {
  let best: PieceSymbol | null = null;
  // Miramos qué capturas tendría esta pieza si fuera su turno
  const fen = chess.fen().split(' ');
  fen[1] = me;
  fen[3] = '-';
  let probe: Chess;
  try {
    probe = new Chess(fen.join(' '));
  } catch {
    return null;
  }
  for (const m of probe.moves({ square: sq, verbose: true })) {
    if (!m.captured || m.captured === 'k') continue;
    const wins = PIECE_VALUES[m.captured] > PIECE_VALUES[m.piece] || isHanging(chess, m.to);
    if (wins && (!best || PIECE_VALUES[m.captured] > PIECE_VALUES[best])) best = m.captured;
  }
  return best;
}

/** Aviso después de mover si el niño ha dejado algo en peligro (solo con ayudas). */
export function warnAfterMove(chess: Chess, move: Move): string | null {
  const me = move.color;
  // ¿Puede el rival dar mate en 1?
  for (const reply of chess.moves({ verbose: true })) {
    chess.move(reply);
    const mate = chess.isCheckmate();
    chess.undo();
    if (mate) return '¡Cuidado! El rival puede darte jaque mate. ¿Quieres deshacer?';
  }
  if (isHanging(chess, move.to as Square))
    return `¡Ojo! ${cap(withArticle(move.piece))} que has movido se puede perder. ¿Quieres deshacer?`;
  const danger = piecesInDanger(chess, me);
  if (danger.length > 0) {
    const worst = danger
      .map((s) => chess.get(s)!.type)
      .sort((a, b) => PIECE_VALUES[b] - PIECE_VALUES[a])[0];
    if (PIECE_VALUES[worst] >= 300) return `¡Ojo! ${cap(yours(worst))} está en peligro (marcad${feminine(worst) ? 'a' : 'o'} en rojo).`;
  }
  return null;
}

/** Frase para contar qué ha hecho el ordenador. */
export function describeOpponentMove(move: Move): string {
  if (move.isKingsideCastle() || move.isQueensideCastle()) return 'Ha enrocado.';
  const what = move.captured ? ` ¡y te ha comido ${yours(move.captured)}!` : '.';
  return `Ha movido ${theirs(move.piece)} a ${move.to}${what}`;
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
