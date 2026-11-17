# ♞ El ajedrez de LRM

Juego de ajedrez para aprender, pensado para niños de unos 7 años. Nino, un mapache, acompaña al jugador, le da pistas explicadas y le avisa de los peligros.

## Qué incluye (fase 1)

- Jugar contra el ordenador: 5 rivales que se desbloquean ganando (🐣 🐢 🦊 motor propio · 🐻 🦉 Stockfish).
- Dos personas en el mismo dispositivo.
- Ayudas activables: casillas a las que puede ir cada pieza y piezas en peligro marcadas en rojo; avisos si deja una pieza colgada o un mate en 1.
- Pista con explicación sencilla, deshacer y girar el tablero.
- Estrellas por rival (3 = ganar sin pistas ni deshacer), guardadas en el dispositivo.
- Temas: Alegre y Clásico. Se adapta a móvil, tablet y monitor; instalable como app (PWA) y funciona sin conexión.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173 (también accesible desde el móvil en la misma wifi)
npm run build    # genera dist/
```

- Cambiar el nombre del mapache o del jugador: `MASCOT_NAME` y `PLAYER_NAME` en `src/mascot.ts`.
- Añadir un tema: una entrada en `src/themes.ts`.
- Ajustar rivales: `src/rivals.ts`.

## Despliegue

Cada `push` a `main` publica automáticamente en GitHub Pages (`.github/workflows/deploy.yml`).

## Requisitos y estado

Ver [REQUISITOS.md](REQUISITOS.md): qué está hecho, qué falta y el plan por fases.

## Próximas fases

Lecciones guiadas · Retos/puzzles · Aperturas (predefinidas, propias, repetir y jugar desde la posición) · Temas dinosaurios, medieval, bloques y piezas de construcción.

## Licencia

GPL-3.0, porque incluye [Stockfish](https://stockfishchess.org/) ([stockfish.js](https://github.com/nmrugg/stockfish.js)), que es GPL-3.0.
