import type { Color, PieceSymbol } from 'chess.js';
import { BLOCK_BG, BLOCK_DARK, BLOCK_DARK_TEX, BLOCK_LIGHT, BLOCK_LIGHT_TEX, drawBlocks } from './themes/blocks';
import { BRICK_BG, BRICK_DARK, BRICK_DARK_TEX, BRICK_LIGHT, BRICK_LIGHT_TEX, drawBricks } from './themes/bricks';
import { DINO_BG, DINO_DARK, DINO_DARK_TEX, DINO_LIGHT, DINO_LIGHT_TEX, drawDino } from './themes/dino';
import { MED_BG, MED_DARK, MED_DARK_TEX, MED_LIGHT, MED_LIGHT_TEX, drawMedieval } from './themes/medieval';

export interface PieceColors {
  fill: string;
  stroke: string;
  detail: string;
}

export interface Theme {
  id: string;
  name: string;
  emoji: string;
  light: string; // casillas claras
  dark: string; // casillas oscuras
  white: PieceColors;
  black: PieceColors;
  faces: boolean; // piezas con carita
  gloss?: boolean; // brillo de "juguete" en las piezas
  bg: string; // fondo de la página (puede llevar varias capas)
  /** Dibujante propio de piezas (devuelve el <svg> completo). Si no hay, se usan las siluetas comunes. */
  draw?: (type: PieceSymbol, color: Color) => string;
  /** Textura de las casillas claras/oscuras: valor de `background` (capas + color liso al final). */
  lightTex?: string;
  darkTex?: string;
}

// Para añadir un tema nuevo basta con añadir una entrada aquí. Los temas con
// dibujos propios tienen su archivo en src/themes/ (piezas, casillas y fondo).
export const THEMES: Theme[] = [
  {
    id: 'infantil',
    name: 'Alegre',
    emoji: '🌈',
    light: '#fff4d6',
    dark: '#7fc77a',
    white: { fill: '#ffefcc', stroke: '#e0761f', detail: '#e0761f' },
    black: { fill: '#6a50d8', stroke: '#2c1f78', detail: '#d6ceff' },
    faces: true,
    gloss: true,
    bg: [
      'radial-gradient(circle at 8% 12%, #ffd86b88 0, #ffd86b00 22%)',
      'radial-gradient(circle at 92% 22%, #ff9ec488 0, #ff9ec400 24%)',
      'radial-gradient(circle at 85% 92%, #8fe3a688 0, #8fe3a600 26%)',
      'radial-gradient(circle at 12% 88%, #9fd8ff99 0, #9fd8ff00 26%)',
      'linear-gradient(165deg, #b9e6ff 0%, #dff4ff 45%, #effbe0 100%)',
    ].join(', '),
  },
  {
    id: 'clasico',
    name: 'Clásico',
    emoji: '♟️',
    light: '#f0d9b5',
    dark: '#b58863',
    white: { fill: '#ffffff', stroke: '#222222', detail: '#222222' },
    black: { fill: '#333333', stroke: '#111111', detail: '#eeeeee' },
    faces: false,
    bg: [
      'radial-gradient(circle at 10% 10%, #ffffff88 0, #ffffff00 25%)',
      'radial-gradient(circle at 90% 90%, #b5886333 0, #b5886300 30%)',
      'linear-gradient(165deg, #f1ebe0 0%, #e2d6c2 55%, #d2c1a6 100%)',
    ].join(', '),
  },
  {
    id: 'dinos',
    name: 'Dinosaurios',
    emoji: '🦖',
    light: DINO_LIGHT,
    dark: DINO_DARK,
    white: { fill: '#fff3cf', stroke: '#7a4612', detail: '#7a4612' },
    black: { fill: '#6a4fc8', stroke: '#1c1250', detail: '#e6deff' },
    faces: true,
    draw: drawDino,
    lightTex: DINO_LIGHT_TEX,
    darkTex: DINO_DARK_TEX,
    bg: DINO_BG,
  },
  {
    id: 'medieval',
    name: 'Medieval',
    emoji: '🏰',
    light: MED_LIGHT,
    dark: MED_DARK,
    white: { fill: '#f2f4f8', stroke: '#343c4c', detail: '#343c4c' },
    black: { fill: '#4a4456', stroke: '#121016', detail: '#eeeeee' },
    faces: false,
    draw: drawMedieval,
    lightTex: MED_LIGHT_TEX,
    darkTex: MED_DARK_TEX,
    bg: MED_BG,
  },
  {
    id: 'bloques',
    name: 'Bloques',
    emoji: '🧱',
    light: BLOCK_LIGHT,
    dark: BLOCK_DARK,
    white: { fill: '#f1e6cc', stroke: '#3a2c1c', detail: '#3a2c1c' },
    black: { fill: '#3d4470', stroke: '#0e0f1c', detail: '#eeeeee' },
    faces: false,
    draw: drawBlocks,
    lightTex: BLOCK_LIGHT_TEX,
    darkTex: BLOCK_DARK_TEX,
    bg: BLOCK_BG,
  },
  {
    id: 'construccion',
    name: 'Construcción',
    emoji: '🔧',
    light: BRICK_LIGHT,
    dark: BRICK_DARK,
    white: { fill: '#f7f8fb', stroke: '#2b2f3a', detail: '#2b2f3a' },
    black: { fill: '#30333d', stroke: '#0b0c10', detail: '#eeeeee' },
    faces: false,
    draw: drawBricks,
    lightTex: BRICK_LIGHT_TEX,
    darkTex: BRICK_DARK_TEX,
    bg: BRICK_BG,
  },
];

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
