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
  bg: string; // fondo de la página
}

// Para añadir un tema nuevo (medieval, dinosaurios, bloques...) basta con
// añadir una entrada aquí. Los temas con dibujos propios llegarán en otra fase.
export const THEMES: Theme[] = [
  {
    id: 'infantil',
    name: 'Alegre',
    emoji: '🌈',
    light: '#fdf3d0',
    dark: '#86c27f',
    white: { fill: '#fff6dc', stroke: '#d9822b', detail: '#d9822b' },
    black: { fill: '#5b4bb7', stroke: '#2e2470', detail: '#c9c2ff' },
    faces: true,
    bg: 'linear-gradient(160deg, #bfe9ff 0%, #e8f7d4 100%)',
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
    bg: 'linear-gradient(160deg, #e9e2d6 0%, #cdbfa8 100%)',
  },
];

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
