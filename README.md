# Hitoria

A peaceful 2.5D settlement builder for the browser, inspired by *The Settlers*.

**Play it in your browser:** https://koszcz.github.io/hitoria/

- **Changelog:** https://koszcz.github.io/hitoria/changelog.html shows what changed, with screenshots.
- **Backlog dashboard:** https://koszcz.github.io/hitoria/backlog.html shows the ideas and what is being built.

![A village around the HQ keep, beside a bay, with a rocky, sharp-peaked mountain in front of it and boulders all around. Foam runs along the beach and ducks paddle on the bay. In the village are huts, a farm with its fields of grain, a windmill, a well, two lookout towers, a hunter's lodge, a geologist's hut, a smelter and a toolmaker's workshop, with worn dirt paths between them. It is early winter, so the first snow falls and the leafy trees are bare. The current goal shows at the top left. At the top right, the clock shows winter, day 5](docs/screenshot.jpg)

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
waits for food does not count, because no one in it goes hungry. Nights do not count either,
because everyone sleeps. On another island, hunger counts only once that island has its own
finished Fisher's Hut, Hunter's Lodge or Bakery, so a new colony that starves does not spoil the
goal. If someone goes hungry, try again next winter.

Goals 7 to 10 send you to the other island, because coal and iron ore lie only in its mountains.
The settle goal is reached when your settlers' ship lands there and they build their harbour.

After the last goal, your village makes wishes, one at a time, such as "Store 40 stone". The
panel shows how close you are, and the season to meet the wish by, such as "before the first
snow". When you meet a wish, it counts as granted, and a new wish comes. If the season comes
first, the wish just passes, with no penalty, and a new one comes.

- A store wish asks for more than your stores hold when it starts: at least 40, and at least
  20 more than you have, rounded up to ten.
- Later wishes ask you to make iron, upgrade buildings, sell the trader goods it wants, and land
  on the far island.
- The village only wishes for what you can do now. For example, it asks for iron only once you
  have a smelter, and for trade only once you have a harbour.

1. **Place a woodcutter's hut.** Press `B` to open the build menu and pick the woodcutter's hut.
   Then click open grass near trees.
2. **Watch it get built.** A builder walks to the site. Carriers walk planks over from the HQ.
   Once it is built, a woodcutter moves in and starts felling trees.
3. **Watch the paths form.** You don't build roads. Settlers walk across the grass, and their
   footsteps wear it into dirt paths. Busy paths are quicker to walk, so settlers keep to them.
4. **Grow your economy.**
   - A forester (`2`) plants new trees, so the woodcutter never runs out. It does not plant on
     worn paths. A message warns you when a woodcutter with no forester nearby has 3 or fewer
     grown trees left. While you place a building, a hint says when it takes the forester's ground.
   - A quarry (`3`) next to boulders makes stone.
   - A sawmill (`4`) turns logs into planks. You need planks for every new building.
   - A lookout tower (`5`) expands your land, so you have room for more.
   - Fishers, hunters, farms, mills and bakeries make food. A bakery also needs water from a
     well. Houses turn food into new settlers.
   - Every worker in a hut eats fish, meat or bread now and then. A hungry worker works at half
     speed, and a bowl floats over their hut. A worker who rests or sleeps is not hungry.
     Carriers and builders need no food. A new island reminds you of this at the start, so build
     a Fisher's Hut early. The Fisher's Hut, Hunter's Lodge and Bakery cards list every hut whose
     worker eats that food.
   - When food is short, farms, wells and mills get it first, so the food chain keeps running.
     Houses get food last.
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
     The workshop gets the next free tool before any other hut.
     Iron comes only from the other island, so the game warns you when 8 tools are left before
     you settle it. The ship needs 6.
   - Some mountain tiles are rich spots. A mine next to a rich spot digs twice as fast. Build a
     geologist's hut near a mountain, and its geologist puts up a sign on each mountain tile
     nearby. A gold sign marks a rich spot. The lumps on a sign show what lies below: grey stone,
     or coal and iron ore. A mine's panel says when it sits next to a rich spot. A mine can
     also stand on the edge of a mountain, if there is open grass in front of its door. From
     there it reaches rich spots deeper in the mountain.
   - Across the water from the bay lies a second island, about 20 tiles across. Farther out, to one side of the bay, lies
     the far island, about 26 tiles across, the largest of the three. To settle them, build a harbour, click it and press the Sail button for the island you want. See
     "Settling the second island" below.
   - The two islands have different themes, chosen at random for each new map from three:
     - Pine highland: dense pine forest and rock cliffs on the shore that faces the open sea.
     - Wild meadow: flowers, a small grove and more deer and hares for hunters.
     - Hidden cove: a sheltered lagoon cut deep into the island from the open sea, ringed by sand
       and reeds. A fisher who fishes from its shore brings home 2 fish from each catch, and more
       ducks and jumping fish gather there.

Settlers must be able to walk from the HQ, or from a harbour they built on the second island, to
every building. If water, mountains or trees cut a
building off, no goods arrive and the builder or worker waits. A warning sign floats over it.
Click a building to see what it is doing and what it is waiting for. Its panel also lists the
goods it made and used in the last minute, so you can see how fast it works.

Days and nights pass as you play. A full day lasts 8 minutes of game time, and a new game starts
in the morning. The light turns orange at dawn and dusk, and blue at night.
From dusk to dawn, each finished building casts a soft, warm pool of light on the ground, and
its windows and doorway glow. The light also tints its walls, brightest near the ground and the
door and fading toward the roof.

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
in winter, when snow falls and covers the land and the roofs of your buildings. Grain grows only from spring to autumn. In
winter, farmers bring in ripe grain but sow nothing, so store grain and food before the snow comes.

A small clock at the top right shows where you are in the day and the year. On its dial, the sun
moves across the light half by day and the moon across the dark half by night. Next to the dial
you see the season, a bar that fills as the season goes on, and the day count.

The sea is alive too. Foam runs along the beaches, fish leap out of the water now and then, and
ducks paddle near the shore. More of both gather in the lagoon of a hidden cove. The ducks fly
south for the winter. They are only there to look at.

### Settling the second island

1. Build a harbour on the shore by the bay.
2. Gather 5 idle settlers in the HQ and 12 planks, 8 stone and 6 tools in your stores. Click the harbour to
   see what is still missing.
3. Pick an island. The panel has one button for each island nobody has settled yet: **Sail to
   the other island** and **Sail to the far island**. A ship takes the settlers and goods to the
   nearest free shore on the island you pick. Older saves, with no far island, have one **Set
   sail** button.
4. The settlers clear the trees and boulders around them, which gives them logs and stone. They
   build a harbour of their own and claim the land 6 tiles around it. The ship sails home.

The new harbour is the island's home, like the HQ. Its idle settlers wait there and go out from it
to build, work and carry goods. Buildings on the island get their goods from it and bring what
they make back to it. Settlers never cross the sea on foot.

When settlers land, a message says the colony needs food. Build a Fisher's Hut there, or let a
boat bring fish (see "Fetching goods by boat").

Each island uses only the goods in its own stores. The goods bar and the build menu show the goods
of the island the camera looks at, and name that island, such as "Second island". Pan to another
island to see its goods. Over open sea, or over an island with no store yet, they show the home
island. Goals and wishes still count the goods on every island.

Once the ship is back, you can sail a second time, to the island nobody has settled yet. It takes another 5
settlers and the same goods. The far island has a mountain ridge with coal and iron ore too, and
all of its ore is rich, so every mine there digs twice as fast. Its ridge runs across the island,
a little towards the shore where the ship lands, so your mines fit near the landing. Walk around
the ends of the ridge to reach the meadows behind it. Each island gets one crew, so you can sail
twice in all.

The second island has a mountain ridge with coal and iron ore in it. The ridge runs across the
middle of the island, with meadows on both sides. Build your coal and iron mines at its foot, and
walk around the ends of the ridge to reach the far side.

### Trading with the trade ship

Each morning, a trade ship sails in from the open sea to your first harbour on the home island.
It stays tied up at the pier until late afternoon, then sails away before sunset. The next one
comes the next morning. If your harbour is finished after midday, the first ship comes the next
morning.

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

### Building a boat

Each harbour, at home or on a colony, can build one small boat.

1. Click a finished harbour.
2. Under **Boat**, press **Build a boat**.
3. Carriers bring 6 planks from the stores on the same island. Planks already stored in the
   harbour go in first. The panel counts the planks as they come in.

Once the last plank is in, a message says the boat has tied up, and you see it at the end of the
pier.

### Fetching goods by boat

Each harbour's panel has a **Wants** list. It sets how many of each good the harbour's island
should keep.

1. Click a finished harbour.
2. Under **Wants**, press **+** next to a good. Each press adds 5, up to 50. Press **−** to lower it.
3. Build a boat at any harbour, if you have none yet.

While an island has fewer of a good than its harbour wants, a free boat sails to another island
that can spare it. Carriers there bring the goods to that island's harbour, and the boat loads up to
10 goods. It brings them to the harbour that wants them, then sails home to its own dock. Boats keep
sailing until the island has what it wants.

- An island never sends goods below what its own harbour wants.
- A boat waits at most 60 seconds for its load, then sails with what it has.
- The boat's line in the panel says where it is going and what it carries.

### Upgrading buildings

Once you make iron in a smelter, you can upgrade your huts and houses. Iron you buy from the
trader does not count until you have made some yourself.

1. Click a finished hut, mine, workshop or house.
2. Under **Upgrade**, the panel shows the cost: 2 iron and 1 tool from your stores.
3. Press **Upgrade**.

In an upgraded hut, mine or workshop, the worker takes half as long over each piece of work.
An upgraded house has room for 2 more settlers. Each building upgrades once. Until your settlers
have sailed to every island, the game keeps back the 6 tools their ship needs.

### Stopping work at a hut

When you run short of settlers, you can free a worker from a hut you don't need right now, such
as a stone mine while you have plenty of stone.

1. Click a finished hut, mine or workshop.
2. Press **Stop work**. The worker walks home and takes the next hut that needs a worker.
3. Press **Resume work** when you want the hut to work again.

Nobody is sent to a stopped hut, and carriers bring it no food. The hut keeps its tool, so the
next worker needs no new one. Your save keeps the choice.

### Feasts

A Feast Square holds two kinds of feast. A wedding feast brings 2 new settlers, with no house
needed. A religious feast blesses the village, so every worker and builder works 25% faster for
the whole next day.

1. Build a Feast Square. It is under Town in the build menu.
2. Click the finished square and press **Order a wedding feast** or **Order a religious feast**.
3. Carriers bring 10 fish, 10 bread and 10 meat to the square. It gets food after every other
   building.
4. At the next dusk, every worker and builder feasts at the square until midnight, then goes to
   bed. Carriers keep working.
5. At dawn, a wedding feast brings 2 new settlers. A religious feast blesses the village until
   midnight. Work goes 25% faster, but walking does not.

You can order one feast each season, of either kind.

### Bringing a keepsake

When you start a new island with **New** in the ☰ menu, you can bring one keepsake from the old
island. You earn each keepsake by reaching a goal:

| Keepsake | Earned by | What the new island starts with |
| --- | --- | --- |
| Builder's crate | Make 50 planks | 20 more planks and 10 more stone |
| Old friends | Grow to 30 settlers | 6 more settlers |
| Full larder | Get through a winter with no one hungry | 20 fish and 10 bread |
| Iron chest | Make 10 iron | 5 iron and 8 more tools |

Pick one in the dialog, or press **Stay on this island** to keep playing. If you have not earned
a keepsake yet, the new island starts at once.

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
| See your goods over time | `G`, or click the goods bar at the top |
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
- **New** starts a fresh island. It makes an autosave of the old island first. If you reached
  goals on the old island, you first pick one keepsake to bring along. See "Bringing a keepsake".
- Opening the page continues from your newest save.
- When you load a save, the island chronicle opens. It lists the island's milestones by day, such
  as the first birth, the first of each building, each goal, every tenth trade ship, the first
  wish granted and every fifth after it, the first upgrade, each landing on an island, each winter
  with no one hungry, reaching 50 and 100 settlers, and the keepsake the island began with.

The save keeps the map, buildings, worn paths, every good, your goals, the village wish, the chronicle and the time of day and year. It does not keep where settlers and
wild animals are. The animals start again from their home spots.
Saves from when the game still had roads load too. Their roads and flags become worn paths.
After a load, everyone starts in their home, the HQ or the harbour on the second island, and walks back to their post. Goods a settler was holding go
back to their building, so nothing is lost.

Each save records which version of the map it was made on. A save from before a map change loads
on the same land it was saved on, even though new games get the new map. On maps from before the
second island's mountain, every mountain still holds coal and iron ore. Maps from before mountain ranges
keep their round mountains. Maps from before the far island have no far island, so their settlers
sail only once. Maps from before island themes keep islands with no theme. Maps from before the hidden cove
only have the pine and meadow themes. Maps from before the
bigger map stay 64 by 64 tiles. New maps are 96 by 96, with wide open sea around the land. Maps
from before the bigger second island keep a second island about 13 tiles across. Maps from before
the bigger far island keep a far island about 13 tiles across.

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

You hear your settlers work near the mouse pointer. On a phone, or when the pointer leaves the
window, you hear from the middle of the screen. Woodcutters chop, the sawmill saws, and builders,
stonecutters and the toolmaker hammer. Nearer work is louder. Work to the right of you on the
screen plays in your right ear, and work to the left plays in your left ear. Work sounds fade as
you zoom out, and stop while the game is paused.

A calm tune plays in the background: soft bells over slow chords. The game writes the notes in
code, so there are no sound files. To change how loud the music is, click **Music** in the menu.
Each click moves it one step from Off to 100%. It starts at 50%.

To mute all sound, music and work sounds included, click **Sound** in the menu or press M. The browser remembers
both choices. Browsers block sound until you click or press a key, so the sound starts then.

## Code map

| File | What it does |
| --- | --- |
| `src/world.ts` | Seeded map generation: island, forests, boulders, mountains, the mountain and bay every start gets, the second island across the bay, the far island, and where coal and iron ore lie |
| `src/land/` | Map helpers: seeded random numbers and noise (`noise.ts`), the ridges and valleys of mountain ranges (`ranges.ts`), the pine, meadow and cove themes of the two islands (`themes.ts`), the hidden cove's lagoon (`cove.ts`), and the map's size, with the open sea around the land on new maps (`size.ts`), and the size and place of the second and far island, and where the far island sits (`isle.ts`) |
| `src/math/` | Sine, cosine and distance that give the same result on every computer, so a seed always makes the same map (`exact.ts`) |
| `src/game/` | Simulation: buildings, demolishing, worn paths, sleep at night (`sleep.ts`), walking distances, settlers, wild animals, hunting, carriers and pack donkeys (`donkeys.ts`), farm fields, food, hungry workers (`meals.ts`), who gets food first (`foodrank.ts`), harbours and their docks, harbour boats (`boats.ts`), what each harbour wants (`harbourwants.ts`) and the boat trips that fetch it (`boattrips.ts`), the trade ship and what it wants and sells (`wants.ts`), homes (the HQ and the harbours settlers build on the other islands), the voyages to settle them and the islands you can still sail to (`isles.ts`), the goods stored on each island (`islandstock.ts`), the tools new workers take, rich spots and the geologist (`geology.ts`), goals, village wishes (`wishes.ts`), building upgrades (`upgrades.ts`), stopping work at a hut (`stopwork.ts`), the goods each building made and used in the last minute (`rates.ts`), the stores every 10 seconds over the last hour, for the goods chart (`stockhistory.ts`), the Feast Square and its wedding and religious feasts (`feast.ts`), the blessing a religious feast leaves (`blessing.ts`), the island chronicle (`chronicle.ts`), keepsakes for a new island (`keepsakes.ts`), mixed food (`variety.ts`), fishing in the hidden cove (`cove.ts`), the warning before a woodcutter runs out of trees and which buildings take a forester's ground (`forestry.ts`) and saving |
| `src/path.ts` | A* pathfinding on the tile grid |
| `src/render/` | Three.js 3D renderer: terrain, the fine alpine ridges, peaks and snow on mountains (`relief.ts`), water, the foam along the shore (`foam.ts`), the fish and ducks on the sea and in the hidden cove (`waterlife.ts`), buildings, settlers, animals, pack donkeys, ships, harbour boats (`boats.ts`), the geologist's signs (`signs.ts`), overlays, the light for each time of day (`daylight.ts`), the warm glow of buildings at night (`glow.ts`) and on their walls (`walllight.ts`), and the season's colours and snow (`seasonal.ts`, `snowfall.ts`), and the snow on roofs (`rooftops.ts`). Keeps the isometric camera angle. `looks.ts` gives each building its body shape and colours |
| `src/water/` | Where the shore is, and where each fish and duck is at any moment. They are only there to look at |
| `src/seasons/` | The day and year clocks, the day count, how the island looks at each point in the year, when grain grows, the clock in the HUD (`hud.ts`), and fast nights (`fastnight.ts`) |
| `src/quality/` | The graphics setting, and Auto, which lowers it when frames are slow |
| `src/sound/` | All sound, joined up in `sounds.ts`. Work sounds (`work.ts` picks what you hear, `ear.ts` picks where you hear from and pans each sound left or right, `strikes.ts` plays it), the background tune (`tune.ts` writes the notes, `music.ts` plays them), and the mute and music volume settings |
| `src/art.ts` | The game's colours and light in one place: sky, sun, dawn, dusk and night, land, water and trees |
| `src/ui.ts` | HUD, goal panel and info panel |
| `src/sailinfo.ts` | The harbour panel's "Sail to settle" part, with a Sail button for each island nobody has settled |
| `src/tradeinfo.ts` | The harbour panel's "Trade ship" part |
| `src/boats/` | The harbour panel's "Boat" part (`panel.ts`) and its "Wants" list, with the boat's trip line (`wants.ts`) |
| `src/upgradeinfo.ts` | The "Upgrade" part of a hut's or house's panel |
| `src/stopinfo.ts` | The "Stop work" and "Resume work" button in a hut's panel |
| `src/rateinfo.ts` | The "In the last minute" part of a building's panel: goods made and used |
| `src/feastinfo.ts` | The Feast Square panel's feast part, and the blessing line in hut panels |
| `src/buildmenu/` | The build menu |
| `src/hints/` | The food hint a new island shows at the start (`food.ts`), and the placement hint for a forester's ground (`forester.ts`) |
| `src/loading/` | The loading screen that covers the page until the island is drawn |
| `src/islandview/` | Which island's goods the goods bar and build menu show, and the island's name |
| `src/saves.ts` | Save slots in the browser's local storage |
| `src/chronicle/` | The island chronicle panel and how its lines read |
| `src/goodschart/` | The goods chart panel, and where each good's line runs (`lines.ts`) |
| `src/keepsake/` | The dialog where you pick a keepsake for a new island, and how keepsakes read |
| `src/wishes/` | The goal panel once every goal is reached: the village wish, its progress and its season |
| `src/i18n.ts` | Translations. The Polish building names and village wishes are in `src/lang/` |
| `src/main.ts` | Input, camera, fixed-step game loop |
| `src/playtest/` | `window.playtest`: console commands that read the game as text and act like a player, for `/playtest` runs. Type `playtest.help()` in the console |

## Current economy

- Woodcutter → logs → Sawmill → planks. A forester replants trees.
- A quarry breaks boulders into stone. A stone mine digs stone out of a mountain, and its miner
  eats fish, meat or bread.
- A coal mine and an iron mine dig coal and iron ore out of a mountain in the same way. Only the
  mountains of the second island and the far island hold coal and iron ore.
- A mine next to a rich spot digs twice as fast. A geologist surveys the mountains up to 6 tiles
  from the Geologist's Hut and marks rich spots with gold signs. The mountain by the HQ and the
  second island's mountain always have one. All the ore on the far island is rich.
- A mine goes on grass next to a mountain, or on a mountain tile at its edge. Either way, the tile
  in front of its door must be open ground.
- Iron mine → iron ore, and coal mine → coal → Smelter → iron. The smelter needs 1 iron ore and
  1 coal for each bar of iron.
- Iron and planks → Toolmaker's Workshop → tools. The toolmaker needs 1 iron and 1 plank for
  each tool.
- When a hut gets its worker, the worker takes 1 tool from the nearest store, and the hut keeps
  it. Scouts, builders and carriers need no tool. Demolishing a hut puts its tool back in your
  stores.
- When tools are short, a finished Toolmaker's Workshop that waits for a tool gets the next free
  tool before any other hut, so the tool chain never stalls.
- Farm → grain → Mill → flour → Bakery → bread. A fisher catches fish, but only about half as
  many in winter. A fisher by a hidden cove's lagoon fishes there first and brings home 2 fish
  from each catch.
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
  bakers eat from what their own hut makes, and keep 1 of it back from carriers. Miners eat as
  they dig instead, and scouts, builders and carriers never eat. A meal of a different food from last time lasts 1.5 times as long.
- Carriers bring food to farms, wells and mills first, then to other huts and mines, then to
  houses, and to a Feast Square last. Within each group, the nearest building comes first.
- A miner digs 2 goods for each fish, meat or bread, or 3 when the food differs from last time.
- An upgrade costs 2 iron and 1 tool. An upgraded worker takes half as long over each piece of
  work, and an upgraded house adds 6 settlers instead of 4.
- A lookout tower expands your land.
- A monument does no work. Building one is your fifth goal.
- Goods are stored at the HQ, in storehouses and in harbours.
- A harbour stands on the shore, up to 4 tiles from open water. A wooden pier runs out to its dock.
  A ship sails from it to settle the second island, and later the far island. A trade ship visits it each
  morning and leaves before sunset. Each harbour can build one boat from 6 planks. Boats fetch the
  goods a harbour wants from your other islands, up to 10 a trip.

There are no roads. A carrier takes one good from the building that has it and walks it the
quickest way across the grass, all the way to the building that needs it. Spare goods go to the
store that is nearest on foot. The tile in front of each door stays open, so nothing can be
built there, and settlers can always get in.

When at least 8 goods wait to move, pack donkeys join the carriers. A donkey carries 2 goods of
one kind at once, one in each basket. You get one donkey for every 4 buildings, counting the HQ.
Donkeys are not settlers, so they never take a worker from you. They go back to the HQ when the
work is done.

Settlers' footsteps wear the grass into dirt paths. A few footsteps leave no mark. About 4
footsteps on a tile start to show, and about 15 turn it fully to dirt. Settlers walk up to 1.25×
faster on a well-worn path, so they keep to the same lines. A path nobody walks for a minute
fades back to grass over about 3 minutes. In winter, snow covers the land but not a well-worn
path, which shows as a brown track through the snow.

Deer, hares and foxes live on the island. Each one wanders near its own spot and grazes. When a
settler comes within about 2 tiles, it runs a few steps away. Animals never block settlers and
leave no paths. The animal a hunter creeps up on stays still until it is caught. When the island
has fewer animals than it started with, a new one appears about once a minute, where a caught
animal used to live.

## Ideas

Ideas for the game, and what we build next, live in [ideas/](ideas/README.md).

## Playtests

Run `/playtest` in Claude Code to have Claude play a fresh island for up to 20 minutes as one of
four tester personas. The personas are in `.claude/skills/playtest/personas.md`. Each run writes
a report to `docs/playtests/`. The report says what the tester achieved, and lists every
obstacle, error, bottleneck and surprise they met.
