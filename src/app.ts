// Estado compartido de la app: el contenedor, el progreso guardado, el tema y la navegación.
import { celebrate, checkMedals } from './medals';
import { setSoundEnabled } from './sound';
import { load, save, type Progress } from './storage';
import { getTheme, type Theme } from './themes';

export const app = document.getElementById('app')!;
export const progress: Progress = load();
setSoundEnabled(progress.sound);

let theme: Theme = getTheme(progress.theme);
export const currentTheme = () => theme;

/** Aplica el tema a la página (fondo, colores y texturas de las casillas). */
export function applyTheme() {
  const root = document.documentElement.style;
  document.body.style.background = theme.bg;
  root.setProperty('--sq-light', theme.light);
  root.setProperty('--sq-dark', theme.dark);
  // texturas de casilla (temas con dibujos); si no hay, el color liso
  root.setProperty('--sq-light-bg', theme.lightTex ?? theme.light);
  root.setProperty('--sq-dark-bg', theme.darkTex ?? theme.dark);
}

export function setTheme(id: string) {
  theme = getTheme(id);
  progress.theme = theme.id;
  applyTheme();
}

/** Guarda el progreso y celebra las medallas nuevas que se hayan conseguido. */
export const persist = () => {
  const fresh = checkMedals(progress);
  save(progress);
  if (fresh.length) celebrate(fresh);
};

/**
 * Navegación entre pantallas principales. Se registra en `main.ts`: así la partida
 * puede volver al inicio o a los rivales sin que los módulos se importen en círculo.
 */
export const nav = {
  home: () => {},
  rivals: () => {},
};
