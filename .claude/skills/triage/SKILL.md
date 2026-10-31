---
name: triage
description: Triage the Hitoria ideas backlog. Scores each idea in the inbox, drops ideas that break the design pillars, splits large ideas, and picks up to 3 ideas for Next in ideas/backlog.md. Use this whenever the user says triage, asks what to build next, wants to sort, score or prioritise ideas, or adds new game ideas and wants them placed, even if they don't say "triage".
---

# Triage the ideas backlog

The backlog is `ideas/backlog.md`. The rules are in `ideas/README.md`, under "Triage the inbox".
Read both files first, with the Read tool. The README is the only source of the rules. If it disagrees with this
skill, follow the README, because the user edits it as their process changes.

The user owns every decision here. Fun is a matter of taste, and it's their game. Your job is
to propose scores with reasons, then write down what the user agrees to.

## Steps

1. **Add new ideas.** If the user gave ideas with the command, add each one to **Inbox** first,
   as one line in the README's format.
2. **Check there is work.** If **Inbox** is empty and **Next** already has 3 ideas, say so and stop.
3. **Propose a triage** for each inbox idea. Show it to the user as one table:

   | Idea | Pillars | Fun | Effort | Needs | Goes to |
   | --- | --- | --- | --- | --- | --- |

   - Give a short reason for each fun score and each effort size.
   - Base effort on the real code in `src/`. Look at what exists before you size it.
   - For an L idea, propose how to split it into S or M ideas.
   - For an idea that breaks a pillar, propose **Dropped** with the reason.
4. **Propose the new Next list.** Fill it to at most 3 ideas, using the README's rules.
   You may also pull ideas up from **Later**. Show the order and say why the first one is first.
5. **Wait for the user** to agree or change anything. Don't edit the backlog before they answer.
6. **Write the result** into `ideas/backlog.md`:
   - Move each idea to its section, with scores in the README's format.
   - Replace split L ideas with their smaller parts.
   - Remove the "Empty" placeholder from any section that now has ideas.
   - Put the placeholder back in any section you emptied.
   - Leave **Building now** and **Done** alone.
7. **Report** in one or two lines: what moved, and what is first in **Next**.

Don't commit. The user decides when and where the backlog change is committed.
