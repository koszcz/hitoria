// How loud the music should be. A pure function, so the rule can be tested without a browser.

// Loudest the music gets, at full music volume. Kept soft, so it stays behind the game.
const MAX_MUSIC = 0.25;

// How loud the music plays, from the music volume (0..1). Muting the sound mutes the music too.
export function musicLevel(volume: number, muted: boolean) {
  return muted ? 0 : MAX_MUSIC * volume;
}
