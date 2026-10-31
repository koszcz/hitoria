# Hitoria

A peaceful 2.5D settlement builder for the browser, inspired by *The Settlers*.

**Play it in your browser:** https://koszcz.github.io/hitoria/

![A village around the HQ keep, beside a bay and below a mountain: huts, a farm with its fields of grain, a windmill, two lookout towers and a stone mine, all joined by roads. The current goal shows at the top left](docs/screenshot.jpg)

## How to play

You start with a headquarters (HQ), some goods and 18 settlers. Your goal is to grow a working
economy. Nobody attacks you.

The panel at the top left gives you one goal at a time, and shows how close you are. When you
reach a goal, the next one starts:

1. Make 50 planks.
2. Bake 20 bread.
3. Grow to 30 settlers.
4. Build 3 houses.
5. Build a monument.

Only goods your settlers make count toward a goal, not the goods you start with.

1. **Place a woodcutter's hut.** Press `B` to open the build menu and pick the woodcutter's hut.
   Then click open grass near trees.
2. **Check its road.** The game lays a road to your nearest flag when one fits. If it can't, press
   `R`, click the hut's flag, then click a flag that is joined to the HQ. Right-click to stop
   drawing.
3. **Watch it get built.** A builder walks to the site. Carriers bring planks from the HQ along the
   road. Once it is built, a woodcutter moves in and starts felling trees.
4. **Grow your economy.**
   - A forester (`2`) plants new trees, so the woodcutter never runs out.
   - A quarry (`3`) next to boulders makes stone.
   - A sawmill (`4`) turns logs into planks. You need planks for every new building.
   - A lookout tower (`5`) expands your land, so you have room for more.
   - Fishers, farms, mills and bakeries make food. A bakery also needs water from a well.
     Houses turn food into new settlers.
   - Your starting land always has a mountain for a stone mine and a bay for a fisher.
   - Coal and iron mines also go next to a mountain. Nothing uses their coal and iron ore yet.
   - Across the water from the bay lies a second island. You can't reach it yet.

Every building needs a road to the HQ. Without one, no goods arrive and the builder or worker
waits. A sign with a crossed-out road floats over any building that has no road. Click a building
to see what it is doing and what it is waiting for.

Placed a building in the wrong spot? Pick the Remove tool (`X`) and click it. Its goods go back
to the HQ, and its flag and roads stay.

### Controls

| Action | Input |
| --- | --- |
| Move the map | Drag |
| Zoom | Scroll |
| Open the build menu | `B`, or the Build button |
| Pick a building straight away | `1`–`9` |
| Place several of the same building | Shift-click |
| Draw roads | `R` |
| Remove a road, a lone flag, or a building | `X` |
| Cancel | Right-click or Esc |
| Pause | Space |
| Save | Ctrl+S (or Cmd+S) |
| Mute or unmute the sound | `M`, or the Sound button |
| Show live diagnostics | F3 |

If something looks wrong, click **Report**. It saves a problem report to `reports/`.

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
bun run play     # http://play.localhost:5174  (a copy to play on, see below)
bun run build    # static build in dist/
bun test         # tests, kept next to the code they test
bun run readme:shot   # take the screenshot at the top of this README again
```

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

## Playing while other branches change

Use `bun run play` when you want to play without interruptions. Other sessions can merge into
`main` or stop their servers, and your game keeps running.

The command:

1. Makes a worktree next to this folder, named `hitoria-play`, the first time you run it.
2. Moves that worktree to the newest commit on `main`.
3. Starts it at http://play.localhost:5174, on its own port.

To get new features, stop the command and run it again. Your saves stay, because the address
stays the same. Saves from other addresses, such as http://main.localhost:5173, do not appear here.

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

The save keeps the map, buildings, roads, flags, every good and your goals. It does not keep where settlers are.
After a load, everyone starts in the HQ and walks back to their post. Goods a settler was holding go
back to their building, so nothing is lost.

Each save records which version of the map it was made on. A save from before a map change loads
on the same land it was saved on, even though new games get the new map.

## Graphics

The **Graphics** button in the menu sets how the game is drawn. Click it to go through the choices.

- **Auto** is the default. It starts on a level that suits your device: High on a computer, Medium
  on a phone or tablet. If the game runs slowly, it lowers the level while you play and tells you.
  If the game then runs smoothly for a while, it tries one level higher, but never one that was
  already too slow. The browser remembers the level it settled on.
- **Low**, **Medium** and **High** stay as you set them. Low turns off shadows and draws fewer
  pixels. High draws soft shadows at full sharpness.

Press F3 to see the level, and how much the game draws each frame.

## Sound

You hear soft wind and, near the shore, waves. The wind grows louder as gusts pass, and both
sounds get quieter when you zoom out. The game makes them from noise, so there are no sound files.

To mute the sound, click **Sound** in the menu or press M. The browser remembers your choice.
Browsers block sound until you click or press a key, so the sound starts then.

## Code map

| File | What it does |
| --- | --- |
| `src/world.ts` | Seeded map generation: island, forests, boulders, mountains, the mountain and bay every start gets, and the second island across the bay |
| `src/game/` | Simulation: buildings, demolishing, roads, settlers, carriers, farm fields, food, goals and saving |
| `src/path.ts` | A* pathfinding on the tile grid |
| `src/render/` | Three.js 3D renderer: terrain, water, buildings, settlers, overlays. Keeps the isometric camera angle. `looks.ts` gives each building its body shape and colours |
| `src/quality/` | The graphics setting, and Auto, which lowers it when frames are slow |
| `src/sound/` | Wind and wave sound, how loud each is from what the camera sees, and the mute setting |
| `src/art.ts` | The game's colours and light in one place: sky, sun, land, water and trees |
| `src/ui.ts` | HUD, goal panel and info panel |
| `src/buildmenu/` | The build menu |
| `src/saves.ts` | Save slots in the browser's local storage |
| `src/i18n.ts` | Translations |
| `src/main.ts` | Input, camera, fixed-step game loop |

## Current economy

- Woodcutter → logs → Sawmill → planks. A forester replants trees.
- A quarry breaks boulders into stone. A stone mine digs stone out of a mountain, and its miner
  eats fish or bread.
- A coal mine and an iron mine dig coal and iron ore out of a mountain in the same way. Nothing
  uses coal or iron ore yet.
- Farm → grain → Mill → flour → Bakery → bread. A fisher catches fish.
- A well draws water on any flat grass. The bakery needs 1 flour and 1 water for each loaf.
- Each farm keeps 6 fields of its own on the grass around it. You can place a farm only where
  they fit, and nothing else can be built on them. Demolishing the farm frees them.
- A house turns fish or bread into new settlers.
- A lookout tower expands your land.
- A monument does no work. Building one is your last goal.
- Goods are stored at the HQ and in storehouses.

Every building has a flag in front of its door. Flags mark where roads end and where they meet.
A carrier takes one good from the building that has it and walks it along the roads, all the way
to the building that needs it. Goods never wait on flags. Settlers walk 1.5× faster on roads.
A building that isn't connected to the HQ by road gets no materials.

## Ideas

Ideas for the game, and what we build next, live in [ideas/](ideas/README.md).
