// The ledger reader (quickened-app task 9.1; criterion 5.3). It reads every open_questions entry
// of the real results/ledger.json with status `open`, id and text verbatim. The expected list is
// derived from the file here, never typed.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readOpenQuestions } from '../build/ledger.ts';
import { ROOT } from './golden.ts';

const TEXT = readFileSync(join(ROOT, 'results', 'ledger.json'), 'utf-8');
const all = (JSON.parse(TEXT) as { open_questions: { id: string; question: string; status: string }[] }).open_questions;

describe('the ledger reader on the real file', () => {
  it('reads every open question, id and text verbatim, in the file order', () => {
    const open = all.filter((q) => q.status === 'open');
    expect(open.length).toBeGreaterThan(0);
    expect(readOpenQuestions(TEXT)).toEqual(open.map((q) => ({ id: q.id, question: q.question })));
  });
  it('leaves out every question that is not open', () => {
    const ids = new Set(readOpenQuestions(TEXT).map((q) => q.id));
    for (const q of all.filter((x) => x.status !== 'open')) expect(ids.has(q.id), q.id).toBe(false);
  });
});

describe('the ledger reader on fixtures', () => {
  it('fails on a file with no open_questions list', () => {
    expect(() => readOpenQuestions('{}')).toThrow(/open_questions/);
  });
  it('fails, naming the entry, on an open question with no id or no text', () => {
    expect(() => readOpenQuestions(JSON.stringify({ open_questions: [{ id: 'Q-900', status: 'open' }] }))).toThrow(/Q-900/);
    expect(() => readOpenQuestions(JSON.stringify({ open_questions: [{ question: 'x', status: 'open' }] }))).toThrow(/entry 1/);
  });
});
