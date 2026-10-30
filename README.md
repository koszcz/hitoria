# Hitoria

A peaceful 2.5D settlement builder for the browser, inspired by *The Settlers*.

## Design pillars

- **No raids, ever.** Nobody attacks you. The challenge is logistics: keeping goods flowing,
  planning space, and growing your economy.
- **Watch it live.** Every log is carried by a visible settler. You can see why a building is
  idle (no trees in range, waiting for logs, no free carrier).
- **Grow by building, not by fighting.** Lookout towers expand your land instead of military
  buildings.

## Running it

Needs [Bun](https://bun.sh). The only library is [Three.js](https://threejs.org), for the 3D view.

```bash
bun install      # first time only
bun run dev      # http://localhost:5173  (add ?seed=123 to start a fixed map fresh)
bun run build    # static build in dist/
bun test         # game logic tests in test/
```

Controls: drag to pan, scroll to zoom, `1`–`5` to pick a building, `R` to draw roads, `X` to
remove roads or flags, shift-click to place several, right-click or Esc to cancel, space to pause,
Ctrl+S (or Cmd+S) to save.

## Saving

The game has one save slot in your browser's local storage.

- **Save** (or Ctrl+S) stores the game. It also saves by itself every minute and when you close the tab.
- **Load** goes back to the last save. Opening the page also continues from it.
- **New** starts a fresh island. Your next save replaces the old one.

The save keeps the map, buildings, roads, flags and every good. It does not keep where settlers are.
After a load, everyone starts in the HQ and walks back to their post. Goods a settler was holding go
back to their building or flag, so nothing is lost.

## Code map

| File | What it does |
| --- | --- |
| `src/world.ts` | Seeded map generation: island, forests, boulders, mountains |
| `src/game.ts` | Simulation: buildings, settlers, task queues, carrier dispatch |
| `src/path.ts` | A* pathfinding on the tile grid |
| `src/render.ts` | Three.js 3D renderer: terrain, water, buildings, settlers, overlays. Keeps the isometric camera angle |
| `src/ui.ts` | HUD, build bar, info panel |
| `src/main.ts` | Input, camera, fixed-step game loop |

## Current economy

Woodcutter → logs → Sawmill → planks. Forester replants trees, Quarry breaks boulders into stone,
Lookout expands land. Everything is stored at the HQ.

Every building has a flag in front of its door. Goods only travel along roads between flags:
each road section has one carrier who passes goods from flag to flag, and a flag holds at most
8 goods, so busy roads back up. Long roads get extra flags every few tiles so more carriers share
the load. Settlers walk 1.5× faster on roads. A building that isn't connected to the HQ by road
gets no materials.

## Roadmap ideas

1. **Road upgrades.** Donkeys on busy roads, warehouses as extra hubs, demolishing buildings.
2. **Food chain.** Fisher, hunter, farm → mill → bakery, well. Miners and workers need food.
3. **Mountains and mines.** Coal, iron and gold mines, smelter, toolmaker. Tools gate new workers.
4. **Population.** Houses that grow your settler count over time.
5. **Demolish and move buildings.**
6. **Goals instead of enemies.** Peaceful scenarios: build a monument, trade with a ship, survive winter.
7. **Art pass.** Swap the built-in 3D shapes for detailed models (for example, free CC0 packs from Kenney or Quaternius).
