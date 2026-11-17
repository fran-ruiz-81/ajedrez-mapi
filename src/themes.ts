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
}

// Para añadir un tema nuevo (medieval, dinosaurios, bloques...) basta con
// añadir una entrada aquí. Los temas con dibujos propios llegarán en otra fase.
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
];

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
