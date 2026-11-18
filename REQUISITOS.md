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
| Curso escolar configurable (1º–6º de primaria; por defecto 2º) que ajusta el nivel | ✅ | En los ajustes de inicio. Lógica en `src/level.ts` |

## 2. Plataforma y despliegue

| Requisito | Estado | Notas |
|---|---|---|
| Gratis | ✅ | GitHub Pages |
| Se juega en portátil y en móvil | ✅ | |
| La pantalla se ve bien en monitor, tablet y móvil (vertical y horizontal) | ✅ | Probado en 390×844, 844×390, 768×1024 y 1440×900, sin scroll |
| Instalable en el móvil como app (PWA) | ✅ | "Añadir a pantalla de inicio" |
| Funciona sin conexión | ✅ | Desde la primera visita (el service worker guarda la app al instalarse); Stockfish, cuando ya se ha usado una vez |
| Rápido en el móvil con mala conexión | ✅ | Stockfish se precarga en segundo plano y nunca hace esperar más de 2,5 s; fuente servida desde la web; QR solo en ordenador |
| Publicación automática con cada cambio | ✅ | GitHub Actions → https://fran-ruiz-81.github.io/ajedrez-mapi/ |
| Repositorio público en GitHub Pages | ✅ | Decisión del usuario; licencia GPL-3.0 por Stockfish |
| Sin zoom accidental en el móvil | ✅ | Corregido tras probarlo jugando |
| Código QR en la pantalla principal para abrirlo en el móvil | ✅ | Solo en ordenador; en móvil/tablet salen instrucciones para instalarlo (iPhone o Android). Se oculta si ya está instalado |

## 3. Modos de juego

| Requisito | Estado | Notas |
|---|---|---|
| Contra el ordenador | ✅ | |
| Dos personas en el mismo dispositivo | ✅ | |
| Lecciones guiadas (pieza a pieza, minijuegos) | ✅ | 11 lecciones; ver sección 6 bis |
| Retos / puzzles (mate en 1, pieza sin defender…) | ✅ | Ver sección 6 ter |
| Aperturas | ✅ | Ver sección 6 |

## 4. Rival ordenador

| Requisito | Estado | Notas |
|---|---|---|
| Rivales con personaje que se desbloquean ganando | ✅ | 🐣 Pollito Pío · 🐢 Tortuga Tula · 🦊 Zorro Zuri · 🐻 Oso Bruno · 🦉 Búho Sabio |
| Motor híbrido: propio para los fáciles, Stockfish para los fuertes y las pistas | ✅ | Stockfish 19 lite (un hilo) |
| Elegir color: blancas, negras o sorpresa | ✅ | |
| El ordenador "piensa" sin congelar la pantalla | ✅ | Web Workers |
| Si Stockfish no carga, se usa el motor propio | ✅ | |
| La fuerza de los rivales sube con el curso | ✅ | Desde 3º se despistan menos; en 5º–6º, más fuertes |
| La jugada del ordenador se ve bien | ✅ | La pieza se desliza despacio (0,9 s), flecha naranja, la pieza comida se desvanece y botón "Ver otra vez su jugada" |

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
| Notación de la extraescolar (Cf3, AxE5…) en los mensajes | ✅ | A partir de 3º |
| Ayudas por defecto según el curso | ✅ | Encendidas hasta 4º; apagadas en 5º–6º (se pueden encender) |

## 6 bis. Lecciones (Fase 2)

| Requisito | Estado | Notas |
|---|---|---|
| Lecciones: torre, alfil, dama, rey, caballo, peón, comer piezas (valores), jaque (mover, comer y tapar), jaque mate, ¡ojo, ahogado!, enroque | ✅ | `src/lessons/data.ts` |
| Introducción de Nino con demostración de cómo mueve la pieza | ✅ | |
| Ejercicios "recoge las estrellas", con piezas rivales y casillas atacadas | ✅ | 3–5 por lección |
| Ejercicios de jaque, mate en 1, enroque, coronar y mejor captura | ✅ | |
| Mensajes amables al fallar, explicando por qué | ✅ | |
| Estrellas según los movimientos respecto al mínimo | ✅ | El mínimo lo calcula el juego; `node src/lessons/verify.mjs` comprueba todos los ejercicios |
| Desbloqueo según el curso | ✅ | 1º–2º en orden; desde 3º abiertas las de piezas (1–6); 5º–6º todas |
| Recomendar por dónde seguir | ✅ | El mapa marca la siguiente lección sin estrellas |

## 6 ter. Retos (Fase 3)

| Requisito | Estado | Notas |
|---|---|---|
| Colecciones por tema, de fácil a difícil | ✅ | 114 retos en 11 colecciones: Mate en 1, ¡Pieza gratis!, ¡Sálvala!, Jaque que gana, Mate del pasillo, Mate en 2, Horquillas, Clavadas, Gana en 2, Mate en 3, Combinaciones |
| Adaptado al curso | ✅ | 1º–2º: 4 colecciones (44 retos); 3º–4º: 8 (84); 5º–6º: todas. Las de mayores se abren antes con buena media de estrellas |
| Cada reto verificado con Stockfish (solución única) | ✅ | `node src/puzzles/verify.mjs` (~2 min) |
| Pista en dos pasos (pieza, luego casilla) y explicación concreta al fallar | ✅ | |
| La jugada del rival se ve deslizándose despacio | ✅ | Sin flecha |
| Estrellas por reto y reto del día | ✅ | |
| Atribución de los retos de Lichess (CC0) | ✅ | README y pie del mapa |

## 6. Aperturas ("saques" de la extraescolar)

| Requisito | Estado | Notas |
|---|---|---|
| Aperturas predefinidas para principiantes con explicación | ✅ | 12 (6 con blancas, 6 con negras): Italiana, Cuatro Caballos, Española, Escocesa, Londres, Mate del Pastor, Defensa contra el Pastor, Italiana con negras, Dos Caballos, Siciliana Dragón (desde 3º), Caro-Kann, Gambito de Dama rehusado. `src/openings/data.ts` |
| Longitud según el curso | ✅ | 1º–2º: 6–8 jugadas; desde 3º: 11–12, con notación española |
| Ver la apertura paso a paso con explicación de cada jugada | ✅ | Con flechas que enseñan |
| Que el padre añada las aperturas de clase | ✅ | Moviendo piezas o pegando la notación (inglesa o española, con o sin números). Se pueden editar y borrar |
| Modo repetir: el juego hace las jugadas del rival y él acierta las suyas | ✅ | Si falla, se le enseña la buena; estrellas según fallos |
| Jugar contra el ordenador desde la posición de la apertura | ✅ | Con un rival ya desbloqueado; al salir vuelve a la apertura |
| Posiciones empezadas para practicar lo aprendido | ✅ | Con «Jugar desde la posición» de cada apertura (también las del padre) |

## 7. Aspecto visual

| Requisito | Estado | Notas |
|---|---|---|
| Infantil y colorido, piezas con carita | ✅ | Tema "Alegre" con brillo de juguete |
| Diseño moderno y atractivo para su edad | ✅ | Tipografía Baloo 2, botones 3D, tarjetas, fondo con manchas de color, microanimaciones |
| Varios temas a elegir | ✅ | Hay 6 |
| Tema Clásico | ✅ | |
| Tema Medieval | ✅ | Caballeros, castillo, piedra y madera |
| Tema Dinosaurios | ✅ | T-rex rey, huevos de peón, selva y volcán |
| Tema "Bloques" (inspirado en Minecraft, diseño propio) | ✅ | Pixel art propio; sin la marca ni su aspecto exacto |
| Tema "Construcción" (inspirado en LEGO, diseño propio) | ✅ | Ladrillos encajables propios; sin la marca ni su aspecto exacto |
| Icono de la app con el Nino actual | ✅ | |
| Arrastrar piezas además de tocar pieza y casilla | ✅ | En todos los tableros (`src/drag.ts`), con ratón y con el dedo |
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
| Medallas / logros | ✅ | 20 medallas en 5 grupos (partidas, lecciones, retos, aperturas, estrellas), aviso al conseguirlas y vitrina. `src/medals.ts` |
| Estrellas en lecciones | ✅ | Cuentan en el total de la pantalla de inicio |
| Estrellas en retos y aperturas | ⬜ | Cuando existan esos modos |
| Borrar progreso | ✅ | Hay que resolver 3 cuentas adecuadas a su curso (1º: hasta 20; 2º: hasta 100 sin llevadas; 3º: llevadas y tablas del 2, 5 y 10; 4º: todas las tablas; 5º–6º: multiplicar y dividir) |

---

## Plan por fases

1. ✅ **Fase 1 — Lo básico**: tablero, ayudas, rivales, dos jugadores, temas Alegre/Clásico, PWA y despliegue.
2. ✅ **Fase 2 — Lecciones guiadas**: cómo se mueve cada pieza, con minijuegos.
3. ✅ **Fase 3 — Retos / puzzles** (adaptados al curso).
4. ✅ **Fase 4 — Aperturas**: predefinidas, propias, repetir y jugar desde la posición.
5. ✅ **Fase 5 — Más temas y medallas**, icono nuevo y arrastrar piezas.

El orden de las fases 2–4 se puede cambiar según lo que estén dando en la extraescolar.

## Ideas sin decidir

- Sincronizar el progreso entre dispositivos (necesitaría un servicio con cuenta).

## Registro de cambios

- **17/11/2026** — Fase 1 publicada. Mascota renombrada a Nino y juego personalizado para LRM. Corregido el zoom accidental en el móvil.
- **17/11/2026** — QR en la pantalla principal para abrir el juego en el móvil e instrucciones para instalarlo como app.
- **18/11/2026** — Revisión de código completa (velocidad, nivel por curso, UX infantil, código limpio): 8 bugs corregidos (2 dejaban la partida bloqueada), pistas con los puntos de clase, rivales escalonados, lecciones de tapar el jaque y de rey ahogado, retos de 1º–2º más fáciles, app sin conexión desde la primera visita, Stockfish sin esperas, botones de 44 px, editor de aperturas protegido. Añadidos Mate del Pastor, Defensa contra el Pastor y colección Mate del pasillo.
- **18/11/2026** — Fases 3 (retos), 4 (aperturas) y 5 (4 temas nuevos y medallas) publicadas. Icono nuevo. Arrastrar piezas. Quitada la flecha de la jugada del ordenador. Corregido el color de las casillas (a1 debe ser oscura).
- **17/11/2026** — Fase 2 (lecciones) publicada. Rediseño visual. Animación de la jugada del ordenador. Curso escolar y borrar progreso con cuentas.
