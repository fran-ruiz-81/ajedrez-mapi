// Contenido de las lecciones. La lógica está en `engine.ts` y la pantalla en `../lessons.ts`.
// Los mínimos de movimientos NO se escriben aquí: se calculan con `minMoves` (y los
// comprueba `verify.mjs`).
import type { PieceSymbol } from 'chess.js';

/**
 * Ejercicio de tablero libre: las piezas rivales no se mueven.
 * Piezas como "Ra1" (R torre, B alfil, Q dama, K rey, N caballo, P peón).
 */
export interface FreeExercise {
  kind: 'free';
  text: string;
  mine: string[];
  enemies?: string[];
  stars?: string[];
  eatAll?: boolean; // hay que comerse todas las piezas rivales
  safe?: boolean; // casillas atacadas en rojo: no se puede parar en ellas
  best?: boolean; // un solo movimiento: comer la pieza que más vale
}

/** Ejercicio con reglas completas (chess.js): dar jaque, mate, enrocar o salir del jaque. */
export interface ChessExercise {
  kind: 'chess';
  text: string;
  fen: string;
  goal: 'check' | 'mate' | 'castle' | 'escape';
  how?: 'move' | 'capture'; // para 'escape': cómo hay que salir del jaque
}

export type Exercise = FreeExercise | ChessExercise;

export interface Demo {
  mine: string[];
  enemies?: string[];
  /** Casillas que se iluminan. Si no hay, se iluminan los movimientos de la primera pieza y se puede mover libremente. */
  marks?: string[];
  values?: boolean; // muestra lo que vale cada pieza
}

export interface Lesson {
  id: string;
  title: string;
  icon: PieceSymbol;
  emoji?: string; // para las lecciones que no son de una pieza
  intro: string;
  demo: Demo;
  exercises: Exercise[];
}

const STAR = 'Lleva la torre a la estrella ⭐.';

export const LESSONS: Lesson[] = [
  {
    id: 'torre',
    title: 'La torre',
    icon: 'r',
    intro: 'La torre va en línea recta: arriba, abajo y a los lados. ¡Todo lo lejos que quiera!',
    demo: { mine: ['Rd4'] },
    exercises: [
      { kind: 'free', text: STAR, mine: ['Ra1'], stars: ['a6'] },
      { kind: 'free', text: 'Recoge las dos estrellas ⭐.', mine: ['Ra1'], stars: ['a8', 'h8'] },
      { kind: 'free', text: 'Recoge todas las estrellas ⭐.', mine: ['Rd4'], stars: ['b2', 'g2', 'g7'] },
      {
        kind: 'free',
        text: 'Las casillas rojas están atacadas. ¡No te pares en ellas!',
        mine: ['Ra1'],
        enemies: ['Bf5'],
        stars: ['a8', 'h8', 'h1'],
        safe: true,
      },
      {
        kind: 'free',
        text: 'Esquiva al caballo y recoge todas las estrellas ⭐.',
        mine: ['Rh1'],
        enemies: ['Nd5'],
        stars: ['a1', 'a8', 'f8'],
        safe: true,
      },
    ],
  },
  {
    id: 'alfil',
    title: 'El alfil',
    icon: 'b',
    intro: 'El alfil va en diagonal ↗️. ¡Siempre pisa casillas del mismo color!',
    demo: { mine: ['Bd4'] },
    exercises: [
      { kind: 'free', text: 'Lleva el alfil a la estrella ⭐.', mine: ['Bc1'], stars: ['g5'] },
      { kind: 'free', text: 'Recoge las dos estrellas ⭐.', mine: ['Bc1'], stars: ['h6', 'f8'] },
      { kind: 'free', text: 'Recoge todas las estrellas ⭐.', mine: ['Bf1'], stars: ['b5', 'e8', 'h5'] },
      {
        kind: 'free',
        text: 'Cuidado con el caballo: ¡no te pares en las casillas rojas!',
        mine: ['Bc1'],
        enemies: ['Ne5'],
        stars: ['h6', 'a7'],
        safe: true,
      },
    ],
  },
  {
    id: 'dama',
    title: 'La dama',
    icon: 'q',
    intro: 'La dama es la pieza más fuerte: va recta como la torre y en diagonal como el alfil.',
    demo: { mine: ['Qd4'] },
    exercises: [
      { kind: 'free', text: 'Lleva la dama a la estrella ⭐.', mine: ['Qd1'], stars: ['h5'] },
      { kind: 'free', text: 'Recoge las estrellas ⭐.', mine: ['Qd1'], stars: ['d7', 'a4'] },
      { kind: 'free', text: 'Recoge todas las estrellas ⭐.', mine: ['Qa1'], stars: ['c3', 'h8', 'c8', 'f5'] },
      {
        kind: 'free',
        text: 'Esquiva las casillas rojas y recoge las estrellas ⭐.',
        mine: ['Qa1'],
        enemies: ['Rd6'],
        stars: ['h8', 'h1', 'a8'],
        safe: true,
      },
    ],
  },
  {
    id: 'rey',
    title: 'El rey',
    icon: 'k',
    intro: 'El rey da pasitos de uno en uno, hacia cualquier lado. ¡Es la pieza más importante!',
    demo: { mine: ['Kd4'] },
    exercises: [
      { kind: 'free', text: 'Lleva el rey a la estrella ⭐, paso a paso.', mine: ['Ke1'], stars: ['e3'] },
      { kind: 'free', text: 'Recoge las estrellas ⭐.', mine: ['Ke1'], stars: ['c3', 'g3'] },
      {
        kind: 'free',
        text: 'El rey nunca puede ir a una casilla atacada. ¡Evita las rojas!',
        mine: ['Ke1'],
        enemies: ['Bd3'],
        stars: ['e3'],
        safe: true,
      },
      {
        kind: 'free',
        text: 'Esquiva al caballo y recoge las estrellas ⭐.',
        mine: ['Kb1'],
        enemies: ['Nd4'],
        stars: ['c4', 'e3'],
        safe: true,
      },
    ],
  },
  {
    id: 'caballo',
    title: 'El caballo',
    icon: 'n',
    intro: 'El caballo salta en forma de L: dos casillas rectas y una de lado. ¡Puede saltar por encima de las piezas!',
    demo: { mine: ['Nd4'] },
    exercises: [
      { kind: 'free', text: 'Lleva el caballo a la estrella ⭐.', mine: ['Nb1'], stars: ['c3'] },
      { kind: 'free', text: 'Recoge las dos estrellas ⭐.', mine: ['Ng1'], stars: ['f3', 'e5'] },
      { kind: 'free', text: 'Esta estrella está un poco lejos… ¡salta, salta!', mine: ['Nb1'], stars: ['b3'] },
      {
        kind: 'free',
        text: 'El caballo salta por encima de los peones. ¡Recoge las estrellas ⭐!',
        mine: ['Nd1'],
        enemies: ['Pc2', 'Pd2', 'Pe2'],
        stars: ['c3', 'e4'],
      },
      {
        kind: 'free',
        text: 'Evita las casillas rojas y recoge las estrellas ⭐.',
        mine: ['Ng1'],
        enemies: ['Be5'],
        stars: ['g5', 'e4'],
        safe: true,
      },
    ],
  },
  {
    id: 'peon',
    title: 'El peón',
    icon: 'p',
    intro: 'El peón va hacia delante, paso a paso. ¡La primera vez puede dar dos pasos!',
    demo: { mine: ['Pe2'] },
    exercises: [
      { kind: 'free', text: 'Llega a la estrella ⭐ con un solo salto.', mine: ['Pe2'], stars: ['e4'] },
      {
        kind: 'free',
        text: 'El peón come en diagonal ↗️. ¡Come para llegar a la estrella!',
        mine: ['Pe4'],
        enemies: ['Pe5', 'Pd5'],
        stars: ['d6'],
      },
      {
        kind: 'free',
        text: 'Cómete todos los peones negros.',
        mine: ['Pb2'],
        enemies: ['Pc3', 'Pd4', 'Pe5'],
        eatAll: true,
      },
      {
        kind: 'free',
        text: 'Si llega al final, ¡el peón se convierte en dama! 👑',
        mine: ['Pa5'],
        stars: ['a8'],
      },
      {
        kind: 'free',
        text: 'Corona y luego recoge la otra estrella con tu dama nueva.',
        mine: ['Pc6'],
        stars: ['c8', 'h3'],
      },
    ],
  },
  {
    id: 'comer',
    title: 'Comer piezas',
    emoji: '😋',
    icon: 'n',
    intro: 'Si una pieza rival está en tu camino, ¡te la puedes comer! Cada pieza vale puntos:',
    demo: { mine: ['Rd2'], enemies: ['Pd6', 'Ng2'], marks: ['d6', 'g2'], values: true },
    exercises: [
      {
        kind: 'free',
        text: 'Cómete todos los peones con la torre.',
        mine: ['Ra1'],
        enemies: ['Pa6', 'Pe6', 'Pe2'],
        eatAll: true,
      },
      {
        kind: 'free',
        text: 'Ahora con el caballo. ¡Cómetelos todos!',
        mine: ['Nb1'],
        enemies: ['Pc3', 'Pe4', 'Pf6'],
        eatAll: true,
      },
      {
        kind: 'free',
        text: 'Puedes comer varias piezas. ¡Come la que más vale!',
        mine: ['Nd4'],
        enemies: ['Pb5', 'Bf5', 'Rc6', 'Pe2'],
        best: true,
      },
      {
        kind: 'free',
        text: '¿Qué pieza vale más? ¡Cómetela!',
        mine: ['Qd1'],
        enemies: ['Pd5', 'Ng4', 'Ra4', 'Qh1'],
        best: true,
      },
      {
        kind: 'free',
        text: 'Cómetelo todo, pero sin pararte en casillas rojas.',
        mine: ['Ra1'],
        enemies: ['Pb6', 'Na5'],
        eatAll: true,
        safe: true,
      },
    ],
  },
  {
    id: 'jaque',
    title: 'El jaque',
    emoji: '👑',
    icon: 'k',
    intro: 'Dar jaque es atacar al rey rival. ¡El rey tiene que salir del jaque enseguida!',
    demo: { mine: ['Re1'], enemies: ['Ke8'], marks: ['e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8'] },
    exercises: [
      { kind: 'chess', text: 'Da jaque al rey negro con la torre.', fen: '4k3/8/8/8/8/8/8/R5K1 w - - 0 1', goal: 'check' },
      { kind: 'chess', text: 'Ahora da jaque con el alfil.', fen: '4k3/8/8/8/8/8/8/5BK1 w - - 0 1', goal: 'check' },
      { kind: 'chess', text: 'Da jaque con el caballo.', fen: '4k3/8/8/8/4N3/8/8/6K1 w - - 0 1', goal: 'check' },
      {
        kind: 'chess',
        text: '¡Tu rey está en jaque! Muévelo a una casilla segura.',
        fen: '4r1k1/8/8/8/8/8/8/4K3 w - - 0 1',
        goal: 'escape',
        how: 'move',
      },
      {
        kind: 'chess',
        text: '¡Jaque! Esta vez sálvate comiendo la pieza que ataca.',
        fen: 'k7/8/8/8/8/8/2R5/2r4K w - - 0 1',
        goal: 'escape',
        how: 'capture',
      },
    ],
  },
  {
    id: 'mate',
    title: 'El jaque mate',
    emoji: '🏆',
    icon: 'q',
    intro: 'Jaque mate es un jaque del que el rey no puede escapar. ¡Así se gana la partida!',
    demo: { mine: ['Ra8', 'Kg1'], enemies: ['Kg8', 'Pf7', 'Pg7', 'Ph7'], marks: ['b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8'] },
    exercises: [
      { kind: 'chess', text: 'Los peones no dejan escapar al rey. ¡Da jaque mate!', fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', goal: 'mate' },
      { kind: 'chess', text: 'Tu rey ayuda a la dama. ¡Jaque mate!', fen: '4k3/8/4K3/8/8/8/8/Q7 w - - 0 1', goal: 'mate' },
      { kind: 'chess', text: 'Dos torres juntas son muy fuertes. ¡Jaque mate!', fen: '7k/R7/8/8/8/8/8/1R4K1 w - - 0 1', goal: 'mate' },
      { kind: 'chess', text: 'Busca el jaque mate con la dama.', fen: 'k7/8/1K6/8/8/8/8/7Q w - - 0 1', goal: 'mate' },
    ],
  },
  {
    id: 'enroque',
    title: 'El enroque',
    emoji: '🏰',
    icon: 'r',
    intro: 'El enroque protege al rey: salta dos casillas hacia la torre y la torre pasa a su lado.',
    demo: { mine: ['Ke1', 'Ra1', 'Rh1'], marks: ['c1', 'd1', 'f1', 'g1'] },
    exercises: [
      {
        kind: 'chess',
        text: 'Enroque corto: toca el rey y luego la casilla g1.',
        fen: '4k3/8/8/8/8/8/5PPP/4K2R w K - 0 1',
        goal: 'castle',
      },
      {
        kind: 'chess',
        text: 'Enroque largo: el rey va a c1 y la torre a d1.',
        fen: '4k3/8/8/8/8/8/PPP5/R3K3 w Q - 0 1',
        goal: 'castle',
      },
      {
        kind: 'chess',
        text: 'Solo se enroca si no hay piezas en medio. ¿Hacia qué lado puedes?',
        fen: '4k3/8/8/8/8/8/8/RN2K2R w KQ - 0 1',
        goal: 'castle',
      },
      {
        kind: 'chess',
        text: '¡Ojo! El rey no puede enrocar pasando por una casilla atacada.',
        fen: '4k3/8/8/1b6/8/8/8/R3K2R w KQ - 0 1',
        goal: 'castle',
      },
    ],
  },
];

/** "Ra1" → { type: 'r', sq: 'a1' } */
export function parsePiece(s: string): { type: PieceSymbol; sq: string } {
  return { type: s[0].toLowerCase() as PieceSymbol, sq: s.slice(1) };
}

/** Lo que vale cada pieza, en puntos sencillos. */
export const POINTS: Partial<Record<PieceSymbol, number>> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
