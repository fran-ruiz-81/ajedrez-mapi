import './style.css';
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { pieceSvg, PIECE_NAMES, withArticle } from './pieces';
import { THEMES, getTheme, type Theme } from './themes';
import { load, save, type Progress } from './storage';
import { sfx, setSoundEnabled } from './sound';
import { mascotSvg, MASCOT_NAME, PLAYER_NAME, type Mood } from './mascot';
import { RIVALS, type Rival } from './rivals';
import { bestMove, isStockfishReady, preloadStockfish } from './stockfish';
import { describeOpponentMove, explainMove, piecesInDanger, warnAfterMove } from './teach';
import type { ScoredMove } from './engine';
import { showLessons } from './lessons';
import { showPuzzles } from './puzzles';
import { showOpenings } from './openings';
import { animateMove } from './animate';
import { enableDrag, justDropped } from './drag';
import { celebrate, checkMedals, MEDALS, recordEvent, showMedals } from './medals';
import { adjustRival, COURSES, defaultHelps, sanEs, showNotation } from './level';
import { mathGate } from './mathgate';
import { cap, colorName, confetti, esc } from './ui';

const app = document.getElementById('app')!;
const progress: Progress = load();
setSoundEnabled(progress.sound);

let theme: Theme = getTheme(progress.theme);
function applyTheme() {
  document.body.style.background = theme.bg;
  document.documentElement.style.setProperty('--sq-light', theme.light);
  document.documentElement.style.setProperty('--sq-dark', theme.dark);
  // texturas de casilla (temas con dibujos); si no hay, el color liso
  document.documentElement.style.setProperty('--sq-light-bg', theme.lightTex ?? theme.light);
  document.documentElement.style.setProperty('--sq-dark-bg', theme.darkTex ?? theme.dark);
}
applyTheme();

/** Guarda el progreso y celebra las medallas nuevas que se hayan conseguido. */
const persist = () => {
  const fresh = checkMedals(progress);
  save(progress);
  if (fresh.length) celebrate(fresh);
};

// ───────────────────────── Motor propio en un Worker ─────────────────────────

const ownWorker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' });
let reqId = 0;
const pending = new Map<number, (m: ScoredMove) => void>();
ownWorker.onmessage = (e) => {
  pending.get(e.data.id)?.(e.data.move);
  pending.delete(e.data.id);
};
function askOwn(msg: Record<string, unknown>): Promise<ScoredMove> {
  const id = ++reqId;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    ownWorker.postMessage({ id, ...msg });
  });
}

const parseUci = (u: string) => ({
  from: u.slice(0, 2),
  to: u.slice(2, 4),
  promotion: u.length > 4 ? u[4] : undefined,
});

/** Motor propio sin despistes: el que juega si Stockfish no está (rápido también en el móvil). */
const FALLBACK = { depth: 1, noise: 0, blunder: 0, qDepth: 2 };

/**
 * Pide la jugada a Stockfish, pero sin hacer esperar al niño mientras se descarga:
 * si aún no está listo y tarda más de 2,5 s, esa jugada la hace el motor propio.
 */
async function stockfishOr(fen: string, opts: { skill: number; depth: number }): Promise<string | null> {
  const sf = bestMove(fen, opts);
  if (isStockfishReady()) return sf;
  const r = await Promise.race([sf, wait(2500).then(() => 'late' as const)]);
  return r === 'late' ? null : r;
}

async function computerMove(fen: string, rival: Rival) {
  const e = adjustRival(rival.engine, progress.course);
  if (e.kind === 'sf') {
    const uci = await stockfishOr(fen, { skill: e.skill, depth: e.depth });
    if (uci) return parseUci(uci);
    return askOwn({ kind: 'pick', fen, level: FALLBACK });
  }
  return askOwn({ kind: 'pick', fen, level: e.level });
}

async function hintMove(fen: string) {
  const uci = await stockfishOr(fen, { skill: 20, depth: 10 });
  if (uci) return parseUci(uci);
  return askOwn({ kind: 'hint', fen });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ───────────────────────────────── Pantallas ─────────────────────────────────

function isUnlocked(i: number) {
  return i === 0 || (progress.stars[RIVALS[i - 1].id] ?? 0) > 0;
}

function showHome() {
  const total = [...Object.values(progress.stars), ...Object.values(progress.lessons), ...Object.values(progress.puzzles), ...Object.values(progress.openings)].reduce((a, b) => a + b, 0);
  app.innerHTML = `
    <main class="screen home">
      <div class="home-hero">
        <div class="mascot big bounce">${mascotSvg('happy')}</div>
        <div>
          <h1>El ajedrez de <span class="brand">${PLAYER_NAME}</span></h1>
          <p class="sub">¡Hola, ${PLAYER_NAME}! Soy ${MASCOT_NAME}, tu amigo mapache. ¿Jugamos?</p>
          <div class="hero-badges">
            <p class="stars-total"><span aria-hidden="true">⭐</span> ${total} estrellas</p>
            <button class="btn medals-btn" data-go="medals"><span aria-hidden="true">🏅</span> ${Object.keys(progress.medals).length}/${MEDALS.length} medallas</button>
          </div>
        </div>
      </div>
      <div class="menu">
        <button class="btn big primary menu-btn" data-go="rivals"><span class="ico" aria-hidden="true">🤖</span><span class="lbl">Jugar contra el ordenador<em>¡Elige un rival del bosque!</em></span></button>
        <button class="btn big menu-btn c-blue" data-go="local"><span class="ico" aria-hidden="true">👥</span><span class="lbl">Jugar dos personas<em>Con alguien a tu lado</em></span></button>
        <button class="btn big menu-btn c-green" data-go="lessons"><span class="ico" aria-hidden="true">📚</span><span class="lbl">Lecciones<em>Aprende cómo mueve cada pieza</em></span></button>
        <button class="btn big menu-btn c-pink" data-go="puzzles"><span class="ico" aria-hidden="true">🧩</span><span class="lbl">Retos<em>Encuentra la mejor jugada</em></span></button>
        <button class="btn big menu-btn c-yellow" data-go="openings"><span class="ico" aria-hidden="true">🚀</span><span class="lbl">Aperturas<em>Practica cómo empezar</em></span></button>
      </div>
      ${installSection()}
      <section class="settings">
        <h2>🎨 Tablero</h2>
        <div class="chips">
          ${THEMES.map(
            (t) =>
              `<button class="chip ${t.id === theme.id ? 'on' : ''}" data-theme="${t.id}">
                 <span class="chip-piece">${pieceSvg('n', 'w', t)}</span>${t.emoji} ${t.name}</button>`,
          ).join('')}
        </div>
        <label class="toggle"><input type="checkbox" class="switch" id="snd" ${progress.sound ? 'checked' : ''}/><span>🔊 Sonido</span></label>
      </section>
      <section class="settings">
        <h2>🎒 ¿En qué curso estás?</h2>
        <div class="chips" role="radiogroup" aria-label="Curso de primaria">
          ${COURSES.map(
            (c) => `<button class="chip course ${c === progress.course ? 'on' : ''}" data-course="${c}" role="radio" aria-checked="${c === progress.course}">${c}º</button>`,
          ).join('')}
        </div>
        <p class="settings-note">Los rivales, las explicaciones de ${MASCOT_NAME} y las cuentas se adaptan a tu curso.</p>
        <button class="btn reset-btn" id="reset">🧹 Borrar progreso</button>
      </section>
      <div class="overlay hidden" id="overlay"></div>
    </main>`;
  app.querySelector('[data-go="rivals"]')!.addEventListener('click', showRivals);
  const section = () => ({ app, progress, persist, theme, goHome: showHome, startGame, rivals: RIVALS });
  app.querySelector('[data-go="medals"]')!.addEventListener('click', () => showMedals(app, progress, showHome));
  app.querySelector('[data-go="puzzles"]')!.addEventListener('click', () => showPuzzles(section()));
  app.querySelector('[data-go="openings"]')!.addEventListener('click', () => showOpenings(section()));
  app.querySelector('[data-go="lessons"]')!.addEventListener('click', () =>
    showLessons({ app, progress, persist, theme, goHome: showHome }),
  );
  app.querySelector('[data-go="local"]')!.addEventListener('click', () => startGame({ mode: 'local' }));
  app.querySelectorAll<HTMLElement>('[data-theme]').forEach((b) =>
    b.addEventListener('click', () => {
      theme = getTheme(b.dataset.theme!);
      progress.theme = theme.id;
      persist();
      applyTheme();
      showHome();
    }),
  );
  app.querySelector<HTMLInputElement>('#snd')!.addEventListener('change', (e) => {
    progress.sound = (e.target as HTMLInputElement).checked;
    setSoundEnabled(progress.sound);
    persist();
  });
  app.querySelectorAll<HTMLElement>('[data-course]').forEach((b) =>
    b.addEventListener('click', () => {
      progress.course = Number(b.dataset.course);
      progress.helps = defaultHelps(progress.course);
      persist();
      showHome();
    }),
  );
  app.querySelector('#reset')!.addEventListener('click', askReset);
  void drawQr();
}

/** El QR solo se ve en el ordenador: su librería se carga solo ahí y después de pintar. */
async function drawQr() {
  const box = app.querySelector<HTMLElement>('#qr');
  if (!box || matchMedia('(pointer: coarse)').matches) return;
  const { default: qrcode } = await import('qrcode-generator');
  const qr = qrcode(0, 'M');
  qr.addData(gameUrl());
  qr.make();
  box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
}

/** Borrar estrellas: hay que resolver 3 cuentas de su curso, para que no pase sin querer. */
async function askReset() {
  const overlay = app.querySelector<HTMLElement>('#overlay')!;
  const ok = await mathGate(overlay, progress.course, {
    title: '🧹 ¿Borrar las estrellas?',
    text: 'Se borrarán las estrellas y las medallas (tus aperturas guardadas se quedan).',
    okLabel: 'Borrar',
    danger: true,
  });
  if (!ok) return;
  progress.stars = {};
  progress.lessons = {};
  progress.puzzles = {};
  progress.openings = {};
  progress.medals = {};
  progress.events = {};
  persist();
  overlay.innerHTML = `<div class="card"><div class="mascot big">${mascotSvg('happy')}</div>
    <h2>¡Cuentas perfectas! ✨</h2><p>Progreso borrado. ¡A conseguir estrellas otra vez!</p>
    <div class="row"><button class="btn primary" id="reset-ok">¡Vamos!</button></div></div>`;
  overlay.querySelector('#reset-ok')!.addEventListener('click', showHome);
}

const PUBLIC_URL = 'https://fran-ruiz-81.github.io/ajedrez-mapi/';

/** Dirección del juego para el QR. En local (localhost) usa la web publicada. */
function gameUrl(): string {
  const { hostname, origin, pathname } = location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return PUBLIC_URL;
  return origin + pathname.replace(/index\.html$/, '');
}

function isInstalled(): boolean {
  return (
    matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Ordenador: QR para abrirlo en el móvil. Móvil/tablet: cómo instalarlo como app. */
function installSection(): string {
  if (isInstalled()) return '';
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return `
    <section class="install">
      <div class="install-qr">
        <div class="qr" id="qr" role="img" aria-label="Código QR para abrir el juego en el móvil"></div>
        <div>
          <h2>📱 Juega en el móvil</h2>
          <p>Apunta con la cámara del móvil a este código y se abrirá el juego.</p>
          <p class="hint-small">Después, añádelo a la pantalla de inicio para tenerlo como una app.</p>
        </div>
      </div>
      <div class="install-tip">
        <h2>📲 Ponlo como app</h2>
        <p>${
          ios
            ? 'Pulsa el botón <strong>Compartir</strong> <span aria-hidden="true">⬆️</span> y elige <strong>«Añadir a pantalla de inicio»</strong>.'
            : 'Abre el menú del navegador <strong>⋮</strong> y elige <strong>«Instalar app»</strong> o <strong>«Añadir a pantalla de inicio»</strong>.'
        }</p>
      </div>
    </section>`;
}

function showRivals() {
  preloadStockfish();
  let color: Color | 'random' = 'w';
  app.innerHTML = `
    <main class="screen rivals">
      <header class="topbar"><button class="btn icon" id="back" aria-label="Volver">⬅️</button><h1>Elige tu rival</h1></header>
      <div class="color-pick">
        <span class="color-label">Juego con:</span>
        <button class="chip on" data-color="w">⚪ Blancas</button>
        <button class="chip" data-color="b">⚫ Negras</button>
        <button class="chip" data-color="random">🎲 Sorpresa</button>
      </div>
      <div class="rival-list">
        ${RIVALS.map((r, i) => {
          const stars = progress.stars[r.id] ?? 0;
          const open = isUnlocked(i);
          return `<button class="rival r${i} ${open ? '' : 'locked'}" data-rival="${i}" ${open ? '' : 'disabled'}>
            <span class="rival-emoji">${open ? r.emoji : '🔒'}</span>
            <span class="rival-info"><span class="rival-level">Nivel ${i + 1}</span><strong>${r.name}</strong>
              <small>${open ? r.desc : `Gana a ${RIVALS[i - 1].name} para desbloquearlo`}</small></span>
            <span class="rival-stars" aria-label="${stars} de 3 estrellas">${'<i class="on">★</i>'.repeat(stars)}${'<i>★</i>'.repeat(3 - stars)}</span>
          </button>`;
        }).join('')}
      </div>
    </main>`;
  app.querySelector('#back')!.addEventListener('click', showHome);
  app.querySelectorAll<HTMLElement>('[data-color]').forEach((b) =>
    b.addEventListener('click', () => {
      color = b.dataset.color as Color | 'random';
      app.querySelectorAll('[data-color]').forEach((x) => x.classList.toggle('on', x === b));
    }),
  );
  app.querySelectorAll<HTMLElement>('[data-rival]').forEach((b) =>
    b.addEventListener('click', () => {
      const c = color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : color;
      startGame({ mode: 'cpu', rival: RIVALS[Number(b.dataset.rival)], playerColor: c });
    }),
  );
}

// ───────────────────────────────── Partida ─────────────────────────────────

export interface GameOpts {
  mode: 'cpu' | 'local';
  rival?: Rival;
  playerColor?: Color;
  /** Empezar desde una posición (p. ej. tras una apertura). No da estrellas de rival. */
  fen?: string;
  /** Primer mensaje de Nino (si no, el saludo normal). */
  intro?: string;
  /** Adónde volver al salir (por defecto, rivales o inicio). */
  onExit?: () => void;
}

export function startGame(opts: GameOpts) {
  const chess = new Chess(opts.fen);
  const fromPosition = !!opts.fen;
  const playerColor: Color = opts.playerColor ?? 'w';
  let orientation: Color = playerColor;
  let selected: Square | null = null;
  let hint: { from: string; to: string } | null = null;
  let thinking = false;
  let over = false;
  let usedHint = false;
  let usedUndo = false;
  let gameToken = 0; // invalida respuestas del ordenador si se deshace o se sale

  const isCpu = opts.mode === 'cpu';
  const rival = opts.rival;
  const myTurn = () => !isCpu || chess.turn() === playerColor;

  app.innerHTML = `
    <main class="screen game">
      <header class="topbar">
        <button class="btn icon" id="back" aria-label="Volver">⬅️</button>
        <h1>${isCpu ? `${rival!.emoji} ${esc(rival!.name)}` : '👥 Dos personas'}</h1>
        <span class="turn" id="turn"></span>
      </header>
      <div class="board-wrap"><div class="board" id="board"></div></div>
      <aside class="panel">
        <div class="talk">
          <div class="mascot" id="mascot"></div>
          <p class="bubble" id="bubble" aria-live="polite"></p>
        </div>
        <button class="btn replay hidden" id="replay">👀 Ver otra vez su jugada</button>
        <div class="controls">
          <button class="btn ctrl ${progress.helps ? 'on' : ''}" id="helps">👀<span>Ayudas</span></button>
          <button class="btn ctrl" id="hint">💡<span>Pista</span></button>
          <button class="btn ctrl" id="undo">↩️<span>Deshacer</span></button>
          <button class="btn ctrl" id="flip">🔄<span>Girar</span></button>
        </div>
        <div class="captured" id="captured"></div>
      </aside>
      <div class="overlay hidden" id="overlay"></div>
    </main>`;

  const boardEl = app.querySelector<HTMLElement>('#board')!;
  const bubble = app.querySelector<HTMLElement>('#bubble')!;
  const mascotEl = app.querySelector<HTMLElement>('#mascot')!;
  const turnEl = app.querySelector<HTMLElement>('#turn')!;
  const overlay = app.querySelector<HTMLElement>('#overlay')!;

  function say(text: string, mood: Mood = 'happy') {
    bubble.textContent = text;
    mascotEl.innerHTML = mascotSvg(mood);
    mascotEl.classList.remove('pop');
    void mascotEl.offsetWidth; // reinicia la animación
    mascotEl.classList.add('pop');
  }

  function legalTargets(from: Square): Move[] {
    return chess.moves({ square: from, verbose: true });
  }

  // Duración de la animación de las jugadas (ms). El ordenador va despacio para que se vea bien.
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CPU_MS = reduceMotion ? 0 : 900;
  const PLAYER_MS = reduceMotion ? 0 : 220;
  const replayBtn = () => app.querySelector<HTMLElement>('#replay')!;

  function render(anim?: { move: Move; ms: number }) {
    const last = chess.history({ verbose: true }).at(-1);
    const targets = selected ? legalTargets(selected) : [];
    const danger = progress.helps ? new Set(piecesInDanger(chess, isCpu ? playerColor : chess.turn())) : new Set();
    const checkSq = chess.inCheck()
      ? chess.board().flat().find((p) => p?.type === 'k' && p.color === chess.turn())?.square
      : null;

    const files = 'abcdefgh';
    let html = '';
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const file = orientation === 'w' ? f : 7 - f;
        const rank = orientation === 'w' ? 8 - r : r + 1;
        const sq = (files[file] + rank) as Square;
        const p = chess.get(sq);
        const light = (file + rank) % 2 === 0; // a1 oscura, h1 clara
        const t = targets.find((m) => m.to === sq);
        const cls = [
          'sq',
          light ? 'light' : 'dark',
          sq === selected && 'selected',
          last && (sq === last.from || sq === last.to) && 'last',
          sq === checkSq && 'check',
          danger.has(sq) && 'danger',
          hint && sq === hint.from && 'hint-from', // la pieza que hay que mover
          hint && sq === hint.to && 'hint', // adónde
          t && progress.helps && (t.captured ? 'target-capture' : 'target'),
          last && sq === last.to && 'arrived',
        ]
          .filter(Boolean)
          .join(' ');
        const coordFile = r === 7 ? `<span class="coord file">${files[file]}</span>` : '';
        const coordRank = f === 0 ? `<span class="coord rank">${rank}</span>` : '';
        const label = p ? `${PIECE_NAMES[p.type]} ${colorName(p.color)} en ${sq}` : sq;
        html += `<button class="${cls}" data-sq="${sq}" aria-label="${label}">${coordRank}${coordFile}${
          p ? `<span class="piece">${pieceSvg(p.type, p.color, theme)}</span>` : ''
        }</button>`;
      }
    }
    boardEl.innerHTML = html;
    boardEl.dataset.drag = !over && !thinking && myTurn() ? chess.turn() : '';
    if (anim) animateMove(boardEl, anim.move, anim.ms, theme);

    // turno
    if (over) turnEl.textContent = '';
    else if (isCpu) turnEl.textContent = myTurn() && !thinking ? 'Te toca 👇' : 'Pensando… 🤔';
    else turnEl.textContent = `Mueven ${chess.turn() === 'w' ? '⚪ blancas' : '⚫ negras'}`;
    turnEl.classList.toggle('thinking', thinking);

    renderCaptured();
    (app.querySelector('#undo') as HTMLButtonElement).disabled = chess.history().length === 0 || thinking;
    (app.querySelector('#hint') as HTMLButtonElement).disabled = !myTurn() || over || thinking;
  }

  function renderCaptured() {
    // piezas comidas por cada bando, a partir del historial
    const taken: Record<Color, PieceSymbol[]> = { w: [], b: [] };
    for (const m of chess.history({ verbose: true })) if (m.captured) taken[m.color].push(m.captured);
    const row = (c: Color) =>
      taken[c]
        .map((t) => `<span class="mini">${pieceSvg(t, c === 'w' ? 'b' : 'w', theme)}</span>`)
        .join('');
    const el = app.querySelector<HTMLElement>('#captured')!;
    el.innerHTML = `
      <div><small>${isCpu ? 'Has comido' : 'Blancas comen'}:</small> ${row(isCpu ? playerColor : 'w') || '—'}</div>
      <div><small>${isCpu ? `${rival!.emoji} ha comido` : 'Negras comen'}:</small> ${row(isCpu ? (playerColor === 'w' ? 'b' : 'w') : 'b') || '—'}</div>`;
  }

  function soundFor(m: Move) {
    if (chess.inCheck()) sfx.check();
    else if (m.captured) sfx.capture();
    else sfx.move();
  }

  function checkEnd(): boolean {
    if (!chess.isGameOver()) return false;
    over = true;
    let title = '';
    let text = '';
    let mood: Mood = 'happy';
    let stars = 0;
    if (chess.isCheckmate()) {
      const winner: Color = chess.turn() === 'w' ? 'b' : 'w';
      if (isCpu && winner === playerColor) {
        if (playerColor === 'b' && !fromPosition) recordEvent(progress, 'winBlack');
        stars = fromPosition ? 0 : Math.max(1, 3 - (usedHint ? 1 : 0) - (usedUndo ? 1 : 0));
        if (!fromPosition) {
          progress.stars[rival!.id] = Math.max(progress.stars[rival!.id] ?? 0, stars);
          persist();
        }
        title = `¡Has ganado, ${PLAYER_NAME}! 🏆`;
        text = `¡Jaque mate a ${rival!.name}! ${
          fromPosition ? '¡Muy bien jugado!' : stars < 3 ? 'Gana sin pistas ni deshacer para conseguir 3 estrellas.' : '¡Partida perfecta!'
        }`;
        sfx.win();
        confetti();
      } else if (isCpu) {
        title = '¡Uy! Jaque mate';
        text = `Esta vez ha ganado ${rival!.name}. ¡Seguro que la próxima lo consigues!`;
        mood = 'sad';
        sfx.lose();
      } else {
        title = `¡Ganan las ${colorName(winner)}! 🏆`;
        text = '¡Jaque mate! Muy buena partida.';
        sfx.win();
        confetti();
      }
    } else {
      title = 'Tablas 🤝';
      text = chess.isStalemate()
        ? 'Rey ahogado: el rey no está en jaque pero no se puede mover. ¡Es empate!'
        : chess.isInsufficientMaterial()
          ? 'Quedan muy pocas piezas para dar jaque mate. ¡Es empate!'
          : 'La partida termina en empate.';
      mood = 'think';
    }
    say(text, mood);
    render();
    const unlockedNext =
      isCpu && stars > 0 && RIVALS.indexOf(rival!) < RIVALS.length - 1 && isUnlocked(RIVALS.indexOf(rival!) + 1);
    overlay.innerHTML = `
      <div class="card end-card mood-${mood}">
        <div class="mascot big">${mascotSvg(mood === 'sad' ? 'sad' : 'wow')}</div>
        <h2>${title}</h2>
        ${stars ? `<p class="big-stars" aria-label="${stars} de 3 estrellas">${'<i class="on">★</i>'.repeat(stars)}${'<i>★</i>'.repeat(3 - stars)}</p>` : ''}
        <p>${esc(text)}</p>
        ${unlockedNext ? `<p class="unlock">🔓 ¡Nuevo rival: ${RIVALS[RIVALS.indexOf(rival!) + 1].emoji} ${RIVALS[RIVALS.indexOf(rival!) + 1].name}!</p>` : ''}
        <div class="row">
          <button class="btn primary" id="again">🔁 Otra vez</button>
          <button class="btn" id="see">👀 Ver tablero</button>
          <button class="btn" id="menu">${opts.onExit ? '⬅️ Volver' : isCpu ? '🐾 Rivales' : '🏠 Inicio'}</button>
        </div>
      </div>`;
    overlay.classList.remove('hidden');
    overlay.querySelector('#again')!.addEventListener('click', () => startGame(opts));
    overlay.querySelector('#menu')!.addEventListener('click', opts.onExit ?? (isCpu ? showRivals : showHome));
    overlay.querySelector('#see')!.addEventListener('click', () => overlay.classList.add('hidden'));
    return true;
  }

  async function playMove(from: Square, to: Square, promotion?: string) {
    const move = chess.move({ from, to, promotion });
    selected = null;
    hint = null;
    replayBtn().classList.add('hidden');
    if (move.isKingsideCastle() || move.isQueensideCastle()) {
      recordEvent(progress, 'castle');
      persist();
    }
    render({ move, ms: justDropped() ? 0 : PLAYER_MS }); // si la ha arrastrado, ya está en su sitio
    soundFor(move);
    const token = gameToken;
    // el ordenador empieza a pensar ya, mientras se anima la jugada del niño
    const early = isCpu && !chess.isGameOver() ? computerMove(chess.fen(), rival!) : undefined;
    await wait(PLAYER_MS);
    if (token !== gameToken) return; // ha deshecho o salido durante la animación
    if (checkEnd()) return;

    // Se calcula siempre: con ayudas se avisa; sin ayudas no se avisa, pero tampoco se felicita un error
    const warning = warnAfterMove(chess, move);
    if (warning && progress.helps) say(warning, 'wow');
    else if (chess.inCheck()) say('¡Jaque! Has atacado al rey. 👑', 'wow');
    else if (warning) say(isCpu ? `Ahora piensa ${rival!.name}…` : `Ahora mueven las ${colorName(chess.turn())}.`, 'think');
    else say(praise(), 'happy');

    if (isCpu) await cpuTurn(early);
  }

  /** Turno del ordenador. `early`: su jugada, si ya se empezó a calcular antes. */
  async function cpuTurn(early?: ReturnType<typeof computerMove>) {
    const token = ++gameToken;
    thinking = true;
    render();
    const fen = chess.fen();
    // un pequeño "Pensando…" para que se note que es su turno
    const [m] = await Promise.all([early ?? computerMove(fen, rival!), wait(400)]);
    if (token !== gameToken || over) return;
    let move: Move;
    try {
      move = chess.move({ from: m.from, to: m.to, promotion: m.promotion ?? 'q' });
    } catch {
      // respuesta rara del motor: que juegue el motor propio para no quedarse atascados
      const own = await askOwn({ kind: 'pick', fen, level: FALLBACK });
      if (token !== gameToken || over) return;
      move = chess.move({ from: own.from, to: own.to, promotion: own.promotion ?? 'q' });
    }
    render({ move, ms: CPU_MS });
    await wait(CPU_MS); // el sonido suena cuando la pieza llega
    if (token !== gameToken) return;
    thinking = false;
    render();
    soundFor(move);
    if (checkEnd()) return;
    replayBtn().classList.remove('hidden');
    let text = `${rival!.emoji} ${describeOpponentMove(move)}${notation(move.san)}`;
    let mood: Mood = move.captured ? 'wow' : 'happy';
    if (chess.inCheck()) {
      text += ' ¡Estás en jaque! Protege a tu rey.';
      mood = 'wow';
    }
    say(text, mood);
  }

  function praise() {
    const p = ['¡Bien!', '¡Buena jugada!', '¡Así se hace!', '¡Muy bien!', '¡Genial!', '¡Bien pensado!'];
    return p[Math.floor(Math.random() * p.length)];
  }

  function askPromotion(color: Color): Promise<string | null> {
    return new Promise((resolve) => {
      overlay.innerHTML = `<div class="card promo-card"><h2>¡Tu peón ha llegado al final! 🎉</h2><p>¿En qué pieza lo conviertes?</p>
        <div class="row promo">${(['q', 'r', 'b', 'n'] as PieceSymbol[])
          .map((t) => `<button class="btn promo-btn" data-p="${t}" aria-label="${PIECE_NAMES[t]}">${pieceSvg(t, color, theme)}<small>${PIECE_NAMES[t]}</small></button>`)
          .join('')}</div></div>`;
      overlay.classList.remove('hidden');
      overlay.querySelectorAll<HTMLElement>('[data-p]').forEach((b) =>
        b.addEventListener('click', () => {
          overlay.classList.add('hidden');
          resolve(b.dataset.p!);
        }),
      );
    });
  }

  boardEl.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-sq]');
    if (!btn || over || thinking || !myTurn()) return;
    const sq = btn.dataset.sq as Square;
    const p = chess.get(sq);

    if (selected) {
      const m = legalTargets(selected).find((x) => x.to === sq);
      if (m) {
        const promo = m.promotion ? await askPromotion(m.color) : undefined;
        if (m.promotion && !promo) return;
        await playMove(selected, sq, promo ?? undefined);
        return;
      }
      if (sq === selected) {
        selected = null;
        render();
        return;
      }
    }
    if (p && p.color === chess.turn()) {
      selected = sq;
      sfx.select();
      if (legalTargets(sq).length === 0) {
        say(`${cap(PIECE_NAMES[p.type])}: ahora no se puede mover. ¡Prueba con otra pieza!`, 'think');
      }
      render();
    } else if (selected) {
      sfx.error();
      const piece = chess.get(selected)!;
      say(
        chess.inCheck()
          ? '¡Tu rey está en jaque! Primero tienes que salvarlo.'
          : `${cap(withArticle(piece.type))} no puede ir a ${sq}. ${progress.helps ? 'Mira los puntitos.' : ''}`,
        'think',
      );
      selected = null;
      render();
    } else if (p) {
      say(isCpu ? `Esa pieza es de ${rival!.name}. Tú juegas con las ${colorName(playerColor)}.` : `Ahora mueven las ${colorName(chess.turn())}.`, 'think');
    }
  });

  app.querySelector('#back')!.addEventListener('click', () => {
    gameToken++;
    if (opts.onExit) opts.onExit();
    else if (isCpu) showRivals();
    else showHome();
  });
  replayBtn().addEventListener('click', () => {
    const last = chess.history({ verbose: true }).at(-1);
    if (!last || thinking) return;
    render({ move: last, ms: CPU_MS || 1 });
  });
  app.querySelector('#flip')!.addEventListener('click', () => {
    orientation = orientation === 'w' ? 'b' : 'w';
    render();
  });
  app.querySelector('#helps')!.addEventListener('click', (e) => {
    progress.helps = !progress.helps;
    persist();
    (e.currentTarget as HTMLElement).classList.toggle('on', progress.helps);
    say(
      progress.helps
        ? 'Ayudas activadas: verás adónde puede ir cada pieza y las piezas en peligro en rojo.'
        : 'Ayudas apagadas. ¡Ahora tienes que fijarte tú solo!',
      'happy',
    );
    render();
  });
  app.querySelector('#undo')!.addEventListener('click', () => {
    if (thinking && isCpu) return;
    gameToken++;
    // contra el ordenador se deshacen la suya y la tuya
    chess.undo();
    if (isCpu && chess.turn() !== playerColor) chess.undo();
    usedUndo = true;
    replayBtn().classList.add('hidden');
    over = false;
    overlay.classList.add('hidden');
    selected = null;
    hint = null;
    say('Hemos vuelto atrás. ¡Piensa otra jugada!', 'happy');
    render();
    // si al deshacer le toca al ordenador (p. ej. abrió él la partida), que vuelva a jugar
    if (isCpu && chess.turn() !== playerColor && !chess.isGameOver()) void cpuTurn();
  });
  app.querySelector('#hint')!.addEventListener('click', async () => {
    if (!myTurn() || over || thinking) return;
    const btn = app.querySelector<HTMLButtonElement>('#hint')!;
    btn.disabled = true;
    say('Déjame pensar…', 'think');
    const fen = chess.fen();
    const m = await hintMove(fen);
    if (fen !== chess.fen()) return;
    usedHint = true;
    hint = { from: m.from, to: m.to };
    selected = null;
    sfx.hint();
    const why = explainMove(fen, m);
    const piece = new Chess(fen).get(m.from as Square);
    // si la explicación no dice adónde, se lo decimos: "El peón de d2 a d4."
    const where = piece && !why.includes(m.to) ? `${cap(withArticle(piece.type))} de ${m.from} a ${m.to}. ` : '';
    say(`💡 ${where}${why}${notation(sanOf(fen, m))}`, 'happy');
    render();
  });

  // inicio
  if (opts.intro) {
    say(opts.intro);
  } else if (isCpu) {
    say(
      playerColor === 'w'
        ? `¡Hola, ${PLAYER_NAME}! Soy ${MASCOT_NAME}. Juegas con las blancas contra ${rival!.name}. ¡Empiezas tú!`
        : `¡Hola, ${PLAYER_NAME}! Soy ${MASCOT_NAME}. Hoy juegas con las negras: empieza ${rival!.name}.`,
    );
  } else {
    say(`¡Hola! Soy ${MASCOT_NAME}. Empiezan las blancas. ¡Que gane el mejor!`);
  }
  render();
  if (isCpu && chess.turn() !== playerColor) void cpuTurn();
}

/** " (Cf3)" a partir de 3º; nada en cursos anteriores. */
function notation(san: string | null): string {
  if (!san || !showNotation(progress.course)) return '';
  // en un avance de peón ("e4") la notación ya está en la frase
  if (/^[a-h][1-8][+#]?$/.test(san)) return '';
  return ` (${sanEs(san)})`;
}

function sanOf(fen: string, m: { from: string; to: string; promotion?: string }): string | null {
  try {
    return new Chess(fen).move({ from: m.from, to: m.to, promotion: m.promotion }).san;
  } catch {
    return null;
  }
}



// Evitar zoom accidental con pellizco en Safari (ignora user-scalable=no).
// El zoom por doble toque lo evita `touch-action: manipulation` en el CSS.
document.addEventListener('gesturestart', (e) => e.preventDefault());

enableDrag();

// Descargar Stockfish en segundo plano en cuanto el navegador esté libre (salvo ahorro de datos):
// así la primera jugada de Oso/Búho o la primera pista no esperan a la descarga.
if (!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) {
  const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1500));
  idle(() => preloadStockfish());
}

// Accesibilidad: al abrirse cualquier ventana (fin de partida, coronación, ejercicio
// superado…) el foco pasa a ella, para no quedarse en el tablero de detrás.
new MutationObserver((changes) => {
  for (const c of changes) {
    const el = c.target as HTMLElement;
    if (el.classList.contains('overlay') && !el.classList.contains('hidden'))
      el.querySelector<HTMLElement>('input, .btn.primary, .btn')?.focus({ preventScroll: true });
  }
}).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });

showHome();

// Instalable y sin conexión (PWA)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
