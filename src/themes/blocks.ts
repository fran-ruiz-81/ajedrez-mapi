// 🧱 Tema Bloques: piezas de pixel art hechas con cuadraditos.
// Cada pieza se dibuja en una cuadrícula de 15×15. El borde oscuro y el
// relieve (luz arriba a la izquierda, sombra abajo a la derecha) se calculan
// solos, así que aquí solo se dibuja la silueta.
//   f = cuerpo   g = oro   a = adorno   e = detalle oscuro (ojos, ventanas, raja)
import type { Color, PieceSymbol } from 'chess.js';
import { rng, squareTexture, svgUrl, wrap } from './svg';

const N = 15;
const PX = 5.9;
const OFF = (100 - N * PX) / 2;

const ART: Record<PieceSymbol, string[]> = {
  p: [
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
    '......fff......',
    '.....fffff.....',
    '.....fffff.....',
    '......fff......',
    '......fff......',
    '.....fffff.....',
    '....fffffff....',
    '...fffffffff...',
    '...fffffffff...',
    '...............',
  ],
  r: [
    '...............',
    '...............',
    '..fff.fff.fff..',
    '..fff.fff.fff..',
    '..fffffffffff..',
    '...fffffffff...',
    '...fffffffff...',
    '...ffffeffff...',
    '...ffffeffff...',
    '...fffffffff...',
    '...fffffffff...',
    '..fffffffffff..',
    '.fffffffffffff.',
    '.fffffffffffff.',
    '...............',
  ],
  n: [
    '...............',
    '.......f.f.....',
    '......ffffaa...',
    '.....fffffaaa..',
    '....ffefffaaa..',
    '...fffffffffaa.',
    '..ffffffffffaa.',
    '..fef..ffffffa.',
    '.......ffffffa.',
    '......fffffffa.',
    '......ffffffff.',
    '.....fffffffff.',
    '...ffffffffff..',
    '..ffffffffffff.',
    '...............',
  ],
  b: [
    '...............',
    '.......f.......',
    '...............',
    '......fff......',
    '.....fffff.....',
    '....ffffeff....',
    '....fffefff....',
    '....ffeffff....',
    '.....fffff.....',
    '....ggggggg....',
    '......fff......',
    '.....fffff.....',
    '....fffffff....',
    '...fffffffff...',
    '...............',
  ],
  q: [
    '...............',
    '.g..g..g..g..g.',
    '.g..g..g..g..g.',
    '.gg.gg.g.gg.gg.',
    '.fffffffffffff.',
    '..fffffffffff..',
    '..gagggggggag..',
    '....fffffff....',
    '.....fffff.....',
    '.....fffff.....',
    '....fffffff....',
    '....fffffff....',
    '...fffffffff...',
    '..fffffffffff..',
    '...............',
  ],
  k: [
    '...............',
    '.......g.......',
    '.....ggggg.....',
    '.......g.......',
    '...fff.g.fff...',
    '..fffffffffff..',
    '..fffffffffff..',
    '...fffffffff...',
    '...ggaggggag...',
    '....fffffff....',
    '.....fffff.....',
    '....fffffff....',
    '...fffffffff...',
    '..fffffffffff..',
    '...............',
  ],
};

interface Mat {
  base: string;
  hi: string;
  lo: string;
}
interface Pal {
  line: string;
  f: Mat;
  a: Mat;
}

const PAL: Record<Color, Pal> = {
  w: {
    line: '#3a2c1c',
    f: { base: '#f1e6cc', hi: '#ffffff', lo: '#c9b48a' },
    a: { base: '#3fa7e8', hi: '#9adcff', lo: '#1f6fae' },
  },
  b: {
    line: '#0e0f1c',
    f: { base: '#3d4470', hi: '#6670ad', lo: '#262b4b' },
    a: { base: '#e8444a', hi: '#ff9a9a', lo: '#a3242a' },
  },
};
const GOLD: Mat = { base: '#f5c32c', hi: '#fff09a', lo: '#c48a0c' };

function render(art: string[], p: Pal): string {
  const at = (r: number, c: number) => (r >= 0 && r < N && c >= 0 && c < N ? art[r][c] : '.');
  const filled = (r: number, c: number) => at(r, c) !== '.';
  const rects: Record<string, string[]> = {};
  const add = (color: string, r: number, c: number) => {
    (rects[color] ??= []).push(`M${(OFF + c * PX).toFixed(2)} ${(OFF + r * PX).toFixed(2)}h${PX}v${PX}h-${PX}z`);
  };
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const ch = at(r, c);
      if (ch === '.') {
        // borde: casilla vacía junto a una llena (sin contar diagonales: esquinas redondeadas)
        if (filled(r - 1, c) || filled(r + 1, c) || filled(r, c - 1) || filled(r, c + 1)) add(p.line, r, c);
        continue;
      }
      if (ch === 'e') {
        add(p.line, r, c);
        continue;
      }
      const m = ch === 'g' ? GOLD : ch === 'a' ? p.a : p.f;
      // relieve: luz arriba/izquierda, sombra abajo/derecha (las tiras de un solo
      // cuadradito de grosor se quedan con el color base)
      const same = (rr: number, cc: number) => at(rr, cc) === ch;
      const t = !same(r - 1, c), b = !same(r + 1, c), l = !same(r, c - 1), rt = !same(r, c + 1);
      const v = t && b ? 0 : t ? 1 : b ? -1 : 0;
      const h = l && rt ? 0 : l ? 1 : rt ? -1 : 0;
      const k = v || h;
      add(k > 0 ? m.hi : k < 0 ? m.lo : m.base, r, c);
    }
  }
  return `<g shape-rendering="crispEdges">${Object.entries(rects)
    .map(([color, d]) => `<path fill="${color}" d="${d.join('')}"/>`)
    .join('')}</g>`;
}

const cache = new Map<string, string>();
export function drawBlocks(type: PieceSymbol, color: Color): string {
  const key = type + color;
  let s = cache.get(key);
  if (!s) {
    s = wrap(render(ART[type], PAL[color]));
    cache.set(key, s);
  }
  return s;
}

// ── Tablero: hierba y tierra pixeladas (8×8 cuadraditos por casilla) ──
function pixels(seed: number, colors: string[], weights: number[]): string {
  const r = rng(seed);
  const total = weights.reduce((a, b) => a + b, 0);
  let s = '';
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      let v = r() * total;
      let i = 0;
      while (v >= weights[i]) v -= weights[i++];
      if (i > 0) s += `<rect x="${x}" y="${y}" width="1" height="1" fill="${colors[i]}"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">${s}</svg>`;
}

const GRASS = '#8fd06a';
const DIRT = '#a8754a';
export const BLOCK_LIGHT = GRASS;
export const BLOCK_DARK = DIRT;
export const BLOCK_LIGHT_TEX = squareTexture(pixels(3, [GRASS, '#7fc25c', '#a2dc7c'], [6, 2, 2]), GRASS);
export const BLOCK_DARK_TEX = squareTexture(pixels(11, [DIRT, '#946340', '#b98559', '#8a5a37'], [5, 2, 2, 1]), DIRT);

// Fondo: cielo con nubes cuadradas y suelo de bloques
const SKYLINE = (() => {
  const r = rng(5);
  let ground = '';
  for (let x = 0; x < 60; x++) {
    const h = 4 + Math.floor(r() * 2);
    ground += `<rect x="${x * 20}" y="${300 - h * 20}" width="20" height="20" fill="${r() < 0.3 ? '#7fc25c' : GRASS}"/>`;
    for (let y = 1; y < h; y++) {
      const v = r();
      ground += `<rect x="${x * 20}" y="${300 - (h - y) * 20}" width="20" height="20" fill="${v < 0.2 ? '#946340' : v < 0.35 ? '#b98559' : DIRT}"/>`;
    }
  }
  const cloud = (x: number, y: number) =>
    `<path d="M${x} ${y}h80v20h40v20h-160v-20h40z" fill="#ffffff" opacity=".85"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 300" preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges">${cloud(120, 40)}${cloud(860, 70)}${ground}</svg>`;
})();

export const BLOCK_BG = [
  `${svgUrl(SKYLINE)} left bottom / auto 120px repeat-x`,
  'linear-gradient(180deg, #7cc6ff 0%, #b5e1ff 55%, #dff3ff 100%)',
].join(', ');
