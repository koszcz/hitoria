// The background sound: wind and waves, made from soft noise with Web Audio, so there are no
// sound files to load. Browsers only allow sound after the player clicks or presses a key.

// One loop of brown noise: a soft rumble with no hiss, good for both wind and surf.
function noiseBuffer(ctx: AudioContext, seconds: number) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.5;
  }
  return buf;
}

// A wave rolls in about every 7 seconds: a slow rise, then a quick fall as it breaks.
function swell(t: number) {
  const p = (t / 7) % 1;
  return 0.35 + 0.65 * (p < 0.7 ? p / 0.7 : 1 - (p - 0.7) / 0.3) ** 2;
}

export class Ambience {
  private ctx: AudioContext | null = null;
  private wind!: GainNode;
  private windTone!: BiquadFilterNode;
  private waves!: GainNode;

  // Call from a click or key press. Does nothing if sound already started or is not supported.
  start() {
    if (this.ctx) return void this.ctx.resume();
    if (typeof AudioContext === 'undefined') return;
    const ctx = (this.ctx = new AudioContext());
    const buf = noiseBuffer(ctx, 4);

    const windSrc = ctx.createBufferSource();
    windSrc.buffer = buf;
    windSrc.loop = true;
    this.windTone = ctx.createBiquadFilter();
    this.windTone.type = 'bandpass';
    this.windTone.Q.value = 0.8;
    this.wind = ctx.createGain();
    this.wind.gain.value = 0;
    windSrc.connect(this.windTone).connect(this.wind).connect(ctx.destination);
    windSrc.start();

    const waveSrc = ctx.createBufferSource();
    waveSrc.buffer = buf;
    waveSrc.loop = true;
    waveSrc.playbackRate.value = 0.6; // lower and slower than the wind
    const waveTone = ctx.createBiquadFilter();
    waveTone.type = 'lowpass';
    waveTone.frequency.value = 600;
    this.waves = ctx.createGain();
    this.waves.gain.value = 0;
    waveSrc.connect(waveTone).connect(this.waves).connect(ctx.destination);
    waveSrc.start(0, 1.7); // start at another point in the loop, so it doesn't echo the wind
  }

  // Set the volumes, each 0..1. `wind` (0..1) also makes gusts higher in pitch. Call every frame.
  set(vol: { wind: number; waves: number }, wind: number, t: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    this.wind.gain.setTargetAtTime(vol.wind, now, 0.3);
    this.windTone.frequency.setTargetAtTime(300 + 700 * wind, now, 0.5);
    this.waves.gain.setTargetAtTime(vol.waves * swell(t), now, 0.3);
  }
}
