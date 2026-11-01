---
name: triage
description: Triage the Hitoria ideas backlog. Scores and sorts the inbox on its own, checks whether each idea is clear enough to build, then asks the user one idea at a time to build, refine or drop it. Built ideas go straight into Next or Later, where factory-build picks them up. Use this whenever the user says triage or factory triage, asks what to build next, wants to sort, score or prioritise ideas, or adds new game ideas and wants them placed, even if they don't say "triage".
---

# Triage the ideas backlog

The backlog is `ideas/backlog.md`. The rules are in `ideas/README.md`, under "Triage the inbox"
and "The factory". Read both files first, with the Read tool. If the README disagrees with this
skill, follow the README, because the user edits it as their process changes.

You do the triage work yourself: pillars, fun, effort, needs, splits, readiness and the order of
**Next**. The user decides only one thing per idea: build it, refine it or drop it. They prefer
to ship now and adjust later, so keep their part to one quick answer.

Every idea in **Next** and **Later** is ready to build. `factory-build` takes them without asking
again. So put an idea there only when the user says Build.

## Steps

1. **Get the latest backlog.** Run `git fetch origin`, then `git merge --ff-only origin/main`.
   If that fails, tell the user and stop. Then read `ideas/backlog.md` again.
2. **Add new ideas.** If the user gave ideas with the command, add each one to **Inbox** first,
   as one line in the README's format.
3. **List the open ideas.** These are the ideas in **Inbox**. If there are none, say so and stop.
   Skip ideas in **Needs thought**. The `refine` skill handles those.
4. **Triage the open ideas yourself**, using the README's rules. Base effort on the real code in
   `src/`. Split each L idea into S or M ideas now. Move ideas that break a pillar straight to
   **Dropped** with the reason, without asking.
5. **Check whether each idea is ready to build.** An idea is ready when a builder working alone
   could build it without a guess that, if wrong, means building it again. It is not ready when:
   - its sentence leaves open what the player sees or does,
   - it has two or more sensible designs that play very differently,
   - it clashes with how the game works now, or
   - it is so vague that you cannot size the effort.

   For each idea that is not ready, write down the open questions in one short line.
6. **Ask about one idea at a time**, starting with the best value: high fun and low effort.
   Use `AskUserQuestion` with one question per call:
   - The question names the idea and gives your scores with one short reason, such as
     "Hunter (Fun 2, Effort S): hunters give the new animals a use. Build it?"
   - For an idea that is not ready, add the open questions, such as "Open: does a wish fail, or
     just move on?"
   - The options are **Build**, **Refine** and **Drop**. Put your pick first and mark it
     "(Recommended)". Recommend **Refine** for every idea that is not ready.
   - For a split idea, ask once about all its parts together.
7. **Ask for a detail only when a wrong guess means building it again.** Ask it right after the
   user says Build, as one more `AskUserQuestion` with your default first. For every other open
   point, pick a sensible default and write it into the idea's sentence. If an idea needs more
   than one such detail, it is not ready. Offer **Refine** instead.
8. **Write each answer into the backlog** as soon as the user gives it, so no answer is lost:
   - Build: move it to **Later**, with scores in the README's format, such as
     `*Fun 2 · Effort S · Needs: Wild animals*`. Step 9 picks what goes into **Next**.
   - Refine: move it to **Needs thought**, with the open questions after its scores, such as
     `*Fun 2 · Effort M · Open: does a wish fail, or just move on?*`.
   - Drop: move it to **Dropped**, with the user's reason or yours after the sentence.
   - The step is done when every open idea from step 3 has left **Inbox**.
9. **Refill Next** to at most 3 ideas from **Later**, using the README's rules. Fix the "Empty"
   placeholders. Leave **Building now** and **Done** alone. Other sessions own those lines.
10. **Push the backlog to `main`**, so factory-build and other sessions see it.
    - Commit only `ideas/backlog.md`, with the message `Triage the inbox`.
    - Push it with `git push origin HEAD:main`.
    - If the push is rejected, run `git fetch origin`, then `git rebase origin/main`. Fix any
      conflict in the backlog by keeping both sides' lines, then push again.
11. **Report** in two or three lines:
    - How many ideas you added to the queue, sent to refine and dropped.
    - What is first in **Next**. Suggest `/factory-build` to build the queue.
    - If **Needs thought** has ideas, suggest `/refine` in a new session for each one.
