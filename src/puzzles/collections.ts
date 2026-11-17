// Colecciones de retos por tema. Las posiciones están en `data.ts` (generado por `build.mjs`
// y comprobado por `verify.mjs`).

/** Qué hay que conseguir en el reto (sirve para el enunciado y para explicar los fallos). */
export type Goal = 'mate' | 'free' | 'save' | 'checkwin' | 'fork' | 'pin' | 'material' | 'combo';

export interface CollectionInfo {
  id: string;
  title: string;
  emoji: string;
  /** Curso a partir del que está abierta (1, 3 o 5). */
  course: number;
  goal: Goal;
  /** Jugadas del niño en cada reto. */
  kidMoves: number;
  /** Frase corta para el mapa. */
  blurb: string;
}

export const COLLECTIONS: CollectionInfo[] = [
  { id: 'mate1', title: 'Mate en 1', emoji: '👑', course: 1, goal: 'mate', kidMoves: 1, blurb: 'Una jugada y ¡mate!' },
  { id: 'free', title: '¡Pieza gratis!', emoji: '🍪', course: 1, goal: 'free', kidMoves: 1, blurb: 'Cómete lo que nadie defiende' },
  { id: 'save', title: '¡Sálvala!', emoji: '🛟', course: 1, goal: 'save', kidMoves: 1, blurb: 'Pon tu pieza a salvo' },
  { id: 'checkwin', title: 'Jaque que gana', emoji: '⚡', course: 1, goal: 'checkwin', kidMoves: 2, blurb: 'Un jaque y te llevas algo' },
  { id: 'mate2', title: 'Mate en 2', emoji: '🏆', course: 3, goal: 'mate', kidMoves: 2, blurb: 'Dos jugadas hasta el mate' },
  { id: 'fork', title: 'Horquillas', emoji: '🍴', course: 3, goal: 'fork', kidMoves: 2, blurb: 'Ataca dos piezas a la vez' },
  { id: 'pin', title: 'Clavadas', emoji: '📌', course: 3, goal: 'pin', kidMoves: 2, blurb: 'La pieza clavada no se mueve' },
  { id: 'material2', title: 'Gana en 2', emoji: '💰', course: 3, goal: 'material', kidMoves: 2, blurb: 'Gana material en 2 jugadas' },
  { id: 'mate3', title: 'Mate en 3', emoji: '🦁', course: 5, goal: 'mate', kidMoves: 3, blurb: 'Para cazadores de reyes' },
  { id: 'combo', title: 'Combinaciones', emoji: '🧠', course: 5, goal: 'combo', kidMoves: 3, blurb: 'Jugadas largas de campeón' },
];

/** Grupos de cursos: así se muestran en el mapa. */
export const TIERS = [
  { course: 1, label: '1º y 2º' },
  { course: 3, label: '3º y 4º' },
  { course: 5, label: '5º y 6º' },
];
