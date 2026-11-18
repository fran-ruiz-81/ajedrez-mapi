// Animación de jugadas, compartida por todos los tableros: la pieza se desliza desde
// su casilla de origen y la pieza comida se desvanece cuando llega la otra.
import type { Move } from 'chess.js';
import { pieceSvg } from './pieces';
import type { Theme } from './themes';

/** Desliza la pieza ya dibujada en `to` desde la casilla `from`. */
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

/** Anima la jugada `m`, que ya está hecha y dibujada en `board`. Con `ms` = 0 no hace nada. */
export function animateMove(board: HTMLElement, m: Move, ms: number, theme: Theme) {
  if (!ms) return;
  const to = board.querySelector<HTMLElement>(`[data-sq="${m.to}"]`);
  to?.classList.remove('arrived');
  if (m.captured && to && !m.isEnPassant()) {
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
