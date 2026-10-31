---
name: factory-build
description: Run the Hitoria factory. Builds and ships every Approved idea in the backlog, one at a time, each in its own subagent, until none is left. Runs unattended. Use when the user says factory build, run the factory, or asks to build all approved ideas.
---

# Run the factory

The factory builds every Approved idea, one after another. The backlog is `ideas/backlog.md`.
The rules are in `ideas/README.md`, under "The factory". Read both files first, with the Read
tool. If the README disagrees with this skill, follow the README.

The user is away while the factory runs. Nobody answers questions until the final report. Decide
every open point yourself, choose the option that keeps the factory moving, and note the choice
for the report. Each idea is built by a subagent, so your own context holds only the loop.

## The loop

Repeat these steps until step 2 finds no idea to build.

1. **Get the latest backlog.** Run `git fetch origin`, then `git merge --ff-only origin/main`.
   Then read `ideas/backlog.md` again. Other sessions may have approved new ideas since the
   last round. They count too.
2. **Pick the idea.** Take the first idea in **Next** that is Approved, is not effort L, and has
   every idea it **Needs** in **Done**.
   - If no idea in **Next** fits, refill **Next** from Approved ideas in **Later**, using the
     README's rules. Commit only `ideas/backlog.md` with the message `Refill Next for the
     factory`, and push it with `git push origin HEAD:main`. If the push is rejected, go back to
     step 1.
   - If no Approved idea fits anywhere, the loop is over. Go to the report.
3. **Send a subagent to build and ship it.** Use the `Agent` tool with `isolation: "worktree"`,
   so the idea gets its own worktree and branch. Give it the prompt in "Subagent prompt" below,
   with the idea's title filled in. Wait for its report.
4. **Check that it shipped.** Run `git fetch origin`. The idea shipped when both are true:
   - The idea is in **Done** in `git show origin/main:ideas/backlog.md`.
   - `git merge-base --is-ancestor <subagent branch> origin/main` succeeds.
5. **Handle a failure.** If the idea did not ship, write down the subagent's reason.
   - If the reason will stop every idea, such as changes left in `/Users/hito/code/hitoria`, a
     failing test on `main`, or a missing tool, stop the loop and go to the report.
   - Otherwise, give the idea back. In the backlog, move it from **Building now** to **Later**,
     remove `· Approved` and the `Branch:` part, and push as in step 2. The idea now waits for
     the user in `/factory-triage`. Leave its branch alone.
   - If two ideas in a row fail, stop the loop and go to the report.
6. Go back to step 1.

## Subagent prompt

```text
Build and ship the idea "<title>" from ideas/backlog.md in Hitoria. This is a factory run:
the user is away, so nobody will answer questions.

1. Run the `build` skill for "<title>". Follow its factory notes: skip every step that waits
   for the user, and decide open points yourself.
2. When the build is done, run the `ship` skill. You are in an agent worktree. In ship's step 6,
   skip ExitWorktree. Run steps 7 to 10 in /Users/hito/code/hitoria with `git -C`, and merge
   your worktree's branch.
3. If any step fails and you cannot fix it, stop.

Report in a few lines: shipped or not, the branch name, the main commit hash, what the player
now sees, the choices you made alone, and why it failed if it did.
```

## Report

When the loop is over, tell the user:

- Each idea that shipped, with its commit hash and one line on what the player sees.
- The choices the subagents made alone, so the user can change them later.
- Each idea that failed, with the reason and its branch.
- Why the loop stopped.
- How many ideas wait in **Inbox** or are not Approved. Suggest `/factory-triage` if any do.
