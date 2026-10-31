# Ideas and what to build next

This folder holds every idea for Hitoria and decides which ones we build next.
The list itself is in [backlog.md](backlog.md).

## Add an idea

1. Open [backlog.md](backlog.md).
2. Add one line under **Inbox**, in this form:

   ```markdown
   - **Short title**: one sentence on what the player sees or does.
   ```

3. Don't score it yet. Anyone can add ideas at any time, even half-formed ones.

## Triage the inbox

Triage when the inbox has a few new ideas, or when **Next** is empty.
To have Claude do it, run `/triage`. Claude proposes the scores and waits for you to agree.
To add ideas and triage them in one go, run `/triage` followed by the ideas.
For each idea in the inbox, follow these steps.

1. **Check it against the design pillars** in the [README](../README.md).
   If it needs enemies, raids or combat, move it to **Dropped** and say why.
2. **Score fun** from 1 to 3. How much more fun is the game to play with it?
   - 1: nice to have.
   - 2: players would notice and enjoy it.
   - 3: it changes how the game feels.
3. **Size the effort** as S, M or L.
   - S: an evening or less.
   - M: a few sessions.
   - L: needs splitting into smaller ideas before we build it.
4. **Note what it needs first**, if another idea must be built before it.
5. **Move it** to **Next** or **Later**, with the scores on the line:

   ```markdown
   - **Short title**: one sentence. *Fun 3 · Effort S · Needs: Food chain*
   ```

### Choose what goes in Next

- Keep at most 3 ideas in **Next**. Order them from first to last.
- Pick high fun and low effort first. Fun 3 with effort S always goes to the top.
- Don't put an L idea in **Next**. Split it into S or M ideas first.
- Don't put an idea in **Next** before the ideas it needs.
- Move everything else to **Later**. Nothing is lost there.

## Build an idea

To have Claude do it, run `/build`, or `/build` followed by the idea's title.

1. Move the top idea in **Next** to **Building now**.
2. Name the branch after it, for example `claude/storehouse`.
3. When it's merged, move it to **Done** with the date.
4. Refill **Next** from **Later** or the inbox.
