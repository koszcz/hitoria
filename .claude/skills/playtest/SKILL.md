---
name: playtest
description: Play Hitoria for up to 20 minutes as one tester persona, then write a report of what the tester achieved and every obstacle, error, bottleneck and surprise they met. Use when the user says playtest, or asks for a human-like test of the game.
---

# Playtest Hitoria as a persona

You play the game as one **playtester**: a person with a name, a play style and no knowledge of
the code. You hunt for **friction**: anything that stops, slows, confuses or surprises a player.
The run ends in a report in `docs/playtests/`.

## Rules for the whole run

- **Wall time is 20 minutes at most.** Run `date +%s` at the start and write the number down.
  Check the time again after every few moves. At 17 minutes, stop playing and write the report.
- **Ask the user when you find a major problem.** A major problem is a crash, an error in the
  console, a broken save, or a point where the village cannot go on, such as everyone stuck or
  starving with no way out. Write it in the report first. Then stop playing and ask the user,
  with `AskUserQuestion`, whether to stop and write the report now or play on. The time you
  wait for the answer does not count toward the 20 minutes. Do what the user answers.
- **Play with a player's knowledge only.** Learn the game from what it shows you: the goal panel,
  building cards, building panels and messages. Leave `src/` and the README unread until the
  report step. When you are stuck, stay stuck for a while and try what a player would try. How
  long you stayed stuck is a finding.
- **Read and act through `window.playtest`.** Call it with `javascript_tool`. Start with
  `playtest.help()`, which lists every command. Read the page as text with `get_page_text` or
  `read_page` when you need something the commands do not cover. Take no screenshots.
- **Choose places the way a player looks at the map.** Ask `playtest.spots(type, 15)` for many
  places, then pick one by what lies around it, or read `playtest.map()` first.
- **Move time with `playtest.advance(seconds)`.** It works even while the browser pane is hidden.
  Pause the game first with `playtest.speed('pause')`, so time moves only when you advance it.
  Advance in steps of 300 game seconds or fewer, and read the state after each one, the way a
  player glances at the village. One game day is 480 seconds.
- **Native dialogs freeze the page.** Before you press New, Report, or overwrite or delete a
  save, run `window.confirm = () => true; window.prompt = () => 'playtest'`.
- **Write each finding down as soon as you meet it**, in the report file. Nothing is lost if the
  run ends early.

## Steps

1. **Pick the persona.** Use the one the user named. Otherwise list `docs/playtests/` and pick the
   persona from [personas.md](personas.md) whose last report is oldest, or who has none.
   Read that persona's entry. You play their way for the whole run.
2. **Start a fresh island.** Start the server as `CLAUDE.md` describes. Pick a seed with
   `echo $RANDOM$RANDOM`, unless the persona or the user gives one. Open
   `<address>/?seed=<seed>`. The page needs a second or two to load. The step is done when
   `playtest.state()` shows game time 0.
3. **Create the report file** `docs/playtests/<date>-<persona>.md` from the template below, with
   the seed, the commit (`git log -1 --format='%h %s'`) and the start time filled in.
4. **Play.** Repeat this loop until the persona's goal is met, 17 minutes have passed, or the
   user tells you to stop:
   1. Read `playtest.state()`. Decide what the persona does next, and why.
   2. Act: `build`, `remove`, `open`, `press`, or the page's own buttons.
   3. Advance time, then read what changed.
   4. Every 5 loops, run `read_console_messages` with `onlyErrors: true`.
   5. Log each piece of friction in the report: what you did, what you expected and what
      happened, with the game time.
5. **Collect the evidence.** Run `playtest.snapshot()` and `read_console_messages` once more.
   Add every stuck item, error and warning that the report does not hold yet.
6. **Check your findings.** Now you may read `src/`. For each finding, decide whether it is a
   bug, a design choice the game fails to explain, or your own mistake as a player. Say which
   in the report. A player's mistake that the game let happen without a hint still counts as
   friction.
7. **Finish the report** and tell the user the top three findings, with a link to the file.
   Ask whether to add any of them to the Inbox in `ideas/backlog.md`.

The step is done when every section of the report is filled in, or says "None found".

## Report template

Write the report for the developer who will fix things. Use plain words.

```markdown
# Playtest: <persona> on island <seed>

- Commit: <hash and subject>
- Played: <wall minutes> minutes, to game time <seconds> s (day <n>)
- Goal for this run: <the persona's goal>

## What the tester achieved

<Goals completed, in order, with the game time of each. Then the state of the village at the end:
population, buildings, goods.>

## Findings

| # | Kind | Game time | What happened | What the tester expected | Bug, unclear design or player mistake |
| --- | --- | --- | --- | --- | --- |

Kinds: obstacle (the tester got stuck), error (console error or crash), bottleneck (a good, a
worker or a building held everything up), surprise (the game did something unexpected).

## How to see each finding again

<For each finding: the seed, then the commands or clicks, in order, that lead to it.>

## Errors in the console

<Each error or warning, with how often it appeared. Or "None found".>
```
