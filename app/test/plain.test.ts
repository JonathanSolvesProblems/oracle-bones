// The plain-sentences reader and the open-question coverage test (quickened-app task 9.2;
// criteria 5.3, 5.7). Every ## Q-NNN entry of the real results/limits-plain.md is read with its
// text; the coverage check names the question on an open question with no entry, an entry for an
// answered question, an entry for an id not in the ledger, and an empty entry.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readOpenQuestions } from '../build/ledger.ts';
import { checkPlainCoverage, readPlain } from '../build/plain.ts';
import { ROOT } from './golden.ts';

const LEDGER = readFileSync(join(ROOT, 'results', 'ledger.json'), 'utf-8');
const PLAIN = readFileSync(join(ROOT, 'results', 'limits-plain.md'), 'utf-8').replace(/\r\n/g, '\n');
const ledgerIds = (JSON.parse(LEDGER) as { open_questions: { id: string; status: string }[] }).open_questions;
const headingIds = PLAIN.split('\n').map((l) => /^## (Q-\d{3})\s*$/.exec(l)?.[1]).filter((x): x is string => !!x);

describe('the plain-sentences reader on the real file', () => {
  const entries = readPlain(PLAIN);
  it('reads every ## Q-NNN entry, in the file order', () => {
    expect(entries.map((e) => e.id)).toEqual(headingIds);
  });
  it('gives each entry the text under its heading, up to the next heading, and not the opening paragraphs', () => {
    for (const e of entries) {
      expect(e.text, e.id).not.toBe('');
      expect(PLAIN.replace(/\s+/g, ' ')).toContain(e.text);
      expect(e.text, e.id).not.toMatch(/^#|\n#/);
      expect(e.text, e.id).not.toContain('One entry for each open question');
    }
  });
  it('covers the ledger both ways: 13 open questions, 13 entries', () => {
    const open = readOpenQuestions(LEDGER);
    expect(open.length).toBe(13);
    expect(entries.length).toBe(13);
    expect(checkPlainCoverage(open, entries, ledgerIds.map((q) => q.id))).toEqual([]);
  });
});

describe('the coverage check on fixtures', () => {
  const open = [{ id: 'Q-002', question: 'a' }, { id: 'Q-003', question: 'b' }];
  const known = ['Q-001', 'Q-002', 'Q-003'];
  const fixture = (...parts: string[]): string => `# Open questions in plain words\nOpening.\n\n${parts.join('\n\n')}\n`;
  it('passes when every open question has one entry with text', () => {
    expect(checkPlainCoverage(open, readPlain(fixture('## Q-002\nText two.', '## Q-003\nText three.')), known)).toEqual([]);
  });
  it('fails, naming the question, on an open question with no entry', () => {
    const p = checkPlainCoverage(open, readPlain(fixture('## Q-002\nText two.')), known);
    expect(p.join('\n')).toMatch(/Q-003.*no entry/);
  });
  it('fails, naming the question, on an entry for an answered question', () => {
    const p = checkPlainCoverage(open, readPlain(fixture('## Q-001\nOld.', '## Q-002\nT.', '## Q-003\nT.')), known);
    expect(p.join('\n')).toMatch(/Q-001.*not open/);
  });
  it('fails, naming the question, on an entry for an id not in the ledger', () => {
    const p = checkPlainCoverage(open, readPlain(fixture('## Q-002\nT.', '## Q-003\nT.', '## Q-999\nT.')), known);
    expect(p.join('\n')).toMatch(/Q-999.*not in the ledger/);
  });
  it('fails, naming the question, on an empty entry', () => {
    const p = checkPlainCoverage(open, readPlain(fixture('## Q-002\n', '## Q-003\nT.')), known);
    expect(p.join('\n')).toMatch(/Q-002.*no text/);
  });
});
