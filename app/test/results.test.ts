// Property 1: same code, same answer (quickened-app criteria 2.1, 2.5, 6.1 to 6.6; design: How the
// UI calls solve()). For every golden, the text the results screen shows for each printed field
// equals respond()'s printed text, trimmed, and the state kind matches respond()'s outcome.
import { describe, expect, it } from 'vitest';
import { solve, type Mode, type Shape } from '../src/solver/index.ts';
import { respond } from '../src/oracle/contract.ts';
import type { AppJob } from '../src/ui/job.ts';
import { classify, runJob } from '../src/ui/state.ts';
import { COMPUTED_HEADING, ECHOED_HEADING, resultsModel, resultsView } from '../src/ui/views/results.ts';
import { screenLabel } from '../src/ui/forms.ts';
import { findAll, textOf } from '../src/ui/vnode.ts';
import { goldens } from './golden.ts';

const KIND_OF: Record<string, string[]> = { result: ['result'], rejected: ['held', 'rejected'], error: ['stopped', 'not_built', 'failed'] };

const compared = goldens().filter((g) => g.outcome !== 'observed');

describe('Property 1: same code, same answer', () => {
  const runs = compared.map((g) => {
    const job: AppJob = { mode: g.mode as Mode, shape: g.shape as Shape, inputs: { ...g.inputs }, origin: 'typed' };
    const response = respond(JSON.stringify({ id: g.id, mode: g.mode, shape: g.shape, inputs: g.inputs }), solve)!;
    return { g, job, response, state: classify(job, runJob(job)) };
  });

  it(`the state kind matches respond()'s outcome for each of the ${compared.length} goldens`, () => {
    for (const { g, response, state } of runs) expect(KIND_OF[response.outcome], g.id).toContain(state.kind);
  });

  it('each printed field is shown as respond()\'s printed text, trimmed, and no other output is shown', () => {
    let results = 0;
    for (const { g, job, response, state } of runs) {
      if (state.kind !== 'result') continue;
      results += 1;
      const m = resultsModel(job, state);
      const shown = Object.fromEntries([...m.inputs, ...m.outputs].map((f) => [f.field, f.text]));
      const expected = Object.fromEntries(Object.entries(response.printed).map(([k, v]) => [k, v.trim()]));
      expect(shown, g.id).toEqual(expected);
      // The view's cells hold the same text.
      const cells = findAll(resultsView(m), (n) => n.attrs['data-field'] !== undefined);
      const fromView = Object.fromEntries(cells.map((c) => [c.attrs['data-field'], c.children.join('')]));
      expect(fromView, g.id).toEqual(expected);
      expect(m.mainFigure.text, g.id).toBe(expected[m.mainFigure.field]);
    }
    expect(results).toBeGreaterThan(0);
  });
});

describe('the results screen', () => {
  const g = compared.find((x) => x.id === 'nd-irr-000006')!;
  const job: AppJob = { mode: 'normal_depth', shape: 'irregular', inputs: { ...g.inputs }, origin: 'typed' };
  const state = classify(job, runJob(job));

  it('labels the echoed inputs as the engineer\'s and the outputs as computed by QUICK-2\'s method (2.5)', () => {
    expect(state.kind).toBe('result');
    if (state.kind !== 'result') return;
    const m = resultsModel(job, state);
    expect(m.inputs.length).toBeGreaterThan(0);
    expect(m.inputs.every((f) => f.field.startsWith('in_'))).toBe(true);
    expect(m.outputs.every((f) => !f.field.startsWith('in_'))).toBe(true);
    const text = textOf(resultsView(m));
    expect(text).toContain(ECHOED_HEADING);
    expect(text).toContain(COMPUTED_HEADING);
  });

  it('puts each field under QUICK-2\'s label for it', () => {
    if (state.kind !== 'result') return;
    const m = resultsModel(job, state);
    for (const f of [...m.inputs, ...m.outputs]) expect(f.label).toBe(screenLabel(job.mode, job.shape, f.field));
  });

  it('the main figure is WS ELEV on the irregular section, Depth on Normal and Critical Depth, Discharge on Channel Capacity', () => {
    const fieldOf = (mode: Mode, shape: Shape) => {
      const x = compared.find((y) => y.mode === mode && y.shape === shape && y.outcome === 'result')!;
      const j: AppJob = { mode, shape, inputs: { ...x.inputs }, origin: 'typed' };
      const s = classify(j, runJob(j));
      return s.kind === 'result' ? resultsModel(j, s).mainFigure.field : null;
    };
    expect(fieldOf('normal_depth', 'irregular')).toBe('ws_elev');
    expect(fieldOf('normal_depth', 'trapezoid')).toBe('depth');
    expect(fieldOf('critical_depth', 'circle')).toBe('depth');
    expect(fieldOf('channel_capacity', 'rectangle')).toBe('discharge');
  });
});
