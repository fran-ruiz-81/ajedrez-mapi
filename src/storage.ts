// Progreso guardado en el propio dispositivo (localStorage). Sin cuentas.
import { Chess } from 'chess.js';
import { DEFAULT_COURSE } from './level';
export interface CustomOpening {
  id: string;
  name: string;
  color: 'w' | 'b'; // con qué color la juega el niño
  moves: string[]; // SAN en inglés (chess.js), p. ej. ['e4', 'e5', 'Nf3']
  note?: string; // explicación corta
}

export interface Progress {
  theme: string;
  sound: boolean;
  helps: boolean;
  stars: Record<string, number>; // estrellas por rival
  lessons: Record<string, number>; // estrellas por lección (0-3)
  puzzles: Record<string, number>; // estrellas por reto (0-3)
  openings: Record<string, number>; // estrellas por apertura (0-3)
  customOpenings: CustomOpening[]; // aperturas que añade el padre (las de la extraescolar)
  medals: Record<string, string>; // medallas conseguidas: id -> fecha (AAAA-MM-DD)
  events: Record<string, number>; // contadores de cosas que no se deducen de las estrellas (enroques...)
  course: number; // curso de primaria (1-6): ajusta cuentas, rivales, explicaciones y ayudas
}

const KEY = 'ajedrez-mapache-v1';

/** Valores por defecto (objetos nuevos cada vez: nunca compartidos entre cargas). */
const defaults = (): Progress => ({
  theme: 'infantil',
  sound: true,
  helps: true,
  stars: {},
  lessons: {},
  puzzles: {},
  openings: {},
  customOpenings: [],
  medals: {},
  events: {},
  course: DEFAULT_COURSE,
});

const isRecord = (v: unknown): v is Record<string, number> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Una apertura guardada solo vale si sus jugadas son legales (si no, rompería la sección). */
function validOpening(o: unknown): o is CustomOpening {
  const c = o as CustomOpening;
  if (!c || typeof c.id !== 'string' || typeof c.name !== 'string' || !Array.isArray(c.moves)) return false;
  try {
    const chess = new Chess();
    c.moves.forEach((m) => chess.move(m));
    return true;
  } catch {
    return false;
  }
}

export function load(): Progress {
  const p = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return p;
    const saved = JSON.parse(raw) as Partial<Progress>;
    if (typeof saved.theme === 'string') p.theme = saved.theme;
    if (typeof saved.sound === 'boolean') p.sound = saved.sound;
    if (typeof saved.helps === 'boolean') p.helps = saved.helps;
    if (typeof saved.course === 'number' && saved.course >= 1 && saved.course <= 6) p.course = saved.course;
    for (const k of ['stars', 'lessons', 'puzzles', 'openings', 'events'] as const) {
      if (isRecord(saved[k])) p[k] = saved[k];
    }
    if (isRecord(saved.medals)) p.medals = saved.medals as unknown as Record<string, string>;
    if (Array.isArray(saved.customOpenings)) p.customOpenings = saved.customOpenings.filter(validOpening);
  } catch {
    /* navegador sin almacenamiento o datos rotos: seguimos con lo que se haya podido leer */
  }
  return p;
}

export function save(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignorar */
  }
}
