---
name: build
description: Build an idea from the Hitoria backlog. Takes the top idea in Next, or the one the user names, builds it test-first on its own branch, checks it in the browser and hands it to ship. Use when the user says build, implement, or work on an idea, or asks to build what's next.
---

# Build an idea from the backlog

The backlog is `ideas/backlog.md`. The rules are in `ideas/README.md`, under "Build an idea".
Read both files first, with the Read tool. If the README disagrees with this skill, follow the README.

## Steps

1. **Pick the idea.** Take the idea the user named. Otherwise take the top idea in **Next**.
   - If **Next** is empty, tell the user to run `/triage` and stop.
   - If the idea lists **Needs** that are not in **Done**, tell the user and stop.
   - If the idea is effort L, tell the user it needs splitting with `/triage` and stop.
2. **Start the branch.** Name it after the idea, such as `claude/population`.
   In a worktree that already has its own branch, keep that branch.
3. **Move the idea** from **Next** to **Building now**. Remove the "Empty" placeholder there,
   and put it back in **Next** if you emptied it.
4. **Plan the change.** Read the code in `src/` that the idea touches. Tell the user in a few
   lines what you will change and how the player will see it. Wait for them to agree.
5. **Build it test-first.** Use the `mattpocock-skills:tdd` skill for the game logic.
   The step is done when every new rule in the logic has a test, and `bun test` passes.
   Check `bun test --coverage` for the files you changed.
6. **Check it in the browser**, as `CLAUDE.md` describes. Play until you see the idea working.
   Take a screenshot as proof, and show it to the user.
7. **Move the idea** from **Building now** to **Done**, at the top, with today's date.
   Put the "Nothing right now." placeholder back in **Building now**.
8. **Ship it** with the `ship` skill, once the user agrees it is done.
9. **Report** what was built, and suggest `/triage` if **Next** has fewer than 3 ideas.
