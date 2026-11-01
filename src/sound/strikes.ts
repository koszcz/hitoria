// Plays the work sounds with Web Audio: the thud of an axe, the rasp of a saw and the knock of a
// hammer, made from noise and tones, so there are no sound files to load.
// Browsers only allow sound after the player clicks or presses a key.
import { WORK_KINDS, beats, type WorkKind } from './work';

const AHEAD = 0.3; // seconds of beats to plan ahead, so a slow frame never leaves a gap
// Seconds between two strokes of each tool.
const EVERY: Record<WorkKind, number> = { chop: 0.85, saw: 0.42, hammer: 0.5 };

export class WorkSounds {
  private ctx: AudioContext | null = null;
  private noise!: AudioBuffer;
  private next: Record<WorkKind, number> = { chop: 0, saw: 0, hammer: 0 };
  private stroke = 0; // counts saw strokes, so they go back and forth

  // Call from a click or key press. Does nothing if sound already started or is not supported.
  start() {
    if (this.ctx) return void this.ctx.resume();
    if (typeof AudioContext === 'undefined') return;
    const ctx = (this.ctx = new AudioContext());
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  // Set the volume of each sound (0..1) and plan the next strokes. Call every frame.
  set(levels: Record<WorkKind, number>) {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const k of WORK_KINDS) {
      // Silent: plan nothing, and start on a fresh beat when the work comes back.
      if (levels[k] < 0.005) {
        this.next[k] = 0;
        continue;
      }
      const r = beats(this.next[k], now + 0.05, AHEAD, EVERY[k]);
      // Each stroke falls a little early or late, so the work sounds played by hand.
      for (const at of r.at) this.play(k, at + Math.random() * 0.06, levels[k] * (0.8 + 0.2 * Math.random()));
      this.next[k] = r.next;
    }
  }

  private play(kind: WorkKind, at: number, gain: number) {
    if (kind === 'chop') {
      this.burst(at, 0.12, 'lowpass', 900, 1, gain);
      this.knock(at, 140, 70, 0.14, gain * 0.9);
    } else if (kind === 'hammer') {
      this.knock(at, 520, 380, 0.07, gain * 0.7);
      this.burst(at, 0.03, 'highpass', 2500, 1, gain * 0.5);
    } else {
      // A push and a pull, a little higher on the push.
      const push = this.stroke++ % 2 === 0;
      this.burst(at, EVERY.saw * 0.9, 'bandpass', push ? 3200 : 2600, 4, gain * 0.6, true);
    }
  }

  // A short burst of noise through a filter. `swell` makes it rise and fall instead of strike.
  private burst(at: number, length: number, type: BiquadFilterType, hz: number, q: number, gain: number, swell = false) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const tone = ctx.createBiquadFilter();
    tone.type = type;
    tone.frequency.value = hz;
    tone.Q.value = q;
    const env = ctx.createGain();
    const g = env.gain;
    g.setValueAtTime(0, at);
    if (swell) {
      g.linearRampToValueAtTime(gain, at + length * 0.4);
      g.linearRampToValueAtTime(0, at + length);
    } else {
      g.linearRampToValueAtTime(gain, at + 0.004);
      g.exponentialRampToValueAtTime(0.001, at + length);
    }
    src.connect(tone).connect(env).connect(ctx.destination);
    src.start(at, Math.random() * 0.5);
    src.stop(at + length + 0.05);
  }

  // A tone that drops in pitch and dies away fast: the body of a hit on wood.
  private knock(at: number, from: number, to: number, length: number, gain: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(to, at + length);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(gain, at + 0.003);
    env.gain.exponentialRampToValueAtTime(0.001, at + length);
    osc.connect(env).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + length + 0.05);
  }
}
