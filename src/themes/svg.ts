// Utilidades compartidas por los temas con dibujos propios.
// Ninguna pieza usa `id` (ni degradados ni patrones con id): en la página se
// repiten muchas piezas y los ids chocarían.

/** Envuelve el dibujo en el mismo <svg> que usan las piezas normales. */
export function wrap(inner: string): string {
  return `<svg viewBox="0 0 100 100" class="piece-svg" aria-hidden="true">${inner}</svg>`;
}

/** SVG como `url(...)` para usarlo de fondo en CSS. */
export function svgUrl(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * Textura de casilla: un SVG que ocupa la casilla entera, encima del color liso.
 * Es un valor válido para la propiedad `background`.
 */
export function squareTexture(svg: string, color: string): string {
  return `${svgUrl(svg)} 0 0 / 100% 100% no-repeat, ${color}`;
}

/** Ojo redondo con brillo (para piezas con carita). */
export function eye(cx: number, cy: number, r: number, line: string): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="${line}" stroke-width="1.6"/>
    <circle cx="${cx + r * 0.18}" cy="${cy + r * 0.15}" r="${r * 0.55}" fill="#1b1424"/>
    <circle cx="${cx + r * 0.38}" cy="${cy - r * 0.2}" r="${r * 0.2}" fill="#fff"/>`;
}

/** Generador pseudoaleatorio con semilla, para texturas que salen siempre igual. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
