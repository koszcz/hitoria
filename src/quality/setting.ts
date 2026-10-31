// The graphics setting as the game uses it: the level to draw at right now, whether the player
// picked it or auto mode is choosing, and what happens when the player changes it.
import { AutoQuality } from './auto';
import { Choice, GraphicsChoice, nextChoice } from './choice';
import { DeviceHints, Level, startLevel } from './levels';

export class GraphicsSetting {
  private auto: AutoQuality;

  constructor(private hints: DeviceHints, private saved = new GraphicsChoice()) {
    this.auto = this.freshAuto();
  }

  private freshAuto() {
    return new AutoQuality(this.saved.lastAuto ?? startLevel(this.hints));
  }

  get choice(): Choice {
    return this.saved.choice;
  }

  get level(): Level {
    const c = this.saved.choice;
    return c === 'auto' ? this.auto.level : c;
  }

  // Moves to the next choice: auto → low → medium → high → auto. Returns the level to draw at.
  cycle(): Level {
    const c = nextChoice(this.saved.choice);
    this.saved.choice = c;
    if (c === 'auto') this.auto = this.freshAuto();
    return this.level;
  }

  // Record one frame. On auto, returns the new level when it changes, otherwise null.
  frame(ms: number): Level | null {
    if (this.saved.choice !== 'auto') return null;
    const l = this.auto.frame(ms);
    if (l) this.saved.lastAuto = l;
    return l;
  }
}
