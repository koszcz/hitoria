---
name: factory-triage
description: Fill the Hitoria factory queue. Scores and sorts the backlog on its own, then asks the user one idea at a time whether it is worth building, and marks the yes ideas Approved for factory-build. Use when the user says factory triage, or wants to clear the backlog quickly with yes or no answers.
---

# Fill the factory queue

The backlog is `ideas/backlog.md`. The rules are in `ideas/README.md`, under "Triage the inbox"
and "The factory". Read both files first, with the Read tool. If the README disagrees with this
skill, follow the README.

You do the triage work yourself: pillars, fun, effort, needs, splits and the order of **Next**.
The user decides only one thing per idea: is it worth building? They prefer to ship now and
adjust later, so keep their part to a quick yes or no.

## Steps

1. **Get the latest backlog.** Run `git fetch origin`, then `git merge --ff-only origin/main`.
   If that fails, tell the user and stop. Then read `ideas/backlog.md` again.
2. **Add new ideas.** If the user gave ideas with the command, add each one to **Inbox** first.
3. **List the open ideas.** These are the ideas in **Inbox**, **Next** and **Later** that are
   not marked Approved. If there are none, say so and stop.
4. **Triage the open ideas yourself**, using the README's rules. Base effort on the real code in
   `src/`. Split each L idea into S or M ideas now. Move ideas that break a pillar straight to
   **Dropped** with the reason, without asking.
5. **Ask about one idea at a time**, starting with the best value: high fun and low effort.
   Use `AskUserQuestion` with one question per call:
   - The question names the idea and gives your scores with one short reason, such as
     "Hunter (Fun 2, Effort S): hunters give the new animals a use. Build it?"
   - The options are **Build** and **Drop**. Put your pick first and mark it "(Recommended)".
   - For a split idea, ask once about all its parts together.
6. **Ask for a detail only when a wrong guess means building it again.** Ask it right after the
   user says Build, as one more `AskUserQuestion` with your default first. For every other open
   point, pick a sensible default and write it into the idea's sentence.
7. **Write each answer into the backlog** as soon as the user gives it, so no answer is lost:
   - Build: add `· Approved` to the end of the idea's scores, such as
     `*Fun 2 · Effort S · Needs: Wild animals · Approved*`. Keep it in its section.
   - Drop: move it to **Dropped**, with the user's reason or yours after the sentence. Add a
     `## Dropped` section at the end of the file if there is none.
   - The step is done when every open idea from step 3 is Approved or in **Dropped**.
8. **Refill Next** to at most 3 Approved ideas, using the README's rules. Fix the "Empty"
   placeholders. Leave **Building now** and **Done** alone. Other sessions own those lines.
9. **Push the backlog to `main`**, so factory-build and other sessions see it.
   - Commit only `ideas/backlog.md`, with the message `Approve ideas for the factory`.
   - Push it with `git push origin HEAD:main`.
   - If the push is rejected, run `git fetch origin`, then `git rebase origin/main`. Fix any
     conflict in the backlog by keeping both sides' lines, then push again.
10. **Report** in two lines: how many ideas you approved and dropped, and what is first in
    **Next**. Suggest `/factory-build` to build them.
