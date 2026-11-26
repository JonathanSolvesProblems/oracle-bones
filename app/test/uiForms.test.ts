// Property 8: labels are QUICK-2's (quickened-app criteria 1.1, 1.4, 1.6).
// For every built pair, every label of the form view model occurs in the row text of that pair's
// result screen in layout.ts, the editable fields come in the solver's prompt order, and the
// fixed fields of FIXED_FIELDS are shown, not editable, with the text QUICK-2 prints for them.
import { describe, expect, it } from 'vitest';
import { isBuilt, type Mode, type Shape } from '../src/solver/index.ts';
import { FIXED_FIELDS, ND_IRREGULAR_PROMPTS, regularPrompts } from '../src/solver/forms.ts';
import { ND_IRR_RESULT, REGULAR_RESULT } from '../src/format/layout.ts';
import type { RegularMode, RegularShape } from '../src/solver/types.ts';
import { formFor, type FormModel } from '../src/ui/forms.ts';
import { goldens } from './golden.ts';

const MODES: Mode[] = ['critical_depth', 'channel_capacity', 'normal_depth', 'step_backwater'];
const SHAPES: Shape[] = ['v_ditch', 'rectangle', 'trapezoid', 'circle', 'irregular'];
const BUILT = MODES.flatMap((mode) => SHAPES.filter((shape) => isBuilt(mode, shape)).map((shape) => ({ mode, shape })));

const rowsOf = (mode: Mode, shape: Shape) => (shape === 'irregular'
  ? ND_IRR_RESULT : REGULAR_RESULT[mode as RegularMode][shape as RegularShape]).rows.join('\n');

const fields = (form: FormModel) => form.groups.flatMap((g) => g.fields);

describe('Property 8: labels are QUICK-2\'s', () => {
  it('covers the 13 built pairs', () => expect(BUILT).toHaveLength(13));

  for (const { mode, shape } of BUILT) {
    describe(`${mode}/${shape}`, () => {
      const form = formFor(mode, shape)!;
      const rows = rowsOf(mode, shape);

      it('has a form', () => expect(form).not.toBeNull());

      it('every label occurs in the result screen\'s rows', () => {
        const labels = fields(form).map((f) => f.label);
        if (form.groundPoints) labels.push(form.groundPoints.stationLabel, form.groundPoints.elevationLabel);
        for (const label of labels) {
          expect(label.trim().length, label).toBeGreaterThan(0);
          expect(rows, label).toContain(label);
        }
      });

      it('the editable fields come in the solver\'s prompt order', () => {
        const prompts = shape === 'irregular' ? [...ND_IRREGULAR_PROMPTS] : [...regularPrompts(mode as RegularMode, shape as RegularShape)];
        expect(fields(form).filter((f) => f.editable).map((f) => f.key)).toEqual(prompts);
      });

      it('the fixed fields are shown, not editable, as QUICK-2 prints them', () => {
        const fixed = shape === 'irregular' ? {} : FIXED_FIELDS[shape as RegularShape];
        const shown = fields(form).filter((f) => !f.editable);
        expect(shown.map((f) => f.key).sort()).toEqual(Object.keys(fixed).sort());
        const g = goldens().find((x) => x.mode === mode && x.shape === shape && x.outcome === 'result');
        for (const f of shown) {
          expect(g, 'a result golden of the pair').toBeDefined();
          expect(f.text).toBe(g!.printed[f.window]!.trim());
        }
      });

      it('the ground points are asked only on the irregular section', () => {
        expect(form.groundPoints !== null).toBe(shape === 'irregular');
      });
    });
  }

  it('gives no form for a pair that is not built', () => {
    for (const mode of MODES) for (const shape of SHAPES) {
      if (!isBuilt(mode, shape)) expect(formFor(mode, shape), `${mode}/${shape}`).toBeNull();
    }
  });
});
