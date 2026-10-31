// Plays the background tune from tune.ts with Web Audio: soft bells over a warm pad.
// Browsers only allow sound after the player clicks or presses a key.
import { BAR_SECONDS, Note, bar, freq } from './tune';

const AHEAD = 1; // seconds of music to plan ahead, so a slow frame never leaves a gap

export class Music {
  private ctx: AudioContext | null = null;
  private out!: GainNode;
  private next = 0; // when the next bar starts, in audio time
  private n = 0; // the number of the next bar

  // Call from a click or key press. Does nothing if music already started or is not supported.
  start() {
    if (this.ctx) return void this.ctx.resume();
    if (typeof AudioContext === 'undefined') return;
    const ctx = (this.ctx = new AudioContext());
    // A low-pass filter takes the edge off every note, so the tune stays mellow.
    const mellow = ctx.createBiquadFilter();
    mellow.type = 'lowpass';
    mellow.frequency.value = 2200;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(mellow).connect(ctx.destination);
  }

  // Set the loudness (0..1) and plan the next notes. Call every frame.
  set(level: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    this.out.gain.setTargetAtTime(level, now, 0.4);
    if (level === 0) return; // silent: plan nothing, and pick up from here when it comes back
    if (this.next < now) this.next = now + 0.1; // the tab was hidden, or the music was off
    while (this.next < now + AHEAD) {
      for (const note of bar(this.n)) this.play(note, this.next + note.at);
      this.next += BAR_SECONDS;
      this.n++;
    }
  }

  private play(note: Note, at: number) {
    const ctx = this.ctx!;
    const env = ctx.createGain();
    env.connect(this.out);
    const end = at + note.length;
    const g = env.gain;
    g.setValueAtTime(0, at);
    if (note.voice === 'bell') {
      // A quick strike that fades out slowly, like a soft mallet.
      g.linearRampToValueAtTime(note.gain * 0.5, at + 0.02);
      g.exponentialRampToValueAtTime(0.001, end + 0.8);
      this.tone('sine', note.note, at, end + 0.8, env, 1);
      this.tone('sine', note.note + 12, at, end + 0.8, env, 0.15); // a faint overtone
    } else {
      // A slow swell and fade, so the chords blend into each other.
      g.linearRampToValueAtTime(note.gain * 0.25, at + 0.8);
      g.setTargetAtTime(0, end - 1, 0.4);
      this.tone('triangle', note.note, at, end + 1, env, 1);
    }
  }

  private tone(type: OscillatorType, note: number, from: number, to: number, into: GainNode, gain: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq(note);
    const g = ctx.createGain();
    g.gain.value = gain;
    osc.connect(g).connect(into);
    osc.start(from);
    osc.stop(to);
  }
}
