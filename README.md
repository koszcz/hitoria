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
bun run dev      # http://main.localhost:5173  (add ?seed=123 to start a fixed map fresh)
bun run build    # static build in dist/
bun test         # game logic tests in test/
```

Controls: drag to pan, scroll to zoom, `1`–`5` to pick a building, `R` to draw roads, `X` to
remove roads or flags, shift-click to place several, right-click or Esc to cancel, space to pause,
Ctrl+S (or Cmd+S) to save.

## Running several copies

You can work on several branches at once, each in its own git worktree. Each copy of the dev
server gets its own address, named after its branch:

| Branch | Address |
| --- | --- |
| `main` | http://main.localhost:5173 |
| `claude/new-roads` | http://claude-new-roads.localhost:5173 |

To use it:

1. Run `bun run dev` in each worktree. It prints the address to open.
2. Open http://localhost:5173 to see every copy that is running.

Things to know:

- Each address has its own save, because browsers keep local storage per address.
- Crash and problem reports go to `reports/` in the worktree that served the page.
- To pick a different name, set `DEV_NAME`, for example `DEV_NAME=try2 bun run dev`.
- Port 5173 must be free for the first copy you start. If that copy stops, another running copy
  takes over the port within a few seconds.

## Saving

Saves live in your browser's local storage. You can keep as many as the storage holds.

- **Save** (or Ctrl+S) stores the game you are playing. The first time, it makes a new save named
  after the island. After that, it writes over that same save.
- **Saves** opens a list of every save. From there you can load a save, save as a new one, write
  over a save, delete one, or change how often the game autosaves.
- **Autosave** runs every minute by default, and when you close the tab. You can also set it to
  every 5 minutes, or turn it off. The game keeps the 3 newest autosaves and writes over the oldest.
- **New** starts a fresh island. It makes an autosave of the old island first.
- Opening the page continues from your newest save.

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

## Ideas

Ideas for the game, and what we build next, live in [ideas/](ideas/README.md).
