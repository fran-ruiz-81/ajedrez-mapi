// Medallas: logros que se consiguen jugando. Casi todas se deducen del progreso
// (estrellas de rivales, lecciones, retos y aperturas); unas pocas usan contadores
// de `progress.events` que apunta la partida (enrocar, ganar con negras...).
import type { Progress } from './storage';
import { LESSONS } from './lessons/data';
import { RIVALS } from './rivals';
import { sfx } from './sound';

export interface Medal {
  id: string;
  group: string;
  emoji: string;
  name: string;
  how: string; // qué hay que hacer (se ve también antes de conseguirla)
  earned: (p: Progress) => boolean;
}

const count = (r: Record<string, number>, min = 1) => Object.values(r).filter((v) => v >= min).length;
const totalStars = (p: Progress) =>
  [p.stars, p.lessons, p.puzzles, p.openings].reduce((t, r) => t + Object.values(r).reduce((a, b) => a + b, 0), 0);
const lessonDone = (p: Progress, from: number, to: number, min = 1) =>
  LESSONS.slice(from, to).every((l) => (p.lessons[l.id] ?? 0) >= min);

export const MEDALS: Medal[] = [
  // Partidas
  { group: 'Partidas', id: 'primera-victoria', emoji: '🏆', name: '¡Primera victoria!', how: 'Gana una partida al ordenador.', earned: (p) => count(p.stars) >= 1 },
  { group: 'Partidas', id: 'partida-perfecta', emoji: '💎', name: 'Partida perfecta', how: 'Gana sin pistas ni deshacer.', earned: (p) => count(p.stars, 3) >= 1 },
  { group: 'Partidas', id: 'con-negras', emoji: '⚫', name: 'Valiente con negras', how: 'Gana una partida jugando con las negras.', earned: (p) => (p.events.winBlack ?? 0) >= 1 },
  { group: 'Partidas', id: 'enroque', emoji: '🏰', name: 'Rey a salvo', how: 'Enroca en una partida.', earned: (p) => (p.events.castle ?? 0) >= 1 },
  { group: 'Partidas', id: 'buho', emoji: '🦉', name: 'Más sabio que el búho', how: `Gana a ${RIVALS.at(-1)!.name}.`, earned: (p) => (p.stars[RIVALS.at(-1)!.id] ?? 0) > 0 },
  { group: 'Partidas', id: 'bosque', emoji: '🌳', name: 'Rey del bosque', how: 'Gana a todos los rivales.', earned: (p) => RIVALS.every((r) => (p.stars[r.id] ?? 0) > 0) },
  // Lecciones
  { group: 'Lecciones', id: 'primera-leccion', emoji: '📗', name: 'Primera lección', how: 'Termina una lección.', earned: (p) => count(p.lessons) >= 1 },
  { group: 'Lecciones', id: 'piezas', emoji: '♞', name: 'Sé mover todas', how: 'Termina las lecciones de las 6 piezas.', earned: (p) => lessonDone(p, 0, 6) },
  { group: 'Lecciones', id: 'todas-lecciones', emoji: '🎓', name: '¡Graduado!', how: 'Termina todas las lecciones.', earned: (p) => lessonDone(p, 0, LESSONS.length) },
  { group: 'Lecciones', id: 'lecciones-perfectas', emoji: '🌟', name: 'Alumno estrella', how: 'Consigue 3 estrellas en todas las lecciones.', earned: (p) => lessonDone(p, 0, LESSONS.length, 3) },
  // Retos
  { group: 'Retos', id: 'primer-reto', emoji: '🧩', name: 'Primer reto', how: 'Resuelve un reto.', earned: (p) => count(p.puzzles) >= 1 },
  { group: 'Retos', id: 'retos-10', emoji: '🔍', name: 'Detective', how: 'Resuelve 10 retos.', earned: (p) => count(p.puzzles) >= 10 },
  { group: 'Retos', id: 'retos-30', emoji: '🧠', name: 'Cerebrito', how: 'Resuelve 30 retos.', earned: (p) => count(p.puzzles) >= 30 },
  { group: 'Retos', id: 'retos-perfectos', emoji: '🎯', name: 'Puntería', how: 'Resuelve 10 retos a la primera.', earned: (p) => count(p.puzzles, 3) >= 10 },
  // Aperturas
  { group: 'Aperturas', id: 'primera-apertura', emoji: '🚀', name: 'Buen comienzo', how: 'Practica una apertura.', earned: (p) => count(p.openings) >= 1 },
  { group: 'Aperturas', id: 'apertura-perfecta', emoji: '🎼', name: 'De memoria', how: 'Repite una apertura sin fallos.', earned: (p) => count(p.openings, 3) >= 1 },
  { group: 'Aperturas', id: 'repertorio', emoji: '📚', name: 'Repertorio', how: 'Practica 5 aperturas distintas.', earned: (p) => count(p.openings) >= 5 },
  // Estrellas
  { group: 'Estrellas', id: 'estrellas-25', emoji: '⭐', name: '25 estrellas', how: 'Junta 25 estrellas.', earned: (p) => totalStars(p) >= 25 },
  { group: 'Estrellas', id: 'estrellas-50', emoji: '🌠', name: '50 estrellas', how: 'Junta 50 estrellas.', earned: (p) => totalStars(p) >= 50 },
  { group: 'Estrellas', id: 'estrellas-100', emoji: '🌌', name: '100 estrellas', how: 'Junta 100 estrellas.', earned: (p) => totalStars(p) >= 100 },
];

/** Apunta un logro de partida (enroque, ganar con negras...). Hay que guardar después. */
export function recordEvent(p: Progress, name: string) {
  p.events[name] = (p.events[name] ?? 0) + 1;
}

/** Marca las medallas nuevas y las devuelve (para celebrarlas). */
export function checkMedals(p: Progress): Medal[] {
  const today = new Date().toISOString().slice(0, 10);
  const fresh = MEDALS.filter((m) => !p.medals[m.id] && m.earned(p));
  for (const m of fresh) p.medals[m.id] = today;
  return fresh;
}

// ───────────── Aviso de medalla nueva (se ve en cualquier pantalla) ─────────────

let queue: Medal[] = [];
let showing = false;

export function celebrate(medals: Medal[]) {
  queue.push(...medals);
  if (!showing) next();
}

function next() {
  const m = queue.shift();
  if (!m) {
    showing = false;
    return;
  }
  showing = true;
  const el = document.createElement('div');
  el.className = 'medal-toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span class="medal-toast-emoji" aria-hidden="true">${m.emoji}</span>
    <span><small>¡Nueva medalla!</small><strong>${m.name}</strong></span>`;
  document.body.appendChild(el);
  sfx.hint();
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => {
      el.remove();
      next();
    }, 350);
  }, 3200);
}

// ───────────────────────────── Vitrina de medallas ─────────────────────────────

export function showMedals(app: HTMLElement, p: Progress, goHome: () => void) {
  const got = MEDALS.filter((m) => p.medals[m.id]).length;
  app.innerHTML = `
    <main class="screen medals">
      <header class="topbar">
        <button class="btn icon" id="back" aria-label="Volver">⬅️</button>
        <h1>🏅 Mis medallas</h1>
        <span class="turn">${got}/${MEDALS.length}</span>
      </header>
      ${[...new Set(MEDALS.map((m) => m.group))]
        .map(
          (g) => `<section><h2 class="medal-group">${g}</h2><ul class="medal-grid">
          ${MEDALS.filter((m) => m.group === g)
            .map((m) => {
              const date = p.medals[m.id];
              return `<li class="medal ${date ? 'got' : ''}">
                <span class="medal-emoji" aria-hidden="true">${date ? m.emoji : '🔒'}</span>
                <strong>${m.name}</strong>
                <small>${m.how}</small>
              </li>`;
            })
            .join('')}
        </ul></section>`,
        )
        .join('')}
    </main>`;
  app.querySelector('#back')!.addEventListener('click', goHome);
}
