// El motor propio piensa en segundo plano para que la pantalla no se congele.
import { pickMove, scoreMoves, type Level } from './engine';

type Req =
  | { id: number; kind: 'pick'; fen: string; level: Level }
  | { id: number; kind: 'hint'; fen: string };

self.onmessage = (e: MessageEvent<Req>) => {
  const r = e.data;
  if (r.kind === 'pick') {
    self.postMessage({ id: r.id, move: pickMove(r.fen, r.level) });
  } else {
    // pista de emergencia si Stockfish no está disponible
    self.postMessage({ id: r.id, move: scoreMoves(r.fen, 1, 2)[0] }); // profundidad 1: rápida en el móvil
  }
};
