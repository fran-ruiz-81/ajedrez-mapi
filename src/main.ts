import './style.css';
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { pieceSvg, PIECE_NAMES } from './pieces';
import { THEMES, getTheme, type Theme } from './themes';
import { load, save, type Progress } from './storage';
import { sfx, setSoundEnabled } from './sound';
import { mascotSvg, MASCOT_NAME, PLAYER_NAME, type Mood } from './mascot';
import { RIVALS, type Rival } from './rivals';
import { bestMove, preloadStockfish } from './stockfish';
import { describeOpponentMove, explainMove, piecesInDanger, warnAfterMove } from './teach';
import type { ScoredMove } from './engine';

const app = document.getElementById('app')!;
const progress: Progress = load();
setSoundEnabled(progress.sound);

let theme: Theme = getTheme(progress.theme);
function applyTheme() {
  document.body.style.background = theme.bg;
  document.documentElement.style.setProperty('--sq-light', theme.light);
  document.documentElement.style.setProperty('--sq-dark', theme.dark);
}
applyTheme();

const persist = () => save(progress);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

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

async function computerMove(fen: string, rival: Rival) {
  const e = rival.engine;
  if (e.kind === 'sf') {
    const uci = await bestMove(fen, { skill: e.skill, depth: e.depth });
    if (uci) return parseUci(uci);
    // Stockfish no disponible: usamos el motor propio al máximo
    return askOwn({ kind: 'pick', fen, level: { depth: 2, noise: 0, blunder: 0, qDepth: 1 } });
  }
  return askOwn({ kind: 'pick', fen, level: e.level });
}

async function hintMove(fen: string) {
  const uci = await bestMove(fen, { skill: 20, depth: 10 });
  if (uci) return parseUci(uci);
  return askOwn({ kind: 'hint', fen });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ───────────────────────────────── Pantallas ─────────────────────────────────

function isUnlocked(i: number) {
  return i === 0 || (progress.stars[RIVALS[i - 1].id] ?? 0) > 0;
}

function showHome() {
  const total = Object.values(progress.stars).reduce((a, b) => a + b, 0);
  app.innerHTML = `
    <main class="screen home">
      <div class="home-hero">
        <div class="mascot big bounce">${mascotSvg('happy')}</div>
        <div>
          <h1>El ajedrez de ${PLAYER_NAME}</h1>
          <p class="sub">¡Hola, ${PLAYER_NAME}! Soy ${MASCOT_NAME}, tu amigo mapache. ¿Jugamos?</p>
          <p class="stars-total">⭐ ${total} estrellas</p>
        </div>
      </div>
      <div class="menu">
        <button class="btn big primary" data-go="rivals">🤖 Jugar contra el ordenador</button>
        <button class="btn big" data-go="local">👥 Jugar dos personas</button>
        <button class="btn big soon" disabled>📚 Lecciones <small>¡pronto!</small></button>
        <button class="btn big soon" disabled>🧩 Retos <small>¡pronto!</small></button>
        <button class="btn big soon" disabled>🚀 Aperturas <small>¡pronto!</small></button>
      </div>
      <section class="settings">
        <h2>Tablero</h2>
        <div class="chips">
          ${THEMES.map(
            (t) =>
              `<button class="chip ${t.id === theme.id ? 'on' : ''}" data-theme="${t.id}">
                 <span class="chip-piece">${pieceSvg('n', 'w', t)}</span>${t.emoji} ${t.name}</button>`,
          ).join('')}
          <button class="chip soon" disabled>🦖 Dinosaurios</button>
          <button class="chip soon" disabled>🏰 Medieval</button>
          <button class="chip soon" disabled>🧱 Bloques</button>
        </div>
        <label class="toggle"><input type="checkbox" id="snd" ${progress.sound ? 'checked' : ''}/> 🔊 Sonido</label>
      </section>
    </main>`;
  app.querySelector('[data-go="rivals"]')!.addEventListener('click', showRivals);
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
}

function showRivals() {
  preloadStockfish();
  let color: Color | 'random' = 'w';
  app.innerHTML = `
    <main class="screen rivals">
      <header class="topbar"><button class="btn icon" id="back" aria-label="Volver">⬅️</button><h1>Elige tu rival</h1></header>
      <div class="color-pick">
        <span>Juego con:</span>
        <button class="chip on" data-color="w">⚪ Blancas</button>
        <button class="chip" data-color="b">⚫ Negras</button>
        <button class="chip" data-color="random">🎲 Sorpresa</button>
      </div>
      <div class="rival-list">
        ${RIVALS.map((r, i) => {
          const stars = progress.stars[r.id] ?? 0;
          const open = isUnlocked(i);
          return `<button class="rival ${open ? '' : 'locked'}" data-rival="${i}" ${open ? '' : 'disabled'}>
            <span class="rival-emoji">${open ? r.emoji : '🔒'}</span>
            <span class="rival-info"><strong>${r.name}</strong>
              <small>${open ? r.desc : `Gana a ${RIVALS[i - 1].name} para desbloquearlo`}</small></span>
            <span class="rival-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>
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

interface GameOpts {
  mode: 'cpu' | 'local';
  rival?: Rival;
  playerColor?: Color;
}

function startGame(opts: GameOpts) {
  const chess = new Chess();
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
  const colorName = (c: Color) => (c === 'w' ? 'blancas' : 'negras');

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
          <p class="bubble" id="bubble"></p>
        </div>
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

  function render() {
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
        const light = (file + rank) % 2 === 1;
        const t = targets.find((m) => m.to === sq);
        const cls = [
          'sq',
          light ? 'light' : 'dark',
          sq === selected && 'selected',
          last && (sq === last.from || sq === last.to) && 'last',
          sq === checkSq && 'check',
          danger.has(sq) && 'danger',
          hint && (sq === hint.from || sq === hint.to) && 'hint',
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

    // turno
    if (over) turnEl.textContent = '';
    else if (isCpu) turnEl.textContent = myTurn() ? 'Te toca 👇' : 'Pensando… 🤔';
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
        stars = Math.max(1, 3 - (usedHint ? 1 : 0) - (usedUndo ? 1 : 0));
        progress.stars[rival!.id] = Math.max(progress.stars[rival!.id] ?? 0, stars);
        persist();
        title = `¡Has ganado, ${PLAYER_NAME}! 🏆`;
        text = `¡Jaque mate a ${rival!.name}! ${
          stars < 3 ? 'Gana sin pistas ni deshacer para conseguir 3 estrellas.' : '¡Partida perfecta!'
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
      <div class="card">
        <div class="mascot big">${mascotSvg(mood === 'sad' ? 'sad' : 'wow')}</div>
        <h2>${title}</h2>
        ${stars ? `<p class="big-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</p>` : ''}
        <p>${esc(text)}</p>
        ${unlockedNext ? `<p class="unlock">🔓 ¡Nuevo rival: ${RIVALS[RIVALS.indexOf(rival!) + 1].emoji} ${RIVALS[RIVALS.indexOf(rival!) + 1].name}!</p>` : ''}
        <div class="row">
          <button class="btn primary" id="again">🔁 Otra vez</button>
          <button class="btn" id="see">👀 Ver tablero</button>
          <button class="btn" id="menu">🏠 Menú</button>
        </div>
      </div>`;
    overlay.classList.remove('hidden');
    overlay.querySelector('#again')!.addEventListener('click', () => startGame(opts));
    overlay.querySelector('#menu')!.addEventListener('click', isCpu ? showRivals : showHome);
    overlay.querySelector('#see')!.addEventListener('click', () => overlay.classList.add('hidden'));
    return true;
  }

  async function playMove(from: Square, to: Square, promotion?: string) {
    const move = chess.move({ from, to, promotion });
    selected = null;
    hint = null;
    soundFor(move);
    render();
    if (checkEnd()) return;

    const warning = progress.helps ? warnAfterMove(chess, move) : null;
    if (warning) say(warning, 'wow');
    else if (chess.inCheck()) say('¡Jaque! Has atacado al rey. 👑', 'wow');
    else say(praise(), 'happy');

    if (isCpu) await cpuTurn();
  }

  async function cpuTurn() {
    const token = ++gameToken;
    thinking = true;
    render();
    const fen = chess.fen();
    const [m] = await Promise.all([computerMove(fen, rival!), wait(700)]);
    if (token !== gameToken || over) return;
    thinking = false;
    const move = chess.move({ from: m.from, to: m.to, promotion: m.promotion ?? 'q' });
    soundFor(move);
    render();
    if (checkEnd()) return;
    let text = `${rival!.emoji} ${describeOpponentMove(move)}`;
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
      overlay.innerHTML = `<div class="card"><h2>¡Tu peón ha llegado al final! 🎉</h2><p>¿En qué pieza lo conviertes?</p>
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
          : `${cap(PIECE_NAMES[piece.type])} no puede ir a ${sq}. ${progress.helps ? 'Mira los puntitos.' : ''}`,
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
    if (isCpu) showRivals();
    else showHome();
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
    over = false;
    overlay.classList.add('hidden');
    selected = null;
    hint = null;
    say('Hemos vuelto atrás. ¡Piensa otra jugada!', 'happy');
    render();
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
    say(`💡 ${explainMove(fen, m)}`, 'happy');
    render();
  });

  // inicio
  if (isCpu) {
    say(
      playerColor === 'w'
        ? `¡Hola, ${PLAYER_NAME}! Soy ${MASCOT_NAME}. Juegas con las blancas contra ${rival!.name}. ¡Empiezas tú!`
        : `¡Hola, ${PLAYER_NAME}! Soy ${MASCOT_NAME}. Hoy juegas con las negras: empieza ${rival!.name}.`,
    );
  } else {
    say(`¡Hola! Soy ${MASCOT_NAME}. Empiezan las blancas. ¡Que gane el mejor!`);
  }
  render();
  if (isCpu && playerColor === 'b') void cpuTurn();
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
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

// Evitar zoom accidental con pellizco en Safari (ignora user-scalable=no).
// El zoom por doble toque lo evita `touch-action: manipulation` en el CSS.
document.addEventListener('gesturestart', (e) => e.preventDefault());

showHome();

// Instalable y sin conexión (PWA)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
