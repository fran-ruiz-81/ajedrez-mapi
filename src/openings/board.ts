// Tablero de las aperturas: dibujo, flechas y piezas que se deslizan.
import type { Chess, Color, Move, Square } from 'chess.js';
import { pieceSvg, PIECE_NAMES } from '../pieces';
import type { Theme } from '../themes';

const FILES = 'abcdefgh';

export type ArrowKind = 'mine' | 'hint';

export interface BoardView {
  orientation: Color;
  selected?: string | null;
  targets?: Move[];
  hint?: { from: string; to: string } | null;
  flash?: string | null;
  arrow?: { from: string; to: string; kind: ArrowKind } | null;
}

/** Columna/fila en pantalla (0-7) de una casilla. */
function screenPos(sq: string, o: Color): [number, number] {
  const file = sq.charCodeAt(0) - 97;
  const rank = Number(sq[1]);
  return o === 'w' ? [file, 8 - rank] : [7 - file, rank - 1];
}

export function arrowSvg(from: string, to: string, o: Color, kind: ArrowKind, ms: number): string {
  const [x1, y1] = screenPos(from, o).map((v) => v + 0.5);
  const [x2, y2] = screenPos(to, o).map((v) => v + 0.5);
  const len = Math.hypot(x2 - x1, y2 - y1);
  const k = (len - 0.32) / len; // que la punta no tape la pieza
  const ex = x1 + (x2 - x1) * k;
  const ey = y1 + (y2 - y1) * k;
  const draw = ms ? `style="--len:${len.toFixed(3)};--ms:${ms}ms"` : '';
  const id = `o-head-${kind}`;
  return `<svg class="move-arrow o-arrow-${kind} ${ms ? 'drawing' : ''}" viewBox="0 0 8 8" aria-hidden="true" ${draw}>
    <defs><marker id="${id}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 Z" fill="currentColor"/></marker></defs>
    <line x1="${x1}" y1="${y1}" x2="${ex.toFixed(3)}" y2="${ey.toFixed(3)}" stroke="currentColor" stroke-width=".16"
      stroke-linecap="round" marker-end="url(#${id})" pathLength="${len.toFixed(3)}"/></svg>`;
}

/** Pinta el tablero. Si se pasa `anim`, la pieza de esa jugada llega deslizándose. */
export function drawBoard(el: HTMLElement, chess: Chess, theme: Theme, v: BoardView, anim?: { move: Move; ms: number }) {
  const last = chess.history({ verbose: true }).at(-1);
  const checkSq = chess.inCheck()
    ? chess.board().flat().find((p) => p?.type === 'k' && p.color === chess.turn())?.square
    : null;
  let html = '';
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const file = v.orientation === 'w' ? f : 7 - f;
      const rank = v.orientation === 'w' ? 8 - r : r + 1;
      const sq = (FILES[file] + rank) as Square;
      const p = chess.get(sq);
      const t = v.targets?.find((m) => m.to === sq);
      const cls = [
        'sq',
        (file + rank) % 2 === 0 ? 'light' : 'dark', // a1 oscura, h1 clara
        last && (sq === last.from || sq === last.to) && 'last',
        sq === v.selected && 'selected',
        sq === checkSq && 'check',
        v.hint && (sq === v.hint.from || sq === v.hint.to) && 'hint',
        t && (t.captured ? 'target-capture' : 'target'),
        sq === v.flash && 'o-no',
        last && sq === last.to && !anim && 'arrived',
      ]
        .filter(Boolean)
        .join(' ');
      const coordFile = r === 7 ? `<span class="coord file">${FILES[file]}</span>` : '';
      const coordRank = f === 0 ? `<span class="coord rank">${rank}</span>` : '';
      const fem = p && (p.type === 'r' || p.type === 'q');
      const label = p ? `${PIECE_NAMES[p.type]} ${p.color === 'w' ? (fem ? 'blanca' : 'blanco') : fem ? 'negra' : 'negro'} en ${sq}` : sq;
      html += `<button class="${cls}" data-sq="${sq}" aria-label="${label}">${coordRank}${coordFile}${
        p ? `<span class="piece">${pieceSvg(p.type, p.color, theme)}</span>` : ''
      }</button>`;
    }
  }
  if (v.arrow) html += arrowSvg(v.arrow.from, v.arrow.to, v.orientation, v.arrow.kind, anim ? anim.ms : 0);
  el.innerHTML = html;
  if (anim && anim.ms) animateMove(el, anim.move, anim.ms, theme);
}

function slide(board: HTMLElement, from: string, to: string, ms: number) {
  const fromEl = board.querySelector<HTMLElement>(`[data-sq="${from}"]`);
  const toSq = board.querySelector<HTMLElement>(`[data-sq="${to}"]`);
  const piece = toSq?.querySelector<HTMLElement>('.piece:not(.ghost)');
  if (!fromEl || !toSq || !piece) return;
  const a = fromEl.getBoundingClientRect();
  const b = toSq.getBoundingClientRect();
  toSq.classList.add('moving');
  piece
    .animate(
      [
        { transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(1.18)` },
        { transform: `translate(${(a.left - b.left) * 0.15}px, ${(a.top - b.top) * 0.15}px) scale(1.18)`, offset: 0.85 },
        { transform: 'translate(0, 0) scale(1)' },
      ],
      { duration: ms, easing: 'cubic-bezier(.45, 0, .25, 1)' },
    )
    .finished.then(() => toSq.classList.remove('moving'))
    .catch(() => {});
}

function animateMove(board: HTMLElement, m: Move, ms: number, theme: Theme) {
  const to = board.querySelector<HTMLElement>(`[data-sq="${m.to}"]`);
  if (m.captured && to && !m.isEnPassant()) {
    // la pieza comida se queda visible y se desvanece cuando llega la otra
    const ghost = document.createElement('span');
    ghost.className = 'piece ghost';
    ghost.innerHTML = pieceSvg(m.captured, m.color === 'w' ? 'b' : 'w', theme);
    to.prepend(ghost);
    ghost
      .animate(
        [{ opacity: 1, transform: 'scale(1)' }, { opacity: 1, transform: 'scale(1)', offset: 0.8 }, { opacity: 0, transform: 'scale(.4) rotate(-20deg)' }],
        { duration: ms, fill: 'forwards' },
      )
      .finished.then(() => ghost.remove())
      .catch(() => {});
  }
  slide(board, m.from, m.to, ms);
  if (m.isKingsideCastle() || m.isQueensideCastle()) {
    const r = m.to[1];
    const king = m.isKingsideCastle();
    slide(board, `${king ? 'h' : 'a'}${r}`, `${king ? 'f' : 'd'}${r}`, ms);
  }
}
