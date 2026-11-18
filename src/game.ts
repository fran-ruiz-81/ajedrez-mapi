// La partida: contra el ordenador o dos personas en el mismo dispositivo.
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { animateMove } from './animate';
import { app, currentTheme, nav, persist, progress } from './app';
import { justDropped } from './drag';
import { askOwn, computerMove, FALLBACK, hintMove } from './engines';
import { sanEs, showNotation } from './level';
import { mascotSvg, MASCOT_NAME, PLAYER_NAME, type Mood } from './mascot';
import { recordEvent } from './medals';
import { pieceSvg, PIECE_NAMES, withArticle } from './pieces';
import { isRivalUnlocked, RIVALS, type Rival } from './rivals';
import { sfx } from './sound';
import { describeOpponentMove, explainMove, piecesInDanger, warnAfterMove } from './teach';
import { cap, colorName, confetti, esc, starsHtml, wait } from './ui';

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
  const theme = currentTheme();
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
        const fem = p && (p.type === 'r' || p.type === 'q');
        const label = p ? `${PIECE_NAMES[p.type]} ${p.color === 'w' ? (fem ? 'blanca' : 'blanco') : fem ? 'negra' : 'negro'} en ${sq}` : sq;
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
      isCpu && stars > 0 && RIVALS.indexOf(rival!) < RIVALS.length - 1 && isRivalUnlocked(progress.stars, RIVALS.indexOf(rival!) + 1);
    overlay.innerHTML = `
      <div class="card end-card mood-${mood}">
        <div class="mascot big">${mascotSvg(mood === 'sad' ? 'sad' : 'wow')}</div>
        <h2>${title}</h2>
        ${stars ? `<p class="big-stars" aria-label="${stars} de 3 estrellas">${starsHtml(stars)}</p>` : ''}
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
    overlay.querySelector('#menu')!.addEventListener('click', opts.onExit ?? (isCpu ? nav.rivals : nav.home));
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
    else if (isCpu) nav.rivals();
    else nav.home();
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
