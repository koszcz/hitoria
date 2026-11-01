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
Triage the latest backlog from `main`: run `git fetch origin`, then `git merge origin/main`.
Never put an idea in **Next** that is already in **Building now**.
To have Claude do it, run `/triage`. Claude scores and sorts the ideas itself. Then it asks you
about one idea at a time: build it, refine it or drop it.
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
5. **Check that it is ready to build.** A builder working alone must be able to build it without
   a guess that, if wrong, means building it again. If it is not ready, move it to
   **Needs thought**, with the open questions after its scores:

   ```markdown
   - **Short title**: one sentence. *Fun 2 · Effort M · Open: does a wish fail, or just move on?*
   ```

6. **Move a ready idea** to **Next** or **Later**, with the scores on the line:

   ```markdown
   - **Short title**: one sentence. *Fun 3 · Effort S · Needs: Food chain*
   ```

Every idea in **Next** and **Later** is ready, and the factory may build it. So an idea goes
there only when you want it built.

### Choose what goes in Next

- Keep at most 3 ideas in **Next**. Order them from first to last.
- Pick high fun and low effort first. Fun 3 with effort S always goes to the top.
- Don't put an L idea in **Next**. Split it into S or M ideas first.
- Don't put an idea in **Next** before the ideas it needs.
- Move everything else to **Later**. Nothing is lost there.

## Refine an idea

An idea in **Needs thought** has open questions. To settle them, start a new session and run
`/refine`, or `/refine` followed by the idea's title. Claude reads the code the idea touches.
Then it asks you one question at a time, with options. It rewrites the idea with your answers
and moves it to **Next** or **Later**.

## Build an idea

To have Claude do it, run `/build`, or `/build` followed by the idea's title.

Several sessions build at the same time, each in its own branch. Each branch has its own copy of
this backlog, so `main` is the only copy that shows what everyone is building.

1. Name the branch after the idea, for example `claude/storehouse`.
2. **Claim the idea on `main`** before you change any code:
   1. Run `git fetch origin`, then `git merge --ff-only origin/main`. Your branch now has the
      latest backlog.
   2. Move the idea from **Next** to **Building now**. Add the branch name to its scores, like
      this: `*Fun 2 · Effort S · Branch: claude/storehouse*`.
   3. Commit only `ideas/backlog.md`, then push it straight to `main` with
      `git push origin HEAD:main`.
   4. If the push is rejected, someone else changed `main` first. Undo your claim with
      `git reset --keep HEAD~1`, then start again from step 1. They may have claimed the same idea.
3. When the branch is merged, move the idea to **Done** with the date.
4. Refill **Next** from **Later** or the inbox.

**Building now** can hold several ideas, one for each branch. If a branch is abandoned, move its
idea back to **Next** by hand.

## The factory

The factory builds the ideas in **Next** and **Later** one after another, without you.

1. Run `/triage` to fill the queue.
2. Run `/refine` in a new session for each idea that triage put in **Needs thought**. This step
   is optional. The factory builds the other ideas without it.
3. Run `/factory-build`. Claude builds and ships every idea in **Next** and **Later**, one at a
   time, until none is left. You can be away while it runs. It reports at the end.

- The factory skips ideas in **Inbox** and **Needs thought**.
- A dropped idea goes to **Dropped**, with the reason after its sentence.
- If the factory can't ship an idea, it moves the idea to **Needs thought**, with the reason as
  its open question. Run `/refine` on it before the factory tries again.
