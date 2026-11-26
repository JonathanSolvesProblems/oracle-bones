// Reads results/headline.md for the proof page (quickened-app design: The proof page; criterion
// 5.2): the `Cases:` line, matched of total, and the `Run:` line, yyyy-mm-dd. The file does not
// exist yet (exhume-loop task 5.1); then the reader returns null and the page shows no count. If
// task 5.1 writes another form, this reader changes with it.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface Headline { matched: number; total: number; run: string; }

export function parseHeadline(source: string): Headline {
  const cases = /^Cases:\s*(\d+)\s+of\s+(\d+)\s*$/m.exec(source);
  const run = /^Run:\s*(\d{4}-\d{2}-\d{2})\s*$/m.exec(source);
  if (!cases) throw new Error('results/headline.md has no line "Cases: <matched> of <total>"');
  const matched = Number(cases[1]);
  const total = Number(cases[2]);
  if (matched > total) throw new Error(`results/headline.md: the Cases: line has more matched than total: ${cases[0]}`);
  if (!run) throw new Error('results/headline.md has no line "Run: yyyy-mm-dd"');
  return { matched, total, run: run[1]! };
}

export function readHeadline(root: string): Headline | null {
  const path = join(root, 'results', 'headline.md');
  if (!existsSync(path)) return null;
  return parseHeadline(readFileSync(path, 'utf-8'));
}
