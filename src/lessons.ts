// Fase 2: Lecciones guiadas. Mapa de lecciones y pantalla de lección.
// El contenido está en `lessons/data.ts` y la lógica de los tableros libres en `lessons/engine.ts`.
import './lessons.css';
import { Chess, type Move, type PieceSymbol, type Square } from 'chess.js';
import type { Progress } from './storage';
import type { Theme } from './themes';
import { pieceSvg, PIECE_NAMES } from './pieces';
import { mascotSvg, MASCOT_NAME, PLAYER_NAME, type Mood } from './mascot';
import { sfx } from './sound';
import { LESSONS, parsePiece, POINTS, type ChessExercise, type FreeExercise, type Lesson } from './lessons/data';
import {
  applyFree,
  attackedBy,
  FILES,
  idx,
  legalFree,
  minMoves,
  name,
  pieceMoves,
  type FreeBoard,
  type FreePiece,
} from './lessons/engine';

export interface LessonsContext {
  app: HTMLElement;
  progress: Progress;
  persist: () => void;
  theme: Theme;
  goHome: () => void;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const art = (t: PieceSymbol) => (t === 'r' || t === 'q' ? 'la ' : 'el ') + PIECE_NAMES[t];
const starsHtml = (n: number) => '<i class="on">★</i>'.repeat(n) + '<i>★</i>'.repeat(3 - n);

/** Cómo se mueve cada pieza, para explicarlo cuando se equivoca. */
const HOW: Record<PieceSymbol, string> = {
  r: 'La torre va en línea recta: ↕️ ↔️.',
  b: 'El alfil va en diagonal ↗️ ↘️.',
  q: 'La dama va recta o en diagonal.',
  k: 'El rey solo da un pasito.',
  n: 'El caballo salta en L: dos y una.',
  p: 'El peón va hacia delante y come en diagonal.',
};

/** Estrellas de un ejercicio según los movimientos de más. */
function exerciseStars(used: number, min: number): number {
  const extra = used - min;
  return extra <= 0 ? 3 : extra <= 2 ? 2 : 1;
}

/** Cambia cada vez que se cambia de pantalla: invalida temporizadores pendientes. */
let screenToken = 0;

export function showLessons(ctx: LessonsContext) {
  const { app, progress, persist, theme } = ctx;
  // Según el curso: en 1º-2º van en orden; desde 3º las de movimiento de piezas (1-6) están
  // abiertas; en 5º-6º todas. El mapa recomienda la primera abierta sin estrellas.
  const openUpTo = progress.course >= 5 ? LESSONS.length : progress.course >= 3 ? 6 : 1;
  const unlocked = (i: number) => i < openUpTo || (progress.lessons[LESSONS[i - 1].id] ?? 0) > 0;

  // ───────────────────────────── Mapa de lecciones ─────────────────────────────
  function showMap() {
    screenToken++;
    const next = LESSONS.findIndex((l, i) => unlocked(i) && !progress.lessons[l.id]);
    const total = LESSONS.reduce((a, l) => a + (progress.lessons[l.id] ?? 0), 0);
    app.innerHTML = `
      <main class="screen lessons-map">
        <header class="topbar">
          <button class="btn icon" id="back" aria-label="Volver">⬅️</button>
          <h1>📚 Lecciones</h1>
          <span class="chip l-total" aria-label="${total} estrellas">⭐ ${total}/${LESSONS.length * 3}</span>
        </header>
        <div class="talk">
          <div class="mascot">${mascotSvg('happy')}</div>
          <p class="bubble">${
            next < 0 && total ? `¡Las has superado todas, ${PLAYER_NAME}! Repite las que quieras.` : openUpTo >= LESSONS.length
              ? '¡Elige la lección que quieras!'
              : openUpTo > 1
                ? '¡Elige una lección! Las de mover piezas ya están abiertas; las demás se abren al terminar la anterior.'
                : '¡Elige una lección! Al terminar una, se abre la siguiente.'
          }</p>
        </div>
        <ol class="l-map">
          ${LESSONS.map((l, i) => {
            const open = unlocked(i);
            const s = progress.lessons[l.id] ?? 0;
            return `<li><button class="l-card ${open ? '' : 'locked'} ${i === next ? 'l-next' : ''}" data-lesson="${i}" ${open ? '' : 'disabled'}
                aria-label="Lección ${i + 1}: ${l.title}${open ? `, ${s} de 3 estrellas` : ', cerrada'}">
              <span class="l-num">${i + 1}</span>
              <span class="l-icon">${open ? lessonIcon(l, theme) : '🔒'}</span>
              <strong>${l.title}</strong>
              <span class="rival-stars l-stars">${starsHtml(s)}</span>
            </button></li>`;
          }).join('')}
        </ol>
      </main>`;
    app.querySelector('#back')!.addEventListener('click', () => {
      screenToken++;
      ctx.goHome();
    });
    app.querySelectorAll<HTMLElement>('[data-lesson]').forEach((b) =>
      b.addEventListener('click', () => playLesson(Number(b.dataset.lesson))),
    );
  }

  // ───────────────────────────── Pantalla de lección ─────────────────────────────
  function playLesson(li: number) {
    const token = ++screenToken;
    const lesson: Lesson = LESSONS[li];
    const results: number[] = []; // estrellas de cada ejercicio
    let exIndex = -1; // -1 = introducción

    // estado del ejercicio actual
    let used = 0;
    let min = 1;
    let selected: string | null = null;
    let busy = false; // esperando a deshacer un intento o a la ventana de fin
    let last: { from: string; to: string } | null = null;
    let flash: string | null = null; // casilla que tiembla tras un error
    let popStar: string | null = null; // estrella recién recogida
    // tablero libre
    let free: FreeBoard = { mine: [], enemies: [] };
    let stars: string[] = [];
    // reglas completas
    let chess: Chess | null = null;

    app.innerHTML = `
      <main class="screen game lesson">
        <header class="topbar">
          <button class="btn icon" id="back" aria-label="Salir de la lección">⬅️</button>
          <h1><span class="l-title-icon">${lessonIcon(lesson, theme)}</span>${lesson.title}</h1>
          <span class="l-dots" id="dots"></span>
        </header>
        <div class="board-wrap"><div class="board" id="board"></div></div>
        <aside class="panel l-panel">
          <div class="talk">
            <div class="mascot" id="mascot"></div>
            <p class="bubble" id="bubble"></p>
          </div>
          <div class="l-info" id="info"></div>
          <div class="l-actions" id="actions"></div>
        </aside>
        <div class="overlay hidden" id="overlay"></div>
      </main>`;
    const boardEl = app.querySelector<HTMLElement>('#board')!;
    const bubble = app.querySelector<HTMLElement>('#bubble')!;
    const mascotEl = app.querySelector<HTMLElement>('#mascot')!;
    const dotsEl = app.querySelector<HTMLElement>('#dots')!;
    const infoEl = app.querySelector<HTMLElement>('#info')!;
    const actionsEl = app.querySelector<HTMLElement>('#actions')!;
    const overlay = app.querySelector<HTMLElement>('#overlay')!;
    const ex = () => lesson.exercises[exIndex];
    const later = (ms: number, fn: () => void) => setTimeout(() => token === screenToken && fn(), ms);

    function say(text: string, mood: Mood = 'happy') {
      bubble.textContent = text;
      mascotEl.innerHTML = mascotSvg(mood);
      mascotEl.classList.remove('pop');
      void mascotEl.offsetWidth; // reinicia la animación
      mascotEl.classList.add('pop');
    }

    function renderDots() {
      dotsEl.innerHTML = lesson.exercises
        .map((_, i) => `<i class="${i < exIndex || (i === exIndex && results[i]) ? 'done' : i === exIndex ? 'now' : ''}"></i>`)
        .join('');
      dotsEl.setAttribute('aria-label', exIndex < 0 ? 'Introducción' : `Ejercicio ${exIndex + 1} de ${lesson.exercises.length}`);
    }

    function renderInfo() {
      const values = lesson.demo.values
        ? `<div class="l-values">${(['p', 'n', 'b', 'r', 'q'] as PieceSymbol[])
            .map((t) => `<span><span class="mini">${pieceSvg(t, 'b', theme)}</span><b>${POINTS[t]}</b></span>`)
            .join('')}</div>`
        : '';
      const moves =
        exIndex >= 0
          ? `<div class="l-moves"><span>👣 Movimientos: <b>${used}</b></span><span>🎯 Mínimo: <b>${min}</b></span></div>`
          : '';
      infoEl.innerHTML = values + moves;
      infoEl.hidden = !values && !moves;
    }

    function renderActions() {
      actionsEl.innerHTML =
        exIndex < 0
          ? `<button class="btn primary big l-go" id="go">▶️ ¡A jugar!</button>`
          : `<button class="btn" id="retry">🔁 Reintentar</button><button class="btn" id="exit">🚪 Salir</button>`;
      actionsEl.querySelector('#go')?.addEventListener('click', () => startExercise(0));
      actionsEl.querySelector('#retry')?.addEventListener('click', () => {
        startExercise(exIndex);
        say('¡Empezamos otra vez! ' + ex().text, 'happy');
      });
      actionsEl.querySelector('#exit')?.addEventListener('click', showMap);
    }

    // ───────── Dibujo del tablero ─────────
    interface Cell {
      piece?: { type: PieceSymbol; color: 'w' | 'b' };
      cls: string[];
      extra?: string;
    }

    function drawBoard(cell: (sq: string) => Cell) {
      let html = '';
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const rank = 8 - r;
          const sq = FILES[f] + rank;
          const c = cell(sq);
          const light = (f + rank) % 2 === 0; // a1 oscura, h1 clara
          const cls = ['sq', light ? 'light' : 'dark', ...c.cls];
          if (last && (sq === last.from || sq === last.to)) cls.push('last');
          if (last && sq === last.to) cls.push('arrived');
          if (sq === selected) cls.push('selected');
          if (sq === flash) cls.push('l-no');
          const coordFile = r === 7 ? `<span class="coord file">${FILES[f]}</span>` : '';
          const coordRank = f === 0 ? `<span class="coord rank">${rank}</span>` : '';
          const p = c.piece;
          const fem = p && (p.type === 'r' || p.type === 'q');
          const label = p ? `${PIECE_NAMES[p.type]} ${p.color === 'w' ? (fem ? 'blanca' : 'blanco') : fem ? 'negra' : 'negro'} en ${sq}` : sq;
          html += `<button class="${cls.join(' ')}" data-sq="${sq}" aria-label="${label}${c.cls.includes('l-star') ? ', estrella' : ''}">${coordRank}${coordFile}${
            c.extra ?? ''
          }${p ? `<span class="piece">${pieceSvg(p.type, p.color, theme)}</span>` : ''}</button>`;
        }
      }
      boardEl.innerHTML = html;
      flash = null;
      popStar = null;
    }

    function freeCell(board: FreeBoard, opts: { stars?: string[]; marks?: Set<string>; attacked?: Set<string>; targets?: Set<string> }) {
      return (sq: string): Cell => {
        const i = idx(sq);
        const mine = board.mine.find((p) => p.sq === i);
        const enemy = board.enemies.find((p) => p.sq === i);
        const piece = mine ? { type: mine.type, color: 'w' as const } : enemy ? { type: enemy.type, color: 'b' as const } : undefined;
        const cls: string[] = [];
        let extra = '';
        if (opts.attacked?.has(sq)) cls.push('l-attacked');
        if (opts.marks?.has(sq)) cls.push('l-mark');
        if (opts.targets?.has(sq)) cls.push(enemy ? 'target-capture' : 'target');
        if (opts.stars?.includes(sq) && !piece) {
          cls.push('l-star');
          extra += '<span class="l-star-ico" aria-hidden="true">⭐</span>';
        }
        if (sq === popStar) extra += '<span class="l-star-pop" aria-hidden="true">⭐</span>';
        return { piece, cls, extra };
      };
    }

    // ───────── Introducción con demostración ─────────
    function showIntro() {
      exIndex = -1;
      selected = null;
      last = null;
      busy = false;
      chess = null;
      free = toBoard(lesson.demo.mine, lesson.demo.enemies);
      say(lesson.intro, 'happy');
      renderDots();
      renderInfo();
      renderActions();
      renderIntro();
    }

    function demoMarks(): Set<string> {
      if (lesson.demo.marks) return new Set(lesson.demo.marks);
      return new Set(legalFree(free, 0, false).map(name));
    }

    function renderIntro() {
      const marks = demoMarks();
      drawBoard(freeCell(free, { marks }));
      // las casillas se iluminan en ola desde la pieza
      const from = free.mine[0].sq;
      boardEl.querySelectorAll<HTMLElement>('.l-mark').forEach((el) => {
        const s = idx(el.dataset.sq!);
        const d = Math.max(Math.abs((s % 8) - (from % 8)), Math.abs(Math.floor(s / 8) - Math.floor(from / 8)));
        el.style.setProperty('--d', `${d * 90}ms`);
      });
    }

    function introTap(sq: string) {
      // Si la demostración es libre, se puede probar a mover la pieza
      if (lesson.demo.marks) return;
      if (demoMarks().has(sq)) {
        const from = name(free.mine[0].sq);
        free = applyFree(free, 0, idx(sq)).board;
        last = { from, to: sq };
        sfx.move();
        say('¡Eso es! Prueba otra casilla o pulsa «¡A jugar!».', 'happy');
        renderIntro();
      } else if (sq !== name(free.mine[0].sq)) {
        sfx.error();
        flash = sq;
        say(`Ahí no llega. ${HOW[free.mine[0].type]} Mira las casillas que brillan.`, 'think');
        renderIntro();
      }
    }

    // ───────── Ejercicios ─────────
    function startExercise(i: number) {
      exIndex = i;
      used = 0;
      selected = null;
      last = null;
      busy = false;
      overlay.classList.add('hidden');
      const e = ex();
      if (e.kind === 'free') {
        chess = null;
        free = toBoard(e.mine, e.enemies);
        stars = [...(e.stars ?? [])];
        min = e.best ? 1 : minMoves(free, { stars: stars.map(idx), eatAll: !!e.eatAll, safe: !!e.safe });
      } else {
        chess = new Chess(e.fen);
        min = 1;
      }
      say(`${i + 1}/${lesson.exercises.length}: ${e.text}`, 'happy');
      renderDots();
      renderInfo();
      renderActions();
      render();
    }

    function render() {
      if (exIndex < 0) return renderIntro();
      const e = ex();
      if (e.kind === 'free') {
        const attacked = e.safe ? new Set([...attackedBy(free.enemies).keys()].map(name)) : undefined;
        const sel = selected ? free.mine.findIndex((p) => name(p.sq) === selected) : -1;
        const targets = progress.helps && sel >= 0 ? new Set(legalFree(free, sel, !!e.safe).map(name)) : undefined;
        drawBoard(freeCell(free, { stars, attacked, targets }));
      } else {
        const c = chess!;
        const targets = progress.helps && selected ? c.moves({ square: selected as Square, verbose: true }) : [];
        const checkSq = c.inCheck() ? c.board().flat().find((p) => p?.type === 'k' && p.color === c.turn())?.square : null;
        drawBoard((sq) => {
          const p = c.get(sq as Square);
          const t = targets.find((m) => m.to === sq);
          const cls: string[] = [];
          if (sq === checkSq) cls.push('check');
          if (t) cls.push(t.captured ? 'target-capture' : 'target');
          return { piece: p ? { type: p.type, color: p.color } : undefined, cls };
        });
      }
    }

    function freeTap(e: FreeExercise, sq: string) {
      const i = idx(sq);
      const mineIdx = free.mine.findIndex((p) => p.sq === i);
      const enemy = free.enemies.find((p) => p.sq === i);
      if (mineIdx >= 0) {
        // tocar otra vez la pieza la deja elegida (con una sola pieza, quitarla confunde)
        selected = sq;
        sfx.select();
        return render();
      }
      if (!selected) {
        sfx.error();
        say(
          enemy
            ? `Esa pieza es del rival y no se mueve. Tú mueves las blancas.`
            : `Primero toca tu pieza 👆 y luego la casilla.`,
          'think',
        );
        return;
      }
      const from = free.mine.findIndex((p) => name(p.sq) === selected);
      const piece = free.mine[from];
      const legal = legalFree(free, from, !!e.safe);
      if (!legal.includes(i)) {
        sfx.error();
        flash = sq;
        say(whyNot(e, piece, i, enemy), 'think');
        return render();
      }

      // movimiento válido
      used++;
      const res = applyFree(free, from, i);
      const prev = free;
      free = res.board;
      last = { from: selected, to: sq };
      selected = free.mine.length === 1 ? sq : null; // con una sola pieza, sigue elegida
      const starHit = stars.indexOf(sq);
      if (starHit >= 0) {
        stars.splice(starHit, 1);
        popStar = sq;
      }

      if (e.best) {
        const best = bestCaptureValue(prev, !!e.safe);
        if (res.captured && POINTS[res.captured.type] === best) {
          sfx.capture();
          renderInfo();
          render();
          return win(`¡Ñam! ${cap(art(res.captured.type))} vale ${best}. ¡Era la mejor!`);
        }
        sfx.error();
        say(
          res.captured
            ? `${cap(art(res.captured.type))} vale ${POINTS[res.captured.type]}. ¡Hay otra que vale más!`
            : 'Así no comes nada. ¡Busca la pieza que más vale!',
          'think',
        );
        renderInfo();
        render();
        busy = true;
        later(1100, () => {
          free = prev;
          last = null;
          selected = null;
          busy = false;
          render();
        });
        return;
      }

      if (res.captured) sfx.capture();
      else if (popStar) sfx.hint();
      else sfx.move();
      renderInfo();
      render();

      const left = stars.length + (e.eatAll ? free.enemies.length : 0);
      if (left === 0) return win(res.promoted ? '¡Coronado! ¡Tu peón es una dama! 👑' : e.stars?.length ? '¡Todas las estrellas! ⭐' : '¡Te lo has comido todo! 😋');
      if (res.promoted) say('¡Tu peón se ha convertido en dama! 👑 Ahora es muy fuerte.', 'wow');
      else if (res.captured) say(`¡Ñam! Te has comido ${art(res.captured.type)}. ${leftText(left, e)}`, 'happy');
      else if (popStar) say(`¡Una estrella! ⭐ ${leftText(left, e)}`, 'happy');
      else say(leftText(left, e), 'happy');
    }

    function leftText(left: number, e: FreeExercise) {
      const what = e.eatAll && !e.stars?.length ? (left === 1 ? 'pieza' : 'piezas') : left === 1 ? 'estrella' : 'estrellas';
      return left === 1 ? `¡Te queda 1 ${what}!` : `Te quedan ${left} ${what}.`;
    }

    function whyNot(e: FreeExercise, piece: FreePiece, to: number, enemy?: FreePiece): string {
      const name0 = cap(art(piece.type));
      if (enemy?.type === 'k') return 'Al rey no se le puede comer. ¡Solo se le da jaque!';
      const occ = new Map<number, string>();
      for (const en of free.enemies) occ.set(en.sq, 'b');
      const moves = pieceMoves(piece.type, piece.sq, occ);
      if (moves.includes(to) && e.safe) {
        const by = attackedBy(free.enemies).get(to);
        return `¡Cuidado! Ahí te comería ${by ? art(by.type) : 'el rival'}. Busca casillas sin rojo.`;
      }
      if (piece.type === 'p') {
        const df = Math.abs((to % 8) - (piece.sq % 8));
        if (df === 1 && to - piece.sq > 0 && to - piece.sq < 16) return 'El peón solo va en diagonal para comer.';
        if (df === 0 && enemy) return 'El peón no puede comer hacia delante. ¡Come en diagonal!';
        return HOW.p;
      }
      // ¿se podría llegar con el tablero vacío? Entonces hay algo en medio
      if (pieceMoves(piece.type, piece.sq, new Map()).includes(to)) return `¡Hay una pieza en medio! ${name0} no puede saltar.`;
      return `${name0} no puede ir ahí. ${HOW[piece.type]}`;
    }

    function chessTap(e: ChessExercise, sq: Square) {
      const c = chess!;
      const p = c.get(sq);
      if (selected) {
        const moves = c.moves({ square: selected as Square, verbose: true });
        let m = moves.find((x) => x.to === sq);
        // tocar la torre propia con el rey elegido también enroca
        if (!m && p?.type === 'r' && p.color === 'w' && c.get(selected as Square)?.type === 'k') {
          m = moves.find((x) => (sq[0] === 'h' ? x.isKingsideCastle() : sq[0] === 'a' && x.isQueensideCastle()));
          if (!m && e.goal === 'castle') {
            sfx.error();
            flash = sq;
            say(castleWhyNot(c, sq[0] === 'h' ? 'k' : 'q'), 'think');
            selected = null;
            return render();
          }
        }
        if (m) return chessMove(e, m);
        if (sq === selected) {
          selected = null;
          return render();
        }
      }
      if (p && p.color === 'w') {
        selected = sq;
        sfx.select();
        if (c.moves({ square: sq }).length === 0) say(`${cap(art(p.type))} ahora no se puede mover. ¡Prueba con otra pieza!`, 'think');
        return render();
      }
      if (!selected) {
        sfx.error();
        say(p ? 'Esa pieza es del rival. Tú juegas con las blancas.' : 'Primero toca tu pieza 👆 y luego la casilla.', 'think');
        return;
      }
      const piece = c.get(selected as Square)!;
      sfx.error();
      flash = sq;
      if (piece.type === 'k' && selected === 'e1' && (sq === 'g1' || sq === 'c1')) say(castleWhyNot(c, sq === 'g1' ? 'k' : 'q'), 'think');
      else if (c.inCheck()) say('¡Así tu rey seguiría en jaque! Busca otra jugada.', 'think');
      else say(`${cap(art(piece.type))} no puede ir ahí. ${HOW[piece.type]}`, 'think');
      selected = null;
      render();
    }

    function castleWhyNot(c: Chess, side: 'k' | 'q'): string {
      const between = side === 'k' ? ['f1', 'g1'] : ['b1', 'c1', 'd1'];
      if (!c.getCastlingRights('w')[side === 'k' ? 'k' : 'q']) return 'Por ese lado no se puede enrocar.';
      if (between.some((s) => c.get(s as Square))) return 'Hay piezas en medio. ¡Prueba por el otro lado!';
      if (c.inCheck()) return 'No se puede enrocar estando en jaque.';
      return '¡El rey pasaría por una casilla atacada! Prueba por el otro lado.';
    }

    function chessMove(e: ChessExercise, m: Move) {
      const c = chess!;
      const move = c.move({ from: m.from, to: m.to, promotion: m.promotion ? 'q' : undefined });
      used++;
      selected = null;
      last = { from: move.from, to: move.to };
      if (c.inCheck()) sfx.check();
      else if (move.captured) sfx.capture();
      else sfx.move();
      renderInfo();
      render();

      let ok = false;
      let why = '';
      if (e.goal === 'check') {
        ok = c.inCheck();
        why = 'Eso no ataca al rey negro. ¡Prueba otra vez!';
      } else if (e.goal === 'mate') {
        ok = c.isCheckmate();
        why = c.inCheck() ? '¡Es jaque, pero el rey puede escapar! Busca el mate.' : 'Eso no es jaque. ¡El mate siempre es un jaque!';
      } else if (e.goal === 'castle') {
        ok = move.isKingsideCastle() || move.isQueensideCastle();
        why = 'Eso no es un enroque. Toca el rey y luego la casilla a dos pasos de él.';
      } else {
        ok = e.how === 'capture' ? !!move.captured : e.how === 'move' ? move.piece === 'k' : true;
        why = e.how === 'capture' ? 'Así también te salvas, pero intenta comerte la pieza que ataca.' : '¡Bien salvado! Pero esta vez mueve el rey.';
      }
      if (ok) {
        const msg =
          e.goal === 'check' ? '¡Jaque! 👑 ¡Muy bien!' : e.goal === 'mate' ? '¡JAQUE MATE! 🏆' : e.goal === 'castle' ? '¡Enroque perfecto! 🏰' : '¡Rey a salvo! 😅';
        return win(msg);
      }
      say(why, 'think');
      busy = true;
      later(1200, () => {
        c.undo();
        last = null;
        busy = false;
        render();
      });
    }

    // ───────── Fin de ejercicio y de lección ─────────
    function win(msg: string) {
      busy = true;
      const s = exerciseStars(used, min);
      results[exIndex] = s;
      renderDots();
      say(msg, 'wow');
      const lastOne = exIndex === lesson.exercises.length - 1;
      later(700, () => {
        sfx.hint();
        overlay.innerHTML = `
          <div class="card end-card l-card-ex">
            <div class="mascot big">${mascotSvg('wow')}</div>
            <h2>${msg}</h2>
            <p class="big-stars" aria-label="${s} de 3 estrellas">${starsHtml(s)}</p>
            <p>${
              s === 3
                ? used === 1
                  ? '¡A la primera! 🎯'
                  : `¡Perfecto! En ${used} movimientos, el mínimo.`
                : `Lo has hecho en ${used} movimientos. ¡Se puede en ${min}!`
            }</p>
            <div class="row">
              <button class="btn primary" id="next">${lastOne ? '🏁 Terminar' : '▶️ Siguiente'}</button>
              <button class="btn" id="again">🔁 Repetir</button>
            </div>
          </div>`;
        overlay.classList.remove('hidden');
        overlay.querySelector('#next')!.addEventListener('click', () => (lastOne ? finishLesson() : startExercise(exIndex + 1)));
        overlay.querySelector('#again')!.addEventListener('click', () => startExercise(exIndex));
      });
    }

    function finishLesson() {
      const s = Math.max(1, Math.floor(results.reduce((a, b) => a + b, 0) / results.length));
      const before = progress.lessons[lesson.id] ?? 0;
      const wasOpen = li + 1 < LESSONS.length && unlocked(li + 1);
      progress.lessons[lesson.id] = Math.max(before, s);
      persist();
      const nextLesson = LESSONS[li + 1];
      const newlyOpen = nextLesson && !wasOpen && unlocked(li + 1);
      sfx.win();
      confetti();
      overlay.innerHTML = `
        <div class="card end-card">
          <div class="mascot big">${mascotSvg('happy')}</div>
          <h2>¡Lección superada, ${PLAYER_NAME}! 🏆</h2>
          <p class="big-stars" aria-label="${s} de 3 estrellas">${starsHtml(s)}</p>
          <p>${s === 3 ? '¡Todo perfecto! Eres un crack.' : 'Repítela con menos movimientos para ganar 3 estrellas.'}</p>
          ${newlyOpen ? `<p class="unlock">🔓 ¡Nueva lección: ${nextLesson.title}!</p>` : ''}
          <div class="row">
            ${nextLesson ? `<button class="btn primary" id="nextl">▶️ Siguiente lección</button>` : ''}
            <button class="btn" id="again">🔁 Repetir</button>
            <button class="btn" id="map">📚 Lecciones</button>
          </div>
        </div>`;
      overlay.classList.remove('hidden');
      say(`¡Muy bien! ${MASCOT_NAME} está muy orgulloso.`, 'wow');
      overlay.querySelector('#nextl')?.addEventListener('click', () => playLesson(li + 1));
      overlay.querySelector('#again')!.addEventListener('click', () => playLesson(li));
      overlay.querySelector('#map')!.addEventListener('click', showMap);
    }

    // ───────── Eventos ─────────
    boardEl.addEventListener('click', (ev) => {
      const btn = (ev.target as HTMLElement).closest<HTMLElement>('[data-sq]');
      if (!btn || busy) return;
      const sq = btn.dataset.sq!;
      if (exIndex < 0) return introTap(sq);
      const e = ex();
      if (e.kind === 'free') freeTap(e, sq);
      else chessTap(e, sq as Square);
    });
    app.querySelector('#back')!.addEventListener('click', showMap);

    showIntro();
  }

  showMap();
}

function lessonIcon(l: Lesson, theme: Theme): string {
  return l.emoji ? `<span class="l-emoji">${l.emoji}</span>` : pieceSvg(l.icon, 'w', theme);
}

function toBoard(mine: string[], enemies: string[] = []): FreeBoard {
  const conv = (s: string) => {
    const p = parsePiece(s);
    return { type: p.type, sq: idx(p.sq) };
  };
  return { mine: mine.map(conv), enemies: enemies.map(conv) };
}

/** Valor de la mejor pieza que se puede comer de un movimiento. */
function bestCaptureValue(b: FreeBoard, safe: boolean): number {
  let best = 0;
  b.mine.forEach((_, i) => {
    for (const to of legalFree(b, i, safe)) {
      const e = b.enemies.find((x) => x.sq === to);
      if (e) best = Math.max(best, POINTS[e.type] ?? 0);
    }
  });
  return best;
}

function confetti() {
  const box = document.createElement('div');
  box.className = 'confetti';
  const colors = ['#ff5d73', '#ffcf3f', '#4cc9f0', '#7bd389', '#b28dff'];
  for (let i = 0; i < 80; i++) {
    const s = document.createElement('i');
    s.style.left = `${Math.random() * 100}%`;
    s.style.background = colors[i % colors.length];
    s.style.animationDelay = `${Math.random() * 0.8}s`;
    s.style.animationDuration = `${2 + Math.random() * 1.5}s`;
    box.appendChild(s);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 4000);
}
