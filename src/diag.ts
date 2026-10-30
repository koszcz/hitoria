// Watches a running game from the outside and keeps what is needed to explain odd behaviour:
// what happened recently, what looks stuck, how fast frames are, and how goods changed over time.
// It never changes the game. It has no DOM code, so tests can use it too.
import { Game, BDEFS, GOODS, Item } from './game';

const EVENTS = 300; // recent events kept
const SAMPLES = 120; // timeline samples kept (20 minutes at one every 10 s)
const SAMPLE_EVERY = 10; // game seconds between timeline samples
const CHECK_EVERY = 1; // game seconds between checks
const SLOW_FRAME = 50; // ms

// How long something may stay the same before it counts as a long wait, in game seconds.
export const LIMITS = {
  settlerStill: 20, // a settler with a walk planned who hasn't moved
  buildingWaiting: 180, // a building whose "Waiting…", "Unreachable…" or "Needs a road…" status hasn't changed
  flagFull: 60, // a flag holding as many goods as it can
  itemUnrouted: 60, // a good on a flag that no building wants
};

export interface Issue {
  key: string;
  since: number; // game time when it started
  text: string;
}

interface Sample {
  t: number;
  hq: string;
  pool: number;
  busy: number;
  onFlags: number;
  buildings: number;
}

export class Diagnostics {
  events: string[] = [];
  issues = new Map<string, Issue>();
  samples: Sample[] = [];
  perf = { frames: 0, frameMs: 0, updateMs: 0, drawMs: 0, worstMs: 0, slow: 0 };

  private game: Game | null = null;
  private checkT = 0;
  private sampleT = 0;
  private status = new Map<number, { status: string; built: boolean; since: number }>();
  private still = new Map<number, { x: number; y: number; since: number }>();
  private full = new Map<number, number>();
  private unrouted = new WeakMap<Item, number>();

  // Start watching a game. Call again after loading or starting a new one.
  attach(game: Game) {
    this.game = game;
    this.status.clear();
    this.still.clear();
    this.full.clear();
    this.issues.clear();
    this.checkT = this.sampleT = 0;
    this.event(`Watching island ${game.seed} at game time ${game.time.toFixed(0)} s`);
  }

  // Something the player did, or something the game reported.
  event(msg: string) {
    const t = this.game ? this.game.time.toFixed(1).padStart(7) : '      -';
    this.events.push(`${t}s  ${msg}`);
    if (this.events.length > EVENTS) this.events.shift();
  }

  // Record one frame's timings in ms. Keeps a moving average and the worst recent frame.
  frame(frameMs: number, updateMs: number, drawMs: number) {
    const p = this.perf, a = 0.05;
    p.frames++;
    p.frameMs += (frameMs - p.frameMs) * a;
    p.updateMs += (updateMs - p.updateMs) * a;
    p.drawMs += (drawMs - p.drawMs) * a;
    p.worstMs = Math.max(frameMs, p.worstMs * 0.995);
    if (frameMs > SLOW_FRAME && p.frames > 30) {
      p.slow++;
      if (frameMs > SLOW_FRAME * 3) this.event(`Slow frame: ${frameMs.toFixed(0)} ms (update ${updateMs.toFixed(0)}, draw ${drawMs.toFixed(0)})`);
    }
  }

  // Call after the game has advanced. Checks run on game time, so pausing pauses them.
  tick() {
    const g = this.game;
    if (!g) return;
    if (g.time >= this.checkT) {
      this.checkT = g.time + CHECK_EVERY;
      this.check(g);
    }
    if (g.time >= this.sampleT) {
      this.sampleT = g.time + SAMPLE_EVERY;
      this.sample(g);
    }
  }

  private check(g: Game) {
    const now = g.time;
    const seen = new Set<string>();
    const flag = (key: string, since: number, limit: number, text: string) => {
      if (now - since < limit) return;
      seen.add(key);
      if (this.issues.has(key)) return;
      this.issues.set(key, { key, since, text });
      this.event(`Long wait: ${text}`);
      console.warn(`[hitoria] ${text}`);
    };

    // Buildings: log every status change, and flag statuses that sit still too long.
    for (const b of g.buildings.values()) {
      const name = `${BDEFS[b.type].name} #${b.id} at ${b.x},${b.y}`;
      const prev = this.status.get(b.id);
      if (!prev) this.event(`${name} appeared (${b.built ? 'built' : 'site'})`);
      else if (prev.built !== b.built) this.event(`${name} finished`);
      else if (prev.status !== b.status) this.event(`${name}: ${prev.status} → ${b.status}`);
      const since = prev && prev.status === b.status && prev.built === b.built ? prev.since : now;
      this.status.set(b.id, { status: b.status, built: b.built, since });
      if (b.type !== 'hq' && /^(Waiting|Unreachable|Needs a road)/.test(b.status))
        flag(`b${b.id}`, since, LIMITS.buildingWaiting, `${name} has said "${b.status}" for ${Math.round(now - since)} s`);
    }
    for (const id of this.status.keys())
      if (!g.buildings.has(id)) {
        this.status.delete(id);
        this.event(`Building #${id} removed`);
      }

    // Settlers: someone with a walk planned who stays on one spot is stuck.
    for (const s of g.settlers.values()) {
      const prev = this.still.get(s.id);
      const moved = !prev || Math.abs(prev.x - s.x) + Math.abs(prev.y - s.y) > 0.01;
      const since = moved ? now : prev.since;
      this.still.set(s.id, { x: s.x, y: s.y, since });
      const walk = s.tasks.find((t) => t.k === 'walk');
      if (walk && walk.k === 'walk' && !s.inside)
        flag(`s${s.id}`, since, LIMITS.settlerStill,
          `${s.role} #${s.id} at ${s.x.toFixed(1)},${s.y.toFixed(1)} wants to walk to ${walk.x},${walk.y} but hasn't moved for ${Math.round(now - since)} s`);
    }
    for (const id of this.still.keys()) if (!g.settlers.has(id)) this.still.delete(id);

    // Flags: full flags and goods nobody wants.
    for (const f of g.flags.values()) {
      if (f.items.length >= 8) {
        if (!this.full.has(f.id)) this.full.set(f.id, now);
        flag(`f${f.id}`, this.full.get(f.id)!, LIMITS.flagFull, `Flag #${f.id} at ${f.x},${f.y} has been full for ${Math.round(now - this.full.get(f.id)!)} s`);
      } else this.full.delete(f.id);
      for (const it of f.items) {
        if (it.dest) {
          this.unrouted.delete(it);
          continue;
        }
        if (!this.unrouted.has(it)) this.unrouted.set(it, now);
        const since = this.unrouted.get(it)!;
        flag(`i${f.id}:${it.g}`, since, LIMITS.itemUnrouted, `A ${it.g} on flag #${f.id} at ${f.x},${f.y} has had no destination for ${Math.round(now - since)} s`);
      }
    }

    for (const [key, issue] of this.issues)
      if (!seen.has(key)) {
        this.issues.delete(key);
        this.event(`Resolved: ${issue.text}`);
      }
  }

  private sample(g: Game) {
    let onFlags = 0;
    for (const f of g.flags.values()) onFlags += f.items.length;
    this.samples.push({
      t: Math.round(g.time),
      hq: GOODS.map((k) => `${k} ${g.hq.stock[k]}`).join(', '),
      pool: g.pool,
      busy: g.settlers.size,
      onFlags,
      buildings: g.buildings.size,
    });
    if (this.samples.length > SAMPLES) this.samples.shift();
  }

  // Settlers by role and what they are doing right now.
  settlers() {
    const roles = new Map<string, number>();
    for (const s of this.game?.settlers.values() ?? []) roles.set(s.role, (roles.get(s.role) ?? 0) + 1);
    return [...roles].map(([r, n]) => `${r} ${n}`).join(', ') || 'none';
  }

  // The parts of a bug report that this module knows about, as Markdown.
  report(): string {
    const p = this.perf;
    const lines = [
      '### Things that look stuck',
      this.issues.size ? [...this.issues.values()].map((i) => `- ${i.text}`).join('\n') : '(none)',
      '',
      '### Performance',
      `Frame ${p.frameMs.toFixed(1)} ms (update ${p.updateMs.toFixed(1)}, draw ${p.drawMs.toFixed(1)}) · worst recent ${p.worstMs.toFixed(0)} ms · slow frames ${p.slow} of ${p.frames}`,
      '',
      '### Settlers out of the HQ',
      this.settlers(),
      '',
      '### Timeline (every 10 s of game time)',
      'time | HQ stock | idle | busy | goods on flags | buildings',
      ...this.samples.map((s) => `${s.t}s | ${s.hq} | ${s.pool} | ${s.busy} | ${s.onFlags} | ${s.buildings}`),
      '',
      '### Recent events',
      this.events.join('\n') || '(none)',
    ];
    return lines.join('\n');
  }
}

export const diag = new Diagnostics();
