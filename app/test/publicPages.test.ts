// Task 17.6 (criterion 10.6): the limits and proof pages in plain words. What the files write for
// the repository is in a closed details element under its entry; "haunting" is defined where the
// limits page first uses it; H-009's table is a table; no entry ends in a dangling "as recorded:".
import { describe, expect, it } from 'vitest';
import { data } from 'virtual:quickened/data';
import { limitsModel, limitsView } from '../src/ui/views/limits.ts';
import { notBuiltModel } from '../src/ui/views/notBuilt.ts';
import { proofModel, proofView } from '../src/ui/views/proof.ts';
import { forRepo, FOR_REPOSITORY, REPO_WORDS, sentences, splitRepo } from '../src/ui/views/repo.ts';
import { findAll, textOf, type Child, type VNode } from '../src/ui/vnode.ts';

const limits = limitsView(limitsModel(data));
const proof = proofView(proofModel(data.proof, data.headline));

/** The text a reader sees without opening anything: every node but the details elements. */
function visible(n: Child): string {
  if (typeof n === 'string') return n;
  if (n.tag === 'details') return '';
  const block = ['p', 'li', 'dd', 'dt', 'h1', 'h2', 'h3', 'td', 'th', 'figcaption'].includes(n.tag);
  return `${n.children.map(visible).join('')}${block ? ' \n' : ''}`;
}
const offending = (page: VNode) => sentences(visible(page).replace(/\n/g, ' ')).filter((s) => REPO_WORDS.test(s));

describe('repository wording is in a closed details element', () => {
  it('splits a text into plain sentences and the sentences for the repository', () => {
    const t = 'QUICK-2 gives no answer. Q-016 Harness finding, run 20261122-180000-23e5ea ended. The cause is not known. A-005 committed it (the person\'s decision).';
    expect(splitRepo(t)).toEqual({
      plain: 'QUICK-2 gives no answer. The cause is not known.',
      repo: ['Q-016 Harness finding, run 20261122-180000-23e5ea ended.', "A-005 committed it (the person's decision)."],
    });
    expect(forRepo(null)).toBeNull();
    const d = forRepo('x')!;
    expect(d.tag).toBe('details');
    expect(d.attrs.open).toBeUndefined();
    expect(textOf(d.children[0] as VNode)).toBe(FOR_REPOSITORY);
  });
  it('on the limits page no sentence outside a details element holds a run id, golden, ledger wording, a decision number, "the person" or an attempt id', () => {
    expect(offending(limits)).toEqual([]);
  });
  it('on the proof page the same', () => {
    expect(offending(proof)).toEqual([]);
  });
  it('a proof entry\'s reason with repository wording keeps its plain sentence and puts the rest in a closed details', () => {
    const model = proofModel(data.proof, data.headline);
    const c = { ...model.cases[0]!, reason: 'The main worked example. It was graded in attempt A-016 (the person\'s decision).' };
    const page = proofView({ ...model, cases: [c] });
    expect(offending(page)).toEqual([]);
    expect(visible(page)).toContain('The main worked example.');
    const d = findAll(page, (n) => n.tag === 'details');
    expect(d).toHaveLength(1);
    expect(textOf(d[0]!)).toContain('A-016');
  });
  it('each open question\'s plain sentences come first, and its ledger wording is in a closed details under it', () => {
    const entries = findAll(limits, (n) => typeof n.attrs.id === 'string' && String(n.attrs.id).startsWith('question-'));
    expect(entries.length).toBe(data.openQuestions.length);
    for (const e of entries) {
      const d = findAll(e, (n) => n.tag === 'details');
      expect(d, String(e.attrs.id)).toHaveLength(1);
      expect(d[0]!.attrs.open).toBeUndefined();
      const id = String(e.attrs.id).replace('question-', '');
      expect(textOf(d[0]!), id).toContain(id);
      expect(visible(e).trim().length, id).toBeGreaterThan(0);
      expect(visible(e), id).not.toContain(id);
    }
  });
  it('every details element on the limits page is closed and named "For the repository"', () => {
    const all = findAll(limits, (n) => n.tag === 'details');
    expect(all.length).toBeGreaterThan(0);
    for (const d of all) {
      expect(d.attrs.open).toBeUndefined();
      expect(textOf(findAll(d, (n) => n.tag === 'summary')[0]!)).toBe(FOR_REPOSITORY);
    }
  });
});

describe('"haunting" is defined where the limits page first uses it', () => {
  it('the first sentence of the page that uses the word says what it is', () => {
    const first = sentences(visible(limits).replace(/\n/g, ' ')).find((s) => /haunting/i.test(s))!;
    expect(first).toMatch(/A haunting is a place where QUICK-2 /);
    expect(first).toMatch(/exact/);
  });
});

describe('H-009\'s table is a table', () => {
  const entry = findAll(limits, (n) => n.attrs.id === 'haunting-H-009')[0]!;
  it('has the five columns and one row for each case', () => {
    const table = findAll(entry, (n) => n.tag === 'table');
    expect(table).toHaveLength(1);
    const head = findAll(findAll(table[0]!, (n) => n.tag === 'thead')[0]!, (n) => n.tag === 'th').map((n) => textOf(n));
    expect(head).toEqual(['Case', 'Pipe and discharge', 'Exact critical depth', 'Share of D', 'Below the crown']);
    const rows = findAll(findAll(table[0]!, (n) => n.tag === 'tbody')[0]!, (n) => n.tag === 'tr');
    expect(rows.map((r) => textOf(findAll(r, (c) => c.tag === 'th')[0]!))).toEqual(['cd-circ-000043', 'cd-circ-000049', 'cd-circ-000050']);
    for (const r of rows) expect(findAll(r, (c) => c.tag === 'td')).toHaveLength(4);
  });
  it('and no raw markdown table is left on the page', () => {
    expect(textOf(limits)).not.toMatch(/\|\s*-{3}|\|\s*Case\s*\|/);
  });
});

describe('no entry ends in a dangling "as recorded:"', () => {
  it('Step-Backwater\'s entry says what QUICK-2 asks for in a list that follows its sentence', () => {
    const sb = findAll(limits, (n) => n.tag === 'article' && textOf(n).includes(notBuiltModel('step_backwater', 'irregular').heading))[0]!;
    const kids = sb.children as VNode[];
    const i = kids.findIndex((k) => k.tag === 'p' && textOf(k).endsWith(':'));
    expect(i).toBeGreaterThanOrEqual(0);
    expect(kids[i + 1]!.tag).toBe('ul');
    expect(findAll(kids[i + 1]!, (n) => n.tag === 'li').length).toBe(notBuiltModel('step_backwater', 'irregular').asks.length);
  });
  it('and every paragraph of the page that ends in a colon is followed by a list or a table', () => {
    for (const p of findAll(limits, (n) => n.tag === 'p' && textOf(n).trim().endsWith(':'))) {
      const parent = findAll(limits, (n) => n.children.includes(p))[0]!;
      const next = parent.children[parent.children.indexOf(p) + 1] as VNode | undefined;
      expect(['ul', 'ol', 'table', 'dl'], textOf(p)).toContain(next?.tag);
    }
  });
});
