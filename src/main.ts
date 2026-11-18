// Arranque de la app: tema, navegación, arrastre, accesibilidad, Stockfish y PWA.
import './style.css';
import { applyTheme, nav } from './app';
import { enableDrag } from './drag';
import { showHome } from './home';
import { showRivals } from './rivals-screen';
import { preloadStockfish } from './stockfish';

applyTheme();
nav.home = showHome;
nav.rivals = showRivals;

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
