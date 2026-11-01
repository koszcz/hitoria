# Hitoria

A peaceful 2.5D settlement builder for the browser, inspired by *The Settlers*.

**Play it in your browser:** https://koszcz.github.io/hitoria/

- **Changelog:** https://koszcz.github.io/hitoria/changelog.html shows what changed, with screenshots.
- **Backlog dashboard:** https://koszcz.github.io/hitoria/backlog.html shows the ideas and what is being built.

![A village around the HQ keep, beside a bay and between rocky, sharp-peaked mountains. Foam runs along the beach and ducks paddle on the bay. In the village are huts, a farm with its fields of grain, a windmill, two lookout towers, a hunter's lodge, a geologist's hut, a smelter and a toolmaker's workshop, with worn dirt paths between them. Bowls float over a few huts whose workers are hungry. It is early winter, so the first snow falls and the leafy trees are bare. The current goal shows at the top left. At the top right, the clock shows winter, day 5](docs/screenshot.jpg)

## How to play

You start with a headquarters (HQ), some goods and 18 settlers. Your goal is to grow a working
economy. Nobody attacks you.

The panel at the top left gives you one goal at a time, and shows how close you are. When you
reach a goal, the next one starts:

1. Make 50 planks.
2. Bake 20 bread.
3. Grow to 30 settlers.
4. Store 30 fish, meat or bread.
5. Build a monument.
6. Get through a winter with no one hungry.
7. Settle the other island.
8. Mine 20 coal.
9. Mine 20 iron ore.
10. Make 10 iron.

Only goods your settlers make count toward a goal, not the goods you start with.

The winter goal counts one whole winter, from the first snow to spring. A settler goes hungry
when a hut worker has no food, or a mine waits for food, for more than 20 seconds. A house that
waits for food does not count, because no one in it goes hungry. If that happens, try again next winter.

Goals 7 to 10 send you to the other island, because coal and iron ore lie only in its mountains.
The settle goal is reached when your settlers' ship lands there and they build their harbour.

After the last goal, your village makes wishes, one at a time, such as "Store 40 stone". The
panel shows how close you are, and the season to meet the wish by, such as "before the first
snow". When you meet a wish, it counts as granted, and a new wish comes. If the season comes
first, the wish just passes, with no penalty, and a new one comes.

1. **Place a woodcutter's hut.** Press `B` to open the build menu and pick the woodcutter's hut.
   Then click open grass near trees.
2. **Watch it get built.** A builder walks to the site. Carriers walk planks over from the HQ.
   Once it is built, a woodcutter moves in and starts felling trees.
3. **Watch the paths form.** You don't build roads. Settlers walk across the grass, and their
   footsteps wear it into dirt paths. Busy paths are quicker to walk, so settlers keep to them.
4. **Grow your economy.**
   - A forester (`2`) plants new trees, so the woodcutter never runs out.
   - A quarry (`3`) next to boulders makes stone.
   - A sawmill (`4`) turns logs into planks. You need planks for every new building.
   - A lookout tower (`5`) expands your land, so you have room for more.
   - Fishers, hunters, farms, mills and bakeries make food. A bakery also needs water from a
     well. Houses turn food into new settlers.
   - Every worker in a hut eats fish, meat or bread now and then. A hungry worker works at half
     speed, and a bowl floats over their hut. Carriers and builders need no food.
   - Mix your food. When a house or worker gets a different food from last time, the house grows
     its settler faster, the worker's meal lasts longer, and a miner digs 3 goods instead of 2.
   - Fishers catch about half as many fish in winter, so store bread and meat too.
   - Your starting land always has a mountain for a stone mine and a bay for a fisher. Beyond it,
     mountains run in long ridges, with grassy valleys between them. They rise into sharp,
     snowy peaks, like the Alps. Mountains near the HQ stay lower, so they never hide it.
   - Coal and iron ore lie only in the mountains of the second island and the far island. The
     mountains on your home island hold stone only. Coal and iron mines go next to the island's mountain, which has
     rust-brown rock with dark seams. A smelter melts their iron ore and coal into iron.
   - Every new worker in a hut needs a tool. The HQ starts with 20 tools. When they run out, a
     toolmaker's workshop makes more from iron and planks. Until then, a new hut waits for a tool.
     Iron comes only from the other island, so the game warns you when 8 tools are left before
     you settle it. The ship needs 6.
   - Some mountain tiles are rich spots. A mine next to a rich spot digs twice as fast. Build a
     geologist's hut near a mountain, and its geologist puts up a sign on each mountain tile
     nearby. A gold sign marks a rich spot. The lumps on a sign show what lies below: grey stone,
     or coal and iron ore. A mine's panel says when it sits next to a rich spot.
   - Across the water from the bay lies a second island. Farther out, to one side of the bay, lies
     the far island. To settle them, build a harbour, click it and press **Set sail**. See
     "Settling the second island" below.

Settlers must be able to walk from the HQ, or from a harbour they built on the second island, to
every building. If water, mountains or trees cut a
building off, no goods arrive and the builder or worker waits. A warning sign floats over it.
Click a building to see what it is doing and what it is waiting for.

Days and nights pass as you play. A full day lasts 8 minutes of game time, and a new game starts
in the morning. The light turns orange at dawn and dusk, and blue at night.

Workers and builders sleep at night. When dusk ends, each one finishes the work in hand and walks
to the nearest bed: the HQ, a finished house or the harbour on the second island. Their hut or
building site says "Asleep until dawn", and no new worker leaves home. At dawn they walk back and
go on working. Carriers and pack donkeys work all night, so goods keep moving.

Once every worker and builder is in bed, the night passes fast. The clock runs 8 times as fast,
or 16 times if you already play at 2× or 4×, and drops back to your speed at dawn. While a night
runs fast, the moon button next to the speed buttons turns blue and shows the speed. Click the
moon button to turn fast nights off or on. The game remembers your choice.

The island also goes through the four seasons. A full year lasts 20 minutes of game time, and a
new game starts in spring. Leafy trees turn yellow, orange and red in autumn and lose their leaves
in winter, when snow falls and covers the land. Grain grows only from spring to autumn. In
winter, farmers bring in ripe grain but sow nothing, so store grain and food before the snow comes.

A small clock at the top right shows where you are in the day and the year. On its dial, the sun
moves across the light half by day and the moon across the dark half by night. Next to the dial
you see the season, a bar that fills as the season goes on, and the day count.

The sea is alive too. Foam runs along the beaches, fish leap out of the water now and then, and
ducks paddle near the shore. The ducks fly south for the winter. They are only there to look at.

### Settling the second island

1. Build a harbour on the shore by the bay.
2. Gather 5 idle settlers in the HQ and 12 planks, 8 stone and 6 tools in your stores. Click the harbour to
   see what is still missing.
3. Press **Set sail**. A ship takes the settlers and goods to the nearest free shore on the
   second island.
4. The settlers clear the trees and boulders around them, which gives them logs and stone. They
   build a harbour of their own and claim the land 6 tiles around it. The ship sails home.

The new harbour is the island's home, like the HQ. Its idle settlers wait there and go out from it
to build, work and carry goods. Buildings on the island get their goods from it and bring what
they make back to it. Settlers never cross the sea on foot.

Once the ship is back, you can sail a second time, to the far island. It takes another 5
settlers and the same goods. The far island has a mountain with coal and iron ore too, and all of
its ore is rich, so every mine there digs twice as fast. Each island gets one crew, so you can
sail twice in all.

The second island has a mountain with coal and iron ore in it. Build your coal and iron mines at
its foot.

### Trading with the trade ship

About 3 minutes after your first harbour on the home island is finished, a trade ship sails in
from the open sea. It stays tied up at the pier for about a minute and a half, then sails away.
The next one comes 3 minutes later.

1. While the trade ship is tied up, click the harbour.
2. Under **You give**, pick a good you can spare. Under **You get**, pick a good you lack.
3. The panel shows the deal, such as 4 planks for 1 iron. Press **Trade** to make it. You can
   trade as often as you like while the ship is there.

The rates are fixed. Each good has a worth, from 1 for logs, stone, water and grain up to 6 for
tools, and the trader keeps half the worth of what you give. The goods you give come from the
harbour first, then from your nearest stores. The goods you get go into the harbour.

Each ship also has its own wishes, shown in the panel:

- It wants 2 goods, marked with ⭐. When you give one of them, the trader pays its full worth.
- It sells 2 rare goods, marked with 💎, at their full worth. It carries only 6 of each.
- It sells only 2 tools and 4 iron on each visit. The **You get** row shows how many it has left.

### Upgrading buildings

Once you make iron, you can upgrade your huts and houses.

1. Click a finished hut, mine, workshop or house.
2. Under **Upgrade**, the panel shows the cost: 2 iron and 1 tool from your stores.
3. Press **Upgrade**.

In an upgraded hut, mine or workshop, the worker takes half as long over each piece of work.
An upgraded house has room for 2 more settlers. Each building upgrades once. Until your settlers
sail to the other island, the game keeps back the 6 tools their ship needs.

Placed a building in the wrong spot? Pick the Remove tool (`X`) and click it. Its goods go back
to the HQ.

### Controls

| Action | Input |
| --- | --- |
| Move the map | Drag |
| Zoom | Scroll |
| Open the build menu | `B`, or the Build button |
| Pick a building straight away | `1`–`9` |
| Place several of the same building | Shift-click |
| Remove a building | `X` |
| Cancel | Right-click or Esc |
| Pause | Space |
| Turn fast nights on or off | The 🌙 button next to the speed buttons |
| Save | Ctrl+S (or Cmd+S) |
| Mute or unmute the sound | `M`, or **Sound** in the ☰ menu |
| Change the music volume | **Music** in the ☰ menu |
| Show live diagnostics | F3 |

If something looks wrong, open the ☰ menu at the top right and click **Report**. It saves a problem report to `reports/`.

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
The save buttons are in the ☰ menu at the top right.

- **Save** (or Ctrl+S) stores the game you are playing. The first time, it makes a new save named
  after the island. After that, it writes over that same save.
- **Saves** opens a list of every save. From there you can load a save, save as a new one, write
  over a save, delete one, or change how often the game autosaves.
- **Autosave** runs every minute by default, and when you close the tab. You can also set it to
  every 5 minutes, or turn it off. The game keeps the 3 newest autosaves and writes over the oldest.
- **New** starts a fresh island. It makes an autosave of the old island first.
- Opening the page continues from your newest save.
- When you load a save, the island chronicle opens. It lists the island's milestones by day, such
  as the first birth, the first of each building, each goal and every tenth trade ship.

The save keeps the map, buildings, worn paths, every good, your goals, the village wish, the chronicle and the time of day and year. It does not keep where settlers and
wild animals are. The animals start again from their home spots.
Saves from when the game still had roads load too. Their roads and flags become worn paths.
After a load, everyone starts in their home, the HQ or the harbour on the second island, and walks back to their post. Goods a settler was holding go
back to their building, so nothing is lost.

Each save records which version of the map it was made on. A save from before a map change loads
on the same land it was saved on, even though new games get the new map. On maps from before the
second island's mountain, every mountain still holds coal and iron ore. Maps from before mountain ranges
keep their round mountains. Maps from before the far island have no far island, so their settlers
sail only once.

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

You also hear your settlers work near the middle of the screen. Woodcutters chop, the sawmill
saws, and builders, stonecutters and the toolmaker hammer. Nearer work is louder. Work sounds fade
as you zoom out, and stop while the game is paused.

A calm tune plays in the background: soft bells over slow chords. The game writes the notes in
code too. To change how loud the music is, click **Music** in the menu. Each click moves it one
step from Off to 100%. It starts at 50%.

To mute all sound, music and work sounds included, click **Sound** in the menu or press M. The browser remembers
both choices. Browsers block sound until you click or press a key, so the sound starts then.

## Code map

| File | What it does |
| --- | --- |
| `src/world.ts` | Seeded map generation: island, forests, boulders, mountains, the mountain and bay every start gets, the second island across the bay, the far island, and where coal and iron ore lie |
| `src/land/` | Map helpers: seeded random numbers and noise (`noise.ts`), and the ridges and valleys of mountain ranges (`ranges.ts`) |
| `src/game/` | Simulation: buildings, demolishing, worn paths, sleep at night (`sleep.ts`), walking distances, settlers, wild animals, hunting, carriers and pack donkeys (`donkeys.ts`), farm fields, food, hungry workers (`meals.ts`), harbours and their docks, the trade ship and what it wants and sells (`wants.ts`), homes (the HQ and the harbours settlers build on the other islands), the voyages to settle them and which island each one goes to (`isles.ts`), the tools new workers take, rich spots and the geologist (`geology.ts`), goals, village wishes (`wishes.ts`), building upgrades (`upgrades.ts`), the island chronicle (`chronicle.ts`), mixed food (`variety.ts`) and saving |
| `src/path.ts` | A* pathfinding on the tile grid |
| `src/render/` | Three.js 3D renderer: terrain, the fine alpine ridges, peaks and snow on mountains (`relief.ts`), water, the foam along the shore (`foam.ts`), the fish and ducks on the sea (`waterlife.ts`), buildings, settlers, animals, pack donkeys, ships, the geologist's signs (`signs.ts`), overlays, the light for each time of day (`daylight.ts`), and the season's colours and snow (`seasonal.ts`, `snowfall.ts`). Keeps the isometric camera angle. `looks.ts` gives each building its body shape and colours |
| `src/water/` | Where the shore is, and where each fish and duck is at any moment. They are only there to look at |
| `src/seasons/` | The day and year clocks, the day count, how the island looks at each point in the year, when grain grows, the clock in the HUD (`hud.ts`), and fast nights (`fastnight.ts`) |
| `src/quality/` | The graphics setting, and Auto, which lowers it when frames are slow |
| `src/sound/` | Wind and wave sound, work sounds (`work.ts` picks what you hear, `strikes.ts` plays it), how loud each is from what the camera sees, the background tune (`tune.ts` writes the notes, `music.ts` plays them), and the mute and music volume settings |
| `src/art.ts` | The game's colours and light in one place: sky, sun, dawn, dusk and night, land, water and trees |
| `src/ui.ts` | HUD, goal panel and info panel |
| `src/sailinfo.ts` | The harbour panel's "Sail to settle" part |
| `src/tradeinfo.ts` | The harbour panel's "Trade ship" part |
| `src/upgradeinfo.ts` | The "Upgrade" part of a hut's or house's panel |
| `src/buildmenu/` | The build menu |
| `src/saves.ts` | Save slots in the browser's local storage |
| `src/chronicle/` | The island chronicle panel and how its lines read |
| `src/wishes/` | The goal panel once every goal is reached: the village wish, its progress and its season |
| `src/i18n.ts` | Translations. The Polish building names and village wishes are in `src/lang/` |
| `src/main.ts` | Input, camera, fixed-step game loop |

## Current economy

- Woodcutter → logs → Sawmill → planks. A forester replants trees.
- A quarry breaks boulders into stone. A stone mine digs stone out of a mountain, and its miner
  eats fish, meat or bread.
- A coal mine and an iron mine dig coal and iron ore out of a mountain in the same way. Only the
  mountains of the second island and the far island hold coal and iron ore.
- A mine next to a rich spot digs twice as fast. A geologist surveys the mountains up to 6 tiles
  from the Geologist's Hut and marks rich spots with gold signs. The mountain by the HQ and the
  second island's mountain always have one. All the ore on the far island is rich.
- Iron mine → iron ore, and coal mine → coal → Smelter → iron. The smelter needs 1 iron ore and
  1 coal for each bar of iron.
- Iron and planks → Toolmaker's Workshop → tools. The toolmaker needs 1 iron and 1 plank for
  each tool.
- When a hut gets its worker, the worker takes 1 tool from the nearest store, and the hut keeps
  it. Scouts, builders and carriers need no tool. Demolishing a hut puts its tool back in your
  stores.
- Farm → grain → Mill → flour → Bakery → bread. A fisher catches fish, but only about half as
  many in winter.
- A hunter catches deer and hares up to 7 tiles from the Hunter's Lodge and brings home meat.
  Foxes are left alone.
- A well draws water on any flat grass. The bakery needs 1 flour and 1 water for each loaf.
- Each farm keeps 6 fields of its own on the grass around it. You can place a farm only where
  they fit, and nothing else can be built on them. Demolishing the farm frees them.
- Grain grows only from spring to autumn. In winter the fields rest, and sown grain waits for
  spring.
- A house turns fish, meat or bread into new settlers. A different food from last time grows the
  settler 25% faster.
- Every worker in a hut eats 1 fish, meat or bread for every 60 seconds of work. Carriers bring
  each hut up to 2 food. With no food, the worker works at half speed. Fishers, hunters and
  bakers eat from what their own hut makes. Miners eat as they dig instead, and scouts, builders
  and carriers never eat. A meal of a different food from last time lasts 1.5 times as long.
- A miner digs 2 goods for each fish, meat or bread, or 3 when the food differs from last time.
- An upgrade costs 2 iron and 1 tool. An upgraded worker takes half as long over each piece of
  work, and an upgraded house adds 6 settlers instead of 4.
- A lookout tower expands your land.
- A monument does no work. Building one is your fifth goal.
- Goods are stored at the HQ, in storehouses and in harbours.
- A harbour stands on the shore, up to 4 tiles from open water. A wooden pier runs out to its dock.
  A ship sails from it to settle the second island, and later the far island. A trade ship visits it every few
  minutes.

There are no roads. A carrier takes one good from the building that has it and walks it the
quickest way across the grass, all the way to the building that needs it. Spare goods go to the
store that is nearest on foot. The tile in front of each door stays open, so nothing can be
built there, and settlers can always get in.

When at least 8 goods wait to move, pack donkeys join the carriers. A donkey carries 2 goods of
one kind at once, one in each basket. You get one donkey for every 4 buildings, counting the HQ.
Donkeys are not settlers, so they never take a worker from you. They go back to the HQ when the
work is done.

Settlers' footsteps wear the grass into dirt paths. Settlers walk up to 1.25×
faster on a well-worn path, so they keep to the same lines. A path nobody walks for a minute
fades back to grass over about 3 minutes.

Deer, hares and foxes live on the island. Each one wanders near its own spot and grazes. When a
settler comes within about 2 tiles, it runs a few steps away. Animals never block settlers and
leave no paths. The animal a hunter creeps up on stays still until it is caught. When the island
has fewer animals than it started with, a new one appears about once a minute, where a caught
animal used to live.

## Ideas

Ideas for the game, and what we build next, live in [ideas/](ideas/README.md).
