// All the game's sound in one place: the music, the work sounds, the mute choice and where you
// hear from. The page calls `update` every frame.
import type { Game } from '../game';
import type { P } from '../path';
import { Ear, workPan } from './ear';
import { musicLevel } from './mix';
import { Music } from './music';
import { MuteChoice } from './mute';
import { WorkSounds } from './strikes';
import { MusicVolume } from './volume';
import { workMix, workSources } from './work';

// What the sound needs from the camera.
export interface SoundView {
  toWorld(px: number, py: number): P; // the ground point under a screen pixel, in tiles
  zoom: number;
}

export class Sounds {
  readonly mute = new MuteChoice();
  readonly musicVolume = new MusicVolume();
  readonly music = new Music();
  readonly work = new WorkSounds();
  readonly ear = new Ear();

  // Follows the pointer, and starts the sound on the first click or key press, because
  // browsers only allow sound after the player does something.
  watch(win: Window) {
    this.ear.watch(win);
    for (const ev of ['pointerdown', 'keydown']) win.addEventListener(ev, () => !this.mute.muted && this.start(), true);
  }

  start() {
    this.music.start();
    this.work.start();
  }

  // Mutes or unmutes all sound. Returns whether it is now muted.
  toggle() {
    const muted = this.mute.toggle();
    if (!muted) this.start();
    return muted;
  }

  // Moves the music volume to its next step. Returns the new volume.
  cycleMusic() {
    const v = this.musicVolume.cycle();
    if (!this.mute.muted) this.music.start();
    return v;
  }

  // You hear work from the pointer: louder near workers, quieter zoomed out, and panned to the
  // side of the screen it is on. Work stops while the game is paused, so its sounds stop too.
  update(game: Game, view: SoundView, width: number, height: number, paused: boolean) {
    const e = this.ear.point(width, height);
    const at = view.toWorld(e.x, e.y);
    const src = workSources(game);
    this.music.set(musicLevel(this.musicVolume.volume, this.mute.muted));
    const levels = workMix(src, { ...at, zoom: view.zoom, muted: this.mute.muted || paused });
    this.work.set(levels, workPan(src, { ...at, zoom: view.zoom, halfWidth: width / 2 }));
  }
}
