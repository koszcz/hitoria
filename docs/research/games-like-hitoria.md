# Games like Hitoria

Researched on 31 October 2026. This note is for anyone who decides what Hitoria builds next.

## Main finding

Many games copy The Settlers, but none we found combines all three things Hitoria does:

- It runs in the browser with nothing to install.
- It has no combat at all.
- Goods travel flag to flag on visible carriers.

The closest match is **Settlers — A Roman Chronicle**, a three.js browser game from September 2026. It
has flags, roads and carriers, but soldiers claim land and fight. Several desktop games can be played
peacefully, but they are not in the browser. Browser remakes of the old Settlers games all include
combat. Most of them also need files from the original game.

## Terms used

- **Carrier**: a settler who stands on one road segment and moves goods from one flag to the next.
- **Territory**: the land a player owns and may build on.
- **Production chain**: a series of buildings where one building's output is the next one's input,
  such as logs to planks.
- **Original files needed**: you must own the old game and load its graphics into the remake.
- **WebAssembly (Wasm)**: a way to run compiled desktop code inside a web browser.
- **GPL, AGPL, MIT**: open-source licences. All three let you read and change the code.
- **RTS**: real-time strategy.
- **Early access**: a paid game still in development.

## Comparison table

"Not verified" means the game's own pages did not say. Prices are as shown on Steam in Polish złoty
(zł) on the research date.

| Game | Platform | Price or licence | Combat | Roads and carriers | Territory | Status |
| --- | --- | --- | --- | --- | --- | --- |
| **Hitoria** (ours) | Browser | Free | None, by design | Yes, flag to flag | Lookout towers | Active |
| Settlers — A Roman Chronicle | Browser (three.js) | Free, MIT | Yes | Yes, flag to flag | Military buildings | New, 2026 |
| OpenSettlers | Browser client, Java server | Free, GPL v3 | Yes | Yes, flag to flag | Military buildings | New, 2026 |
| webserf | Browser | Free, MIT, original files needed | Yes | Yes | Military | New, 2026 |
| Freeserf (Wasm edition) | Browser | Free, GPL v3, original files needed | Yes | Yes | Military | New, 2026 |
| yasc | Browser | Free, no licence stated | Not verified | Not verified | Not verified | Unfinished, last change 2020 |
| Settlers.ts | Browser | Free, MIT, original files needed | Not verified | Not verified | Not verified | Map viewer only, last change 2025 |
| Open Northland | Browser | Free, AGPL v3, original files needed | Yes | Not verified | Not verified | Alpha, active |
| The Settlers Online | Browser | Free with paid extras | Yes | Not verified | Not verified | Active since 2011 |
| Castle: Build & Defend | Browser | Free | Yes, raider waves | Roads, workers carry supplies | Not verified | New, 2026 |
| Lost Settlers | Browser | Free | None now | No | Expanding from a start point | In development |
| Widelands | Desktop | Free, GPL v2 | Yes, with a peaceful mode | Yes, flag to flag | Military buildings | Active, v1.3.1 in 2026 |
| Return to the Roots | Desktop | Free, GPL v2, original files needed | Yes | Yes, flag to flag | Military buildings | Active, v0.9.5 in 2022 |
| Freeserf | Desktop | Free, GPL v3, original files needed | Yes | Yes | Military | Active |
| Freeserf.net | Desktop, Android | Free, GPL v3, original files needed | Yes | Yes | Military | Active, v2.2.11 in 2026 |
| JSettlers (settlers-remake) | Desktop, Android | Free, MIT | Not verified | Not verified | Not verified | Archived 2022 |
| Pioneers of Pagonia | Windows | 149.99 zł | Yes, enemies set per map | Roads and transport | Own territory | Released 2025 |
| The Wuslers | PC, Android tablet | Not stated | Soldiers expand land, battles not described | Yes, one carrier per segment | Military buildings | Planned for 2027 |
| The Colonists | Windows, macOS, Linux, consoles | 89.99 zł | Separate peaceful and military missions | Roads, boats, trains | Expeditions | Released 2018 |
| The Settlers: New Allies | PC, consoles | 159.90 zł (Ubisoft) | Yes | Not verified | Not verified | Released 2023 |
| Farthest Frontier | Windows | 161.99 zł | Raiders, with a pacifist mode | Roads, wagons, villagers carry goods | Not described | Released 2025 |
| Colonize | Windows | 59.49 zł | None | Not described | Fixed maps | Released 2026 |
| Mini Settlers | Windows | 24.49 zł | Not described | Roads, trains, ports | Islands and regions | Released 2025 |
| Foundation | Windows | 139.99 zł | Optional ("fight for the King") | Free-form roads you paint | Zones you paint | Released 2025 |
| Banished | Windows | 71.99 zł | Not mentioned | Not described | Not described | Released 2014 |
| Cultures – 8th Wonder of the World | Windows | 22.99 zł | Yes | Not described | Not described | Re-released 2015 |
| Knights and Merchants | Windows, macOS, Linux | 45.99 zł | Yes, real-time battles | Not described | Provinces | Re-released 2013 |
| Anno 117: Pax Romana | Windows | 249.90 zł | Yes, land and sea | Not described | Not described | Released 2025 |

## Browser games and remakes

These are the most direct comparison, because Hitoria also runs in the browser.

### Settlers — A Roman Chronicle

- **Link**: https://github.com/markldn/settlers-roman-chronicle
- **What it is**: a browser strategy game "in the spirit of The Settlers II Gold", built with three.js.
  It creates every graphic and sound in the browser at startup. It has an 8-chapter campaign and free
  play with up to 5 computer opponents.
- **Like Hitoria**: flags, roads, one carrier per road segment, and HQ. Busy roads turn to cobblestone
  and get a donkey. It has 31 buildings, geologists, and mines that run out.
- **Unlike Hitoria**: military buildings claim land. Soldiers attack enemy buildings and fight at flags.
  You must run a local web server; we found no hosted copy to play.
- **Licence and status**: MIT. The repository was created on 23 September 2026 and last changed on
  1 October 2026 (GitHub API).
- **Not verified**: whether you can start a game with no opponents.

### OpenSettlers

- **Link**: https://github.com/OpenConquest/OpenSettlers
- **What it is**: a fan-made web copy of The Settlers II: 10th Anniversary Edition. The browser client
  uses Vue and WebGL. The game runs on a Java server.
- **Like Hitoria**: flags, roads with route finding, carriers, donkeys on busy roads, and 32 building
  types.
- **Unlike Hitoria**: territory comes from military buildings. It has garrisons, duels, sieges and
  computer opponents. It needs its server running to play.
- **Licence and status**: GPL v3. Created 1 June 2026, last pushed 10 July 2026 (GitHub API).

### webserf

- **Link**: https://github.com/chaosben/webserf (play at https://www.webserf.org)
- **What it is**: a browser port of The Settlers (1993). Its rules come from the original DOS program.
- **Like Hitoria**: you place buildings and connect them with roads. Serfs carry, build and work on
  their own. Saves stay in the browser.
- **Unlike Hitoria**: you must drop in the graphics file from your own copy of the 1993 game. You win
  by holding three quarters of the land and the military strength.
- **Licence and status**: MIT. Created August 2026, last pushed 18 October 2026 (GitHub API).

### Freeserf (Wasm edition)

- **Link**: https://github.com/dos-ise/freeserf-tizen
- **What it is**: a WebAssembly build of Freeserf, so the Settlers 1 remake runs in the browser.
- **Unlike Hitoria**: it needs the original Settlers 1 data files. It has the original's military.
- **Licence and status**: GPL v3. Created and last pushed 18 October 2026 (GitHub API).

### Other browser remakes

- **yasc**: a Settlers 3 and 4 copy in JavaScript, with a demo at guckstift.github.io/yasc. Its README
  says it is "heavily under development". It was last pushed in August 2020 and has no licence on
  GitHub. https://github.com/guckstift/yasc
- **Settlers.ts**: a Settlers 4 remake in TypeScript, hosted at https://settlers.hmilch.net/. It
  needs the original Settlers 4 files. Its README says it only draws the map so far. MIT licence, last
  pushed September 2025. https://github.com/tomsoftware/Settlers.ts
- **Open Northland**: a browser engine for the Cultures games, written in TypeScript with PixiJS. It is
  in alpha, has combat, and needs an installed copy of Cultures. AGPL v3. Play test at
  https://game.opennorthland.org. https://github.com/s-nems/open-northland

### The Settlers Online

- **Link**: https://www.thesettlersonline.com/en/homepage
- **What it is**: a free browser strategy game with a gem shop. Blue Byte made it. CipSoft has run it
  since 2025 (https://www.cipsoft.com/en/games/the-settlers-online). It launched in 2011.
- **Like Hitoria**: production chains in the browser.
- **Unlike Hitoria**: it has soldiers, generals and adventures. Its pages do not mention roads or
  carriers.
- **Status**: active. The homepage had a news post dated 29 October 2026.

### Browser builders that are not Settlers-likes

- **Castle: Build & Defend**: free, in the browser. You connect a village with roads, and workers
  carry supplies. Decorations attract settlers. Waves of raiders attack at night. Released in October
  2026, in development. https://cineeeekk.itch.io/castle-builddefend
- **Lost Settlers**: a free, peaceful, minimal strategy game made in Unity. It has no combat now. It
  has no roads or carriers. Buildings produce more when placed near the right tiles. The developer
  plans to add creatures. https://poppants.itch.io/lost-settlers
- **Erfgooiers**: a free browser game in early access. Workers carry every good through production
  chains. It has raids and an army, so it is not peaceful. https://elgeffe.itch.io/erfgooiers

## Open-source remakes on the desktop

### Widelands

- **Link**: https://github.com/widelands/widelands (site: https://www.widelands.org/)
- **What it is**: a free strategy game inspired by Settlers II, with campaigns and multiplayer. It
  runs on Linux, Windows and macOS. It has 3,100 stars on GitHub.
- **Like Hitoria**: roads, flags and carriers move every good. It has long production chains.
- **Peaceful play**: the game setup screen has a "Peaceful mode" option
  (https://github.com/widelands/widelands/blob/master/src/ui/fsmenu/launch_game.cc). Some win
  conditions turn it off. For example, "defeat all" sets `peaceful_mode_allowed = false`
  (https://github.com/widelands/widelands/blob/master/data/scripting/win_conditions/defeat_all.lua).
  Territory still comes from military buildings.
- **Licence and status**: GPL v2 or later. Latest release v1.3.1 on 22 February 2026
  (https://github.com/widelands/widelands/releases). Last pushed 29 October 2026.
- **Not verified**: we could not read widelands.org, because its bot protection blocked us.

### Return to the Roots (RttR)

- **Link**: https://www.siedler25.org/ and https://github.com/Return-To-The-Roots/s25client
- **What it is**: a new engine for The Settlers II. It adds online multiplayer, higher screen sizes
  and support for current systems.
- **Unlike Hitoria**: you need The Settlers II Gold Edition files to play. It keeps the original's
  military.
- **Licence and status**: GPL v2. Latest release v0.9.5 on 28 February 2022. The code was pushed on
  30 October 2026, and the site posted news on 22 October 2026.
- **Not verified**: whether it has a peaceful option.

### Freeserf and Freeserf.net

- **Freeserf**: a copy of Settlers 1 (Serf City) in C++. It needs the original data files. GPL v3,
  last pushed 23 October 2026. https://github.com/freeserf/freeserf
- **Freeserf.net**: a C# port of Freeserf for Windows, Linux, macOS and Android. Version 2.2.11 came
  out on 20 October 2026. It needs the original data files. GPL v3.
  https://github.com/Pyrdacor/freeserf.net

### JSettlers (settlers-remake)

- A remake of The Settlers III for Windows, Linux, Mac and Android. MIT licence. The repository was
  archived in 2022, so work has stopped. https://github.com/jsettlers/settlers-remake

### Knights and Merchants remakes

- KaM Remake and its fork OpenKaM exist. Both need the original game. We did not verify their pages,
  so they are left out of the table. Leads: https://github.com/reyandme/kam_remake and
  https://phix.itch.io/openkam

## Commercial Settlers-likes

### Pioneers of Pagonia

- **Link**: https://store.steampowered.com/app/2155180/Pioneers_of_Pagonia/
- **What it is**: a build-up game from Envision Entertainment, the studio of Settlers creator Volker
  Wertich. Early access began 13 December 2023. Version 1.0 came out 11 December 2025. Windows only
  (https://www.pioneersofpagonia.com/).
- **Like Hitoria**: "Dynamic logistics with roads, transport routes and bottlenecks". "Every
  production step is visible—from Forester to Weaponsmith." Civilians stay inside your own territory
  (https://forum.envision-entertainment.de/t/faq-for-the-game/33).
- **Combat**: troops fight bandits and monsters. The number of enemies is a map setting.
- **Not verified**: whether you can set enemies to zero. Reviews say you can, but the official pages
  we read do not say so.

### The Wuslers

- **Link**: https://store.steampowered.com/app/5233290/The_Wuslers/
- **What it is**: a relaxed builder from Quolz-Systems for PC and Android tablet, planned for March 2027.
- **Like Hitoria**: it is the closest commercial match. Wuslers carry every good on foot along roads.
  Exactly one carrier walks between two flags, so long roads become bottlenecks. Foresters and
  woodcutters supply a sawmill.
- **Unlike Hitoria**: soldiers in barracks and towers push the border out. In co-op, players cannot
  attack each other. The page does not describe battles.

### The Colonists

- **Link**: https://store.steampowered.com/app/677340/The_Colonists/
- **What it is**: a settlement game from Codebyfire, "inspired by classic titles such as The Settlers
  and Anno" (https://www.codebyfire.com/). Released 24 October 2018. Also on consoles.
- **Like Hitoria**: its campaign has "14 missions split into separate peaceful and military tracks".
  It has road, boat and train transport.
- **Not verified**: whether goods move flag to flag like in Settlers.

### The Settlers: New Allies

- **Link**: https://www.ubisoft.com/pl-PL/games/27994413-32f3-4cfb-bcc4-024e4aca7493
- **What it is**: Ubisoft's 2023 reboot of the series. Released on PC on 17 February 2023
  (https://news.ubisoft.com/en-us/article/suR56dFE4pagtFRz5zIWL/the-settlers-new-allies-coming-to-pc-on-february-17),
  then on PlayStation, Xbox and Switch.
- **Combat**: "strategic real-time battles". It has skirmish against AI and other players.
- **Not verified**: roads, carriers and territory. Ubisoft's pages do not describe them.

### Cultures and Knights and Merchants

- **Cultures – 8th Wonder of the World**: Windows, re-released on Steam in 2015. An RTS where fighters
  grow into heroes. https://store.steampowered.com/app/351870/
- **Knights and Merchants**: Windows, macOS and Linux, on Steam since 2013. It mixes a medieval economy
  with real-time battles and over 10 troop types. https://store.steampowered.com/app/253900/Knights_and_Merchants/

## Peaceful settlement builders

These games can be played with no fighting. None of them runs in the browser.

| Game | How it stays peaceful | Source |
| --- | --- | --- |
| Colonize | "There are no armies, no enemies, and no warfare." Reviews are mixed (40% positive). | https://store.steampowered.com/app/1573590/Colonize/ |
| Farthest Frontier | "pacifist mode available for players who do not want to engage in combat" | https://store.steampowered.com/app/1044720/Farthest_Frontier/ |
| The Colonists | A separate peaceful mission track and a sandbox mode | https://store.steampowered.com/app/677340/The_Colonists/ |
| Widelands | A "Peaceful mode" option at game setup | https://github.com/widelands/widelands/blob/master/src/ui/fsmenu/launch_game.cc |
| Foundation | Combat is optional. Its page mentions "fight for the King" as one choice. | https://store.steampowered.com/app/690830/Foundation/ |
| Banished | Its store page does not mention combat at all | https://store.steampowered.com/app/242920/Banished/ |
| Mini Settlers | Its store page does not mention combat. Tagged "Relaxing". | https://store.steampowered.com/app/2521630/Mini_Settlers/ |

Anno 117 (https://store.steampowered.com/app/3274580/Anno_117_Pax_Romana/) has land and sea battles.
Its page says "the cost of peace is yours to decide", but it does not say you can turn combat off.

## What we could not verify

- Whether Pioneers of Pagonia lets you set enemies to zero. Only reviews say so.
- Whether Settlers — A Roman Chronicle and Return to the Roots allow a game with no opponents.
- How goods move in The Colonists and The Settlers: New Allies.
- Anything on widelands.org, because its bot protection blocked our reader.
- Combat and features of yasc and JSettlers.
- itch.io search pages returned little or blocked us. Small browser games there may be missing.
- We did not check mobile-only games, such as Townsmen.

## What this means for Hitoria

### The crowded part

- **Settlers II remakes.** Widelands, Return to the Roots, OpenSettlers and Settlers — A Roman
  Chronicle all copy the Settlers II road system. Two of them appeared in 2026 and run in the browser.
  Flags, roads and carriers alone no longer make Hitoria stand out.
- **Peaceful desktop builders.** Colonize, Farthest Frontier, Foundation and Banished already serve
  players who want no combat. They do not use flag-to-flag carriers.

### The open part

- We found **no** browser game that has Settlers-style carriers **and** no combat. Every browser remake
  includes soldiers.
- Four of the browser remakes need files from the original game. Hitoria needs nothing, so anyone can
  open the link and play.
- Lookout towers that grow land without soldiers appear to be Hitoria's own idea. Every other
  Settlers-like we checked grows land with military buildings.

### Ideas worth borrowing

Each idea fits the "no raids, ever" pillar.

1. **One carrier per segment, more flags for more carriers.** The Wuslers and A Roman Chronicle make
   long roads slow on purpose. Players then add flags to speed them up. This turns road layout into the
   main puzzle.
2. **Paved roads that show traffic.** A Roman Chronicle turns busy roads to cobblestone before it adds
   a donkey. This could join the "Faster roads" idea in the backlog, so players see which roads are busy.
3. **Peaceful goals.** The Colonists has a whole peaceful mission track. It supports the "Goals" idea
   in the backlog.
4. **Beauty that attracts settlers.** Castle: Build & Defend uses flowers and lanterns to draw new
   settlers. It gives a peaceful reason to grow population.
5. **Storage and spoilage.** Farthest Frontier makes how you store food matter. It adds a logistics
   challenge without enemies.
6. **Visible production chains.** Pioneers of Pagonia shows each step from forester to final good. This
   matches the "Watch it live" pillar.
7. **Sound made in the browser.** A Roman Chronicle creates all its sound with the Web Audio API, so it
   ships no audio files. This could suit the "Sound basics" and "Work sounds" ideas in the backlog.
