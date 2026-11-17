// Progreso guardado en el propio dispositivo (localStorage). Sin cuentas.
export interface Progress {
  theme: string;
  sound: boolean;
  helps: boolean;
  stars: Record<string, number>; // estrellas por rival
  lessons: Record<string, number>; // estrellas por lección (0-3)
  course: number; // curso de primaria (1-6): ajusta cuentas, rivales, explicaciones y ayudas
}

const KEY = 'ajedrez-mapache-v1';

const DEFAULTS: Progress = {
  theme: 'infantil',
  sound: true,
  helps: true,
  stars: {},
  lessons: {},
  course: 2,
};

export function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = { ...DEFAULTS, ...JSON.parse(raw) };
      p.stars ??= {};
      p.lessons ??= {};
      return p;
    }
  } catch {
    /* navegador sin almacenamiento: seguimos con valores por defecto */
  }
  return { ...DEFAULTS, stars: {}, lessons: {} };
}

export function save(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignorar */
  }
}
