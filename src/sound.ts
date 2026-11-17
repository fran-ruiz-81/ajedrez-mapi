// Efectos de sonido sintetizados con Web Audio: no hace falta descargar archivos.
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.2) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const sfx = {
  select: () => tone(660, 0, 0.08, 'sine', 0.08),
  move: () => tone(420, 0, 0.12, 'triangle', 0.25),
  capture: () => {
    tone(220, 0, 0.15, 'square', 0.12);
    tone(160, 0.05, 0.18, 'triangle', 0.2);
  },
  check: () => {
    tone(880, 0, 0.12, 'square', 0.08);
    tone(660, 0.13, 0.15, 'square', 0.08);
  },
  error: () => tone(150, 0, 0.18, 'sawtooth', 0.06),
  hint: () => {
    tone(1046, 0, 0.12, 'sine', 0.12);
    tone(1318, 0.1, 0.18, 'sine', 0.12);
  },
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.13, 0.3, 'triangle', 0.2)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, i * 0.18, 0.3, 'sine', 0.15)),
};
