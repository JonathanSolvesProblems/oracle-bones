// Property 7: exact values only for recorded cases, beside their fields (quickened-app criteria
// 2.2, 2.4; design: Which haunting a result links to, Exact values by field). And the mappings
// of hauntingLinks.ts: every haunting of the file is in one, and every one names a haunting of
// the file.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { data } from 'virtual:quickened/data';
import type { Mode, Shape } from '../src/solver/index.ts';
import { flagLinks, PAIR_RULES, recordedCase } from '../src/ui/hauntingLinks.ts';
import type { AppJob } from '../src/ui/job.ts';
import { classify, runJob } from '../src/ui/state.ts';
import { EXACT_HEADER, resultsModel, resultsView } from '../src/ui/views/results.ts';
import { findAll, textOf } from '../src/ui/vnode.ts';
import { goldens } from './golden.ts';

const jobOf = (g: { mode: string; shape: string; inputs: Readonly<Record<string, string>> }): AppJob =>
  ({ mode: g.mode as Mode, shape: g.shape as Shape, inputs: { ...g.inputs }, origin: 'typed' });
const lines = data.hauntings.flatMap((h) => h.exactByField.map((x) => ({ h, x })));
const hauntingCases = new Set(Object.keys(data.cases));

describe('Property 7: exact values only for recorded cases, beside their fields', () => {
  for (const { h, x } of lines) {
    it(`${h.id}, ${x.caseId}: the fields with an exact value are the line's, each on its field's row`, () => {
      const job = jobOf(data.cases[x.caseId]!);
      const state = classify(job, runJob(job));
      if (state.kind !== 'result') {
        // A refusal (H-009's cases) has no exact value and links its haunting.
        expect(x.values).toBeNull();
        expect(recordedCase(job)?.haunting).toBe(h.id);
        return;
      }
      expect(state.exact?.haunting).toBe(h.id);
      expect(state.exact?.caseId).toBe(x.caseId);
      const m = resultsModel(job, state);
      const rows = [...m.inputs, ...m.outputs];
      const withExact = Object.fromEntries(rows.filter((r) => r.exact !== null).map((r) => [r.field, r.exact]));
      expect(withExact).toEqual(x.values ?? {});
      const view = resultsView(m);
      const cells = findAll(view, (n) => n.attrs['data-exact'] !== undefined);
      expect(Object.fromEntries(cells.map((c) => [c.attrs['data-exact'], textOf(c).replace(`${EXACT_HEADER} `, '')]))).toEqual(x.values ?? {});
      // The printed value is the first one read on the row.
      for (const c of cells) {
        const row = findAll(view, (n) => n.tag === 'tr' && n.children.includes(c))[0]!;
        const tds = row.children.filter((n) => typeof n !== 'string' && n.tag === 'td');
        expect(tds.indexOf(c)).toBeGreaterThan(0);
      }
      const text = textOf(view);
      expect(text).toContain(h.id);
      if (x.values) {
        expect(text).toContain(EXACT_HEADER);
        expect(text).toContain(h.assumption);
      } else {
        expect(text).not.toContain(EXACT_HEADER);
      }
    });
  }

  it('gives no exact value to any other golden', () => {
    for (const g of goldens().filter((y) => y.outcome !== 'observed' && !hauntingCases.has(y.id))) {
      const job = jobOf(g);
      const state = classify(job, runJob(job));
      if (state.kind === 'result') expect(state.exact, g.id).toBeNull();
    }
  });

  it('gives no exact value once any input of a haunting case differs in key or text', () => {
    const recorded = lines.filter(({ x }) => x.values !== null).map(({ x }) => data.cases[x.caseId]!);
    fc.assert(fc.property(fc.constantFrom(...recorded), fc.nat(), fc.constantFrom('0', ' ', '.'), fc.boolean(), (c, k, extra, drop) => {
      const keys = Object.keys(c.inputs);
      const key = keys[k % keys.length]!;
      const inputs: Record<string, string> = { ...c.inputs };
      if (drop) delete inputs[key];
      else inputs[key] = inputs[key] + extra;
      const job = jobOf({ ...c, inputs });
      const state = classify(job, runJob(job));
      if (state.kind === 'result') expect(state.exact).toBeNull();
      expect(recordedCase(job)).toBeNull();
    }), { numRuns: 200 });
    // 200 solves of 40-point sections take about 4 s alone; the full suite in parallel passed 5 s.
  }, 30_000);
});

describe('the haunting links (criterion 2.4)', () => {
  const ids = data.hauntings.map((h) => h.id);
  const mapped = [...Object.values(flagLinks()).flat(), ...PAIR_RULES.map((r) => r.haunting)];

  it('every haunting of the file is in a mapping, and every mapping names one', () => {
    for (const id of ids) expect(mapped, id).toContain(id);
    for (const id of mapped) expect(ids).toContain(id);
  });

  it('the flags map from each entry\'s **Flag:** line', () => {
    expect(flagLinks()).toEqual(Object.fromEntries(data.hauntings.flatMap((h) => h.flagCodes.map((c) => [c, [h.id]]))));
  });

  it('a result of a kind a haunting describes links it, with no exact value, when its inputs are not the case\'s', () => {
    const g = goldens().find((y) => y.mode === 'critical_depth' && y.shape === 'circle' && y.outcome === 'result' && !hauntingCases.has(y.id))!;
    const job = jobOf(g);
    const state = classify(job, runJob(job));
    if (state.kind !== 'result') throw new Error('not a result');
    expect(state.exact).toBeNull();
    expect(state.links.map((l) => l.haunting)).toEqual(expect.arrayContaining(['H-003', 'H-004', 'H-007']));
    expect(textOf(resultsView(resultsModel(job, state)))).toContain('H-004');
  });
});
