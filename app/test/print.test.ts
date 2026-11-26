// The print view (quickened-app task 8.1; criteria 4.1, 4.3 to 4.6, 2.3; design: The print view).
// The model holds the echoed inputs, the outputs, every flag sentence, the drawing, the date as
// yyyy-mm-dd, the version and commit, the notice, the exact values where the results screen shows
// them, the sources and discharge sentence of either worked example, the ground points four pairs
// to a row, and no control. Print is offered only for outcome `result`.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { data } from 'virtual:quickened/data';
import type { Mode, Shape } from '../src/solver/index.ts';
import { enter, sectionKeys } from '../src/solver/groundPoints.ts';
import type { AppJob } from '../src/ui/job.ts';
import { classify, runJob, type ShownState } from '../src/ui/state.ts';
import { dischargeSentence, exampleJob } from '../src/ui/views/example.ts';
import { NOTICE } from '../src/ui/views/notice.ts';
import { printDate, printModel, printView, PRINT_ACTION } from '../src/ui/views/print.ts';
import { resultsModel } from '../src/ui/views/results.ts';
import { screenView } from '../src/ui/views/screen.ts';
import { findAll, textOf } from '../src/ui/vnode.ts';
import { goldens, ROOT } from './golden.ts';

const VERSION = JSON.parse(readFileSync(join(ROOT, 'app', 'package.json'), 'utf-8')).version as string;
const DATE = new Date(2026, 10, 26, 9, 5);
const jobOf = (g: { mode: string; shape: string; inputs: Readonly<Record<string, string>> }): AppJob =>
  ({ mode: g.mode as Mode, shape: g.shape as Shape, inputs: { ...g.inputs }, origin: 'typed' });

function resultOf(job: AppJob): Extract<ShownState, { kind: 'result' }> {
  const s = classify(job, runJob(job));
  if (s.kind !== 'result') throw new Error('not a result');
  return s;
}

const results = goldens().filter((g) => g.outcome === 'result').map(jobOf).filter((j) => runJob(j).outcome === 'result');
const flagged = results.find((j) => runJob(j).flags.length > 0)!;
const regular = results.find((j) => j.shape === 'trapezoid')!;
const CONTROLS = (n: { tag: string }) => ['button', 'input', 'textarea', 'select', 'a', 'nav', 'form'].includes(n.tag);

describe('the print view', () => {
  for (const job of [exampleJob('main_example'), exampleJob('cutoff_example'), flagged, regular]) {
    it(`${job.origin === 'typed' ? `${job.mode}/${job.shape}` : job.origin}: holds what criterion 4.1 lists, and no control`, () => {
      const state = resultOf(job);
      const rm = resultsModel(job, state);
      const m = printModel(job, state, DATE);
      expect(m.inputs.map((r) => [r.field, r.text])).toEqual(rm.inputs.map((r) => [r.field, r.text]));
      expect(m.outputs.map((r) => [r.field, r.text, r.exact])).toEqual(rm.outputs.map((r) => [r.field, r.text, r.exact]));
      const view = printView(m);
      const text = textOf(view);
      for (const f of state.result.flags) expect(text).toContain(f.text);
      expect(findAll(view, (n) => n.tag === 'svg' && n.attrs.class === 'section-drawing')).toHaveLength(1);
      expect(m.header.date).toBe('2026-11-26');
      expect(text).toContain('2026-11-26');
      expect(m.header.version).toBe(VERSION);
      expect(m.header.commit).toBe(data.build.commit);
      expect(m.header.commit).toMatch(/^[0-9a-f]{7,}$/);
      expect(text).toContain(`${VERSION}`);
      expect(text).toContain(m.header.commit);
      expect(text).toContain('Quickened');
      expect(text).toContain(NOTICE);
      expect(findAll(view, CONTROLS)).toEqual([]);
      // Exact values where the results screen shows them, on their fields' rows.
      const cells = findAll(view, (n) => n.attrs['data-exact'] !== undefined);
      expect(Object.fromEntries(cells.map((c) => [c.attrs['data-exact'], textOf(c).replace(/^Exact /, '')])))
        .toEqual(Object.fromEntries(rm.outputs.concat(rm.inputs).filter((r) => r.exact !== null).map((r) => [r.field, r.exact])));
      // The sources and discharge sentence go with either worked example, and only with one.
      if (job.origin === 'typed') {
        expect(m.sources).toBeNull();
      } else {
        expect(m.sources).not.toBeNull();
        expect(text).toContain(dischargeSentence(job.origin));
        for (const i of data.sources.items) expect(text).toContain(i.text);
        for (const c of data.sources.caveats) expect(text).toContain(c);
      }
      // Ground points four station and elevation pairs to a row, as QUICK-2's editor shows them.
      if (job.shape === 'irregular') {
        const kept = enter(sectionKeys(job.inputs)).points.map((p) => [p.stationText, p.elevationText]);
        expect(m.groundRows.flat()).toEqual(kept);
        m.groundRows.forEach((row, i) => expect(row.length).toBe(i < m.groundRows.length - 1 ? 4 : row.length));
        expect(m.groundRows.every((row) => row.length >= 1 && row.length <= 4)).toBe(true);
      } else {
        expect(m.groundRows).toEqual([]);
      }
    });
  }

  it('cut-off example: H-001\'s exact values are in the print', () => {
    const job = exampleJob('cutoff_example');
    const m = printModel(job, resultOf(job), DATE);
    const line = data.hauntings.find((h) => h.id === 'H-001')!.exactByField[0]!;
    expect(Object.fromEntries(m.outputs.filter((r) => r.exact !== null).map((r) => [r.field, r.exact]))).toEqual(line.values);
  });

  it('writes the local date as yyyy-mm-dd', () => {
    expect(printDate(new Date(2027, 0, 5, 23, 59))).toBe('2027-01-05');
    expect(printDate(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31');
  });

  it('offers Print only for outcome result (4.3)', () => {
    const seen = new Set<string>();
    for (const g of goldens().filter((x) => x.outcome !== 'observed')) {
      const job = jobOf(g);
      const state = classify(job, runJob(job));
      if (seen.has(state.kind)) continue;
      seen.add(state.kind);
      const node = screenView(job, state)!.node;
      const print = findAll(node, (n) => n.tag === 'button' && n.on.click?.type === PRINT_ACTION);
      expect(print.length, state.kind).toBe(state.kind === 'result' ? 1 : 0);
    }
    expect(seen.has('result')).toBe(true);
    expect(seen.size).toBeGreaterThan(2);
  });
});
