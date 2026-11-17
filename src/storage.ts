// Progreso guardado en el propio dispositivo (localStorage). Sin cuentas.
export interface Progress {
  theme: string;
  sound: boolean;
  helps: boolean;
  stars: Record<string, number>; // estrellas por rival
}

const KEY = 'ajedrez-mapache-v1';

const DEFAULTS: Progress = {
  theme: 'infantil',
  sound: true,
  helps: true,
  stars: {},
};

export function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* navegador sin almacenamiento: seguimos con valores por defecto */
  }
  return { ...DEFAULTS, stars: {} };
}

export function save(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignorar */
  }
}
