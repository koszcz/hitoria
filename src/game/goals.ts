// Peaceful goals the player works through in order, such as "make 50 planks" or "build a monument".
import type { BType } from './defs';
import type { Game } from './game';

export interface Goal {
  id: string;
  text: string;
  need: number;
  have: (g: Game) => number;
}

// How many buildings of a type are finished.
const built = (g: Game, type: BType) => [...g.buildings.values()].filter((b) => b.type === type && b.built).length;

export const GOALS: Goal[] = [
  { id: 'planks', text: 'Make 50 planks', need: 50, have: (g) => g.made.plank },
  { id: 'bread', text: 'Bake 20 bread', need: 20, have: (g) => g.made.bread },
  { id: 'settlers', text: 'Grow to 30 settlers', need: 30, have: (g) => g.population },
  { id: 'houses', text: 'Build 3 houses', need: 3, have: (g) => built(g, 'house') },
  { id: 'monument', text: 'Build a monument', need: 1, have: (g) => built(g, 'monument') },
];

// The goal the player is on now, with its progress, or null once every goal is reached.
export function goalNow(g: Game) {
  const goal = GOALS[g.goal];
  if (!goal) return null;
  return { id: goal.id, text: goal.text, have: Math.min(goal.need, goal.have(g)), need: goal.need };
}

// Move past every goal that is reached, with a toast for each one.
export function checkGoals(g: Game) {
  for (let goal = GOALS[g.goal]; goal && goal.have(g) >= goal.need; goal = GOALS[g.goal]) {
    g.toasts.push(`🏆 Goal reached: ${goal.text}`);
    g.goal++;
  }
}
