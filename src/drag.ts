// Arrastrar piezas en CUALQUIER tablero (.board con casillas [data-sq]).
//
// En vez de duplicar la lógica de cada tablero (partida, lecciones, retos,
// aperturas), el arrastre se traduce a los mismos dos toques que ya entienden:
// "toco la pieza" al empezar y "toco la casilla" al soltar. Así se conservan sus
// reglas, avisos y explicaciones, y tocar-tocar sigue funcionando igual.

const THRESHOLD = 8; // px que hay que mover el dedo para que cuente como arrastre

let start: { x: number; y: number; sq: string; pointerId: number } | null = null;
let ghost: HTMLElement | null = null;
let fromSq = '';
let lastDropAt = 0;

const squareAt = (x: number, y: number) =>
  document.elementFromPoint(x, y)?.closest<HTMLElement>('.board [data-sq]') ?? null;
const squareEl = (sq: string) => document.querySelector<HTMLElement>(`.board [data-sq="${sq}"]`);

/** true justo después de soltar una pieza arrastrada (para no animarla desde el origen). */
export const justDropped = () => Date.now() - lastDropAt < 400;

function beginDrag(e: PointerEvent): boolean {
  const sqEl = squareEl(start!.sq);
  if (!sqEl) return false;
  // primer "toque": seleccionar la pieza (si no lo estaba ya)
  if (!sqEl.classList.contains('selected')) sqEl.click();
  // el tablero se redibuja al seleccionar: volver a buscar la casilla
  const sel = squareEl(start!.sq);
  if (!sel?.classList.contains('selected')) return false; // no es una pieza que se pueda mover ahora
  const piece = sel.querySelector<HTMLElement>('.piece');
  if (!piece) return false;
  fromSq = start!.sq;
  const r = sel.getBoundingClientRect();
  ghost = document.createElement('div');
  ghost.className = 'drag-ghost';
  ghost.style.width = `${r.width}px`;
  ghost.style.height = `${r.height}px`;
  ghost.innerHTML = piece.innerHTML;
  document.body.appendChild(ghost);
  sel.classList.add('drag-src');
  moveGhost(e);
  return true;
}

function moveGhost(e: PointerEvent) {
  if (!ghost) return;
  ghost.style.transform = `translate(${e.clientX - ghost.offsetWidth / 2}px, ${e.clientY - ghost.offsetHeight * 0.65}px)`;
  document.querySelectorAll('.board .drag-over').forEach((el) => el.classList.remove('drag-over'));
  squareAt(e.clientX, e.clientY)?.classList.add('drag-over');
}

function finish(e: PointerEvent | null) {
  const target = e && ghost ? squareAt(e.clientX, e.clientY) : null;
  ghost?.remove();
  ghost = null;
  document.querySelectorAll('.board .drag-over, .board .drag-src').forEach((el) => el.classList.remove('drag-over', 'drag-src'));
  start = null;
  if (target && target.dataset.sq !== fromSq) {
    lastDropAt = Date.now();
    target.click(); // segundo "toque": la casilla de destino
  }
  fromSq = '';
}

/** Activa el arrastre para todos los tableros de la página. Se llama una vez. */
export function enableDrag() {
  document.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !e.isPrimary) return;
    const sq = (e.target as HTMLElement).closest<HTMLElement>('.board [data-sq]');
    if (!sq?.querySelector('.piece')) return;
    start = { x: e.clientX, y: e.clientY, sq: sq.dataset.sq!, pointerId: e.pointerId };
  });
  document.addEventListener('pointermove', (e) => {
    if (!start || e.pointerId !== start.pointerId) return;
    if (!ghost) {
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < THRESHOLD) return;
      if (!beginDrag(e)) {
        start = null;
        return;
      }
    }
    e.preventDefault();
    moveGhost(e);
  });
  document.addEventListener('pointerup', (e) => {
    if (!start || e.pointerId !== start.pointerId) return;
    if (ghost) {
      finish(e);
      // evitar que el navegador convierta este "soltar" en un click extra
      const swallow = (ev: Event) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      window.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
    } else {
      start = null; // era un toque normal: lo gestiona el click de siempre
    }
  });
  document.addEventListener('pointercancel', () => finish(null));
}
