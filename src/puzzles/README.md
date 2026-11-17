# Retos (puzzles)

| Archivo | Qué hace |
|---|---|
| `collections.ts` | Las colecciones por tema, su curso mínimo y su objetivo |
| `data.ts` | Las posiciones (GENERADO por `build.mjs`) |
| `build.mjs` | Elige los retos de la base de Lichess, crea los de "¡Sálvala!" y escribe `data.ts` |
| `verify.mjs` | `node src/puzzles/verify.mjs`: comprueba todos los retos con chess.js y Stockfish |
| `sf-node.mjs` | Stockfish lite (un hilo) para Node, con MultiPV |

## Origen y licencia

- Los retos `lc-*` vienen de la [base de puzzles de Lichess](https://database.lichess.org/#puzzles),
  publicada en **dominio público (CC0)**. El identificador es el de Lichess
  (`lc-0JoLP` → https://lichess.org/training/0JoLP). Gracias a lichess.org.
- Los retos `nino-save-*` ("¡Sálvala!") los crea `build.mjs` para este juego.

## Formato

- `fen`: posición de partida.
- `setup`: jugada del rival que se ve animada al empezar (como en Lichess). Juega el niño con el otro color.
- `moves`: jugadas en UCI, alternando niño, rival, niño… (las del rival las hace el juego solo).

## Qué comprueba `verify.mjs`

- Que la posición y todas las jugadas (también las del rival) son legales.
- Que cada jugada del niño es la mejor de Stockfish (profundidad 18) y que no hay otra igual de buena
  (MultiPV 2): en los mates, la segunda opción no da mate igual de rápido; en el resto, es al menos
  2 peones peor.
- Que los mates acaban en jaque mate y los de material ganan al menos 2 puntos.
- Que cada colección tiene de 8 a 12 retos y que no hay identificadores repetidos.

## Regenerar

```bash
mkdir -p .tmp/lichess && curl -s https://database.lichess.org/lichess_db_puzzle.csv.zst | head -c 30000000 | zstd -dc > .tmp/lichess/puzzles.csv
node src/puzzles/build.mjs .tmp/lichess/puzzles.csv
node src/puzzles/verify.mjs
```

Ojo: si cambian los identificadores, se pierden las estrellas guardadas de esos retos.
