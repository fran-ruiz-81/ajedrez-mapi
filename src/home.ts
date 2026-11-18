// Pantalla de inicio: menú, QR / instalar, tema, sonido, curso y borrar progreso.
import { app, currentTheme, persist, progress, setTheme } from './app';
import { startGame } from './game';
import { defaultHelps, COURSES } from './level';
import { showLessons } from './lessons';
import { mascotSvg, MASCOT_NAME, PLAYER_NAME } from './mascot';
import { mathGate } from './mathgate';
import { MEDALS, showMedals } from './medals';
import { showOpenings } from './openings';
import { pieceSvg } from './pieces';
import { showPuzzles } from './puzzles';
import { RIVALS } from './rivals';
import { showRivals } from './rivals-screen';
import { setSoundEnabled } from './sound';
import { THEMES } from './themes';

export function showHome() {
  const theme = currentTheme();
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
      setTheme(b.dataset.theme!);
      persist();
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
