// 🏰 Tema Medieval: soldado con escudo, castillo con estandarte, caballo con
// armadura y penacho, obispo con mitra, reina y rey con capa y corona.
// Blancas: acero claro con azul. Negras: hierro oscuro con rojo.
import type { Color, PieceSymbol } from 'chess.js';
import { squareTexture, svgUrl, wrap } from './svg';

interface Pal {
  metal: string;
  shade: string;
  line: string;
  accent: string;
  accentLine: string;
}

const PAL: Record<Color, Pal> = {
  w: { metal: '#f2f4f8', shade: '#c4ccda', line: '#343c4c', accent: '#2f6fd6', accentLine: '#173f86' },
  b: { metal: '#4a4456', shade: '#302b3a', line: '#121016', accent: '#d8343c', accentLine: '#7a141a' },
};
const GOLD = '#f6c443';
const GOLD_LINE = '#8a5a00';
const WOOD = '#7a4a24';

const g = (fill: string, line: string, inner: string, w = 3) =>
  `<g fill="${fill}" stroke="${line}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round">${inner}</g>`;

const BASE = '<path d="M22 92 Q22 81 34 80 H66 Q78 81 78 92 Z"/>';
const base = (p: Pal) =>
  g(p.metal, p.line, BASE) + `<rect x="28" y="85" width="44" height="3" rx="1.5" fill="${p.accent}"/>`;

function pawn(p: Pal): string {
  return (
    base(p) +
    // cuerpo con túnica
    g(p.metal, p.line, '<path d="M33 82 Q36 64 43 58 H57 Q64 64 67 82 Z"/>') +
    // yelmo con visera
    g(p.metal, p.line, '<path d="M37 58 V40 Q37 28 50 28 Q63 28 63 40 V58 Z"/>') +
    `<rect x="40" y="41" width="20" height="4" rx="1.5" fill="${p.line}"/>` +
    `<rect x="48" y="44" width="4" height="9" rx="1.5" fill="${p.line}"/>` +
    `<path d="M50 28 V38" stroke="${p.shade}" stroke-width="2.4"/>` +
    // escudo
    g(p.accent, p.accentLine, '<path d="M41 61 H59 V69 Q59 79 50 84 Q41 79 41 69 Z"/>', 2.4) +
    `<path d="M50 63 V80 M43 69 H57" stroke="${GOLD}" stroke-width="2.6"/>`
  );
}

function rook(p: Pal): string {
  // torre de castillo de piedra con estandarte
  const bricks = `<g stroke="${p.shade}" stroke-width="2" fill="none" stroke-linecap="round">
    <path d="M31 50 H69 M30.5 62 H69.5 M30 74 H70"/>
    <path d="M40 38 V50 M60 38 V50 M50 50 V62 M37 62 V74 M63 62 V74"/></g>`;
  return (
    // mástil y bandera
    `<path d="M50 18 V3" stroke="${WOOD}" stroke-width="2.6" stroke-linecap="round"/>` +
    g(p.accent, p.accentLine, '<path d="M51.5 3.5 L66 7.5 L51.5 12 Z"/>', 2) +
    base(p) +
    g(
      p.metal,
      p.line,
      '<path d="M24 38 V17 H35 V25 H44.5 V17 H55.5 V25 H65 V17 H76 V38 Z"/><path d="M29 38 H71 L73 82 H27 Z"/>',
    ) +
    `<path d="M27 38 H73" stroke="${p.line}" stroke-width="3"/>` +
    bricks +
    // puerta de madera
    g(WOOD, p.line, '<path d="M43 82 V72 Q43 64 50 64 Q57 64 57 72 V82 Z"/>', 2.4) +
    `<path d="M50 65 V82" stroke="#4d2c12" stroke-width="1.6"/>` +
    // ventana
    `<rect x="47.5" y="43" width="5" height="9" rx="2.5" fill="${p.line}"/>`
  );
}

function knight(p: Pal): string {
  return (
    base(p) +
    // cabeza de caballo
    g(
      p.metal,
      p.line,
      '<path d="M30 82 Q33 64 40 56 Q30 54 25 46 Q23 40 29 34 L43 20 L41 9 L52 15 Q72 19 74 46 Q76 64 71 82 Z"/>',
    ) +
    // crin
    g(p.shade, p.line, '<path d="M53 16 Q73 21 74 46 Q75 62 71 72 Q66 58 66 46 Q65 30 52 22 Z"/>', 2.2) +
    // penacho
    g(p.accent, p.accentLine, '<path d="M45 18 Q44 4 58 3 Q52 8 54 17 Z"/>', 2.2) +
    // ojo, ollar y bridas
    `<ellipse cx="44" cy="31" rx="3.4" ry="2.6" fill="${p.line}"/><circle cx="45" cy="30.2" r="1" fill="#fff"/>` +
    `<circle cx="29.5" cy="44" r="1.8" fill="${p.line}"/>` +
    `<path d="M34 49 L47 36 L52 22" stroke="${p.accent}" stroke-width="2.6" fill="none" stroke-linecap="round"/>` +
    // gualdrapa (tela del cuello) con ribete dorado
    g(p.accent, p.accentLine, '<path d="M31 78 Q34 64 41 57 L55 60 Q64 66 70 78 Z"/>', 2.2) +
    `<path d="M33 74 Q50 70 68 74" stroke="${GOLD}" stroke-width="2.4" fill="none"/>`
  );
}

function bishop(p: Pal): string {
  return (
    base(p) +
    g(p.metal, p.line, '<path d="M33 82 Q37 64 42 56 H58 Q63 64 67 82 Z"/>') +
    // estola
    `<path d="M45 58 L43 80 M55 58 L57 80" stroke="${p.accent}" stroke-width="3.4" stroke-linecap="round"/>` +
    g(GOLD, GOLD_LINE, '<rect x="36" y="49" width="28" height="7" rx="3.5"/><circle cx="50" cy="8" r="4.6"/>', 2.4) +
    // mitra
    g(p.metal, p.line, '<path d="M50 13 Q68 25 64 49 H36 Q32 25 50 13 Z"/>') +
    `<path d="M50 14 V49" stroke="${p.accent}" stroke-width="5"/>` +
    `<path d="M37 43 H63" stroke="${p.accent}" stroke-width="4"/>` +
    // la raja del alfil
    `<path d="M60 23 L54 31" stroke="${p.line}" stroke-width="3" stroke-linecap="round"/>` +
    g(GOLD, GOLD_LINE, '<path d="M47.6 25 H52.4 V29 H56 V33.4 H52.4 V39 H47.6 V33.4 H44 V29 H47.6 Z"/>', 1.4)
  );
}

function queen(p: Pal): string {
  return (
    base(p) +
    g(p.metal, p.line, '<path d="M31 82 Q35 68 33 62 H67 Q65 68 69 82 Z"/>') +
    // corona de picos con perlas doradas
    g(
      p.metal,
      p.line,
      '<path d="M31 62 L23 30 L38 46 L37 20 L46 44 L50 15 L54 44 L63 20 L62 46 L77 30 L69 62 Z"/>',
    ) +
    g(
      GOLD,
      GOLD_LINE,
      '<circle cx="23" cy="28" r="4.6"/><circle cx="37" cy="18" r="4.6"/><circle cx="50" cy="12" r="4.6"/><circle cx="63" cy="18" r="4.6"/><circle cx="77" cy="28" r="4.6"/>' +
        '<rect x="30" y="56" width="40" height="8" rx="3"/>',
      2.2,
    ) +
    `<g fill="${p.accent}" stroke="${p.accentLine}" stroke-width="1.2"><circle cx="40" cy="60" r="2.3"/><circle cx="50" cy="60" r="2.3"/><circle cx="60" cy="60" r="2.3"/></g>` +
    `<path d="M40 82 L44 66 M60 82 L56 66" stroke="${p.accent}" stroke-width="3" stroke-linecap="round"/>`
  );
}

function king(p: Pal): string {
  return (
    base(p) +
    g(p.metal, p.line, '<path d="M31 82 Q35 68 33 62 H67 Q65 68 69 82 Z"/>') +
    // cruz
    g(GOLD, GOLD_LINE, '<path d="M46 26 V15 H40 V8 H46 V2 H54 V8 H60 V15 H54 V26 Z"/>', 2.4) +
    // corona redonda con arcos
    g(p.metal, p.line, '<path d="M29 62 Q19 38 36 33 Q45 31 50 40 Q55 31 64 33 Q81 38 71 62 Z"/>') +
    `<path d="M50 40 V60 M36 36 Q42 48 40 60 M64 36 Q58 48 60 60" stroke="${GOLD}" stroke-width="3" fill="none" stroke-linecap="round"/>` +
    g(GOLD, GOLD_LINE, '<rect x="30" y="56" width="40" height="8" rx="3"/>', 2.2) +
    `<g fill="${p.accent}" stroke="${p.accentLine}" stroke-width="1.2"><circle cx="40" cy="60" r="2.3"/><circle cx="60" cy="60" r="2.3"/></g>` +
    `<path d="M50 56 l3 4 l-3 4 l-3 -4 Z" fill="#fff" stroke="${GOLD_LINE}" stroke-width="1"/>` +
    // escudo con chevrón en el pecho
    g(p.accent, p.accentLine, '<path d="M42 66 H58 V72 Q58 79 50 83 Q42 79 42 72 Z"/>', 2) +
    `<path d="M44.5 77 L50 70.5 L55.5 77" stroke="${GOLD}" stroke-width="2.4" fill="none"/>`
  );
}

const DRAW: Record<PieceSymbol, (p: Pal) => string> = {
  p: pawn,
  r: rook,
  n: knight,
  b: bishop,
  q: queen,
  k: king,
};

export function drawMedieval(type: PieceSymbol, color: Color): string {
  return wrap(DRAW[type](PAL[color]));
}

// ── Tablero: losas de piedra y tablones de madera ──
const STONE = '#e2d8c3';
const OAK = '#9a6a3e';

const FLAGSTONES = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="none" stroke="#c3b597" stroke-width="2.2">
  <path d="M0 52 H100 M46 0 V52 M62 52 V100"/></g>
  <g fill="#cfc3a8"><circle cx="20" cy="30" r="1.6"/><circle cx="76" cy="20" r="1.2"/><circle cx="30" cy="78" r="1.4"/><circle cx="84" cy="80" r="1.6"/></g></svg>`;
const PLANKS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="none" stroke="#7d522b" stroke-width="2.4">
  <path d="M0 33.3 H100 M0 66.6 H100"/></g>
  <g fill="none" stroke="#8b5d33" stroke-width="1.4" stroke-linecap="round"><path d="M10 16 Q40 12 70 18"/><path d="M30 50 Q60 46 90 52"/><path d="M8 84 Q35 80 58 86"/></g>
  <g fill="#5e3a1a"><circle cx="6" cy="27" r="1.6"/><circle cx="94" cy="27" r="1.6"/><circle cx="6" cy="60" r="1.6"/><circle cx="94" cy="60" r="1.6"/><circle cx="6" cy="94" r="1.6"/><circle cx="94" cy="94" r="1.6"/></g></svg>`;

export const MED_LIGHT = STONE;
export const MED_DARK = OAK;
export const MED_LIGHT_TEX = squareTexture(FLAGSTONES, STONE);
export const MED_DARK_TEX = squareTexture(PLANKS, OAK);

// Fondo: cielo, colinas y la silueta de un castillo con banderines
const CASTLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 300" preserveAspectRatio="xMidYMax slice">
  <path d="M0 300 V230 Q300 190 600 225 Q900 260 1200 215 V300 Z" fill="#9cc58a"/>
  <g fill="#b9b1c6">
    <path d="M820 300 V150 H835 V138 H848 V150 H862 V138 H875 V150 H890 V300 Z"/>
    <path d="M890 300 V190 H1010 V300 Z"/>
    <path d="M1010 300 V130 H1025 V118 H1038 V130 H1052 V118 H1065 V130 H1080 V300 Z"/>
    <path d="M890 190 V178 H905 V190 H920 V178 H935 V190 H950 V178 H965 V190 H980 V178 H995 V190 Z"/>
  </g>
  <path d="M930 300 V250 Q950 228 970 250 V300 Z" fill="#8a7f99"/>
  <path d="M855 138 V100" stroke="#8a7f99" stroke-width="3"/><path d="M856 100 L882 108 L856 116 Z" fill="#d8343c"/>
  <path d="M1045 118 V80" stroke="#8a7f99" stroke-width="3"/><path d="M1046 80 L1072 88 L1046 96 Z" fill="#2f6fd6"/>
  <path d="M0 300 V265 Q300 245 600 268 Q900 290 1200 260 V300 Z" fill="#7fb06c"/>
</svg>`;

export const MED_BG = [
  `${svgUrl(CASTLE)} center bottom / 100% auto no-repeat`,
  'radial-gradient(circle at 12% 12%, #ffffffaa 0, #ffffff00 25%)',
  'linear-gradient(180deg, #a9d4f5 0%, #d9ecf7 50%, #eef3df 100%)',
].join(', ');
