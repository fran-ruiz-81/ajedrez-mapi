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

function addSub(maxTotal: number, noCarry: boolean): MathProblem {
  for (;;) {
    const a = rnd(2, maxTotal - 1);
    const b = rnd(1, maxTotal - a);
    // sin llevadas: ninguna cifra de las unidades/decenas se pasa de 9 (o se queda corta al restar)
    const carry = (a % 10) + (b % 10) > 9 || (Math.floor(a / 10) % 10) + (Math.floor(b / 10) % 10) > 9;
    if (Math.random() < 0.5) {
      if (noCarry && carry) continue;
      return { text: `${a} + ${b}`, answer: a + b };
    }
    const [x, y] = a >= b ? [a, b] : [b, a];
    if (noCarry && (x % 10 < y % 10 || Math.floor(x / 10) % 10 < Math.floor(y / 10) % 10)) continue;
    return { text: `${x} − ${y}`, answer: x - y };
  }
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
        return addSub(20, false);
      case 2:
        return addSub(99, true);
      case 3:
        return Math.random() < 0.67 ? addSub(999, false) : times([2, 5, 10]);
      case 4:
        return Math.random() < 0.5 ? addSub(999, false) : times([2, 3, 4, 5, 6, 7, 8, 9]);
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
  const extra = course <= 2 ? 0 : course <= 4 ? 2 : 5;
  return { kind: 'sf', skill: engine.skill + extra, depth: engine.depth + Math.ceil(extra / 2) };
}

/** A partir de 3º se muestra la notación (Cf3, e4…) que usan en la extraescolar. */
export const showNotation = (course: number) => course >= 3;

/** En 5º y 6º las ayudas empiezan apagadas (se pueden encender). */
export const defaultHelps = (course: number) => course <= 4;

/** Notación en español: C caballo, A alfil, T torre, D dama, R rey. */
export function sanEs(san: string): string {
  const map: Record<string, string> = { N: 'C', B: 'A', R: 'T', Q: 'D', K: 'R' };
  return san.replace(/^[NBRQK]/, (m) => map[m]).replace(/=([NBRQ])/, (_, p: string) => '=' + map[p]);
}
