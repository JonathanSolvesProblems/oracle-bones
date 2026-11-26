// The held-out record (quickened-app task 16.9; criterion 5.12). results/held-out.md is one table,
// Round | Committed | Right | What was predicted, with one row for each prediction round of
// results/attempts.md in order (two where a round graded two rules), and two sentences under it.
// A row fails when its count or a commit is not found under a heading of attempts.md that names
// its round: the round's own section, and the sections that grade it ("## A-006: the A-005
// cases, graded ...", "## A-016 graded: ...").
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './golden.ts';

const read = (f: string): string => readFileSync(join(ROOT, 'results', f), 'utf-8').replace(/\r\n/g, '\n');
const ATTEMPTS = read('attempts.md').split('\n');
const HELD = read('held-out.md');

/** Each `## ` section of attempts.md: its heading and its text up to the next `## `. */
const sections = ATTEMPTS.flatMap((l, i) => (l.startsWith('## ') ? [i] : [])).map((at, k, all) => ({
  heading: ATTEMPTS[at]!, text: ATTEMPTS.slice(at, all[k + 1] ?? ATTEMPTS.length).join('\n'),
}));
const idOf = (heading: string): string => /^## (A-\d{3})\b/.exec(heading)?.[1] ?? '';
/** A prediction round: a section whose opening says it was committed before any of its cases ran. */
const rounds = [...new Set(sections.filter((s) => {
  const opening = s.text.split('\n').slice(1, 4).join(' ');
  return /committed/.test(opening) && /before any/.test(opening);
}).map((s) => idOf(s.heading)))];
const under = (id: string): string => sections.filter((s) => new RegExp(`\\b${id}\\b`).test(s.heading)).map((s) => s.text).join('\n');

const lines = HELD.trimEnd().split('\n');
const tableAt = lines.findIndex((l) => l.startsWith('|'));
const table = lines.slice(tableAt).filter((l, i, all) => l.startsWith('|') && all.slice(0, i).every((x) => x.startsWith('|')));
const cells = (l: string): string[] => l.slice(1, -1).split('|').map((c) => c.trim());
const rows = table.slice(2).map(cells).map(([round, committed, right, what]) => ({ round: round!, committed: committed!, right: right!, what: what! }));
const after = lines.slice(tableAt + table.length).join('\n').trim();

describe('results/held-out.md', () => {
  it('is one table with exactly the columns Round | Committed | Right | What was predicted', () => {
    expect(table[0]).toBe('| Round | Committed | Right | What was predicted |');
    expect(cells(table[1]!).every((c) => /^-{3,}$/.test(c))).toBe(true);
    expect(lines.filter((l) => l.startsWith('|')).length).toBe(table.length);
    for (const r of rows) expect(Object.values(r).every((c) => c !== undefined && c !== ''), JSON.stringify(r)).toBe(true);
  });
  it('has a row for each prediction round of results/attempts.md, in order, and no other', () => {
    expect(rounds.length).toBeGreaterThan(0);
    expect([...new Set(rows.map((r) => r.round))]).toEqual(rounds);
    const order = rows.map((r) => rounds.indexOf(r.round));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
  it("finds each row's count and commit under a heading that names its round", () => {
    for (const r of rows) {
      expect(r.right, r.round).toMatch(/^\d+ of \d+$/);
      expect(r.committed, r.round).toMatch(/^[0-9a-f]{7}(, [0-9a-f]{7})*$/);
      const text = under(r.round);
      expect(text, `${r.round}: "${r.right}"`).toMatch(new RegExp(`\\b${r.right}\\b`));
      for (const c of r.committed.split(', ')) expect(text, `${r.round}: ${c}`).toMatch(new RegExp(`\\b${c}\\b`));
    }
  });
  it('writes the last column as one plain line, and two sentences under the table', () => {
    for (const r of rows) expect(r.what, r.round).not.toMatch(/[`*_[\]]|<br>/);
    expect(after.split('\n').length).toBe(1);
    expect(after.match(/[.!?](\s|$)/g)?.length).toBe(2);
    expect(after).toMatch(/full-pipe number/);
    expect(after).toMatch(/person's prompt/);
    expect(after).toMatch(/shape menu/);
  });
});
