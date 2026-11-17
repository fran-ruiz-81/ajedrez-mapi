# Requisitos — El ajedrez de LRM

Juego web de ajedrez para que LRM (7 años) aprenda jugando. Este documento recoge lo acordado, lo que está hecho y lo que falta. Se actualiza con cada cambio.

**Leyenda:** ✅ hecho · 🟡 a medias · ⬜ pendiente

_Última actualización: 17/11/2026_

---

## 1. Público y principios

| Requisito | Estado | Notas |
|---|---|---|
| Para un niño de 7 años que está aprendiendo y va a extraescolar de ajedrez | ✅ | |
| Lee bien: textos cortos y sencillos en pantalla (sin voz) | ✅ | |
| Todo en español | ✅ | |
| Un solo jugador (sin perfiles) | ✅ | |
| Personalizado: el título es "El ajedrez de LRM" y le saluda por su nombre | ✅ | `PLAYER_NAME` en `src/mascot.ts` |

## 2. Plataforma y despliegue

| Requisito | Estado | Notas |
|---|---|---|
| Gratis | ✅ | GitHub Pages |
| Se juega en portátil y en móvil | ✅ | |
| La pantalla se ve bien en monitor, tablet y móvil (vertical y horizontal) | ✅ | Probado en 390×844, 844×390, 768×1024 y 1440×900, sin scroll |
| Instalable en el móvil como app (PWA) | ✅ | "Añadir a pantalla de inicio" |
| Funciona sin conexión | ✅ | Tras la primera visita |
| Publicación automática con cada cambio | ✅ | GitHub Actions → https://fran-ruiz-81.github.io/ajedrez-mapi/ |
| Repositorio público en GitHub Pages | ✅ | Decisión del usuario; licencia GPL-3.0 por Stockfish |
| Sin zoom accidental en el móvil | ✅ | Corregido tras probarlo jugando |

## 3. Modos de juego

| Requisito | Estado | Notas |
|---|---|---|
| Contra el ordenador | ✅ | |
| Dos personas en el mismo dispositivo | ✅ | |
| Lecciones guiadas (pieza a pieza, minijuegos) | ⬜ | Fase 2. Botón "¡pronto!" en el menú |
| Retos / puzzles (mate en 1, pieza sin defender…) | ⬜ | Fase 3 |
| Aperturas | ⬜ | Fase 4, ver sección 6 |

## 4. Rival ordenador

| Requisito | Estado | Notas |
|---|---|---|
| Rivales con personaje que se desbloquean ganando | ✅ | 🐣 Pollito Pío · 🐢 Tortuga Tula · 🦊 Zorro Zuri · 🐻 Oso Bruno · 🦉 Búho Sabio |
| Motor híbrido: propio para los fáciles, Stockfish para los fuertes y las pistas | ✅ | Stockfish 19 lite (un hilo) |
| Elegir color: blancas, negras o sorpresa | ✅ | |
| El ordenador "piensa" sin congelar la pantalla | ✅ | Web Workers |
| Si Stockfish no carga, se usa el motor propio | ✅ | |

## 5. Ayudas para aprender

| Requisito | Estado | Notas |
|---|---|---|
| Interruptor de ayudas (👀) | ✅ | Se recuerda entre partidas |
| Mostrar movimientos posibles (solo con ayudas) | ✅ | Puntos y aros en el tablero |
| Avisar de piezas en peligro (solo con ayudas) | ✅ | Borde rojo parpadeante |
| Aviso al dejar una pieza colgada o permitir mate en 1 | ✅ | Solo con ayudas |
| Botón de pista con explicación sencilla | ✅ | Mejor jugada de Stockfish + frase |
| Deshacer jugada | ✅ | Contra el ordenador deshace la tuya y la suya |
| Girar el tablero | ✅ | |
| Mensajes al mover mal ("el caballo no puede ir ahí") | ✅ | |
| Coordenadas en el tablero (a–h, 1–8) | ✅ | |
| Piezas comidas por cada bando | ✅ | |
| Explicación de tablas (rey ahogado, material insuficiente) | ✅ | |

## 6. Aperturas ("saques" de la extraescolar)

| Requisito | Estado | Notas |
|---|---|---|
| Aperturas predefinidas para principiantes con explicación | ⬜ | Italiana, Española, Cuatro Caballos, Londres… |
| Que el padre añada las aperturas de clase | ⬜ | Moviendo piezas en el tablero o pegando la notación |
| Modo repetir: el juego hace las jugadas del rival y él acierta las suyas | ⬜ | Si falla, se le enseña la buena |
| Jugar contra el ordenador desde la posición de la apertura | ⬜ | |
| Posiciones empezadas para practicar lo aprendido | ⬜ | |

## 7. Aspecto visual

| Requisito | Estado | Notas |
|---|---|---|
| Infantil y colorido, piezas con carita | ✅ | Tema "Alegre" |
| Varios temas a elegir | 🟡 | Hay 2 de 6 |
| Tema Clásico | ✅ | |
| Tema Medieval | ⬜ | |
| Tema Dinosaurios | ⬜ | |
| Tema "Bloques" (inspirado en Minecraft, diseño propio) | ⬜ | Sin usar la marca ni su aspecto exacto |
| Tema "Construcción" (inspirado en LEGO, diseño propio) | ⬜ | Sin usar la marca ni su aspecto exacto |
| Animaciones y confeti al ganar | ✅ | |

## 8. Mascota

| Requisito | Estado | Notas |
|---|---|---|
| Mascota guía mapache (como su peluche) | ✅ | |
| Se llama Nino | ✅ | `MASCOT_NAME` en `src/mascot.ts` |
| Expresiones (contento, pensando, sorprendido, triste) | ✅ | |

## 9. Sonido

| Requisito | Estado | Notas |
|---|---|---|
| Efectos al mover, comer, jaque, ganar y perder | ✅ | Sintetizados, sin archivos |
| Sin música | ✅ | |
| Botón para silenciar | ✅ | En la pantalla de inicio |

## 10. Progreso y recompensas

| Requisito | Estado | Notas |
|---|---|---|
| Estrellas por rival (3 = ganar sin pistas ni deshacer) | ✅ | |
| Total de estrellas en la pantalla de inicio | ✅ | |
| Guardado en el dispositivo, sin cuentas | ✅ | No se comparte entre móvil y portátil |
| Medallas / logros | ⬜ | Ej.: primer jaque mate, primer enroque, ganar con negras |
| Estrellas en lecciones, retos y aperturas | ⬜ | Cuando existan esos modos |

---

## Plan por fases

1. ✅ **Fase 1 — Lo básico**: tablero, ayudas, rivales, dos jugadores, temas Alegre/Clásico, PWA y despliegue.
2. ⬜ **Fase 2 — Lecciones guiadas**: cómo se mueve cada pieza, con minijuegos.
3. ⬜ **Fase 3 — Retos / puzzles**.
4. ⬜ **Fase 4 — Aperturas**: predefinidas, propias, repetir y jugar desde la posición.
5. ⬜ **Fase 5 — Más temas y medallas**.

El orden de las fases 2–4 se puede cambiar según lo que estén dando en la extraescolar.

## Ideas sin decidir

- Arrastrar piezas además de tocar origen y destino.
- Sincronizar el progreso entre dispositivos (necesitaría un servicio con cuenta).

## Registro de cambios

- **17/11/2026** — Fase 1 publicada. Mascota renombrada a Nino y juego personalizado para LRM. Corregido el zoom accidental en el móvil.
