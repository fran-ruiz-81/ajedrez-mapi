import type { Color, PieceSymbol } from 'chess.js';
import type { Theme } from './themes';

// Siluetas en un lienzo de 100x100. Se rellenan con los colores del tema.
const BASE = '<rect x="22" y="80" width="56" height="12" rx="5"/>';

const SHAPES: Record<PieceSymbol, string> = {
  p: `<circle cx="50" cy="30" r="14"/>
      <rect x="37" y="44" width="26" height="7" rx="3.5"/>
      <path d="M33 80 Q36 60 44 51 H56 Q64 60 67 80 Z"/>`,
  r: `<path d="M26 40 V16 H36 V24 H45 V16 H55 V24 H64 V16 H74 V40 Z"/>
      <path d="M31 40 H69 L71 80 H29 Z"/>`,
  n: `<path d="M30 80 Q33 64 40 56 Q30 54 26 46 Q24 40 30 34 L44 20 L42 10 L52 16
          Q72 20 74 46 Q76 64 70 80 Z"/>`,
  b: `<circle cx="50" cy="11" r="5"/>
      <path d="M50 16 Q68 32 62 50 Q50 55 38 50 Q32 32 50 16 Z"/>
      <rect x="37" y="50" width="26" height="7" rx="3.5"/>
      <path d="M34 80 Q38 64 42 57 H58 Q62 64 66 80 Z"/>`,
  q: `<path d="M31 62 L24 30 L38 46 L37 21 L46 44 L50 16 L54 44 L63 21 L62 46 L76 30 L69 62 Z"/>
      <circle cx="24" cy="28" r="4.5"/><circle cx="37" cy="19" r="4.5"/>
      <circle cx="50" cy="13" r="4.5"/><circle cx="63" cy="19" r="4.5"/>
      <circle cx="76" cy="28" r="4.5"/>
      <path d="M32 80 Q36 68 33 62 H67 Q64 68 68 80 Z"/>`,
  k: `<rect x="46" y="4" width="8" height="22" rx="2"/>
      <rect x="39" y="9" width="22" height="8" rx="2"/>
      <path d="M29 62 Q20 38 36 33 Q45 31 50 40 Q55 31 64 33 Q80 38 71 62 Z"/>
      <path d="M32 80 Q36 68 33 62 H67 Q64 68 68 80 Z"/>`,
};

// Detalles que se dibujan con trazo (no relleno), por ejemplo la raja del alfil
const DETAILS: Partial<Record<PieceSymbol, string>> = {
  b: '<path d="M54 24 L46 36" fill="none"/>',
  n: '<circle cx="31" cy="44" r="1.6"/>',
};

// Dónde va la cara en cada pieza (tema infantil)
const FACE: Record<PieceSymbol, { x: number; y: number; s: number; side?: boolean }> = {
  p: { x: 50, y: 30, s: 1 },
  r: { x: 50, y: 58, s: 1.1 },
  n: { x: 46, y: 32, s: 0.9, side: true },
  b: { x: 50, y: 40, s: 0.85 },
  q: { x: 50, y: 52, s: 0.85 },
  k: { x: 50, y: 50, s: 0.9 },
};

function face(type: PieceSymbol): string {
  const f = FACE[type];
  const eye = (cx: number) =>
    `<circle cx="${cx}" cy="0" r="4.6" fill="#fff" stroke="#222" stroke-width="1.2"/>
     <circle cx="${cx + 0.8}" cy="0.6" r="2.3" fill="#222"/>
     <circle cx="${cx + 1.6}" cy="-0.8" r="0.8" fill="#fff"/>`;
  const eyes = f.side ? eye(-2) : eye(-6.5) + eye(6.5);
  const mouth = f.side
    ? '<path d="M-14 9 Q-10 12 -6 9" fill="none" stroke="#222" stroke-width="1.6" stroke-linecap="round"/>'
    : '<path d="M-4.5 7 Q0 11 4.5 7" fill="none" stroke="#222" stroke-width="1.6" stroke-linecap="round"/>';
  const cheeks = f.side
    ? '<ellipse cx="4" cy="7" rx="3" ry="2" fill="#ff8a9a" opacity=".6"/>'
    : '<ellipse cx="-11" cy="6" rx="3" ry="2" fill="#ff8a9a" opacity=".6"/><ellipse cx="11" cy="6" rx="3" ry="2" fill="#ff8a9a" opacity=".6"/>';
  return `<g transform="translate(${f.x} ${f.y}) scale(${f.s})">${cheeks}${eyes}${mouth}</g>`;
}

export function pieceSvg(type: PieceSymbol, color: Color, theme: Theme): string {
  const c = color === 'w' ? theme.white : theme.black;
  const body = `<g fill="${c.fill}" stroke="${c.stroke}" stroke-width="3" stroke-linejoin="round">
      ${SHAPES[type]}${BASE}</g>`;
  const detail = DETAILS[type]
    ? `<g stroke="${c.detail}" fill="${c.detail}" stroke-width="3" stroke-linecap="round">${DETAILS[type]}</g>`
    : '';
  return `<svg viewBox="0 0 100 100" class="piece-svg" aria-hidden="true">${body}${detail}${
    theme.faces ? face(type) : ''
  }</svg>`;
}

export const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: 'peón',
  n: 'caballo',
  b: 'alfil',
  r: 'torre',
  q: 'dama',
  k: 'rey',
};

/** Artículo + nombre: "el caballo", "la torre" */
export function withArticle(type: PieceSymbol): string {
  return (type === 'r' || type === 'q' ? 'la ' : 'el ') + PIECE_NAMES[type];
}

export const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 300,
  b: 320,
  r: 500,
  q: 900,
  k: 20000,
};
