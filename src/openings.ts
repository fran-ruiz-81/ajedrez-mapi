// Fase 4: Aperturas ("saques" de la extraescolar).
// Lista de aperturas, pantalla de práctica (ver, repetir y jugar desde la posición)
// y editor de las aperturas que añade el padre. Contenido en `openings/data.ts`.
import './openings.css';
import { Chess, type Move, type Square } from 'chess.js';
import type { CustomOpening, Progress } from './storage';
import type { Theme } from './themes';
import type { Rival } from './rivals';
import type { GameOpts } from './main';
import { pieceSvg, PIECE_NAMES } from './pieces';
import { mascotSvg, MASCOT_NAME, PLAYER_NAME, type Mood } from './mascot';
import { sfx } from './sound';
import { showNotation } from './level';
import { OPENINGS, lineLength } from './openings/data';
import { describeMove, fenAfter, formatLine, parseMoves, toEs } from './openings/notation';
import { drawBoard, type BoardView } from './openings/board';

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

/** Una apertura lista para practicar (predefinida o del padre), ya cortada según el curso. */
interface Entry {
  id: string;
  name: string;
  emoji: string;
  color: 'w' | 'b';
  idea: string;
  moves: string[];
  why: string[];
  custom?: CustomOpening;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const starsHtml = (n: number) => '<i class="on">★</i>'.repeat(n) + '<i>★</i>'.repeat(3 - n);
const colorName = (c: 'w' | 'b') => (c === 'w' ? 'blancas' : 'negras');
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Las jugadas del rival se deslizan despacio para que se vea qué ha movido. */
const RIVAL_MS = () => (reduceMotion() ? 0 : 800);
const MINE_MS = () => (reduceMotion() ? 0 : 250);

/** Estrellas al repetir: 3 sin fallos, 2 con uno o dos, 1 con más. */
export const practiceStars = (mistakes: number) => (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1);

/** Cambia en cada pantalla nueva: invalida temporizadores pendientes. */
let screenToken = 0;

function entriesFor(progress: Progress): Entry[] {
  const pre: Entry[] = OPENINGS.map((o) => {
    const n = lineLength(o, progress.course);
    return {
      id: o.id,
      name: o.name,
      emoji: o.emoji,
      color: o.color,
      idea: o.idea,
      moves: o.moves.slice(0, n),
      why: o.why.slice(0, n).map((w, i) => w ?? autoWhy(o.moves, i)),
    };
  });
  const mine: Entry[] = progress.customOpenings.map((c) => ({
    id: c.id,
    name: c.name,
    emoji: '🎒',
    color: c.color,
    idea: c.note?.trim() || 'La apertura que habéis aprendido en clase.',
    moves: c.moves,
    why: c.moves.map((_, i) => ((i % 2 === 0) === (c.color === 'w') ? autoWhy(c.moves, i) : 'El rival: ' + autoWhy(c.moves, i).replace(/^./, (x) => x.toLowerCase()))),
    custom: c,
  }));
  return [...pre, ...mine];
}

/** Explicación automática (para las aperturas del padre). */
function autoWhy(moves: string[], i: number): string {
  const c = new Chess(fenAfter(moves, i));
  return describeMove(c.move(moves[i]));
}

export function showOpenings(ctx: SectionContext, openId?: string) {
  const { app, progress, persist, theme } = ctx;
  const notation = () => showNotation(progress.course);
  const findEntry = (id: string) => entriesFor(progress).find((e) => e.id === id);

  // ───────────────────────────── Lista de aperturas ─────────────────────────────
  function showList() {
    screenToken++;
    const all = entriesFor(progress);
    const total = all.reduce((a, e) => a + (progress.openings[e.id] ?? 0), 0);
    const next = all.find((e) => !progress.openings[e.id]);
    const card = (e: Entry) => {
      const s = progress.openings[e.id] ?? 0;
      const mine = e.moves.filter((_, i) => (i % 2 === 0) === (e.color === 'w')).length;
      return `<li><button class="o-card ${e === next ? 'o-next' : ''}" data-open="${esc(e.id)}"
          aria-label="${esc(e.name)}, con ${colorName(e.color)}, ${s} de 3 estrellas">
        <span class="o-icon">${e.emoji}</span>
        <strong>${esc(e.name)}</strong>
        <small>${mine} ${mine === 1 ? 'jugada tuya' : 'jugadas tuyas'}</small>
        <span class="rival-stars o-stars">${starsHtml(s)}</span>
      </button></li>`;
    };
    const group = (c: 'w' | 'b') => all.filter((e) => !e.custom && e.color === c).map(card).join('');
    const customs = all.filter((e) => e.custom);
    app.innerHTML = `
      <main class="screen o-map">
        <header class="topbar">
          <button class="btn icon" id="back" aria-label="Volver">⬅️</button>
          <h1>🚀 Aperturas</h1>
          <span class="chip o-total" aria-label="${total} estrellas">⭐ ${total}/${all.length * 3}</span>
        </header>
        <div class="talk">
          <div class="mascot">${mascotSvg('happy')}</div>
          <p class="bubble">${
            total === 0
              ? `¡Hola, ${PLAYER_NAME}! Una apertura es cómo empiezas la partida. ¡Elige una y te la enseño!`
              : `¡Muy bien, ${PLAYER_NAME}! Elige una apertura para practicar.`
          }</p>
        </div>
        <h2 class="o-sec"><span class="o-dot w"></span>Con blancas</h2>
        <ol class="o-grid">${group('w')}</ol>
        <h2 class="o-sec"><span class="o-dot b"></span>Con negras</h2>
        <ol class="o-grid">${group('b')}</ol>
        <h2 class="o-sec">🎒 Las de clase</h2>
        <ol class="o-grid">
          ${customs.map(card).join('')}
          <li><button class="o-card o-add" id="add" aria-label="Añadir una apertura de clase">
            <span class="o-icon">➕</span><strong>Añadir</strong><small>Para papá o mamá</small>
          </button></li>
        </ol>
      </main>`;
    app.querySelector('#back')!.addEventListener('click', () => {
      screenToken++;
      ctx.goHome();
    });
    app.querySelector('#add')!.addEventListener('click', () => showEditor());
    app.querySelectorAll<HTMLElement>('[data-open]').forEach((b) =>
      b.addEventListener('click', () => {
        const e = findEntry(b.dataset.open!);
        if (e) showOpening(e);
      }),
    );
  }

  // ───────────────────────────── Pantalla de una apertura ─────────────────────────────
  function showOpening(entry: Entry, start: 'menu' | 'watch' | 'practice' = 'menu') {
    const token = ++screenToken;
    const later = (ms: number, fn: () => void) => setTimeout(() => token === screenToken && fn(), ms);
    const n = entry.moves.length;
    const isMine = (i: number) => (i % 2 === 0) === (entry.color === 'w');
    let chess = new Chess();
    let mode: 'menu' | 'watch' | 'practice' = 'menu';
    let view: BoardView = { orientation: entry.color };
    let busy = false;
    let mistakes = 0;
    let failedHere = false; // ya ha fallado esta jugada (cuenta una vez)

    app.innerHTML = `
      <main class="screen game lesson o-play">
        <header class="topbar">
          <button class="btn icon" id="back" aria-label="Volver a las aperturas">⬅️</button>
          <h1><span aria-hidden="true">${entry.emoji}</span> ${esc(entry.name)}</h1>
          ${entry.custom ? `<button class="btn icon" id="edit" aria-label="Editar la apertura">✏️</button>` : ''}
          <span class="turn o-side">${entry.color === 'w' ? '⚪ Blancas' : '⚫ Negras'}</span>
        </header>
        <div class="board-wrap"><div class="board" id="board"></div></div>
        <aside class="panel o-panel">
          <div class="talk">
            <div class="mascot" id="mascot"></div>
            <p class="bubble" id="bubble" aria-live="polite"></p>
          </div>
          <div class="o-line" id="line"></div>
          <div class="o-actions" id="actions"></div>
        </aside>
        <div class="overlay hidden" id="overlay"></div>
      </main>`;
    const boardEl = app.querySelector<HTMLElement>('#board')!;
    const bubble = app.querySelector<HTMLElement>('#bubble')!;
    const mascotEl = app.querySelector<HTMLElement>('#mascot')!;
    const lineEl = app.querySelector<HTMLElement>('#line')!;
    const actionsEl = app.querySelector<HTMLElement>('#actions')!;
    const overlay = app.querySelector<HTMLElement>('#overlay')!;

    function say(text: string, mood: Mood = 'happy') {
      bubble.textContent = text;
      mascotEl.innerHTML = mascotSvg(mood);
      mascotEl.classList.remove('pop');
      void mascotEl.offsetWidth; // reinicia la animación
      mascotEl.classList.add('pop');
    }

    const ply = () => chess.history().length;

    function render(anim?: { move: Move; ms: number }) {
      drawBoard(boardEl, chess, theme, view, anim);
      renderLine();
    }

    /** Tira de jugadas: una ficha por jugada; desde 3º, con la notación. */
    function renderLine() {
      const p = ply();
      const showAll = mode === 'menu';
      const c = new Chess();
      lineEl.innerHTML = entry.moves
        .map((san, i) => {
          const m = c.move(san);
          const done = showAll || i < p;
          const cls = ['o-mv', isMine(i) ? 'mine' : 'rival', done ? 'done' : '', !showAll && i === p - 1 ? 'now' : ''].join(' ');
          const num = i % 2 === 0 && notation() ? `<b>${i / 2 + 1}.</b>` : '';
          const txt = notation() ? `<span>${done ? toEs(san) : '?'}</span>` : '';
          const ico = done ? `<span class="mini">${pieceSvg(m.piece, m.color, theme)}</span>` : notation() ? '' : '<span class="o-q">?</span>';
          return `<span class="${cls}">${num}${ico}${txt}</span>`;
        })
        .join('');
      lineEl.setAttribute('aria-label', `Jugada ${p} de ${n}`);
    }

    function setActions(html: string, handlers: Record<string, () => void>) {
      actionsEl.innerHTML = html;
      for (const [id, fn] of Object.entries(handlers)) actionsEl.querySelector(`#${id}`)?.addEventListener('click', fn);
    }

    /** "1. Cf3" a partir de 3º; nada antes. */
    const label = (i: number) => (notation() ? `${Math.floor(i / 2) + 1}${i % 2 ? '…' : '.'} ${toEs(entry.moves[i])} · ` : '');

    // ───────── Menú de la apertura ─────────
    function showMenu() {
      mode = 'menu';
      busy = false;
      overlay.classList.add('hidden');
      chess = new Chess();
      for (const m of entry.moves) chess.move(m);
      view = { orientation: entry.color };
      const best = progress.openings[entry.id] ?? 0;
      say(`${entry.idea} ${best ? '' : '¿Te la enseño?'}`.trim(), 'happy');
      render();
      setActions(
        `<button class="btn ${best ? '' : 'primary'}" id="watch">👀 Ver</button>
         <button class="btn ${best ? 'primary' : ''}" id="practice">🔁 Repetir</button>
         <button class="btn o-wide" id="play">🤖 Jugar desde aquí</button>`,
        { watch: startWatch, practice: startPractice, play: pickRival },
      );
    }

    // ───────── Ver la apertura paso a paso ─────────
    function startWatch() {
      mode = 'watch';
      chess = new Chess();
      view = { orientation: entry.color };
      say(
        entry.color === 'w'
          ? `Juegas con las blancas, así que empiezas tú. Pulsa ▶️ para ver cada jugada.`
          : `Juegas con las negras: primero mueve el rival. Pulsa ▶️ para ver cada jugada.`,
        'happy',
      );
      render();
      watchButtons();
    }

    function watchButtons() {
      const p = ply();
      if (p >= n) {
        setActions(
          `<button class="btn primary o-wide" id="practice">🔁 ¡Ahora tú! Repetirla</button>
           <button class="btn" id="back1">⏪ Atrás</button>
           <button class="btn" id="play">🤖 Jugar</button>`,
          { practice: startPractice, back1: watchBack, play: pickRival },
        );
        return;
      }
      setActions(
        `<button class="btn" id="back1" ${p === 0 ? 'disabled' : ''}>⏪ Atrás</button>
         <button class="btn primary" id="next">▶️ Siguiente</button>
         <button class="btn o-wide o-small" id="menu">🚀 Volver</button>`,
        { back1: watchBack, next: watchNext, menu: showMenu },
      );
    }

    function explain(i: number): string {
      return `${label(i)}${isMine(i) ? 'Tú: ' : ''}${entry.why[i]}`;
    }

    function watchNext() {
      if (busy || ply() >= n) return;
      const i = ply();
      const move = chess.move(entry.moves[i]);
      // flecha solo en las jugadas del niño (para enseñar); las del rival solo se deslizan
      view = { orientation: entry.color, arrow: isMine(i) ? { from: move.from, to: move.to, kind: 'mine' } : null };
      busy = true;
      const ms = RIVAL_MS();
      render({ move, ms });
      say(explain(i), isMine(i) ? 'happy' : 'think');
      watchButtons();
      later(ms, () => {
        busy = false;
        if (move.captured) sfx.capture();
        else sfx.move();
        if (ply() >= n) {
          later(300, () => {
            say(`${explain(i)} ¡Y ya está! Esa es la apertura ${entry.name}. ¿La repites tú?`, 'wow');
            sfx.hint();
          });
        }
      });
    }

    function watchBack() {
      if (busy || ply() === 0) return;
      chess.undo();
      const last = chess.history({ verbose: true }).at(-1);
      const i = ply() - 1;
      view = { orientation: entry.color, arrow: last && isMine(i) ? { from: last.from, to: last.to, kind: 'mine' } : null };
      render();
      say(i >= 0 ? explain(i) : 'Así empieza la partida. Pulsa ▶️.', 'happy');
      watchButtons();
    }

    // ───────── Repetir: el rival mueve solo y el niño acierta las suyas ─────────
    function startPractice() {
      mode = 'practice';
      overlay.classList.add('hidden');
      chess = new Chess();
      view = { orientation: entry.color };
      mistakes = 0;
      failedHere = false;
      busy = false;
      render();
      setActions(
        `<button class="btn" id="restart">🔁 Empezar otra vez</button>
         <button class="btn" id="menu">🚪 Salir</button>`,
        { restart: startPractice, menu: showMenu },
      );
      if (isMine(0)) say(`¡Te toca! Haz la primera jugada de la apertura ${entry.name}.`, 'happy');
      else {
        say('Mira bien lo que mueve el rival…', 'think');
        busy = true;
        later(700, rivalMove);
      }
    }

    function rivalMove() {
      const i = ply();
      const move = chess.move(entry.moves[i]);
      view = { orientation: entry.color };
      busy = true;
      const ms = RIVAL_MS();
      render({ move, ms });
      later(ms, () => {
        if (move.captured) sfx.capture();
        else sfx.move();
        busy = false;
        if (ply() >= n) return finishPractice();
        failedHere = false;
        say(`${label(i)}${entry.why[i]} ¡Te toca! 👇`, 'happy');
      });
    }

    function practiceTap(sq: Square) {
      const p = chess.get(sq);
      const sel = view.selected as Square | null | undefined;
      if (sel) {
        const m = chess.moves({ square: sel, verbose: true }).find((x) => x.to === sq);
        if (m) return tryMove(m);
        if (sq === sel) {
          view = { ...view, selected: null, targets: [] };
          return render();
        }
      }
      if (p && p.color === entry.color) {
        sfx.select();
        view = { ...view, selected: sq, targets: progress.helps ? chess.moves({ square: sq, verbose: true }) : [] };
        return render();
      }
      sfx.error();
      if (sel) {
        const piece = chess.get(sel)!;
        say(`${cap(PIECE_NAMES[piece.type])} no puede ir ahí. ¡Prueba otra vez!`, 'think');
        view = { ...view, selected: null, targets: [], flash: sq };
        render();
        view = { ...view, flash: null };
      } else {
        say(p ? `Esa pieza es del rival. Tú juegas con las ${colorName(entry.color)}.` : 'Primero toca tu pieza 👆 y luego la casilla.', 'think');
      }
    }

    function tryMove(m: Move) {
      const i = ply();
      const want = new Chess(chess.fen()).move(entry.moves[i]);
      if (m.san !== want.san) {
        // jugada posible, pero no es la de la apertura: Nino enseña la buena con una flecha
        sfx.error();
        if (!failedHere) mistakes++;
        failedHere = true;
        view = {
          orientation: entry.color,
          hint: { from: want.from, to: want.to },
          arrow: { from: want.from, to: want.to, kind: 'hint' },
          flash: m.to,
        };
        render();
        view = { ...view, flash: null };
        say(`¡Casi! En la apertura ${entry.name} toca mover ${artName(want)} a ${want.to}. Mira la flecha y hazlo tú.`, 'think');
        return;
      }
      const move = chess.move(m.san);
      view = { orientation: entry.color };
      const ms = MINE_MS();
      render({ move, ms });
      if (move.captured) sfx.capture();
      else sfx.move();
      const praise = failedHere ? '¡Eso es!' : ['¡Bien!', '¡Muy bien!', '¡Genial!', '¡Perfecto!'][i % 4];
      say(`${praise} ${label(i)}${entry.why[i]}`, 'happy');
      busy = true;
      if (ply() >= n) return later(ms + 600, finishPractice);
      later(ms + 1300, rivalMove);
    }

    function finishPractice() {
      busy = true;
      const s = practiceStars(mistakes);
      const before = progress.openings[entry.id] ?? 0;
      progress.openings[entry.id] = Math.max(before, s);
      persist();
      sfx.win();
      if (s === 3) confetti();
      say(`¡Apertura terminada! ${MASCOT_NAME} está muy orgulloso.`, 'wow');
      overlay.innerHTML = `
        <div class="card end-card">
          <div class="mascot big">${mascotSvg('wow')}</div>
          <h2>¡Ya te sabes la apertura ${esc(entry.name)}! 🚀</h2>
          <p class="big-stars" aria-label="${s} de 3 estrellas">${starsHtml(s)}</p>
          <p>${
            mistakes === 0
              ? '¡Sin ningún fallo! Eres un crack.'
              : `${mistakes === 1 ? 'Un fallo' : `${mistakes} fallos`}. ¡Repítela sin fallos para tener 3 estrellas!`
          }</p>
          ${before && s > before ? '<p class="unlock">⭐ ¡Has mejorado tu nota!</p>' : ''}
          <div class="row">
            <button class="btn primary" id="play">🤖 Jugar desde aquí</button>
            <button class="btn" id="again">🔁 Otra vez</button>
            <button class="btn" id="list">🚀 Aperturas</button>
          </div>
        </div>`;
      overlay.classList.remove('hidden');
      overlay.querySelector('#play')!.addEventListener('click', pickRival);
      overlay.querySelector('#again')!.addEventListener('click', startPractice);
      overlay.querySelector('#list')!.addEventListener('click', showList);
    }

    // ───────── Jugar contra el ordenador desde la posición ─────────
    function pickRival() {
      const rivals = ctx.rivals;
      const open = (i: number) => i === 0 || (progress.stars[rivals[i - 1].id] ?? 0) > 0;
      overlay.innerHTML = `
        <div class="card o-rivals">
          <h2>🤖 ¿Contra quién juegas?</h2>
          <p>Empezáis desde el final de la apertura ${esc(entry.name)}. Tú llevas las ${colorName(entry.color)}.</p>
          <div class="o-rival-list">
            ${rivals
              .map((r, i) =>
                open(i)
                  ? `<button class="rival r${i}" data-rival="${i}"><span class="rival-emoji">${r.emoji}</span>
                      <span class="rival-info"><strong>${esc(r.name)}</strong><small>${esc(r.desc)}</small></span></button>`
                  : '',
              )
              .join('')}
          </div>
          ${rivals.some((_, i) => !open(i)) ? '<p class="o-locked">🔒 Gana partidas contra el ordenador para jugar con más rivales.</p>' : ''}
          <div class="row"><button class="btn" id="cancel">Mejor no</button></div>
        </div>`;
      overlay.classList.remove('hidden');
      overlay.querySelector('#cancel')!.addEventListener('click', () => {
        overlay.classList.add('hidden');
        if (mode === 'practice' && busy && ply() >= n) showMenu();
      });
      overlay.querySelectorAll<HTMLElement>('[data-rival]').forEach((b) =>
        b.addEventListener('click', () => {
          const rival = rivals[Number(b.dataset.rival)];
          const fen = fenAfter(entry.moves);
          const myTurn = new Chess(fen).turn() === entry.color;
          screenToken++;
          ctx.startGame({
            mode: 'cpu',
            rival,
            playerColor: entry.color,
            fen,
            intro: `¡Seguimos desde la apertura ${entry.name}! Juegas con las ${colorName(entry.color)} contra ${rival.name}. ${
              myTurn ? '¡Te toca! 👇' : `Empieza ${rival.name}.`
            }`,
            onExit: () => showOpenings(ctx, entry.id),
          });
        }),
      );
    }

    // ───────── Eventos ─────────
    boardEl.addEventListener('click', (ev) => {
      const btn = (ev.target as HTMLElement).closest<HTMLElement>('[data-sq]');
      if (!btn || busy) return;
      if (mode === 'practice') return practiceTap(btn.dataset.sq as Square);
      if (mode === 'watch') return watchNext();
      say('Pulsa 👀 Ver para que te la enseñe, o 🔁 Repetir para hacerla tú.', 'think');
    });
    app.querySelector('#back')!.addEventListener('click', showList);
    app.querySelector('#edit')?.addEventListener('click', () => showEditor(entry.custom));

    if (start === 'watch') startWatch();
    else if (start === 'practice') startPractice();
    else showMenu();
  }

  // ───────────────────────────── Editor (para el adulto) ─────────────────────────────
  function showEditor(existing?: CustomOpening) {
    screenToken++;
    const chess = new Chess();
    for (const m of existing?.moves ?? []) chess.move(m);
    let color: 'w' | 'b' = existing?.color ?? 'w';
    let selected: Square | null = null;

    app.innerHTML = `
      <main class="screen o-editor">
        <header class="topbar">
          <button class="btn icon" id="back" aria-label="Volver sin guardar">⬅️</button>
          <h1>${existing ? '✏️ Editar apertura' : '➕ Nueva apertura'}</h1>
        </header>
        <p class="o-ed-intro">Para el adulto: añade una apertura de la extraescolar. Mueve las piezas de los dos bandos en el tablero o pega la notación. Luego ${PLAYER_NAME} podrá verla, repetirla y jugar desde ella.</p>
        <div class="o-ed-grid">
          <section class="o-ed-board">
            <div class="board-wrap"><div class="board" id="board"></div></div>
            <div class="o-ed-tools">
              <span class="turn" id="turn"></span>
              <button type="button" class="btn" id="undo">↩️ Deshacer</button>
              <button type="button" class="btn" id="clear">🧹 Vaciar</button>
            </div>
          </section>
          <form class="settings o-ed-form" id="form" novalidate>
            <label class="o-field"><span>Jugadas <small>(inglés o español, con o sin números)</small></span>
              <textarea id="pgn" rows="3" spellcheck="false" autocapitalize="off" autocomplete="off"
                placeholder="1. e4 e5 2. Cf3 Cc6 3. Ac4 Ac5"></textarea></label>
            <div class="o-ed-read">
              <button type="button" class="btn" id="read">📋 Usar esta notación</button>
              <span class="o-count" id="count"></span>
            </div>
            <p class="o-err" id="pgn-err" aria-live="polite"></p>
            <label class="o-field"><span>Nombre</span>
              <input id="name" type="text" maxlength="40" autocomplete="off" placeholder="Por ejemplo: Italiana de clase" value="${esc(existing?.name ?? '')}"/></label>
            <div class="o-field"><span>¿Con qué color la juega ${PLAYER_NAME}?</span>
              <div class="chips" role="radiogroup" aria-label="Color">
                <button type="button" class="chip" data-color="w" role="radio">⚪ Blancas</button>
                <button type="button" class="chip" data-color="b" role="radio">⚫ Negras</button>
              </div></div>
            <label class="o-field"><span>Nota <small>(opcional: la idea, lo que dijo el monitor…)</small></span>
              <textarea id="note" rows="2" maxlength="200">${esc(existing?.note ?? '')}</textarea></label>
            <p class="o-err" id="form-err" aria-live="polite"></p>
            <div class="row o-ed-save">
              <button type="submit" class="btn primary">💾 Guardar</button>
              ${existing ? '<button type="button" class="btn danger" id="del">🗑️ Borrar</button>' : ''}
            </div>
          </form>
        </div>
        <div class="overlay hidden" id="overlay"></div>
      </main>`;
    const boardEl = app.querySelector<HTMLElement>('#board')!;
    const pgn = app.querySelector<HTMLTextAreaElement>('#pgn')!;
    const pgnErr = app.querySelector<HTMLElement>('#pgn-err')!;
    const formErr = app.querySelector<HTMLElement>('#form-err')!;
    const overlay = app.querySelector<HTMLElement>('#overlay')!;
    const back = () => {
      const e = existing && findEntry(existing.id);
      if (e) showOpening(e);
      else showList();
    };

    function render(syncText = true) {
      drawBoard(boardEl, chess, theme, {
        orientation: color,
        selected,
        targets: selected ? chess.moves({ square: selected, verbose: true }) : [],
      });
      const h = chess.history();
      app.querySelector('#turn')!.textContent = `Mueven ${chess.turn() === 'w' ? '⚪ blancas' : '⚫ negras'}`;
      app.querySelector<HTMLButtonElement>('#undo')!.disabled = h.length === 0;
      app.querySelector<HTMLButtonElement>('#clear')!.disabled = h.length === 0;
      app.querySelector('#count')!.textContent = `${h.length} ${h.length === 1 ? 'jugada' : 'jugadas'}`;
      if (syncText) pgn.value = formatLine(h);
      app.querySelectorAll<HTMLElement>('[data-color]').forEach((b) => {
        b.classList.toggle('on', b.dataset.color === color);
        b.setAttribute('aria-checked', String(b.dataset.color === color));
      });
    }

    boardEl.addEventListener('click', (ev) => {
      const btn = (ev.target as HTMLElement).closest<HTMLElement>('[data-sq]');
      if (!btn) return;
      const sq = btn.dataset.sq as Square;
      const p = chess.get(sq);
      if (selected) {
        const m = chess.moves({ square: selected, verbose: true }).find((x) => x.to === sq);
        if (m) {
          chess.move({ from: m.from, to: m.to, promotion: m.promotion ? 'q' : undefined });
          selected = null;
          pgnErr.textContent = '';
          sfx.move();
          return render();
        }
      }
      selected = p && p.color === chess.turn() && sq !== selected ? sq : null;
      if (selected) sfx.select();
      render(false);
    });
    app.querySelector('#undo')!.addEventListener('click', () => {
      chess.undo();
      selected = null;
      render();
    });
    app.querySelector('#clear')!.addEventListener('click', () => {
      chess.reset();
      selected = null;
      render();
    });
    app.querySelector('#read')!.addEventListener('click', () => {
      const r = parseMoves(pgn.value);
      if (!r.ok) {
        sfx.error();
        pgnErr.textContent = `⚠️ ${r.error}`;
        return;
      }
      chess.reset();
      for (const m of r.moves) chess.move(m);
      selected = null;
      pgnErr.textContent = '';
      sfx.hint();
      render();
    });
    app.querySelectorAll<HTMLElement>('[data-color]').forEach((b) =>
      b.addEventListener('click', () => {
        color = b.dataset.color as 'w' | 'b';
        selected = null;
        render(false);
      }),
    );
    app.querySelector('#back')!.addEventListener('click', back);
    app.querySelector('#form')!.addEventListener('submit', (ev) => {
      ev.preventDefault();
      // si el texto se ha cambiado a mano y no se ha leído, se lee ahora
      if (pgn.value.trim() !== formatLine(chess.history())) {
        const r = parseMoves(pgn.value);
        if (!r.ok) {
          sfx.error();
          pgnErr.textContent = `⚠️ ${r.error}`;
          formErr.textContent = 'Revisa las jugadas antes de guardar.';
          return;
        }
        chess.reset();
        for (const m of r.moves) chess.move(m);
        render();
      }
      const name = app.querySelector<HTMLInputElement>('#name')!.value.trim();
      const note = app.querySelector<HTMLTextAreaElement>('#note')!.value.trim();
      const moves = chess.history();
      const needed = color === 'w' ? 1 : 2;
      let err = '';
      if (!name) err = 'Ponle un nombre.';
      else if (moves.length < needed)
        err = color === 'w' ? 'Añade al menos una jugada.' : 'Con negras hacen falta al menos dos jugadas (una del rival y otra suya).';
      if (err) {
        sfx.error();
        formErr.textContent = `⚠️ ${err}`;
        return;
      }
      const data: CustomOpening = { id: existing?.id ?? `c-${Date.now().toString(36)}`, name, color, moves, ...(note ? { note } : {}) };
      const i = progress.customOpenings.findIndex((c) => c.id === data.id);
      if (i >= 0) {
        // si cambian las jugadas o el color, la nota anterior ya no vale
        const old = progress.customOpenings[i];
        if (old.color !== color || old.moves.join() !== moves.join()) delete progress.openings[data.id];
        progress.customOpenings[i] = data;
      } else progress.customOpenings.push(data);
      persist();
      sfx.hint();
      showOpening(findEntry(data.id)!);
    });
    app.querySelector('#del')?.addEventListener('click', () => {
      overlay.innerHTML = `
        <div class="card end-card mood-think">
          <div class="mascot big">${mascotSvg('think')}</div>
          <h2>¿Borrar «${esc(existing!.name)}»?</h2>
          <p>Se borrará la apertura y sus estrellas. No se puede deshacer.</p>
          <div class="row">
            <button class="btn" id="no">Mejor no</button>
            <button class="btn danger" id="yes">🗑️ Borrar</button>
          </div>
        </div>`;
      overlay.classList.remove('hidden');
      overlay.querySelector('#no')!.addEventListener('click', () => overlay.classList.add('hidden'));
      overlay.querySelector('#yes')!.addEventListener('click', () => {
        progress.customOpenings = progress.customOpenings.filter((c) => c.id !== existing!.id);
        delete progress.openings[existing!.id];
        persist();
        showList();
      });
    });

    render();
  }

  const first = openId ? findEntry(openId) : undefined;
  if (first) showOpening(first);
  else showList();
}

/** "el caballo", "la torre"… de una jugada. */
function artName(m: Move): string {
  if (m.isKingsideCastle() || m.isQueensideCastle()) return 'el rey (¡enroque!)';
  return (m.piece === 'r' || m.piece === 'q' ? 'la ' : 'el ') + PIECE_NAMES[m.piece];
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
