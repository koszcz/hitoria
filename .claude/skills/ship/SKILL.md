---
name: ship
description: Ship the current work in Hitoria. Runs the tests, adds a changelog entry, commits, merges the branch into main and pushes. Use when the user says ship, ship it, or asks to wrap up, land or push a change.
---

# Ship the current work

Stop and tell the user if any step fails. Never skip a failing step.

1. Run `bun test`. Every test must pass.
2. Add a changelog entry, unless the branch already has one for this change.
   Follow `changelog/README.md`. If the change shows in the game, run
   `bun run changelog:shots <entry>` and look at the screenshots. Then run `bun run changelog`.
3. Commit all changes with a short message that says what changed.
4. If you are on a branch other than `main`, merge it into `main`. Do not open a pull request.
   In a worktree, `main` is checked out in `/Users/hito/code/hitoria`, so merge there:
   `git -C /Users/hito/code/hitoria merge <branch>`.
5. Push `main`: `git -C /Users/hito/code/hitoria push origin main`.
6. Tell the user the commit hash and what went out.
