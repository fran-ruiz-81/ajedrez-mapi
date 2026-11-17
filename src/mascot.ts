// El mapache guía (como su peluche) y el nombre del jugador.
export const MASCOT_NAME = 'Nino';
export const PLAYER_NAME = 'LRM';

export type Mood = 'happy' | 'think' | 'wow' | 'sad';

export function mascotSvg(mood: Mood = 'happy'): string {
  const pupilY = mood === 'think' ? 53 : 58;
  const pupilR = mood === 'wow' ? 4.5 : 3.6;
  const mouth =
    mood === 'wow'
      ? '<ellipse cx="60" cy="90" rx="5" ry="6" fill="#5a2a2a"/>'
      : mood === 'sad'
        ? '<path d="M53 92 Q60 86 67 92" fill="none" stroke="#2b2b33" stroke-width="2.6" stroke-linecap="round"/>'
        : mood === 'think'
          ? '<path d="M54 89 H66" stroke="#2b2b33" stroke-width="2.6" stroke-linecap="round"/>'
          : '<path d="M52 86 Q60 95 68 86" fill="#ff8fa0" stroke="#2b2b33" stroke-width="2.6" stroke-linecap="round"/>';
  return `<svg viewBox="0 0 120 120" class="mascot-svg" role="img" aria-label="${MASCOT_NAME}, el mapache">
    <path d="M22 44 L14 8 L46 26 Z" fill="#7d838c" stroke="#3c4048" stroke-width="3" stroke-linejoin="round"/>
    <path d="M98 44 L106 8 L74 26 Z" fill="#7d838c" stroke="#3c4048" stroke-width="3" stroke-linejoin="round"/>
    <path d="M24 36 L20 17 L37 27 Z" fill="#f2b8c0"/>
    <path d="M96 36 L100 17 L83 27 Z" fill="#f2b8c0"/>
    <ellipse cx="60" cy="64" rx="47" ry="40" fill="#9aa1aa" stroke="#3c4048" stroke-width="3"/>
    <path d="M18 70 Q26 98 60 102 Q94 98 102 70 Q96 82 60 84 Q24 82 18 70Z" fill="#eceef2"/>
    <path d="M55 26 Q60 22 65 26 L62 46 H58 Z" fill="#3c4048"/>
    <path d="M17 58 Q26 44 44 49 Q56 53 60 60 Q64 53 76 49 Q94 44 103 58 Q96 72 79 70 Q66 68 60 64 Q54 68 41 70 Q24 72 17 58Z" fill="#2b2b33"/>
    <circle cx="43" cy="58" r="8" fill="#fff"/><circle cx="77" cy="58" r="8" fill="#fff"/>
    <circle cx="44" cy="${pupilY}" r="${pupilR}" fill="#2b2b33"/><circle cx="78" cy="${pupilY}" r="${pupilR}" fill="#2b2b33"/>
    <circle cx="45.5" cy="${pupilY - 1.5}" r="1.3" fill="#fff"/><circle cx="79.5" cy="${pupilY - 1.5}" r="1.3" fill="#fff"/>
    <ellipse cx="60" cy="86" rx="17" ry="13" fill="#fff"/>
    <ellipse cx="60" cy="78" rx="7" ry="4.6" fill="#2b2b33"/>
    ${mouth}
    <ellipse cx="30" cy="80" rx="6" ry="3.5" fill="#ff9aa8" opacity=".55"/>
    <ellipse cx="90" cy="80" rx="6" ry="3.5" fill="#ff9aa8" opacity=".55"/>
  </svg>`;
}
