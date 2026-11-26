// A label is the text between the field before it on its row and its own field, and never holds a
// mask (fix before task 12: the irregular screen's Chan Vel read "Flow Type @@@@@@@@@@@@@ Chan Vel").
// Checked over every window of every built pair's result screen, against the screen's own rows.
import { describe, expect, it } from 'vitest';
import { isBuilt, type Mode, type Shape } from '../src/solver/index.ts';
import { pictureFor, pictures } from '../src/format/screen.ts';
import { screenLabel, screenOf } from '../src/ui/forms.ts';
import { MODES, SHAPES, shapeChoice, STEP_BACKWATER_SHAPE } from '../src/ui/views/picker.ts';

const PAIRS: { mode: Mode; shape: Shape }[] = MODES.flatMap((m) => (shapeChoice(m.mode)
  ? SHAPES.map((s) => ({ mode: m.mode, shape: s.shape })) : [{ mode: m.mode, shape: STEP_BACKWATER_SHAPE }]))
  .filter((p) => isBuilt(p.mode, p.shape));

describe('labels on the result screens', () => {
  it('never hold a mask, and lie between the field before on the row and the field', () => {
    for (const { mode, shape } of PAIRS) {
      const layout = screenOf(mode, shape)!;
      const all = pictures(layout.rows);
      for (const w of Object.keys(layout.windows)) {
        const label = screenLabel(mode, shape, w)!;
        // A mask is a picture: a numeric format or a run of @ (format/screen.ts). "Froude #" is a label.
        expect(pictures([label]), `${mode}/${shape} ${w}: ${label}`).toEqual([]);
        const p = pictureFor(layout, w);
        const prevEnd = Math.max(0, ...all.filter((q) => q.row === p.row && q.col < p.col).map((q) => q.col + q.text.length));
        expect(layout.rows[p.row]!.slice(prevEnd, p.col), `${mode}/${shape} ${w}`).toContain(label);
      }
    }
  });
  it('reads "Chan Vel" for the irregular screen\'s channel velocity', () => {
    const layout = screenOf('normal_depth', 'irregular')!;
    const labels = Object.keys(layout.windows).map((w) => screenLabel('normal_depth', 'irregular', w));
    expect(labels).toContain('Chan Vel');
    expect(labels.filter((l) => l?.includes('Flow Type'))).toEqual(['Flow Type']);
  });
});
