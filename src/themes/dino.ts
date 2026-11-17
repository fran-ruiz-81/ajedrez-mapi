// 🦖 Tema Dinosaurios: piezas que son dinosaurios (y huevos).
// - Rey: T-rex con corona y cruz.      - Dama: dinosauria con corona de picos.
// - Torre: anquilosaurio con almenas.  - Alfil: paquicefalosaurio (cabeza de cúpula, como una mitra).
// - Caballo: dinosaurio de cuello largo. - Peón: huevo con carita en su nido.
import type { Color, PieceSymbol } from 'chess.js';
import { eye, rng, squareTexture, svgUrl, wrap } from './svg';

interface Pal {
  body: string;
  belly: string;
  spot: string;
  line: string;
}

const PAL: Record<Color, Pal> = {
  w: { body: '#fff3cf', belly: '#ffffff', spot: '#f5a23a', line: '#7a4612' },
  b: { body: '#6a4fc8', belly: '#a796f0', spot: '#3f2b8f', line: '#1c1250' },
};
const GOLD = '#ffc93a';
const GOLD_LINE = '#9a5c00';
const MOUTH = '#5a1630';

const outline = (p: Pal, fill: string, inner: string, w = 3) =>
  `<g fill="${fill}" stroke="${p.line}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round">${inner}</g>`;

const smile = (x: number, y: number, w: number, p: Pal) =>
  `<path d="M${x - w} ${y} Q${x} ${y + w * 0.75} ${x + w} ${y}" fill="none" stroke="${p.line}" stroke-width="2.2" stroke-linecap="round"/>`;

// Patas de dinosaurio con uñas: la base de todas las piezas menos el peón
function feet(p: Pal): string {
  const claws = (cx: number) =>
    [-7, 0, 7]
      .map((d) => `<path d="M${cx + d - 2.4} 91 l2.4 -4 l2.4 4 Z"/>`)
      .join('');
  return (
    outline(p, p.body, '<path d="M23 92 Q22 80 38 80 Q48 80 49 92 Z"/><path d="M51 92 Q52 80 62 80 Q78 80 77 92 Z"/>') +
    `<g fill="#fff" stroke="${p.line}" stroke-width="1.2" stroke-linejoin="round">${claws(36)}${claws(64)}</g>`
  );
}

function pawn(p: Pal): string {
  return (
    outline(
      p,
      p.body,
      '<path d="M50 30 C65 30 72 54 72 66 C72 79 62 86 50 86 C38 86 28 79 28 66 C28 54 35 30 50 30 Z"/>',
    ) +
    // manchas del huevo
    `<g fill="${p.spot}"><circle cx="40" cy="47" r="3.6"/><circle cx="63" cy="51" r="3"/><circle cx="62" cy="72" r="3.4"/></g>` +
    // grieta: está a punto de nacer
    `<path d="M36 41 L42 45 L46 39 L51 45 L56 39 L60 44 L65 41" fill="none" stroke="${p.line}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>` +
    eye(43, 60, 4.6, p.line) +
    eye(57, 60, 4.6, p.line) +
    smile(50, 69, 4.5, p) +
    // nido de ramitas
    outline(
      { ...p, line: '#5b3410' },
      '#b8803f',
      '<path d="M24 80 Q50 90 76 80 L73 91 Q50 97 27 91 Z"/>',
      2.5,
    ) +
    `<path d="M30 85 L40 88 M46 89 L56 88 M62 87 L70 84" stroke="#e8b878" stroke-width="2" stroke-linecap="round"/>`
  );
}

function rook(p: Pal): string {
  return (
    feet(p) +
    outline(
      p,
      p.body,
      // cuerpo acorazado con almenas: placas cuadradas de la espalda
      '<path d="M25 42 V17 H36 V25 H44.5 V17 H55.5 V25 H64 V17 H75 V42 Z"/><path d="M29 42 H71 L73 83 H27 Z"/>',
    ) +
    // placas de la coraza
    `<g fill="${p.spot}"><rect x="28.5" y="20.5" width="4" height="4" rx="1"/><rect x="48" y="20.5" width="4" height="4" rx="1"/><rect x="67.5" y="20.5" width="4" height="4" rx="1"/></g>` +
    `<path d="M27 42 H73" stroke="${p.line}" stroke-width="3"/>` +
    eye(41, 52, 5, p.line) +
    eye(59, 52, 5, p.line) +
    smile(50, 61, 5, p) +
    `<ellipse cx="35" cy="62" rx="3.2" ry="2" fill="#ff8a9a" opacity=".7"/><ellipse cx="65" cy="62" rx="3.2" ry="2" fill="#ff8a9a" opacity=".7"/>` +
    // escamas de la coraza
    `<g fill="${p.spot}" stroke="${p.line}" stroke-width="1.4">${[36, 50, 64]
      .map((x) => `<path d="M${x - 5} 78 Q${x} 68 ${x + 5} 78 Z"/>`)
      .join('')}${[43, 57].map((x) => `<path d="M${x - 4} 72 Q${x} 64 ${x + 4} 72 Z"/>`).join('')}</g>`
  );
}

function knight(p: Pal): string {
  // dinosaurio de cuello largo mirando a la izquierda, como la cabeza del caballo
  return (
    feet(p) +
    outline(
      p,
      p.body,
      // cola
      '<path d="M66 74 Q80 72 86 60 Q84 74 70 82 Z"/>' +
        '<path d="M28 84 C28 68 36 62 42 54 C46 48 44 38 36 36 C28 35 18 34 17 26 C16 16 28 10 40 12 C52 14 58 22 58 34 C58 48 66 56 72 64 C76 70 75 78 72 84 Z"/>',
    ) +
    // manchas en la espalda
    `<g fill="${p.spot}"><circle cx="57" cy="44" r="3"/><circle cx="63" cy="56" r="3.4"/><circle cx="70" cy="68" r="3"/><circle cx="49" cy="15" r="2.4"/></g>` +
    // tripa
    `<path d="M33 82 C34 70 40 64 46 58 C48 66 54 74 56 82 Z" fill="${p.belly}" stroke="${p.line}" stroke-width="2" stroke-linejoin="round"/>` +
    eye(38, 22, 5, p.line) +
    `<circle cx="21" cy="23" r="1.6" fill="${p.line}"/>` +
    `<path d="M20 30 Q26 33 31 30" fill="none" stroke="${p.line}" stroke-width="2.2" stroke-linecap="round"/>` +
    `<ellipse cx="30" cy="29" rx="3" ry="1.8" fill="#ff8a9a" opacity=".7"/>`
  );
}

function bishop(p: Pal): string {
  // paquicefalosaurio: cabeza en forma de cúpula alta (como la mitra del alfil)
  return (
    feet(p) +
    outline(
      p,
      p.body,
      '<circle cx="50" cy="9" r="5"/>' +
        '<path d="M50 14 Q69 26 66 50 Q50 57 34 50 Q31 26 50 14 Z"/>' +
        '<rect x="36" y="50" width="28" height="7" rx="3.5"/>' +
        '<path d="M33 84 Q37 66 42 57 H58 Q63 66 67 84 Z"/>',
    ) +
    // bultitos de la cúpula
    `<g fill="${p.spot}" stroke="${p.line}" stroke-width="1.5"><circle cx="35" cy="34" r="2.6"/><circle cx="65" cy="34" r="2.6"/><circle cx="38" cy="24" r="2.2"/><circle cx="62" cy="24" r="2.2"/></g>` +
    // la raja del alfil
    `<path d="M57 22 L47 33" stroke="${p.spot}" stroke-width="4" stroke-linecap="round"/>` +
    eye(43, 41, 4.4, p.line) +
    eye(57, 41, 4.4, p.line) +
    smile(50, 48, 3.2, p) +
    `<path d="M43 82 Q44 70 50 64 Q56 70 57 82 Z" fill="${p.belly}" stroke="${p.line}" stroke-width="2"/>`
  );
}

// Cabeza redonda de dinosaurio de frente (rey y dama)
function head(p: Pal, teeth: boolean): string {
  const h = outline(
    p,
    p.body,
    '<path d="M33 84 Q33 68 42 63 H58 Q67 68 67 84 Z"/>' +
      '<path d="M25 54 Q25 35 50 35 Q75 35 75 54 Q75 71 50 71 Q25 71 25 54 Z"/>',
  );
  const arms = `<g fill="none" stroke="${p.line}" stroke-width="7" stroke-linecap="round"><path d="M36 73 L31 77"/><path d="M64 73 L69 77"/></g><g fill="none" stroke="${p.body}" stroke-width="3.6" stroke-linecap="round"><path d="M36 73 L31 77"/><path d="M64 73 L69 77"/></g>`;
  const belly = `<path d="M42 84 Q42 74 50 72 Q58 74 58 84 Z" fill="${p.belly}" stroke="${p.line}" stroke-width="2"/>`;
  const nose = `<circle cx="45" cy="55" r="1.6" fill="${p.line}"/><circle cx="55" cy="55" r="1.6" fill="${p.line}"/>`;
  const mouth = teeth
    ? `<path d="M34 59 Q50 72 66 59 Q50 64 34 59 Z" fill="${MOUTH}" stroke="${p.line}" stroke-width="2" stroke-linejoin="round"/>` +
      `<g fill="#fff">${[39, 45, 51, 57]
        .map((x) => `<path d="M${x} ${61.6 + (x === 39 ? 0 : 0.9)} l2.5 3.4 l2.5 -3 Z"/>`)
        .join('')}</g>`
    : smile(50, 61, 7, p);
  const spots = `<g fill="${p.spot}"><circle cx="31" cy="50" r="2.4"/><circle cx="69" cy="50" r="2.4"/><circle cx="34" cy="43" r="1.8"/><circle cx="66" cy="43" r="1.8"/></g>`;
  return h + arms + belly + spots + nose + mouth;
}

function king(p: Pal): string {
  return (
    feet(p) +
    head(p, true) +
    eye(41, 46, 5, p.line) +
    eye(59, 46, 5, p.line) +
    // cejas de rey valiente
    `<path d="M35 39 L45 41 M65 39 L55 41" stroke="${p.line}" stroke-width="2.4" stroke-linecap="round"/>` +
    `<g fill="${GOLD}" stroke="${GOLD_LINE}" stroke-width="2.6" stroke-linejoin="round">
      <path d="M35 39 L32 23 L41 30 L50 21 L59 30 L68 23 L65 39 Z"/>
      <path d="M46.5 21 V13 H41 V7 H46.5 V2 H53.5 V7 H59 V13 H53.5 V21 Z"/></g>` +
    `<circle cx="50" cy="33" r="2.4" fill="#e8344a"/>`
  );
}

function queen(p: Pal): string {
  return (
    feet(p) +
    head(p, false) +
    eye(41, 47, 5, p.line) +
    eye(59, 47, 5, p.line) +
    // pestañas
    `<path d="M35 42 l-3 -2 M37 40 l-2 -3 M65 42 l3 -2 M63 40 l2 -3" stroke="${p.line}" stroke-width="1.8" stroke-linecap="round"/>` +
    `<ellipse cx="34" cy="57" rx="3.4" ry="2.2" fill="#ff8a9a" opacity=".8"/><ellipse cx="66" cy="57" rx="3.4" ry="2.2" fill="#ff8a9a" opacity=".8"/>` +
    `<g fill="${GOLD}" stroke="${GOLD_LINE}" stroke-width="2.4" stroke-linejoin="round">
      <path d="M33 40 L25 21 L38 31 L38 14 L46 29 L50 9 L54 29 L62 14 L62 31 L75 21 L67 40 Z"/>
      <circle cx="25" cy="20" r="3.6"/><circle cx="38" cy="13" r="3.6"/><circle cx="50" cy="8" r="3.6"/>
      <circle cx="62" cy="13" r="3.6"/><circle cx="75" cy="20" r="3.6"/></g>` +
    `<circle cx="50" cy="34" r="2.6" fill="#e8344a"/>`
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

export function drawDino(type: PieceSymbol, color: Color): string {
  return wrap(DRAW[type](PAL[color]));
}

// ── Tablero: arena con piedrecitas y selva con hojas ──
const SAND = '#f0dca6';
const JUNGLE = '#5f9a45';

function pebbles(): string {
  const r = rng(7);
  let s = '';
  for (let i = 0; i < 7; i++) {
    s += `<ellipse cx="${(8 + r() * 84).toFixed(1)}" cy="${(8 + r() * 84).toFixed(1)}" rx="${(1.5 + r() * 2).toFixed(1)}" ry="${(1 + r() * 1.4).toFixed(1)}" fill="#c9a76a" opacity=".55"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${s}</svg>`;
}

function leaves(): string {
  const leaf = (x: number, y: number, a: number) =>
    `<path transform="translate(${x} ${y}) rotate(${a})" d="M0 0 Q5 -7 0 -14 Q-5 -7 0 0 Z" fill="#4c8636"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${leaf(16, 30, -20)}${leaf(22, 32, 25)}${leaf(78, 82, -15)}${leaf(84, 84, 30)}${leaf(70, 20, 10)}<g fill="#6fae52"><circle cx="40" cy="70" r="2"/><circle cx="58" cy="44" r="1.6"/></g></svg>`;
}

export const DINO_LIGHT = SAND;
export const DINO_DARK = JUNGLE;
export const DINO_LIGHT_TEX = squareTexture(pebbles(), SAND);
export const DINO_DARK_TEX = squareTexture(leaves(), JUNGLE);

// Fondo prehistórico: cielo de atardecer, volcán humeante y helechos
const LANDSCAPE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 300" preserveAspectRatio="xMidYMax slice">
  <g fill="#ffffff" opacity=".55"><circle cx="905" cy="40" r="22"/><circle cx="930" cy="22" r="26"/><circle cx="960" cy="34" r="20"/></g>
  <path d="M760 300 L880 110 Q900 90 920 110 L1040 300 Z" fill="#a0613f"/>
  <path d="M880 110 Q900 90 920 110 L912 130 L900 118 L888 132 Z" fill="#ff7a2f"/>
  <path d="M0 300 V210 Q150 160 300 205 Q450 250 600 200 Q760 150 900 210 Q1050 260 1200 200 V300 Z" fill="#7fb35a"/>
  <path d="M0 300 V250 Q200 220 400 255 Q600 285 800 245 Q1000 215 1200 250 V300 Z" fill="#5f9a45"/>
  <g fill="#4c8636"><path d="M120 300 Q110 230 60 205 Q120 220 135 300 Z"/><path d="M140 300 Q160 220 220 200 Q165 235 155 300 Z"/>
  <path d="M1060 300 Q1050 240 1000 220 Q1065 235 1075 300 Z"/><path d="M1080 300 Q1100 230 1150 215 Q1105 245 1095 300 Z"/></g>
</svg>`;

export const DINO_BG = [
  `${svgUrl(LANDSCAPE)} center bottom / 100% auto no-repeat`,
  'radial-gradient(circle at 15% 15%, #fff6b088 0, #fff6b000 28%)',
  'linear-gradient(180deg, #ffd59a 0%, #ffe9b8 40%, #e8f4c4 100%)',
].join(', ');
