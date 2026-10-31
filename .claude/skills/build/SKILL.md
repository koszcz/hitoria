---
name: build
description: Build an idea from the Hitoria backlog. Takes the top idea in Next, or the one the user names, claims it on main so parallel sessions skip it, builds it test-first on its own branch, checks it in the browser and hands it to ship. Use when the user says build, implement, or work on an idea, or asks to build what's next.
---

# Build an idea from the backlog

The backlog is `ideas/backlog.md`. The rules are in `ideas/README.md`, under "Build an idea".
Read both files first, with the Read tool. If the README disagrees with this skill, follow the README.

Other sessions build at the same time, in their own worktrees. Your copy of the backlog is
out of date until you bring in `main`. Step 1 does that, and step 3 tells the other sessions
which idea you took.

## Steps

1. **Get the latest backlog.** Run `git fetch origin`.
   - Run `git log --oneline origin/main..HEAD`. If it lists commits, the branch has work that
     is not on `main` yet. Tell the user and stop. Ship or set aside that work first.
   - Run `git merge --ff-only origin/main`. Then read `ideas/backlog.md` again.
2. **Pick the idea.** Take the idea the user named. Otherwise take the top idea in **Next**.
   - If **Next** is empty, tell the user to run `/triage` and stop.
   - If the idea is already in **Building now**, another session has it. Tell the user and stop.
   - If the idea lists **Needs** that are not in **Done**, tell the user and stop.
   - If the idea is effort L, tell the user it needs splitting with `/triage` and stop.
3. **Claim the idea on `main`.** Do this before you change any code.
   - If you are not in a worktree with its own branch, create a branch named after the idea,
     such as `claude/population`. In a worktree that already has its own branch, keep it.
   - Move the idea from **Next** to **Building now**. Add `Branch: <branch>` to the end of its
     scores, such as `*Fun 2 · Effort S · Branch: claude/population*`.
   - Remove the "Nothing right now." placeholder from **Building now**. Put the "Empty"
     placeholder back in **Next** if you emptied it.
   - Commit only `ideas/backlog.md`, with the message `Start building <idea>`.
   - Push it straight to `main`: `git push origin HEAD:main`.
   - If the push is rejected, `main` moved. Run `git reset --keep HEAD~1`, then go back to
     step 1. Another session may have claimed the same idea.
4. **Plan the change.** Read the code in `src/` that the idea touches. Tell the user in a few
   lines what you will change and how the player will see it. Wait for them to agree.
5. **Build it test-first.** Use the `mattpocock-skills:tdd` skill for the game logic.
   The step is done when every new rule in the logic has a test, and `bun test` passes.
   Check `bun test --coverage` for the files you changed.
6. **Check it in the browser**, as `CLAUDE.md` describes. Play until you see the idea working.
   Take a screenshot as proof, and show it to the user.
7. **Move the idea** from **Building now** to **Done**, at the top, with today's date.
   Drop the `Branch:` part. Leave other sessions' ideas in **Building now** alone.
   Put the "Nothing right now." placeholder back only if **Building now** is empty.
8. **Ship it** with the `ship` skill, once the user agrees it is done.
9. **Report** what was built, and suggest `/triage` if **Next** has fewer than 3 ideas.

## Factory runs

The `factory-build` skill runs this skill in a subagent while the user is away.
In a factory run, keep moving:

- Step 2: if you would stop, stop and report the reason. Leave `/triage` to the user.
- Step 4: write the plan into your report and go on without waiting.
- Step 6: describe what the screenshot shows in your report.
- Step 8: ship as soon as steps 5 and 6 pass.
- Decide every other open point yourself, and list each choice in your report.
