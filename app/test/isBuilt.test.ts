// isBuilt(mode, shape) agrees with solve() (quickened-app criterion 7.4; design: The two solver
// additions). For every mode and shape, isBuilt is false exactly when solve() answers `not built`
// for each of that pair's golden inputs, or, where no golden exists, for a probe job.
import { describe, expect, it } from 'vitest';
import { isBuilt, NOT_BUILT, solve, type Mode, type Shape } from '../src/solver/index.ts';
import { regularPrompts } from '../src/solver/forms.ts';
import { golden, goldens } from './golden.ts';

const MODES: Mode[] = ['critical_depth', 'channel_capacity', 'normal_depth', 'step_backwater'];
const SHAPES: Shape[] = ['v_ditch', 'rectangle', 'trapezoid', 'circle', 'irregular'];

const answersNotBuilt = (mode: Mode, shape: Shape, inputs: Record<string, string>) => {
  const r = solve({ mode, shape, inputs });
  return r.outcome === 'error' && r.message === NOT_BUILT;
};

/** A probe job for a pair no golden covers: plain values at every prompt the pair could ask. */
function probe(mode: Mode, shape: Shape): Record<string, string> {
  if (shape === 'irregular') return { ...golden('nd-irr-000006').inputs };
  const m = mode === 'step_backwater' ? 'normal_depth' : mode;
  return Object.fromEntries(regularPrompts(m, shape).map((p) => [p, '1']));
}

const compared = goldens().filter((g) => g.outcome !== 'observed');

describe('isBuilt agrees with solve()', () => {
  for (const mode of MODES) {
    for (const shape of SHAPES) {
      const cases = compared.filter((g) => g.mode === mode && g.shape === shape);
      it(`${mode}/${shape} (${cases.length ? `${cases.length} goldens` : 'probe job'})`, () => {
        const jobs = cases.length ? cases.map((g) => g.inputs) : [probe(mode, shape)];
        for (const inputs of jobs) expect(answersNotBuilt(mode, shape, inputs)).toBe(!isBuilt(mode, shape));
      });
    }
  }

  it('today: Step-Backwater and the irregular Critical Depth and Channel Capacity are not built', () => {
    const notBuilt = MODES.flatMap((m) => SHAPES.filter((s) => !isBuilt(m, s)).map((s) => `${m}/${s}`));
    expect(notBuilt).toEqual([
      'critical_depth/irregular', 'channel_capacity/irregular',
      ...SHAPES.map((s) => `step_backwater/${s}`),
    ]);
  });
});
