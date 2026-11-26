// The cut-off line (quickened-app criterion 6.8): beside Area, Top Wid and Wet Per exactly when
// the Result carries cut_off_area_counted, over every irregular golden.
import { describe, expect, it } from 'vitest';
import type { AppJob } from '../src/ui/job.ts';
import { classify, runJob } from '../src/ui/state.ts';
import { CUT_OFF_LINE, resultsModel, resultsView } from '../src/ui/views/results.ts';
import { findAll, textOf } from '../src/ui/vnode.ts';
import { goldens } from './golden.ts';

const irregular = goldens().filter((g) => g.outcome === 'result' && g.mode === 'normal_depth' && g.shape === 'irregular');

describe('the cut-off line', () => {
  it(`is beside Area, Top Wid and Wet Per exactly when the Result has cut_off_area_counted (${irregular.length} irregular goldens)`, () => {
    let withFlag = 0;
    for (const g of irregular) {
      const job: AppJob = { mode: 'normal_depth', shape: 'irregular', inputs: { ...g.inputs }, origin: 'typed' };
      const state = classify(job, runJob(job));
      expect(state.kind, g.id).toBe('result');
      if (state.kind !== 'result') continue;
      const cutOff = state.result.flags.some((f) => f.code === 'cut_off_area_counted');
      if (cutOff) withFlag += 1;
      const m = resultsModel(job, state);
      const rows = [...m.inputs, ...m.outputs];
      expect(rows.filter((r) => r.notes.includes(CUT_OFF_LINE)).map((r) => r.field).sort(), g.id)
        .toEqual(cutOff ? ['area', 'top_width', 'wet_perimeter'] : []);
      // In the view, the line sits in those fields' rows.
      const view = resultsView(m);
      const lineRows = findAll(view, (n) => n.tag === 'tr' && textOf(n).includes(CUT_OFF_LINE));
      expect(lineRows.length, g.id).toBe(cutOff ? 3 : 0);
    }
    expect(withFlag).toBeGreaterThan(0);
    expect(withFlag).toBeLessThan(irregular.length);
  });
});
