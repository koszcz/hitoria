// The background tune, written as notes rather than recorded, so there are no sound files.
// Pure functions: `bar(n)` gives the notes of bar n, and music.ts plays them with Web Audio.

// A note to play. `note` is a MIDI number (60 is middle C). `at` and `length` are in seconds,
// from the start of the bar. `voice` says which instrument plays it.
export interface Note {
  voice: 'bell' | 'pad';
  note: number;
  at: number;
  length: number;
  gain: number; // 0..1, before the music volume
}

const BEAT = 0.75; // 80 beats a minute: slow and calm
export const BAR_SECONDS = 4 * BEAT;

// The five-note scale C D E G A. It has no clashing half steps, so any two notes sound fine.
export const SCALE = [0, 2, 4, 7, 9];

// Chords under the tune, one per bar: C, A minor, F, G. Each is three notes held by the pad.
const CHORDS = [
  [48, 52, 55],
  [45, 52, 57],
  [41, 48, 57],
  [43, 50, 55],
];

// The melody stays between A4 and E5, so it never jumps far.
const MELODY = [69, 72, 74, 76];

// Rhythms, as [beat, length in beats]. The last two are sparse, to give the tune room to breathe.
const RHYTHMS = [
  [[0, 1], [1, 1], [2, 2]],
  [[0, 1.5], [1.5, 0.5], [2, 1], [3, 1]],
  [[0, 2], [2, 1], [3, 1]],
  [[0, 1], [1, 0.5], [1.5, 0.5], [2, 2]],
  [[0, 1], [2, 2]],
  [[0, 3]],
];
// Which rhythm each bar of the loop uses.
const PLAN = [0, 1, 2, 5, 3, 0, 4, 5];
export const LOOP_BARS = PLAN.length;

// The notes of the chord under bar n.
export function chordOf(n: number) {
  return CHORDS[mod(n, CHORDS.length)];
}

// The pitch of a MIDI note in Hz.
export function freq(note: number) {
  return 440 * 2 ** ((note - 69) / 12);
}

// The notes of bar n. The tune repeats every LOOP_BARS bars.
export function bar(n: number): Note[] {
  const i = mod(n, LOOP_BARS);
  const chord = chordOf(i).map((c) => c % 12);
  const notes: Note[] = chordOf(i).map((note) => ({ voice: 'pad', note, at: 0, length: BAR_SECONDS + 1, gain: 0.35 }));
  // Start on the chord note nearest the middle of the melody, then wander a step at a time.
  let at = nearestChordTone(chord);
  RHYTHMS[PLAN[i]].forEach(([beat, len], k) => {
    if (k > 0) {
      const step = random(i * 17 + k) < 0.5 ? -1 : 1;
      at = MELODY[at + step] === undefined ? at - step : at + step; // turn back at the edge
    }
    notes.push({ voice: 'bell', note: MELODY[at], at: beat * BEAT, length: len * BEAT, gain: k === 0 ? 0.7 : 0.5 });
  });
  return notes;
}

// The place in MELODY of the chord note closest to C5. Every chord has one in that range.
function nearestChordTone(chord: number[]) {
  const fits = MELODY.map((m, j) => j).filter((j) => chord.includes(MELODY[j] % 12));
  return fits.reduce((a, b) => (Math.abs(MELODY[b] - 72) < Math.abs(MELODY[a] - 72) ? b : a));
}

// A fixed random number in 0..1 for each seed, so the tune is the same on every visit.
function random(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}
