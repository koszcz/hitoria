# Backlog

How to add and triage ideas: see [README.md](README.md).

## Building now

Nothing right now.

## Next

At most 3 ideas, in the order we build them.

- **Design review round 2 fixes**: seven small fixes from the second gameplay review, built together. (1) A worker who rests or sleeps is no longer marked hungry, and the winter goal does not check for hunger at night. (2) Every wish can be granted, and none is granted for free: "Welcome 2 trade ships" asks for 1 ship, and the two "Store 40" wishes ask you to store more than you have when the wish starts. (3) New wishes point you at the late-game systems: upgrade 2 buildings, make 10 iron, sell the trader 8 of the goods it wants, and land on the far island. (4) The chronicle records more milestones: the first wish granted and every 5th after it, the first upgrade, each landing on an island, each winter with no one hungry, and 50 and 100 settlers. (5) You can upgrade a building only after you have made iron yourself, as the README says. (6) Foresters do not plant on worn paths. (7) The HQ keeps 6 tools back until every voyage on the map has sailed, not only the first. *Fun 2 · Effort M*
- **Feast Square and wedding feast**: you build a Feast Square and order a wedding feast there. Carriers bring 10 fish, 10 bread and 10 meat. At the next dusk every worker gathers at the square to feast until midnight, then goes to sleep, and 2 new settlers arrive at dawn. You can hold one feast each season. *Fun 3 · Effort M*
- **Fresh island with a keepsake**: you start a new map that keeps one reward from the last one. *Fun 2 · Effort M*

## Inbox

New ideas go here, not scored yet.

- **A keepsake for each wish**: each granted wish unlocks a decoration you can place, such as a flower bed, a lantern, a bench or a statue. Decorations do nothing, and you keep them.
- **Choose where the ship sails**: when you send a ship to settle, you pick which island it sails to, instead of the ship always landing on the nearest shore.

## Needs thought

Triaged, but with open questions. Run `/refine` on one to settle them.

Empty.

## Later

Triaged and ready to build, but not next.

- **Religious feast**: the Feast Square can also hold a religious feast, for the same food and on the same night schedule. It blesses the village, so every worker works 25% faster for the whole next day. *Fun 2 · Effort S · Needs: Feast Square and wedding feast*
- **Bigger map**: new maps are 96 by 96 tiles, with more open sea around the home island. The home island and the two islands keep today's size. Old saves stay 64 by 64. *Fun 1 · Effort M*
- **Bigger second island**: the second island is about 20 tiles across, with wider meadows, more forest and a longer mountain ridge with more ore. New maps only. *Fun 2 · Effort S · Needs: Bigger map*
- **Bigger far island**: the far island is about 26 tiles across, the largest of the three, with wider meadows, more forest and a longer mountain ridge with more ore. New maps only. *Fun 2 · Effort S · Needs: Bigger map*
- **Island themes**: each new map gives the second and far island two different themes, drawn at random, so they look and play differently. Pine highlands: dense dark pines, sea cliffs on the far shore, and about twice the forest. Wild meadows: wide flower meadows, few trees, and more deer and hares for hunters. Each island keeps its ore ridge and grove, has no name label, and only new maps get themes. *Fun 2 · Effort M*
- **Hidden cove theme**: a third island theme, a sheltered lagoon cut deep into the island and ringed by sand and reeds. Fishers by the cove catch more, and ducks and jumping fish gather there. *Fun 2 · Effort S · Needs: Island themes*
- **Rates in the info panel**: a building's panel shows how fast it uses and makes goods. *Fun 1 · Effort S*
- **Fish that run out**: shore fish thin out when a fisher overfishes, then slowly come back. *Fun 1 · Effort S*
- **Goods chart**: a panel that shows how much of each good you have over time. *Fun 1 · Effort S*
- **Gold mine**: a mine that digs gold out of mountains. Gold has no use yet. *Fun 1 · Effort S · Needs: Coal and iron mines*
- **Move a building**: pick up a building and place it somewhere else. *Fun 1 · Effort M · Needs: Demolish a building*

## Done

Newest first, with the date it was merged.

- **Food makers eat first**: when food is short, carriers bring it to farms, wells and mills first, then to other huts and mines, and to houses last, so the food chain keeps running. *2026-11-01*
- **Far island**: a third island with its own riches lies farther out, and you sail to settle it. New maps only. Old saves keep their land. *2026-11-01*
- **Trader wants**: each trade ship brings a short list of goods it wants at a better rate, a few rare goods to buy, and a limit on how many tools and iron it sells. *2026-11-01*
- **Building upgrades**: you spend iron and tools to make a hut work faster or a house hold more settlers, so iron has a use after the last goal. *2026-11-01*
- **Village wishes**: after the last goal, the village asks for one gentle wish at a time, such as "store 40 food before the first snow", and a missed wish just moves on. *2026-11-01*
- **Finer mountain mesh**: mountains look like the Alps, with sharp ridges, tall peaks, snowy tops and dark rock faces. Mountains near the HQ stay lower, so they never hide it. The ground has 4 points along each tile side, and flat land looks the same as before. *2026-11-01*
- **Gameplay review quick fixes**: four small fixes from the gameplay review, built together. (1) The winter goal counts only workers and mines that are really hungry, not houses waiting to grow, and fishers catch less in winter so stored food matters. (2) A house or worker that gets more than one kind of food grows settlers faster or eats less often, so the bread chain and hunting stay useful. (3) A saved, dated chronicle of milestones, such as the first birth or the tenth trade ship, shows when you load your island. (4) "Build 3 houses" is replaced with a goal that teaches something new, and the game warns you before you use up the tools the ship needs. *2026-11-01*
- **Fast nights**: the clock runs fast once every worker is in bed, and drops back to normal speed at dawn. It is on by default, and you can turn it off. *2026-11-01*
- **Workers sleep at night**: after dusk, workers walk home and sleep in houses or the HQ, and work stops until dawn. Carriers and donkeys keep working. *2026-11-01*
- **Day and season clock**: a small dial in the HUD shows the time of day, the season and the day count. *2026-11-01*
- **Living water**: foam along the shore, fish that jump now and then, and ducks on the water. *2026-11-01*
- **Mountain ranges**: mountains form ridges and valleys instead of round blobs. New maps only. Old saves keep their land. *2026-11-01*
- **Work sounds**: chopping, sawing and hammering you hear near the camera. The game makes the sounds in code, like the wind and waves. *2026-11-01*
- **Hungry workers**: all workers in buildings need food, not just miners. Carriers do not. A worker with no food works at half speed. *2026-11-01*
- **Pack donkeys**: when many goods wait to move, a donkey joins the carriers and carries two goods at once along the worn paths. *2026-11-01*
- **No player roads**: the road tool, flags, auto-road and the road warning sign go away, because paths form by themselves. Old saves still load. *2026-11-01*
- **Geologist**: a settler who finds rich spots in mountains, so you place mines for a reason. A mine on a rich spot works twice as fast. The geologist puts up small signs that show what lies below. *2026-11-01*
- **Trade ship**: a trade ship visits your harbour every few minutes. While it is tied up, you swap spare goods for goods you lack, at fixed rates. *2026-11-01*
- **Tools**: a toolmaker makes the tools that new workers need, from 1 iron and 1 plank each. The HQ starts with 20 tools, and the ship takes 6 to the other island. *2026-11-01*
- **More goals**: after the monument, a second set of goals asks you to mine coal and iron, make iron and settle the second island. *2026-11-01*
- **Island riches**: the second island gets mountains, and coal and iron ore lie only in them. The home island has stone only. Old saves keep the ore they have. *2026-11-01*
- **Sail to settle**: a ship carries settlers and goods from the harbour to settle the other island. It lands, builds a small harbour store there, and claims land around it. *2026-11-01*
- **Harbour**: a harbour building on the shore, where ships can dock. *2026-11-01*
- **Survive winter goal**: a last goal asks you to get through a whole winter with no house or mine waiting for food. *2026-11-01*
- **Winter fields**: grain grows only in the warm months, so you store food for winter. In winter, farmers bring in ripe grain but sow nothing, and sown grain waits for spring. *2026-11-01*
- **Seasons look**: the island moves through spring, summer, autumn and winter. Trees change colour, and snow falls in winter. A full year takes about 20 minutes of play. *2026-10-31*
- **Music**: a calm background tune with its own volume. The game makes the tune in code, so it needs no sound files. *2026-10-31*
- **Smelter**: a smelter melts 1 iron ore and 1 coal into 1 iron. Nothing uses iron yet. *2026-10-31*
- **Hunter**: a hunter catches wild animals that roam the map and brings back meat as food. Animals slowly come back, so the meadows never empty. *2026-10-31*
- **Day and night light**: the light slowly turns from morning to evening to night and back. *2026-10-31*
- **Carriers walk free**: carriers walk across the grass straight to buildings, and goods go to the nearest store by walking distance instead of road distance. *2026-10-31*
- **Wild animals**: deer, hares and foxes roam the meadows and step aside for settlers. *2026-10-31*
- **Coal and iron mines**: mines that dig coal and iron ore out of mountains. *2026-10-31*
- **Worn paths**: settlers' footsteps wear the grass into dirt paths. Worn tiles are faster to walk on, so settlers keep to the same lines. Unused paths slowly fade back to grass over several minutes, and busy paths never fade. *2026-10-31*
- **Well and water**: a well draws water on any flat grass, and the bakery needs 1 flour and 1 water for each loaf. *2026-10-31*
- **Second island**: a wooded island with a sandy beach sits across the water from the mouth of the bay. Water at least 3 tiles wide cuts it off from the home island. *2026-10-31*
- **Goals**: five peaceful goals in order, from "make 50 planks" to "build a monument", with a panel that shows your progress. *2026-10-31*
- **Mountain shape**: hills rise smoothly into peaks, with no cliff wall at the mountain's edge and no random spikes. *2026-10-31*
- **Sound basics**: soft wind and waves that follow the camera, with a mute button and the M key. The game remembers the choice. *2026-10-31*
- **Farms keep their fields**: you can place a farm only where it has room for 6 fields. The farm marks them as tilled soil when placed, and no buildings, flags, roads or trees can go on them. *2026-10-31*
- **Demolish a building**: remove a building you placed in the wrong spot. Its goods go back to the HQ. *2026-10-31*
- **Start near a mountain and shore**: every map puts a mountain and a bay to the open sea in the HQ's land, with room for a stone mine and a fisher. *2026-10-31*
- **Buildings that look different**: each building has its own shape and colours, so you can tell them apart at a glance. *2026-10-31*
- **Auto road for new buildings**: a new building gets the shortest road to the nearest joined flag or road. *2026-10-31*
- **Population**: houses turn fish or bread into new settlers, up to 4 per house. *2026-10-31*
- **Plants and wind**: grass, flowers, bushes, ferns, mushrooms, fallen logs, reeds and pebbles; birches and trees in blossom; wind gusts that bend them. *2026-10-31*
- **Stone mine and food chain**: fishers, farms, a mill and a bakery feed a stone mine that never runs dry. *2026-10-30*
- **Storehouse**: a building that stores goods near where they're made, so carriers walk less. *2026-10-30*
- **Road warning sign**: a sign over buildings with no road to the HQ. *2026-10-30*
- **Problem reports**: live diagnostics and a clearer road hint. *2026-10-30*
- **Save and load**: one save slot in the browser. *2026-10-30*
- **Roads and carriers**: roads, flags and carriers that move goods. *2026-10-30*
- **First playable**: an island, five buildings, settlers and carriers. *2026-10-30*

## Dropped

Ideas we decided not to build, and why.

- **Fix type errors**: already fixed. The type check passes with no errors.
- **Shortcuts from footsteps**: Worn paths and Carriers walk free now cover it. Paths form wherever settlers walk, so there is no road route to shortcut.
- **Birds**: it adds atmosphere only and changes no choices. Wild animals and Hunter add more to play.
- **Clouds**: you decided not to build it.
- **Forests spread**: dropped after a first build. Trees regrew in other forests' gaps instead of the felled patch, and we decided not to pursue it.
- **Model loader, trees and rocks**: load detailed 3D models from free CC0 packs, starting with trees and rocks. We prefer the game's own code-built look to the Kenney and Quaternius packs.
- **Building models**: swap the built-in building shapes for detailed models. We prefer the code-built look, and each building already has its own details.
- **Settler models**: swap the built-in settler shapes for detailed, animated models. We prefer the code-built look.
- **Hotkeys for every building**: the last 3 buildings in the build menu get a hotkey too. You decided not to build it.
- **Butterflies**: butterflies float over flower meadows. You decided not to build it.
- **Fireflies**: fireflies glow at the forest edge after dark. You decided not to build it.
