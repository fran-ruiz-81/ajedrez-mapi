# AGENTS.md — El ajedrez de LRM

Instrucciones para agentes de IA (Claude Code, Codex, Cursor…) que trabajen en este proyecto.

## Qué es

Juego web de ajedrez para que **LRM, un niño de 7 años**, aprenda jugando. Va a una extraescolar de ajedrez, lee bien y juega en el móvil y en el portátil. Le acompaña **Nino**, un mapache como su peluche de apego.

- Requisitos, estado (hecho / pendiente) y plan por fases: **[REQUISITOS.md](REQUISITOS.md)**
- Web publicada: https://fran-ruiz-81.github.io/ajedrez-mapi/

## Reglas obligatorias

1. **Mantén `REQUISITOS.md` al día en cada cambio**: marca lo hecho, añade lo nuevo que pida el usuario, actualiza la fecha y el registro de cambios. Va en el mismo commit que el cambio.
2. **Responsive siempre**: todo debe verse bien en móvil vertical, móvil horizontal, tablet y monitor, sin scroll en la pantalla de partida. Compruébalo en esos tamaños antes de dar algo por terminado.
3. **Pensado para un niño de 7 años**:
   - textos cortos y sencillos, en español, en tono cercano;
   - botones grandes y fáciles de tocar;
   - los errores se explican con amabilidad, nunca se regaña;
   - sin música (los efectos de sonido sí).
4. **Las ayudas visuales (movimientos posibles, piezas en peligro, avisos) solo salen con el interruptor de ayudas activado.** La pista y el deshacer están siempre disponibles, pero restan estrellas.
5. **Privacidad**: el repositorio y la web son públicos. Del niño solo se usan sus siglas (LRM). No añadas su nombre, foto, edad exacta, colegio ni ningún otro dato personal.
6. **Temas inspirados en marcas** (Minecraft, LEGO): solo diseño propio "de bloques" o "de construcción". Nada de nombres, logotipos ni aspecto copiado.
7. **Sin coste**: nada que necesite servidor o servicios de pago. Todo estático en GitHub Pages.
8. **Commits y push**: el usuario ha aprobado publicar los cambios en `main` (cada push despliega). Mensajes de commit en español.

## Stack

- **Vite + TypeScript, sin framework.** El DOM se genera con plantillas de texto.
- **chess.js** para las reglas.
- **Motor híbrido**:
  - motor propio (`src/engine.ts`, alfa-beta + capturas) para los rivales fáciles: rápido a profundidad 1, lento a partir de 2 porque chess.js calcula el SAN de cada jugada;
  - **Stockfish 19 lite de un hilo** (`src/stockfish.ts`, UCI en un Worker) para los rivales fuertes y las pistas. Lo copia `scripts/copy-stockfish.mjs` a `public/stockfish/` (ignorado en git). La versión de un hilo no necesita cabeceras COOP/COEP, que GitHub Pages no permite.
- Licencia **GPL-3.0** (obligada por Stockfish).

## Comandos

```bash
npm install
npm run dev       # servidor de desarrollo (--host: accesible desde el móvil en la misma wifi)
npm run build     # copia Stockfish, comprueba tipos (tsc) y genera dist/
npm run preview   # sirve dist/ en local
```

El despliegue es automático: un push a `main` ejecuta `.github/workflows/deploy.yml` y publica en GitHub Pages.

## Estructura

| Archivo | Qué hace |
|---|---|
| `src/main.ts` | Pantallas (inicio, rivales, partida), interacción con el tablero, final de partida |
| `src/teach.ts` | Parte educativa: piezas en peligro, explicación de pistas, avisos tras mover |
| `src/engine.ts` / `engine.worker.ts` | Motor propio y su Worker |
| `src/stockfish.ts` | Puente UCI con Stockfish; si falla, devuelve `null` y se usa el motor propio |
| `src/rivals.ts` | Los 5 rivales y su nivel base |
| `src/level.ts` | Todo lo que depende del curso: cuentas de borrar progreso, fuerza de rivales, notación, ayudas por defecto |
| `src/lessons.ts`, `src/lessons.css` | Mapa de lecciones y pantalla de lección |
| `src/lessons/data.ts` | Contenido de las lecciones y ejercicios |
| `src/lessons/engine.ts` | Lógica de tableros de lección y cálculo del mínimo de movimientos (sin DOM) |
| `src/lessons/verify.mjs` | `node src/lessons/verify.mjs`: comprueba que todos los ejercicios tienen solución |
| `src/pieces.ts` | Piezas en SVG generadas por código; nombres y valores |
| `src/themes.ts` | Temas (colores del tablero y piezas). Un tema nuevo = una entrada |
| `src/mascot.ts` | SVG de Nino con expresiones; `MASCOT_NAME` y `PLAYER_NAME` |
| `src/sound.ts` | Efectos sintetizados con Web Audio |
| `src/storage.ts` | Progreso en `localStorage` (estrellas, tema, sonido, ayudas) |
| `public/sw.js` | Service worker: primero la red y, sin conexión, lo guardado |

## Cómo probar

No hay tests automáticos. Para comprobar un cambio:

1. `npm run build` (incluye la comprobación de tipos). Si tocas lecciones, también `node src/lessons/verify.mjs`.
2. Sirve `dist/` con `npm run preview` y contrólalo con Playwright usando el Chrome instalado (`/Applications/Google Chrome.app`) en estos tamaños: 390×844 con toque, 844×390, 768×1024 y 1440×900.
3. Comprueba:
   - que no hay errores en la consola;
   - que no hay scroll en la partida;
   - jugar, pedir pista y deshacer;
   - el final de partida.
4. Si tocas el diseño, revisa las capturas.

## Cuidado con

- **Zoom en el móvil:** está desactivado (meta viewport, `touch-action: manipulation` y `gesturestart`). No añadas manejadores de `touchend` con `preventDefault`: se perderían los toques rápidos entre pieza y destino.
- **Caché de la app:** el service worker sirve primero la red, así que los cambios llegan al recargar. Si cambias la estrategia, sube el nombre de `CACHE`.
- **QR de la pantalla principal:** apunta a la dirección actual de la página; en `localhost` usa `PUBLIC_URL` (`src/main.ts`). Si cambia la dirección de la web, actualízala ahí.
- **Curso escolar:** cualquier contenido nuevo (retos, aperturas…) debe adaptarse a `progress.course` usando `src/level.ts`.
- **Tipografía:** Baloo 2 (Google Fonts). Los temas pueden tener `gloss` (brillo de juguete en las piezas).
- **Emojis compuestos (ZWJ, como 👨‍👦):** no se ven bien en todos los dispositivos. Usa emojis simples.
