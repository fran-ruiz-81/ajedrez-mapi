// Pantalla «Elige tu rival».
import type { Color } from 'chess.js';
import { app, nav, progress } from './app';
import { startGame } from './game';
import { isRivalUnlocked, RIVALS } from './rivals';
import { preloadStockfish } from './stockfish';
import { starsHtml } from './ui';

export function showRivals() {
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
          const open = isRivalUnlocked(progress.stars, i);
          return `<button class="rival r${i} ${open ? '' : 'locked'}" data-rival="${i}" ${open ? '' : 'disabled'}>
            <span class="rival-emoji">${open ? r.emoji : '🔒'}</span>
            <span class="rival-info"><span class="rival-level">Nivel ${i + 1}</span><strong>${r.name}</strong>
              <small>${open ? r.desc : `Gana a ${RIVALS[i - 1].name} para desbloquearlo`}</small></span>
            <span class="rival-stars" aria-label="${stars} de 3 estrellas">${starsHtml(stars)}</span>
          </button>`;
        }).join('')}
      </div>
    </main>`;
  app.querySelector('#back')!.addEventListener('click', nav.home);
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
