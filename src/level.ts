// Todo lo que depende del curso escolar (1º a 6º de primaria).
import type { Level } from './engine';
import type { RivalEngine } from './rivals';

export const COURSES = [1, 2, 3, 4, 5, 6];
export const DEFAULT_COURSE = 2; // 7 años

export interface MathProblem {
  text: string; // "8 + 5"
  answer: number;
}

const rnd = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

/** Suma o resta (sin resultados negativos) con números hasta `maxTotal`. */
function addSub(maxTotal: number): MathProblem {
  const a = rnd(2, maxTotal - 1);
  const b = rnd(1, maxTotal - a);
  if (Math.random() < 0.5) return { text: `${a} + ${b}`, answer: a + b };
  const [x, y] = a >= b ? [a, b] : [b, a];
  return { text: `${x} − ${y}`, answer: x - y };
}

function times(tables: number[], maxFactor = 10): MathProblem {
  const a = tables[rnd(0, tables.length - 1)];
  const b = rnd(1, maxFactor);
  return Math.random() < 0.5 ? { text: `${a} × ${b}`, answer: a * b } : { text: `${b} × ${a}`, answer: a * b };
}

function division(): MathProblem {
  const d = rnd(2, 9);
  const q = rnd(2, 10);
  return { text: `${d * q} ÷ ${d}`, answer: q };
}

/** Tres cuentas adecuadas al curso para confirmar que se quiere borrar el progreso. */
export function mathProblems(course: number): MathProblem[] {
  const one = (): MathProblem => {
    switch (course) {
      case 1:
        return addSub(20);
      case 2:
        return addSub(99); // en 2º ya se suma y resta llevando
      case 3:
        return Math.random() < 0.67 ? addSub(999) : times([2, 3, 4, 5, 6, 10]);
      case 4:
        return Math.random() < 0.5 ? addSub(999) : times([2, 3, 4, 5, 6, 7, 8, 9]);
      default: {
        const r = Math.random();
        if (r < 0.34) return times([2, 3, 4, 5, 6, 7, 8, 9]);
        if (r < 0.67) return division();
        return { ...times([rnd(11, 25)], 9) };
      }
    }
  };
  const out: MathProblem[] = [];
  while (out.length < 3) {
    const p = one();
    if (!out.some((o) => o.text === p.text)) out.push(p);
  }
  return out;
}

/** Los rivales se hacen más fuertes con el curso: se despistan menos. */
export function adjustRival(engine: RivalEngine, course: number): RivalEngine {
  if (engine.kind === 'own') {
    const f = course <= 2 ? 1 : course <= 4 ? 0.6 : 0.35;
    const level: Level = {
      ...engine.level,
      noise: Math.round(engine.level.noise * f),
      blunder: engine.level.blunder * f,
      qDepth: course >= 3 ? Math.max(engine.level.qDepth, 1) : engine.level.qDepth,
    };
    return { kind: 'own', level };
  }
  const extra = course <= 2 ? 0 : course <= 4 ? 2 : 4;
  return { kind: 'sf', skill: engine.skill + extra, depth: engine.depth + extra };
}

/** A partir de 3º se muestra la notación (Cf3, e4…) que usan en la extraescolar. */
export const showNotation = (course: number) => course >= 3;

/** En 5º y 6º las ayudas empiezan apagadas (se pueden encender). */
export const defaultHelps = (course: number) => course <= 4;

/** Notación española (C caballo, A alfil, T torre, D dama, R rey, 0-0). */
export { toEs as sanEs } from './openings/notation';
