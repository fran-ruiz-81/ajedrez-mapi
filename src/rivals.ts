import type { Level } from './engine';

export type RivalEngine =
  | { kind: 'own'; level: Level } // motor propio (rivales fáciles)
  | { kind: 'sf'; skill: number; depth: number }; // Stockfish (rivales fuertes)

export interface Rival {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  engine: RivalEngine;
}

export const RIVALS: Rival[] = [
  {
    id: 'pollito',
    name: 'Pollito Pío',
    emoji: '🐣',
    desc: 'Acaba de aprender a mover las piezas.',
    engine: { kind: 'own', level: { depth: 1, noise: 250, blunder: 0.5, qDepth: 0 } },
  },
  {
    id: 'tortuga',
    name: 'Tortuga Tula',
    emoji: '🐢',
    desc: 'Va despacito y a veces se despista.',
    engine: { kind: 'own', level: { depth: 1, noise: 90, blunder: 0.15, qDepth: 1 } },
  },
  {
    id: 'zorro',
    name: 'Zorro Zuri',
    emoji: '🦊',
    desc: 'Listo y rápido: ¡no le dejes piezas sueltas!',
    engine: { kind: 'own', level: { depth: 1, noise: 25, blunder: 0.04, qDepth: 2 } },
  },
  {
    id: 'oso',
    name: 'Oso Bruno',
    emoji: '🐻',
    desc: 'Fuerte y tranquilo. Piensa antes de mover.',
    engine: { kind: 'sf', skill: 0, depth: 3 },
  },
  {
    id: 'buho',
    name: 'Búho Sabio',
    emoji: '🦉',
    desc: 'El más sabio del bosque. ¡El gran reto!',
    engine: { kind: 'sf', skill: 4, depth: 8 },
  },
];
