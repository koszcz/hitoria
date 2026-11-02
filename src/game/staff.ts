// Sending settlers out of their homes: a builder for every site and a worker for every hut.
// A new worker fetches a tool on the way, if their hut has none yet.
import { BDEFS } from './defs';
import { builtStatus, linked } from './construction';
import type { Game } from './game';
import { baseOf, giveUp, takeSettler } from './settlers';
import { dropTool, fetchTool, lacksTool, NO_TOOL, toolStore } from './tools';
import type { Building } from './types';
import { ASLEEP, night } from './sleep';

// Nobody leaves home for work at night. Huts and sites with nobody yet say so.
function nightStatus(g: Game) {
  for (const b of g.buildings.values())
    if (b.built ? BDEFS[b.type].worker && !b.worker && !b.stopped : !b.builder) b.status = ASLEEP;
}

export function staff(g: Game) {
  if (night(g)) return nightStatus(g);
  // Houses come first, because only they bring in more settlers.
  for (const b of g.buildings.values()) if (b.type === 'house' && !sendBuilder(g, b)) break;
  for (const b of g.buildings.values()) {
    if (!sendBuilder(g, b)) continue;
    const role = BDEFS[b.type].worker;
    if (b.built && role && !b.worker && !b.stopped) {
      if (b.status === ASLEEP) b.status = builtStatus(b);
      const store = lacksTool(b) ? toolStore(g, b) : null;
      if (lacksTool(b) && !store) {
        b.status = NO_TOOL;
        continue;
      }
      if (b.status === NO_TOOL) b.status = builtStatus(b);
      const s = takeSettler(g, role, b);
      if (!s) continue; // this building's home has nobody left, but another home may
      b.worker = s.id;
      s.home = b.id;
      s.onAbort = () => {
        dropTool(g, s, baseOf(g, s));
        giveUp(g, s, b, 'worker');
      };
      s.tasks = [
        ...(store ? fetchTool(s, store) : []),
        { k: 'walk', x: b.x, y: b.y },
        { k: 'do', f: () => {
          if (s.carrying === 'tool') b.tooled = true;
          s.carrying = null;
          s.inside = true;
          s.onAbort = null;
        } },
      ];
    }
  }
}

// Send a builder to a site that a home can walk to and has none yet.
// Returns false when its home has nobody left to send.
function sendBuilder(g: Game, b: Building) {
  if (b.built || b.builder || !linked(g, b)) return true;
  const s = takeSettler(g, 'builder', b);
  if (!s) return false;
  b.builder = s.id;
  s.home = b.id;
  s.onAbort = () => giveUp(g, s, b, 'builder');
  s.tasks = [{ k: 'walk', x: b.x, y: b.y, adjacent: true }, { k: 'do', f: () => { s.atWork = true; s.onAbort = null; } }];
  return true;
}
