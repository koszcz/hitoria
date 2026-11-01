---
name: refine
description: Refine one Hitoria idea that triage marked as not ready. Takes an idea from Needs thought in the backlog, works through its open questions with the user one at a time, rewrites it as a clear idea, and moves it into Next or Later, where factory-build picks it up. Use when the user says refine, wants to think an idea through, or asks to dig deeper into an idea before building it.
---

# Refine an idea

The backlog is `ideas/backlog.md`. The rules are in `ideas/README.md`, under "Triage the inbox"
and "Refine an idea". Read both files first, with the Read tool. If the README disagrees with
this skill, follow the README.

`triage` moves an idea to **Needs thought** when a builder could not build it without a big
guess. Your job is to settle those guesses with the user, so the idea can go into the queue.
Work on one idea per session. The user owns every design choice. You bring the options.

## Steps

1. **Get the latest backlog.** Run `git fetch origin`, then `git merge --ff-only origin/main`.
   If that fails, tell the user and stop. Then read `ideas/backlog.md` again.
2. **Pick the idea.** Take the idea the user named. Otherwise list the ideas in
   **Needs thought** and ask which one with `AskUserQuestion`. If the section is empty, say so
   and stop. The idea can also be one the user names from **Inbox** or **Later**.
3. **Learn what the idea touches.** Read the code in `src/` that the idea would change. Read the
   **Done** ideas it builds on. Note how the game works now in the areas it touches.
4. **List the open questions.** Start from the `Open:` part of the idea's line. Add each other
   point where a wrong guess means building it again. Leave out details a builder can pick alone.
5. **Ask one question at a time**, with `AskUserQuestion`:
   - Give 2 to 4 options that play differently. Put your pick first and mark it "(Recommended)".
   - Say in a few words what the player would see with each option.
   - Check each option against the design pillars in the [README](../../../README.md). Leave
     out options that break one.
   - When an answer opens a new question, ask it next.
   - Stop when no open question is left.
6. **Rewrite the idea.** Write one clear sentence, then up to 3 short sentences with the choices
   the user made. Say what the player sees or does, not how the code works.
   - Score fun and size the effort again, using the README's rules.
   - If it is now effort L, split it into S or M ideas, and show the split to the user.
   - If the user no longer wants it, move it to **Dropped** with their reason instead.
7. **Show the new line or lines** to the user, and wait for them to agree.
8. **Move the idea** out of **Needs thought** into **Later**, with scores in the README's format.
   Drop the `Open:` part. Then refill **Next** to at most 3 ideas, using the README's rules.
   Fix the "Empty" placeholders. Leave **Building now** and **Done** alone.
9. **Push the backlog to `main`**, so factory-build and other sessions see it.
   - Commit only `ideas/backlog.md`, with the message `Refine <idea>`.
   - Push it with `git push origin HEAD:main`.
   - If the push is rejected, run `git fetch origin`, then `git rebase origin/main`. Fix any
     conflict in the backlog by keeping both sides' lines, then push again.
10. **Report** in two lines: the idea's new line, and where it went. Suggest `/factory-build`
    or `/build` to build it.
