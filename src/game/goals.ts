// Peaceful goals the player works through in order, such as "make 50 planks" or "build a monument".
import type { BType } from './defs';
import type { Game } from './game';
import { WINTER_NOTES, watchWinter } from './survive';

export interface Goal {
  id: string;
  text: string;
  need: number;
  have: (g: Game) => number;
  note?: (g: Game) => string; // a line on how the goal is going, shown in place of the count
  watch?: (g: Game) => void; // keeps track of the goal while the player is on it
}

// How many buildings of a type are finished.
const built = (g: Game, type: BType) => [...g.buildings.values()].filter((b) => b.type === type && b.built).length;

export const GOALS: Goal[] = [
  { id: 'planks', text: 'Make 50 planks', need: 50, have: (g) => g.made.plank },
  { id: 'bread', text: 'Bake 20 bread', need: 20, have: (g) => g.made.bread },
  { id: 'settlers', text: 'Grow to 30 settlers', need: 30, have: (g) => g.population },
  { id: 'houses', text: 'Build 3 houses', need: 3, have: (g) => built(g, 'house') },
  { id: 'monument', text: 'Build a monument', need: 1, have: (g) => built(g, 'monument') },
  {
    id: 'winter', text: 'Get through a winter with no one hungry', need: 1,
    have: (g) => (g.winter.state === 'done' ? 1 : 0), note: (g) => WINTER_NOTES[g.winter.state], watch: watchWinter,
  },
];

// The goal the player is on now, with its progress, or null once every goal is reached.
export function goalNow(g: Game): { id: string; text: string; have: number; need: number; note?: string } | null {
  const goal = GOALS[g.goal];
  if (!goal) return null;
  const now = { id: goal.id, text: goal.text, have: Math.min(goal.need, goal.have(g)), need: goal.need };
  return goal.note ? { ...now, note: goal.note(g) } : now;
}

// Move past every goal that is reached, with a toast for each one.
export function checkGoals(g: Game) {
  GOALS[g.goal]?.watch?.(g);
  for (let goal = GOALS[g.goal]; goal && goal.have(g) >= goal.need; goal = GOALS[g.goal]) {
    g.toasts.push(`🏆 Goal reached: ${goal.text}`);
    g.goal++;
  }
}
