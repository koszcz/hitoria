---
title: One triage skill, and a refine skill
date: '2026-11-01 13:00'
kind: dev
---
`/triage` now does what `/factory-triage` did, and `/factory-triage` is gone. Claude scores the inbox itself, then asks you about one idea at a time: build it, refine it or drop it. Ideas you choose to build go straight into **Next** or **Later**, and `/factory-build` builds them without asking again. The `Approved` mark is gone.

Triage also checks whether each idea is clear enough to build. An idea with open questions goes to a new **Needs thought** section. Run the new `/refine` skill in its own session to settle the questions with Claude, one at a time. The idea then joins the queue. If the factory can't ship an idea, it moves the idea to **Needs thought** too.
