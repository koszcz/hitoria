// Reads ideas/backlog.md into sections of ideas, with their scores, needs and dates.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const BACKLOG = resolve(import.meta.dir, 'backlog.md');

export type Idea = {
  title: string;
  text: string; // the sentence after the title, in Markdown
  fun?: number; // 1 to 3
  effort?: string; // S, M or L
  needs: string[]; // titles of ideas that must be built first
  date?: string; // YYYY-MM-DD, for ideas in Done
};

export type Backlog = Record<string, Idea[]>; // keyed by section heading, such as "Next"

export function parseIdea(line: string): Idea | undefined {
  const m = line.match(/^- \*\*(.+?)\*\*:?\s*(.*)$/);
  if (!m) return undefined;
  const idea: Idea = { title: m[1], text: m[2], needs: [] };
  const tail = idea.text.match(/\s*\*([^*]+)\*\s*$/);
  if (!tail) return idea;
  const parts = tail[1].split('·').map((p) => p.trim());
  let known = false;
  for (const part of parts) {
    const fun = part.match(/^Fun (\d)$/);
    const effort = part.match(/^Effort ([SML])$/);
    const needs = part.match(/^Needs: (.+)$/);
    if (fun) idea.fun = Number(fun[1]);
    else if (effort) idea.effort = effort[1];
    else if (needs) idea.needs = needs[1].split(',').map((n) => n.trim());
    else if (/^\d{4}-\d{2}-\d{2}$/.test(part)) idea.date = part;
    else continue;
    known = true;
  }
  if (known) idea.text = idea.text.slice(0, tail.index).trim();
  return idea;
}

export function parseBacklog(markdown: string): Backlog {
  const backlog: Backlog = {};
  let section: Idea[] | undefined;
  for (const line of markdown.split('\n')) {
    const heading = line.match(/^## (.+)$/);
    if (heading) backlog[heading[1].trim()] = section = [];
    const idea = section && parseIdea(line);
    if (idea) section!.push(idea);
  }
  return backlog;
}

export const readBacklog = (file = BACKLOG) => parseBacklog(readFileSync(file, 'utf8'));
