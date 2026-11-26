// The app's Job (quickened-app criterion 1.5; design: The Job model). Each field's text goes to
// solve() exactly as typed, keyed by the contract's names: sta_01, elev_01, ... in row order for
// the ground points, the prompts of forms.ts for the rest.
import { describe, expect, it } from 'vitest';
import { isBuilt, type Mode, type Shape } from '../src/solver/index.ts';
import { formFor } from '../src/ui/forms.ts';
import { buildJob, type Row } from '../src/ui/job.ts';
import { goldens } from './golden.ts';

/** The ground points of a golden's inputs, in row order. */
function rowsOf(inputs: Record<string, string>): Row[] {
  const rows: Row[] = [];
  for (let i = 1; `sta_${String(i).padStart(2, '0')}` in inputs; i++) {
    const n = String(i).padStart(2, '0');
    rows.push({ station: inputs[`sta_${n}`]!, elevation: inputs[`elev_${n}`]! });
  }
  return rows;
}

const compared = goldens().filter((g) => g.outcome !== 'observed');
const built = compared.filter((g) => isBuilt(g.mode as Mode, g.shape as Shape));

describe('buildJob keys each typed text by the contract\'s names', () => {
  it(`covers ${built.length} goldens of built pairs`, () => expect(built.length).toBeGreaterThan(0));

  it('gives every golden of a built pair its inputs, key for key and text for text', () => {
    for (const g of built) {
      const form = formFor(g.mode as Mode, g.shape as Shape)!;
      const values = Object.fromEntries(form.groups.flatMap((x) => x.fields).filter((f) => f.editable).map((f) => [f.key, g.inputs[f.key]!]));
      const job = buildJob(form, values, form.groundPoints ? rowsOf(g.inputs) : []);
      expect(job.inputs, g.id).toEqual(g.inputs);
      expect(Object.keys(job.inputs)).toHaveLength(Object.keys(g.inputs).length);
      expect([job.mode, job.shape, job.origin]).toEqual([g.mode, g.shape, 'typed']);
    }
  });

  it('the goldens left out are those of pairs with no form, Step-Backwater today', () => {
    const left = compared.filter((g) => !built.includes(g));
    for (const g of left) expect(formFor(g.mode as Mode, g.shape as Shape), g.id).toBeNull();
    expect([...new Set(left.map((g) => `${g.mode}/${g.shape}`))]).toEqual(['step_backwater/irregular']);
  });

  it('keeps text exactly as typed, blanks and all, and an empty field as empty text', () => {
    const form = formFor('normal_depth', 'trapezoid')!;
    const job = buildJob(form, { left_slope: ' 2', right_slope: '2.', bottom_width: '010', n: '.035' }, []);
    expect(job.inputs).toEqual({ left_slope: ' 2', right_slope: '2.', bottom_width: '010', n: '.035', discharge: '', slope: '' });
  });

  it('numbers ground points from 01 in row order', () => {
    const form = formFor('normal_depth', 'irregular')!;
    const job = buildJob(form, {}, [{ station: '0', elevation: '10' }, { station: '12.82', elevation: '9' }]);
    expect(Object.keys(job.inputs).slice(0, 4)).toEqual(['sta_01', 'elev_01', 'sta_02', 'elev_02']);
    expect(job.inputs.sta_02).toBe('12.82');
  });
});
