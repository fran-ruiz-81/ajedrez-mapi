// Fase 2: Lecciones guiadas. (Esqueleto: lo implementa el agente de lecciones.)
import type { Progress } from './storage';
import type { Theme } from './themes';

export interface LessonsContext {
  app: HTMLElement;
  progress: Progress;
  persist: () => void;
  theme: Theme;
  goHome: () => void;
}

export function showLessons(ctx: LessonsContext) {
  ctx.app.innerHTML = `<main class="screen"><button class="btn" id="back">⬅️</button><p>Lecciones: ¡pronto!</p></main>`;
  ctx.app.querySelector('#back')!.addEventListener('click', ctx.goHome);
}
