# Backlog

How to add and triage ideas: see [README.md](README.md).

## Building now

- **Second island**: the map has a nearby island across the water. *Fun 3 · Effort M · Branch: claude/build-6ab056*
- **Well and water**: a well draws water, and the bakery needs water to bake bread. *Fun 2 · Effort S · Branch: claude/build-f2bace*

## Next

At most 3 ideas, in the order we build them.

- **Music**: a calm background tune with its own volume. *Fun 2 · Effort S · Needs: Sound basics*

## Inbox

New ideas go here, not scored yet.

*Empty.*

## Later

Triaged, but not next.

- **Mountain ranges**: mountains form ridges and valleys instead of round blobs. *Fun 2 · Effort M · Needs: Mountain shape*
- **Finer mountain mesh**: mountains get more detail, so you see crags and rock faces up close. *Fun 1 · Effort M · Needs: Mountain shape*
- **Worn paths**: settlers who walk off-road wear dirt trails into the grass, and unused trails fade back. *Fun 2 · Effort S*
- **Shortcuts from footsteps**: a busy trail between two flags becomes a road, but only if it is much shorter than the current road route. *Fun 2 · Effort M · Needs: Auto road for new buildings, Worn paths*
- **Sail to settle**: a ship carries settlers and goods from the harbour to settle the other island. *Fun 3 · Effort M · Needs: Harbour, Second island*
- **Smelter**: a smelter turns iron ore and coal into iron. *Fun 2 · Effort S · Needs: Coal and iron mines*
- **Birds**: gulls circle over the shore, and small birds fly up from a tree when a woodcutter fells it. *Fun 2 · Effort S*
- **Forests spread**: grown trees slowly drop saplings next to them, so a felled forest grows back without a forester. Needs a limit, so wood doesn't become free. *Fun 2 · Effort S*
- **Clouds**: cloud shadows drift across the island. A first step toward day, night and seasons. *Fun 2 · Effort S*
- **Hungry workers**: all workers need food, not just miners. *Fun 2 · Effort M · Needs: Well and water*
- **Coal and iron mines**: mines that dig coal and iron ore out of mountains. *Fun 2 · Effort M*
- **Tools**: a toolmaker that makes the tools new workers need, so you can't grow for free. *Fun 2 · Effort M · Needs: Population, Smelter*
- **Geologist**: a settler who finds rich spots in mountains, so you place mines for a reason. *Fun 2 · Effort M · Needs: Coal and iron mines*
- **Faster roads**: busy roads get a donkey that carries two goods at once. *Fun 2 · Effort M*
- **Harbour**: a harbour building on the shore, where ships can dock. *Fun 2 · Effort M*
- **Trade ship**: a ship that visits to trade goods. *Fun 2 · Effort M · Needs: Harbour*
- **Model loader, trees and rocks**: load detailed 3D models, such as free CC0 packs from Kenney or Quaternius, starting with trees and rocks. *Fun 2 · Effort M*
- **Building models**: swap the built-in building shapes for detailed models. *Fun 2 · Effort M · Needs: Model loader, trees and rocks*
- **Settler models**: swap the built-in settler shapes for detailed, animated models. *Fun 2 · Effort M · Needs: Model loader, trees and rocks*
- **Wild animals**: deer, hares and foxes roam the meadows and step aside for settlers. They are only there to watch. *Fun 2 · Effort M*
- **Living water**: foam along the shore, fish that jump now and then, and ducks on the water. *Fun 2 · Effort M*
- **Work sounds**: chopping, sawing and hammering you hear near the camera. *Fun 2 · Effort M · Needs: Sound basics*
- **Goods chart**: a panel that shows how much of each good you have over time. *Fun 1 · Effort S*
- **Fish that run out**: shore fish thin out when a fisher overfishes, then slowly come back. *Fun 1 · Effort S*
- **Hotkeys for every building**: the last 3 buildings in the build menu get a hotkey too. Keys 1 to 9 cover only the first 9. *Fun 1 · Effort S*
- **Rates in the info panel**: a building's panel shows how fast it uses and makes goods. *Fun 1 · Effort S*
- **Survive winter goal**: a goal to get through the winter. *Fun 2 · Effort S · Needs: Goals, Seasons*
- **Gold mine**: a mine that digs gold out of mountains. Gold has no use yet. *Fun 1 · Effort S · Needs: Coal and iron mines*
- **Butterflies**: butterflies float over flower meadows. *Fun 1 · Effort S*
- **Fireflies**: fireflies glow at the forest edge after dark. *Fun 1 · Effort S · Needs: Day and night*
- **Hunter**: a hunter catches wild animals that roam the map. *Fun 1 · Effort M*
- **Move a building**: pick up a building and place it somewhere else. *Fun 1 · Effort M · Needs: Demolish a building*

## Done

Newest first, with the date it was merged.

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
