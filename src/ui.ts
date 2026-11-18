// Pequeñas utilidades de interfaz compartidas por todas las pantallas.
import type { Color } from 'chess.js';

/** Escapa texto para meterlo en HTML (p. ej. los nombres de las aperturas del padre). */
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Primera letra en mayúscula. */
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Tres estrellas, `n` de ellas encendidas (para `.big-stars` / `.rival-stars`). */
export const starsHtml = (n: number) => '<i class="on">★</i>'.repeat(n) + '<i>★</i>'.repeat(3 - n);

export const colorName = (c: Color) => (c === 'w' ? 'blancas' : 'negras');

/** Lluvia de confeti para celebrar. */
export function confetti() {
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

/** Espera `ms` milisegundos. */
export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
