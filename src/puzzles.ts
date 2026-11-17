// Fase 3: Retos (puzzles). Mapa de colecciones, lista de retos y pantalla de reto.
// Las colecciones están en `puzzles/collections.ts` y las posiciones en `puzzles/data.ts`
// (todas comprobadas con Stockfish por `node src/puzzles/verify.mjs`).
import './puzzles.css';
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import type { Progress } from './storage';
import type { Theme } from './themes';
import type { Rival } from './rivals';
import type { GameOpts } from './main';
import { pieceSvg, PIECE_NAMES } from './pieces';
import { mascotSvg, MASCOT_NAME, PLAYER_NAME, type Mood } from './mascot';
import { sfx } from './sound';
import { sanEs, showNotation } from './level';
import { COLLECTIONS, TIERS, type CollectionInfo } from './puzzles/collections';
import { PUZZLES, type Puzzle } from './puzzles/data';

export interface SectionContext {
  app: HTMLElement;
  progress: Progress;
  persist: () => void;
  theme: Theme;
  goHome: () => void;
  /** Abre una partida (p. ej. contra el ordenador desde una posición). */
  startGame: (opts: GameOpts) => void;
  rivals: Rival[];
}

const FILES = 'abcdefgh';
const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const fem = (t: PieceSymbol) => t === 'r' || t === 'q';
const art = (t: PieceSymbol) => (fem(t) ? 'la ' : 'el ') + PIECE_NAMES[t];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const lo = (t: PieceSymbol) => (fem(t) ? 'la' : 'lo');
const starsHtml = (n: number) => '<i class="on">★</i>'.repeat(n) + '<i>★</i>'.repeat(3 - n);
const colorName = (c: Color) => (c === 'w' ? 'blancas' : 'negras');
const uci = (m: string) => ({ from: m.slice(0, 2) as Square, to: m.slice(2, 4) as Square, promotion: m[4] || undefined });
const puzzlesOf = (c: CollectionInfo): Puzzle[] => PUZZLES[c.id] ?? [];

/** Cambia cada vez que se cambia de pantalla: invalida temporizadores pendientes. */
let screenToken = 0;

export function showPuzzles(ctx: SectionContext) {
  const { app, progress, persist, theme } = ctx;
  const notation = showNotation(progress.course);
  const starsOf = (c: CollectionInfo) => puzzlesOf(c).reduce((a, p) => a + (progress.puzzles[p.id] ?? 0), 0);

  // Las colecciones de su curso (y de cursos anteriores) están abiertas. Las de mayores se abren
  // también si consigue una media de 2 estrellas en todos los retos de los grupos anteriores.
  function tierNeed(min: number): number {
    const lower = COLLECTIONS.filter((c) => c.course < min);
    const max = lower.reduce((a, c) => a + puzzlesOf(c).length * 2, 0);
    const got = lower.reduce((a, c) => a + starsOf(c), 0);
    return Math.max(0, max - got);
  }
  const isOpen = (c: CollectionInfo) => progress.course >= c.course || tierNeed(c.course) === 0;

  /** El reto del día: el mismo durante todo el día, elegido entre los de su curso. */
  function daily(): { ci: number; pi: number } | null {
    const all: { ci: number; pi: number }[] = [];
    COLLECTIONS.forEach((c, ci) => progress.course >= c.course && puzzlesOf(c).forEach((_, pi) => all.push({ ci, pi })));
    if (!all.length) return null;
    const d = new Date();
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    let h = 2166136261;
    for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return all[(h >>> 0) % all.length];
  }

  // ───────────────────────────── Mapa de colecciones ─────────────────────────────
  function showMap() {
    screenToken++;
    const open = COLLECTIONS.filter(isOpen);
    const total = open.reduce((a, c) => a + starsOf(c), 0);
    const max = open.reduce((a, c) => a + puzzlesOf(c).length * 3, 0);
    const day = daily();
    const dayP = day && puzzlesOf(COLLECTIONS[day.ci])[day.pi];
    const dayStars = dayP ? (progress.puzzles[dayP.id] ?? 0) : 0;
    const tiers = TIERS.filter((t) => COLLECTIONS.some((c) => c.course === t.course));
    app.innerHTML = `
      <main class="screen puzzles-map">
        <header class="topbar">
          <button class="btn icon" id="back" aria-label="Volver">⬅️</button>
          <h1>🧩 Retos</h1>
          <span class="chip p-total" aria-label="${total} estrellas">⭐ ${total}/${max}</span>
        </header>
        <div class="talk">
          <div class="mascot" id="mascot">${mascotSvg('happy')}</div>
          <p class="bubble" id="bubble">¡Hola, ${PLAYER_NAME}! Elige un tema. Los retos van de fácil a difícil.</p>
        </div>
        ${
          dayP
            ? `<button class="btn big menu-btn p-daily" id="daily">
                <span class="ico" aria-hidden="true">📅</span>
                <span class="lbl">Reto del día<em>${dayStars ? '¡Hecho! Vuelve mañana a por otro.' : `${COLLECTIONS[day!.ci].emoji} ${COLLECTIONS[day!.ci].title}`}</em></span>
                <span class="rival-stars p-daily-stars">${starsHtml(dayStars)}</span>
              </button>`
            : ''
        }
        ${tiers
          .map((t) => {
            const cols = COLLECTIONS.map((c, ci) => ({ c, ci })).filter(({ c }) => c.course === t.course);
            const mine = progress.course >= t.course;
            const opened = cols.every(({ c }) => isOpen(c));
            const title = mine ? (t.course === 1 ? 'Tus retos' : `Retos de ${t.label}`) : `Para mayores · ${t.label} 🎓`;
            return `<section class="p-tier ${opened ? '' : 'p-tier-locked'}">
              <h2>${title}</h2>
              ${
                !opened
                  ? `<p class="p-tier-note">🔒 Se abren con <b>${tierNeed(t.course)} ⭐</b> más en los anteriores. ¡Tú puedes!</p>`
                  : !mine
                    ? `<p class="p-tier-note">🔓 ¡Los has abierto tú con tus estrellas!</p>`
                    : ''
              }
              <ul class="p-cols">${cols.map(({ c, ci }) => colCard(c, ci, opened)).join('')}</ul>
            </section>`;
          })
          .join('')}
        <p class="p-credit">Muchos retos vienen de partidas reales de <b>lichess.org</b> (dominio público).</p>
      </main>`;
    app.querySelector('#back')!.addEventListener('click', () => {
      screenToken++;
      ctx.goHome();
    });
    app.querySelector('#daily')?.addEventListener('click', () => playPuzzle(day!.ci, day!.pi, true));
    app.querySelectorAll<HTMLElement>('[data-col]').forEach((b) =>
      b.addEventListener('click', () => {
        const c = COLLECTIONS[Number(b.dataset.col)];
        if (isOpen(c)) return showCollection(Number(b.dataset.col));
        sfx.select();
        const tier = TIERS.find((t) => t.course === c.course)!;
        const bubble = app.querySelector<HTMLElement>('#bubble')!;
        const m = app.querySelector<HTMLElement>('#mascot')!;
        bubble.textContent = `«${c.title}» es de ${tier.label}. ¡Consigue ${tierNeed(c.course)} ⭐ más en tus retos y se abre! 💪`;
        m.innerHTML = mascotSvg('think');
        m.classList.remove('pop');
        void m.offsetWidth;
        m.classList.add('pop');
      }),
    );
  }

  function colCard(c: CollectionInfo, ci: number, opened: boolean): string {
    const list = puzzlesOf(c);
    const s = starsOf(c);
    const done = list.filter((p) => progress.puzzles[p.id]).length;
    const pct = list.length ? Math.round((done / list.length) * 100) : 0;
    return `<li><button class="p-col ${opened ? '' : 'locked'}" data-col="${ci}"
        aria-label="${c.title}: ${opened ? `${done} de ${list.length} retos, ${s} estrellas` : 'cerrada, para mayores'}">
      <span class="p-col-icon">${opened ? c.emoji : '🔒'}</span>
      <span class="p-col-text">
        <strong>${c.title}</strong>
        <small>${c.blurb}</small>
        <span class="p-bar" aria-hidden="true"><i style="width:${pct}%"></i></span>
      </span>
      <span class="p-col-stars">⭐ ${s}<small>/${list.length * 3}</small></span>
    </button></li>`;
  }

  // ───────────────────────────── Retos de una colección ─────────────────────────────
  function showCollection(ci: number) {
    screenToken++;
    const c = COLLECTIONS[ci];
    const list = puzzlesOf(c);
    const next = list.findIndex((p) => !progress.puzzles[p.id]);
    app.innerHTML = `
      <main class="screen puzzles-map">
        <header class="topbar">
          <button class="btn icon" id="back" aria-label="Volver a los retos">⬅️</button>
          <h1>${c.emoji} ${c.title}</h1>
          <span class="chip p-total">⭐ ${starsOf(c)}/${list.length * 3}</span>
        </header>
        <div class="talk">
          <div class="mascot">${mascotSvg(next < 0 ? 'wow' : 'happy')}</div>
          <p class="bubble">${
            next < 0 ? '¡Los has resuelto todos! Repite los que tengan menos estrellas.' : `${c.blurb}. Van de fácil a difícil. ¡Elige uno!`
          }</p>
        </div>
        <ol class="p-list">
          ${list
            .map((p, pi) => {
              const s = progress.puzzles[p.id] ?? 0;
              return `<li><button class="p-num ${s ? 'done' : ''} ${pi === next ? 'p-next' : ''}" data-p="${pi}" aria-label="Reto ${pi + 1}, ${s} de 3 estrellas">
                <b>${pi + 1}</b><span class="rival-stars">${starsHtml(s)}</span></button></li>`;
            })
            .join('')}
        </ol>
      </main>`;
    app.querySelector('#back')!.addEventListener('click', showMap);
    app.querySelectorAll<HTMLElement>('[data-p]').forEach((b) => b.addEventListener('click', () => playPuzzle(ci, Number(b.dataset.p))));
  }

  // ───────────────────────────── Pantalla de reto ─────────────────────────────
  function playPuzzle(ci: number, pi: number, isDaily = false) {
    const token = ++screenToken;
    const col = COLLECTIONS[ci];
    const list = puzzlesOf(col);
    const p = list[pi];
    const chess = new Chess(p.fen);
    const kid: Color = p.setup ? (chess.turn() === 'w' ? 'b' : 'w') : chess.turn();
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const CPU_MS = reduceMotion ? 0 : 800;
    const KID_MS = reduceMotion ? 0 : 220;

    let step = 0; // índice en p.moves de la jugada que toca
    let selected: Square | null = null;
    let last: { from: string; to: string } | null = null;
    let flash: string | null = null;
    let busy = true;
    let hintLevel = 0; // 0 nada, 1 la pieza, 2 también la casilla
    let hints = 0;
    let mistakes = 0;

    app.innerHTML = `
      <main class="screen game puzzle">
        <header class="topbar">
          <button class="btn icon" id="back" aria-label="Salir del reto">⬅️</button>
          <h1>${isDaily ? '📅 Reto del día' : `${col.emoji} ${col.title}`}</h1>
          <span class="chip p-count">${isDaily ? `${col.emoji}` : `${pi + 1}/${list.length}`}</span>
        </header>
        <div class="board-wrap"><div class="board" id="board"></div></div>
        <aside class="panel p-panel">
          <div class="talk">
            <div class="mascot" id="mascot"></div>
            <p class="bubble" id="bubble"></p>
          </div>
          <div class="p-info" id="info"></div>
          <div class="p-actions">
            <button class="btn" id="hint">💡 Pista</button>
            <button class="btn" id="exit">🧩 Retos</button>
          </div>
        </aside>
        <div class="overlay hidden" id="overlay"></div>
      </main>`;
    const boardEl = app.querySelector<HTMLElement>('#board')!;
    const bubble = app.querySelector<HTMLElement>('#bubble')!;
    const mascotEl = app.querySelector<HTMLElement>('#mascot')!;
    const infoEl = app.querySelector<HTMLElement>('#info')!;
    const hintBtn = app.querySelector<HTMLElement>('#hint')!;
    const overlay = app.querySelector<HTMLElement>('#overlay')!;
    const later = (ms: number, fn: () => void) => setTimeout(() => token === screenToken && fn(), ms);
    const back = () => (isDaily ? showMap() : showCollection(ci));

    function say(text: string, mood: Mood = 'happy') {
      bubble.textContent = text;
      mascotEl.innerHTML = mascotSvg(mood);
      mascotEl.classList.remove('pop');
      void mascotEl.offsetWidth; // reinicia la animación
      mascotEl.classList.add('pop');
    }

    const potential = () => Math.max(1, 3 - mistakes - hints);
    const kidTotal = (p.moves.length + 1) / 2;
    function renderInfo() {
      const s = potential();
      infoEl.innerHTML = `
        <span class="p-side"><span class="mini">${pieceSvg('k', kid, theme)}</span>Juegas con ${colorName(kid)}</span>
        ${kidTotal > 1 ? `<span class="p-step">Jugada <b>${Math.min(kidTotal, step / 2 + 1)}</b> de ${kidTotal}</span>` : ''}
        <span class="rival-stars p-pot" aria-label="Puedes ganar ${s} estrellas">${starsHtml(s)}</span>`;
    }

    // ───────── Tablero ─────────
    const hintSquares = (): string[] => {
      if (!hintLevel || step >= p.moves.length) return [];
      const m = p.moves[step];
      return hintLevel === 1 ? [m.slice(0, 2)] : [m.slice(0, 2), m.slice(2, 4)];
    };
    function render(anim?: { move: Move; ms: number }) {
      const targets = progress.helps && selected ? chess.moves({ square: selected, verbose: true }) : [];
      const checkSq = chess.inCheck() ? chess.board().flat().find((x) => x?.type === 'k' && x.color === chess.turn())?.square : null;
      const hint = hintSquares();
      let html = '';
      for (let row = 0; row < 8; row++) {
        for (let colI = 0; colI < 8; colI++) {
          const f = kid === 'w' ? colI : 7 - colI;
          const rank = kid === 'w' ? 8 - row : row + 1;
          const sq = (FILES[f] + rank) as Square;
          const pc = chess.get(sq);
          const cls = ['sq', (f + rank) % 2 === 0 ? 'light' : 'dark']; // a1 oscura, h1 clara
          if (last && (sq === last.from || sq === last.to)) cls.push('last');
          if (last && sq === last.to && !anim) cls.push('arrived');
          if (sq === selected) cls.push('selected');
          if (sq === checkSq) cls.push('check');
          if (hint.includes(sq)) cls.push('hint');
          if (sq === flash) cls.push('p-no');
          const t = targets.find((m) => m.to === sq);
          if (t) cls.push(t.captured ? 'target-capture' : 'target');
          const coordFile = row === 7 ? `<span class="coord file">${FILES[f]}</span>` : '';
          const coordRank = colI === 0 ? `<span class="coord rank">${rank}</span>` : '';
          const label = pc ? `${PIECE_NAMES[pc.type]} ${pc.color === 'w' ? (fem(pc.type) ? 'blanca' : 'blanco') : fem(pc.type) ? 'negra' : 'negro'} en ${sq}` : sq;
          html += `<button class="${cls.join(' ')}" data-sq="${sq}" aria-label="${label}">${coordRank}${coordFile}${
            pc ? `<span class="piece">${pieceSvg(pc.type, pc.color, theme)}</span>` : ''
          }</button>`;
        }
      }
      boardEl.innerHTML = html;
      flash = null;
      if (anim) animateMove(anim.move, anim.ms);
    }

    /** Desliza una pieza ya dibujada en `to` desde la casilla `from`. */
    function slide(from: string, to: string, ms: number) {
      const fromEl = boardEl.querySelector<HTMLElement>(`[data-sq="${from}"]`);
      const toSq = boardEl.querySelector<HTMLElement>(`[data-sq="${to}"]`);
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

    function animateMove(m: Move, ms: number) {
      if (!ms) return;
      const to = boardEl.querySelector<HTMLElement>(`[data-sq="${m.to}"]`);
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
      slide(m.from, m.to, ms);
      if (m.isKingsideCastle() || m.isQueensideCastle()) {
        const r = m.to[1];
        const king = m.isKingsideCastle();
        slide(`${king ? 'h' : 'a'}${r}`, `${king ? 'f' : 'd'}${r}`, ms);
      }
    }

    function moveSound(m: Move) {
      if (chess.inCheck()) sfx.check();
      else if (m.captured) sfx.capture();
      else sfx.move();
    }

    // ───────── Enunciado ─────────
    function goalText(): string {
      const n = kidTotal;
      switch (col.goal) {
        case 'mate':
          return n === 1 ? '¡Da jaque mate en 1!' : `¡Da jaque mate en ${n} jugadas!`;
        case 'free':
          return '¡Hay una pieza gratis! Cómetela.';
        case 'save': {
          const t = chess.get(uci(p.moves[0]).from)!.type;
          return `¡Atacan a tu ${PIECE_NAMES[t]}! Pon${lo(t)} a salvo.`;
        }
        case 'checkwin':
          return '¡Da un jaque que te haga ganar algo!';
        case 'fork':
          return '¡Busca una jugada que ataque dos piezas a la vez!';
        case 'pin':
          return '¡Aprovecha la clavada y gana material!';
        case 'material':
          return '¡Gana material en 2 jugadas!';
        default:
          return '¡Busca la combinación ganadora!';
      }
    }
    const prompt = () => `Juegan ${colorName(kid)}. ${goalText()}`;

    function nextText(): string {
      const left = (p.moves.length - step + 1) / 2;
      if (col.goal === 'mate') return left === 1 ? '¡Ahora dale jaque mate!' : `¡Sigue! Mate en ${left}.`;
      if (col.goal === 'checkwin' || col.goal === 'fork') return '¡Ahora llévate el premio! 🎁';
      return left === 1 ? '¡Sigue! Te queda una jugada.' : `¡Sigue! Te quedan ${left} jugadas.`;
    }

    // ───────── Jugadas del rival ─────────
    function rivalMove(m: string, then: () => void) {
      busy = true;
      const mv = chess.move(uci(m));
      last = { from: mv.from, to: mv.to };
      render({ move: mv, ms: CPU_MS });
      moveSound(mv);
      later(CPU_MS + 150, () => {
        busy = false;
        then();
      });
    }

    // ───────── ¿Por qué no? ─────────
    function explain(fenBefore: string, m: Move): string {
      const c = new Chess(fenBefore);
      c.move(m);
      const opp: Color = kid === 'w' ? 'b' : 'w';
      const replies = c.moves({ verbose: true });
      const matesMe = replies.some((r) => {
        c.move(r);
        const mate = c.isCheckmate();
        c.undo();
        return mate;
      });
      if (matesMe) return '¡Cuidado! Así el rival te daría jaque mate. 😱';
      const expected = uci(p.moves[step]);
      if (col.goal === 'mate') {
        if (c.inCheck()) {
          const esc = replies.filter((r) => r.piece === 'k');
          if (esc.length) return `Es jaque, pero el rey puede escapar a ${esc[0].to}.`;
          if (replies.some((r) => r.to === m.to)) return `Es jaque, pero te pueden comer ${art(m.piece)} en ${m.to}.`;
          return 'Es jaque, pero el rival puede tapar el jaque. ¡Busca otro!';
        }
        const e = new Chess(fenBefore);
        e.move(expected);
        return e.inCheck() ? 'Eso no es jaque. ¡Busca un jaque sin escapatoria!' : 'Así el rival tiene tiempo de defenderse. ¡Busca otra jugada!';
      }
      // ¿se queda colgada la pieza que ha movido?
      const attackers = c.attackers(m.to, opp);
      const defended = c.attackers(m.to, kid).length > 0;
      const cheaper = attackers.some((s) => VALUE[c.get(s)!.type] < VALUE[m.piece]);
      if (m.piece !== 'k' && attackers.length && (!defended || cheaper)) {
        if (col.goal === 'save' && m.from === expected.from) return `Ahí también te ${lo(m.piece)} comen. ¡Busca una casilla segura!`;
        if (m.captured && VALUE[m.captured] < VALUE[m.piece])
          return `${cap(art(m.captured))} estaba defendid${fem(m.captured) ? 'a' : 'o'}: te comerían ${art(m.piece)}.`;
        return `Ahí te pueden comer ${art(m.piece)}. 😬`;
      }
      switch (col.goal) {
        case 'save': {
          const t = new Chess(fenBefore).get(expected.from)!.type;
          return `¡${cap(art(t))} sigue en peligro! Muéve${lo(t)} a una casilla segura.`;
        }
        case 'free':
          return m.captured ? '¡Ñam! Pero hay otra pieza mejor y sin defender.' : 'Así no comes nada. ¡Busca la pieza que nadie defiende!';
        case 'checkwin':
          return c.inCheck() ? 'Es jaque, pero así no ganas nada. ¡Busca otro jaque!' : 'Eso no es jaque. ¡Empieza con un jaque!';
        case 'fork':
          return 'Así no atacas dos piezas a la vez. ¡Mira otra vez!';
        case 'pin':
          return 'Así no aprovechas la clavada. ¿Qué pieza rival no se puede mover?';
        default:
          return 'Hay una jugada mejor. ¡Mira bien todo el tablero! 🔍';
      }
    }

    // ───────── Toques en el tablero ─────────
    function tap(sq: Square) {
      const pc = chess.get(sq);
      if (selected) {
        const m = chess.moves({ square: selected, verbose: true }).find((x) => x.to === sq);
        if (m) return tryMove(m);
        if (sq === selected) {
          selected = null;
          return render();
        }
      }
      if (pc && pc.color === kid) {
        selected = sq;
        sfx.select();
        if (chess.moves({ square: sq }).length === 0) say(`${cap(art(pc.type))} ahora no se puede mover. ¡Prueba con otra pieza!`, 'think');
        return render();
      }
      if (!selected) {
        sfx.error();
        say(pc ? `Esa pieza es del rival. Tú juegas con ${colorName(kid)}.` : 'Primero toca tu pieza 👆 y luego la casilla.', 'think');
        return;
      }
      const piece = chess.get(selected)!;
      sfx.error();
      flash = sq;
      say(chess.inCheck() ? '¡Así tu rey seguiría en jaque! Busca otra jugada.' : `${cap(art(piece.type))} no puede ir ahí.`, 'think');
      selected = null;
      render();
    }

    function tryMove(m: Move) {
      const want = uci(p.moves[step]);
      const fenBefore = chess.fen();
      const isLastKid = step === p.moves.length - 1;
      let ok = m.from === want.from && m.to === want.to;
      const mv = chess.move({ from: m.from, to: m.to, promotion: ok ? want.promotion : m.promotion ? 'q' : undefined });
      if (!ok && col.goal === 'mate' && isLastKid && chess.isCheckmate()) ok = true; // cualquier mate vale
      selected = null;
      last = { from: mv.from, to: mv.to };
      hintLevel = 0;
      render({ move: mv, ms: KID_MS });
      moveSound(mv);
      if (ok) {
        step++;
        renderInfo();
        if (step >= p.moves.length) return solved();
        busy = true;
        say('¡Muy bien! 👏 Ahora mueve el rival…', 'happy');
        later(KID_MS + 450, () =>
          rivalMove(p.moves[step], () => {
            step++;
            renderInfo();
            say(nextText(), 'happy');
          }),
        );
        return;
      }
      // fallo: se explica y se deshace
      mistakes++;
      busy = true;
      renderInfo();
      later(KID_MS, () => sfx.error());
      say(explain(fenBefore, mv), 'think');
      later(KID_MS + 1700, () => {
        chess.undo();
        const prev = chess.history({ verbose: true }).at(-1);
        last = prev ? { from: prev.from, to: prev.to } : null;
        busy = false;
        render();
        if (mistakes >= 2 && hints === 0) hintBtn.classList.add('p-nudge');
      });
    }

    function giveHint() {
      if (busy || step >= p.moves.length) return;
      hintBtn.classList.remove('p-nudge');
      const m = uci(p.moves[step]);
      const t = chess.get(m.from)!.type;
      if (hintLevel < 2) {
        hintLevel++;
        hints++;
      }
      selected = null;
      sfx.hint();
      renderInfo();
      render();
      if (hintLevel === 1) say(`Mueve ${art(t)} 👀 (${fem(t) ? 'la' : 'el'} que brilla). Si quieres, pide otra pista.`, 'think');
      else {
        const san = new Chess(chess.fen()).move(m).san;
        say(`Lleva ${art(t)} a ${m.to}${notation ? ` (${sanEs(san)})` : ''}. ¡Tú puedes!`, 'think');
      }
    }

    // ───────── Reto superado ─────────
    function solved() {
      busy = true;
      const s = potential();
      const before = progress.puzzles[p.id] ?? 0;
      progress.puzzles[p.id] = Math.max(before, s);
      persist();
      const mate = chess.isCheckmate();
      const msg = mate ? '¡JAQUE MATE! 🏆' : '¡Reto superado! 🎉';
      say(msg, 'wow');
      const nextIdx = isDaily ? -1 : pi + 1 < list.length ? pi + 1 : -1;
      later(KID_MS + 600, () => {
        sfx.win();
        if (s === 3) confetti();
        overlay.innerHTML = `
          <div class="card end-card">
            <div class="mascot big">${mascotSvg('wow')}</div>
            <h2>${msg}</h2>
            <p class="big-stars" aria-label="${s} de 3 estrellas">${starsHtml(s)}</p>
            <p>${
              s === 3
                ? `¡A la primera y sin pistas, ${PLAYER_NAME}! 🎯`
                : s === 2
                  ? '¡Muy bien! Sin fallos ni pistas son 3 ⭐.'
                  : `¡Conseguido! ${MASCOT_NAME} está orgulloso. Repítelo para ganar más ⭐.`
            }</p>
            <div class="row">
              ${nextIdx >= 0 ? `<button class="btn primary" id="next">▶️ Siguiente reto</button>` : ''}
              <button class="btn" id="again">🔁 Repetir</button>
              <button class="btn ${nextIdx >= 0 ? '' : 'primary'}" id="map">🧩 Retos</button>
            </div>
          </div>`;
        overlay.classList.remove('hidden');
        overlay.querySelector('#next')?.addEventListener('click', () => playPuzzle(ci, nextIdx));
        overlay.querySelector('#again')!.addEventListener('click', () => playPuzzle(ci, pi, isDaily));
        overlay.querySelector('#map')!.addEventListener('click', isDaily ? showMap : () => showCollection(ci));
      });
    }

    // ───────── Eventos y arranque ─────────
    boardEl.addEventListener('click', (ev) => {
      const btn = (ev.target as HTMLElement).closest<HTMLElement>('[data-sq]');
      if (!btn || busy) return;
      tap(btn.dataset.sq as Square);
    });
    hintBtn.addEventListener('click', giveHint);
    app.querySelector('#exit')!.addEventListener('click', back);
    app.querySelector('#back')!.addEventListener('click', back);

    renderInfo();
    render();
    if (p.setup) {
      say('Mira lo que juega el rival… 👀', 'think');
      later(reduceMotion ? 0 : 700, () =>
        rivalMove(p.setup!, () => say(prompt(), 'happy')),
      );
    } else {
      busy = false;
      say(prompt(), 'happy');
    }
  }

  showMap();
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
