// El mapache guía (como su peluche) y el nombre del jugador.
export const MASCOT_NAME = 'Nino';
export const PLAYER_NAME = 'LRM';

export type Mood = 'happy' | 'think' | 'wow' | 'sad';

const INK = '#2b2b33';

export function mascotSvg(mood: Mood = 'happy'): string {
  // mirada: pensando mira hacia arriba y a un lado
  const look = mood === 'think' ? { x: 2.2, y: -3.2 } : mood === 'sad' ? { x: 0, y: 1.5 } : { x: 0.8, y: 0.4 };
  const pupilR = mood === 'wow' ? 4.8 : mood === 'sad' ? 3.6 : 4.2;
  const brows =
    mood === 'wow'
      ? `<path d="M33 37 Q43 30 52 36" /><path d="M68 36 Q77 30 87 37" />`
      : mood === 'sad'
        ? `<path d="M34 44 Q43 41 51 37" /><path d="M69 37 Q77 41 86 44" />`
        : mood === 'think'
          ? `<path d="M34 42 Q43 40 52 42" /><path d="M68 37 Q77 32 87 38" />`
          : `<path d="M34 41 Q43 35 52 40" /><path d="M68 40 Q77 35 86 41" />`;
  const mouth =
    mood === 'wow'
      ? `<ellipse cx="60" cy="91" rx="5.5" ry="6.5" fill="#6b2433" stroke="${INK}" stroke-width="2"/>
         <ellipse cx="60" cy="94" rx="3.2" ry="2.2" fill="#ff8fa0"/>`
      : mood === 'sad'
        ? `<path d="M52 93 Q60 86 68 93" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>`
        : mood === 'think'
          ? `<path d="M53 90 Q57 87.5 61 90 T69 89" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`
          : `<path d="M50 85.5 Q60 99 70 85.5 Z" fill="#6b2433" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
             <path d="M54.5 91.5 Q60 88 65.5 91.5 Q60 96 54.5 91.5Z" fill="#ff8fa0"/>`;
  const extra =
    mood === 'sad'
      ? `<path d="M33 66 Q30 72 33 75 Q36 72 33 66Z" fill="#7cc8ff" stroke="#3a8fd0" stroke-width="1.2"/>`
      : mood === 'wow'
        ? `<path d="M104 18 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5Z" fill="#ffc93c"/>
           <path d="M12 22 l1.8 4 4 1.8 -4 1.8 -1.8 4 -1.8 -4 -4 -1.8 4 -1.8Z" fill="#ffc93c"/>`
        : mood === 'think'
          ? `<circle cx="104" cy="22" r="3" fill="#fff" stroke="#3c4048" stroke-width="1.5"/>
             <circle cx="111" cy="12" r="4.5" fill="#fff" stroke="#3c4048" stroke-width="1.5"/>`
          : '';
  const eye = (cx: number) => `
    <circle cx="${cx}" cy="58" r="9" fill="#fff"/>
    <circle cx="${cx + look.x}" cy="${58 + look.y}" r="${pupilR}" fill="${INK}"/>
    <circle cx="${cx + look.x + 1.8}" cy="${58 + look.y - 1.8}" r="1.6" fill="#fff"/>
    <circle cx="${cx + look.x - 1.4}" cy="${58 + look.y + 1.6}" r=".7" fill="#fff"/>`;
  return `<svg viewBox="0 0 120 120" class="mascot-svg" role="img" aria-label="${MASCOT_NAME}, el mapache">
    <ellipse cx="60" cy="110" rx="34" ry="5" fill="#0002"/>
    <path d="M22 44 L14 8 L46 26 Z" fill="#8a909a" stroke="#3c4048" stroke-width="3" stroke-linejoin="round"/>
    <path d="M98 44 L106 8 L74 26 Z" fill="#8a909a" stroke="#3c4048" stroke-width="3" stroke-linejoin="round"/>
    <path d="M24 36 L20 17 L37 27 Z" fill="#f6b3c0"/>
    <path d="M96 36 L100 17 L83 27 Z" fill="#f6b3c0"/>
    <ellipse cx="60" cy="64" rx="47" ry="40" fill="#a3aab4" stroke="#3c4048" stroke-width="3"/>
    <path d="M30 34 Q44 26 58 26" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".45"/>
    <path d="M18 70 Q26 98 60 102 Q94 98 102 70 Q96 82 60 84 Q24 82 18 70Z" fill="#f1f2f5"/>
    <path d="M55 26 Q60 22 65 26 L62 46 H58 Z" fill="#3c4048"/>
    <path d="M17 58 Q26 44 44 49 Q56 53 60 60 Q64 53 76 49 Q94 44 103 58 Q96 72 79 70 Q66 68 60 64 Q54 68 41 70 Q24 72 17 58Z" fill="${INK}"/>
    ${eye(43)}${eye(77)}
    <g fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round">${brows}</g>
    <ellipse cx="60" cy="86" rx="17" ry="13" fill="#fff"/>
    <ellipse cx="60" cy="78" rx="7" ry="4.6" fill="${INK}"/>
    <ellipse cx="58" cy="76.6" rx="2.2" ry="1.2" fill="#fff" opacity=".7"/>
    ${mouth}
    <ellipse cx="29" cy="81" rx="6.5" ry="3.8" fill="#ff8fa0" opacity="${mood === 'sad' ? 0.35 : 0.6}"/>
    <ellipse cx="91" cy="81" rx="6.5" ry="3.8" fill="#ff8fa0" opacity="${mood === 'sad' ? 0.35 : 0.6}"/>
    ${extra}
  </svg>`;
}
