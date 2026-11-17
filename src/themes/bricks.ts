// 🔧 Tema Construcción: piezas hechas con ladrillos de juguete encajables,
// con sus botoncitos redondos arriba. Diseño propio (sin marcas).
// Blancas: ladrillos blancos con amarillo. Negras: ladrillos negros con rojo.
import type { Color, PieceSymbol } from 'chess.js';
import { squareTexture, svgUrl, wrap } from './svg';

interface Mat {
  base: string;
  hi: string;
  lo: string;
}
interface Pal {
  line: string;
  body: Mat;
  acc: Mat;
}

const PAL: Record<Color, Pal> = {
  w: {
    line: '#2b2f3a',
    body: { base: '#f7f8fb', hi: '#ffffff', lo: '#cfd5df' },
    acc: { base: '#2f7de1', hi: '#7fb6ff', lo: '#1b56a6' },
  },
  b: {
    line: '#0b0c10',
    body: { base: '#30333d', hi: '#545a69', lo: '#1c1e25' },
    acc: { base: '#e53935', hi: '#ff8a80', lo: '#a5201d' },
  },
};
const YELLOW: Mat = { base: '#ffcc1a', hi: '#fff07a', lo: '#d69a00' };

/** Botoncito redondo visto de lado, apoyado en la altura y. */
function stud(p: Pal, m: Mat, x: number, y: number): string {
  return (
    `<rect x="${x - 5}" y="${y - 5.5}" width="10" height="7" rx="1.6" fill="${m.base}" stroke="${p.line}" stroke-width="2.2"/>` +
    `<rect x="${x - 3.2}" y="${y - 4}" width="2.4" height="3" rx="1" fill="${m.hi}"/>`
  );
}

/** Ladrillo visto de lado: caja con luz arriba y sombra a la derecha, y botoncitos encima. */
function brick(p: Pal, m: Mat, x: number, y: number, w: number, h: number, studs: number[] = []): string {
  return (
    studs.map((sx) => stud(p, m, sx, y)).join('') +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${m.base}" stroke="${p.line}" stroke-width="2.6"/>` +
    `<rect x="${x + 2.6}" y="${y + 2.4}" width="${w - 5.2}" height="${Math.min(3, h / 4)}" rx="1" fill="${m.hi}"/>` +
    `<rect x="${x + w - 5.4}" y="${y + 2.4}" width="${3}" height="${h - 4.8}" rx="1" fill="${m.lo}"/>`
  );
}

// Placa ancha de la base, igual para todas las piezas
const base = (p: Pal) => brick(p, p.acc, 20, 82, 60, 10);

function pawn(p: Pal): string {
  return (
    base(p) +
    brick(p, p.body, 32, 64, 36, 18, [41, 59]) +
    // pieza redonda (cilindro) encima, con su botoncito
    stud(p, p.body, 50, 47) +
    `<rect x="37" y="47" width="26" height="15" rx="3" fill="${p.body.base}" stroke="${p.line}" stroke-width="2.6"/>` +
    `<ellipse cx="50" cy="47" rx="13" ry="3.6" fill="${p.body.hi}" stroke="${p.line}" stroke-width="2.2"/>` +
    `<rect x="57" y="50.5" width="3" height="9" rx="1" fill="${p.body.lo}"/>` +
    stud(p, p.body, 50, 44.5)
  );
}

function rook(p: Pal): string {
  return (
    base(p) +
    brick(p, p.body, 26, 62, 48, 20) +
    brick(p, p.body, 28, 42, 44, 20) +
    // ventana
    `<rect x="46" y="66" width="8" height="12" rx="4" fill="${p.line}"/>` +
    // almenas: tres ladrillos pequeños con su botoncito
    brick(p, p.body, 25, 26, 15, 16, [32.5]) +
    brick(p, p.body, 42.5, 26, 15, 16, [50]) +
    brick(p, p.body, 60, 26, 15, 16, [67.5])
  );
}

function knight(p: Pal): string {
  // cabeza de caballo escalonada mirando a la izquierda
  return (
    base(p) +
    brick(p, p.body, 30, 62, 42, 20) +
    brick(p, p.body, 38, 44, 34, 18) +
    // hocico
    brick(p, p.body, 16, 28, 48, 18) +
    // frente y orejas
    brick(p, p.body, 36, 13, 30, 15, [43, 58]) +
    // crin del color de adorno
    brick(p, p.acc, 64, 18, 11, 44, [69.5]) +
    `<rect x="42" y="18" width="6" height="6" rx="1.2" fill="${p.line}"/>` +
    `<rect x="21" y="32" width="4" height="4" rx="1" fill="${p.line}"/>` +
    `<path d="M18 46 H40" stroke="${p.line}" stroke-width="2.6"/>`
  );
}

function bishop(p: Pal): string {
  return (
    base(p) +
    brick(p, p.body, 33, 62, 34, 20) +
    brick(p, YELLOW, 29, 54, 42, 8) +
    // cono alto con la raja
    `<path d="M34 54 L39 24 Q50 15 61 24 L66 54 Z" fill="${p.body.base}" stroke="${p.line}" stroke-width="2.6" stroke-linejoin="round"/>` +
    `<path d="M57 26 L61 51" stroke="${p.body.lo}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M41 27 L39 42" stroke="${p.body.hi}" stroke-width="2.6" stroke-linecap="round"/>` +
    `<path d="M58 28 L45 42" stroke="${p.line}" stroke-width="4" stroke-linecap="round"/>` +
    // botoncito redondo en la punta
    `<rect x="44.5" y="8" width="11" height="10" rx="5" fill="${p.body.base}" stroke="${p.line}" stroke-width="2.2"/>` +
    `<rect x="47" y="10" width="2.6" height="3.2" rx="1" fill="${p.body.hi}"/>`
  );
}

// Corona: pinchos amarillos (dama) o cruz (rey) sobre una franja amarilla
function crownedBody(p: Pal): string {
  return base(p) + brick(p, p.body, 29, 62, 42, 20) + brick(p, p.body, 32, 46, 36, 16) + brick(p, YELLOW, 27, 38, 46, 8);
}

function queen(p: Pal): string {
  const spike = (x: number, h: number) =>
    `<path d="M${x - 5.5} 38 L${x} ${38 - h} L${x + 5.5} 38 Z" fill="${YELLOW.base}" stroke="${p.line}" stroke-width="2.4" stroke-linejoin="round"/>` +
    `<circle cx="${x}" cy="${36 - h}" r="3.8" fill="${YELLOW.base}" stroke="${p.line}" stroke-width="2.2"/>`;
  return (
    spike(32, 14) +
    spike(41, 21) +
    spike(50, 27) +
    spike(59, 21) +
    spike(68, 14) +
    crownedBody(p) +
    `<g fill="${p.acc.base}" stroke="${p.line}" stroke-width="1.4"><circle cx="38" cy="42" r="2.3"/><circle cx="50" cy="42" r="2.3"/><circle cx="62" cy="42" r="2.3"/></g>`
  );
}

function king(p: Pal): string {
  return (
    // cruz hecha de ladrillos
    brick(p, YELLOW, 44, 9, 12, 29, [50]) +
    brick(p, YELLOW, 34, 17, 32, 10) +
    crownedBody(p) +
    `<g fill="${p.acc.base}" stroke="${p.line}" stroke-width="1.4"><circle cx="38" cy="42" r="2.3"/><circle cx="62" cy="42" r="2.3"/></g>`
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

export function drawBricks(type: PieceSymbol, color: Color): string {
  return wrap(DRAW[type](PAL[color]));
}

// ── Tablero: placa base con 2×2 botoncitos por casilla ──
const studs = (base: string, dark: string, light: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${[25, 75]
    .flatMap((y) => [25, 75].map((x) => [x, y]))
    .map(
      ([x, y]) =>
        `<circle cx="${x + 1.5}" cy="${y + 2.5}" r="13" fill="${dark}"/><circle cx="${x}" cy="${y}" r="13" fill="${base}" stroke="${dark}" stroke-width="1.5"/><circle cx="${x - 5}" cy="${y - 5}" r="3.2" fill="${light}"/>`,
    )
    .join('')}</svg>`;

const LIGHT = '#ffe58a';
const DARK = '#3fa34d';
export const BRICK_LIGHT = LIGHT;
export const BRICK_DARK = DARK;
export const BRICK_LIGHT_TEX = squareTexture(studs(LIGHT, '#e6c45a', '#fff6c8'), LIGHT);
export const BRICK_DARK_TEX = squareTexture(studs(DARK, '#2f8a3c', '#74c97e'), DARK);

// Fondo: ladrillos de colores apilados por los bordes
const PILE = (() => {
  const colors = ['#e53935', '#2f7de1', '#ffcc1a', '#3fa34d', '#ffffff'];
  let s = '';
  let k = 0;
  for (let row = 0; row < 3; row++) {
    for (let x = row % 2 ? -40 : 0; x < 1200; x += 80) {
      const c = colors[k++ % colors.length];
      const y = 300 - (row + 1) * 30;
      s += `<rect x="${x + 2}" y="${y}" width="76" height="28" rx="3" fill="${c}" stroke="#0002" stroke-width="2"/>`;
      s += `<rect x="${x + 14}" y="${y - 8}" width="16" height="9" rx="2" fill="${c}"/><rect x="${x + 50}" y="${y - 8}" width="16" height="9" rx="2" fill="${c}"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 300" preserveAspectRatio="xMidYMax slice">${s}</svg>`;
})();

export const BRICK_BG = [
  `${svgUrl(PILE)} left bottom / auto 96px repeat-x`,
  'radial-gradient(circle at 10% 12%, #ffffffaa 0, #ffffff00 25%)',
  'linear-gradient(180deg, #bfe3ff 0%, #e6f4ff 55%, #fff6d6 100%)',
].join(', ');
