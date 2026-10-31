---
name: ship
description: Ship the current work in Hitoria. Runs the checks and tests, adds a changelog entry, updates the README and its screenshot, commits, merges the branch into main and pushes. Use when the user says ship, ship it, or asks to wrap up, land or push a change.
---

# Ship the current work

Stop and tell the user if any step fails. Never skip a failing step.

Other sessions push to `main` at the same time as you, so the steps below bring in their work
before you merge and push.

1. Run `bun run check` and `bun test`. Both must pass.
2. Add a changelog entry, unless the branch already has one for this change.
   Follow `changelog/README.md`, then run `bun run changelog`. Skip changelog screenshots.
3. Bring `README.md` up to date. Read it, then fix every part this change made wrong or left out:
   how to play, controls, saving, the current economy, the commands and the code map.
   Write in the README's plain style. If nothing in it changed, say so and move on.
4. Take the README screenshot again if this change alters what players see, such as buildings,
   art, the HUD or a menu. Run `bun run readme:shot`, then look at `docs/screenshot.jpg` with the
   Read tool.
   - It must show a built village around the HQ, with the game's controls on screen.
   - If it doesn't, fix the village plan in `scripts/readme/village.ts` and run it again.
   - Update the screenshot's alt text in `README.md` if the picture now shows something else.
   - Skip this step for changes players can't see. The picture changes a little on every run,
     so a new one with no visible change only adds noise.
5. Commit your changes with a short message that says what changed. Add only the files this
   change touched, by name, including `README.md` and `docs/screenshot.jpg` if you changed them.
6. If you are in a worktree, leave it first with `ExitWorktree` and `action: "keep"`. You are
   now in `/Users/hito/code/hitoria`, where `main` is checked out.
7. In `/Users/hito/code/hitoria`, run `git status --short`. If it shows changes you did not
   make, stop and ask the user what to do with them. Do not stash, commit or discard them.
8. Bring `main` up to date: `git switch main`, then `git pull --ff-only origin main`.
9. If your work is on another branch, merge it: `git merge <branch>`. Do not open a pull
   request. If the merge has conflicts, resolve them, then run step 1 again. If `README.md` or
   `docs/screenshot.jpg` conflicts, keep both sides' text changes, and run step 4 again for the
   screenshot.
10. Push: `git push origin main`. If the push is rejected because `main` moved, go back to
    step 8.
11. Tell the user the commit hash and what went out, including whether the README or its
    screenshot changed.
