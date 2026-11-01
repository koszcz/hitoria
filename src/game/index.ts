// The game rules, without any drawing. Other folders import from here.
export * from './defs';
export * from './types';
export { Game } from './game';
export { SAVE_VERSION, type SaveData } from './save';
export { GOALS } from './goals';
export { HUNGRY_AFTER } from './survive';
export { SAIL_CARGO, SAIL_CREW, lacking } from './voyage';
export { LANDING_LAND } from './homes';
export { ROAM, ANIMAL } from './animals';
export { HUNT_RANGE, ANIMAL_RETURN } from './hunting';
export { START_TOOLS, needsTool } from './tools';
