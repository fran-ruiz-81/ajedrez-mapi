// Progreso guardado en el propio dispositivo (localStorage). Sin cuentas.
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

const DEFAULTS: Progress = {
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
  course: 2,
};

export function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = { ...DEFAULTS, ...JSON.parse(raw) };
      p.stars ??= {};
      p.lessons ??= {};
      p.puzzles ??= {};
      p.openings ??= {};
      p.customOpenings ??= [];
      p.medals ??= {};
      p.events ??= {};
      return p;
    }
  } catch {
    /* navegador sin almacenamiento: seguimos con valores por defecto */
  }
  return { ...DEFAULTS, stars: {}, lessons: {}, puzzles: {}, openings: {}, customOpenings: [], medals: {}, events: {} };
}

export function save(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignorar */
  }
}
