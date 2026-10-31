---
name: ship
description: Ship the current work in Hitoria. Runs the checks and tests, adds a changelog entry, commits, merges the branch into main and pushes. Use when the user says ship, ship it, or asks to wrap up, land or push a change.
---

# Ship the current work

Stop and tell the user if any step fails. Never skip a failing step.

Other sessions push to `main` at the same time as you, so the steps below bring in their work
before you merge and push.

1. Run `bun run check` and `bun test`. Both must pass.
2. Add a changelog entry, unless the branch already has one for this change.
   Follow `changelog/README.md`, then run `bun run changelog`. Skip screenshots.
3. Commit your changes with a short message that says what changed. Add only the files this
   change touched, by name.
4. If you are in a worktree, leave it first with `ExitWorktree` and `action: "keep"`. You are
   now in `/Users/hito/code/hitoria`, where `main` is checked out.
5. In `/Users/hito/code/hitoria`, run `git status --short`. If it shows changes you did not
   make, stop and ask the user what to do with them. Do not stash, commit or discard them.
6. Bring `main` up to date: `git switch main`, then `git pull --ff-only origin main`.
7. If your work is on another branch, merge it: `git merge <branch>`. Do not open a pull
   request. If the merge has conflicts, resolve them, then run step 1 again.
8. Push: `git push origin main`. If the push is rejected because `main` moved, go back to
   step 6.
9. Tell the user the commit hash and what went out.
