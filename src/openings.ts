// Aperturas (Fase 4). (Esqueleto: lo implementa su agente.)
import type { Progress } from './storage';
import type { Theme } from './themes';
import type { Rival } from './rivals';
import type { GameOpts } from './main';

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

export function showOpenings(ctx: SectionContext) {
  ctx.app.innerHTML = `<main class="screen"><button class="btn icon" id="back">⬅️</button><p>¡Pronto!</p></main>`;
  ctx.app.querySelector('#back')!.addEventListener('click', ctx.goHome);
}
