// The drawing's labels (fix before task 12). No two label boxes on a drawing overlap, over every
// result golden; every box stays inside the drawing. The water-surface elevation sits at the right
// end of the water line, each bank station under its tick, and a full pipe's assumption above the
// line (seen overlapping on nd-irr-000006 and nd-irr-000010).
import { describe, expect, it } from 'vitest';
import type { AppJob } from '../src/ui/job.ts';
import { runJob } from '../src/ui/state.ts';
import { BOX, frameFor } from '../src/ui/drawing/axis.ts';
import { placeLabels, overlaps, type PlacedLabel } from '../src/ui/drawing/labels.ts';
import { DRAWING_WORDS, sectionDrawing, type DrawingModel } from '../src/ui/drawing/section.ts';
import { drawingView } from '../src/ui/drawing/svg.ts';
import { findAll, textOf } from '../src/ui/vnode.ts';
import { golden, goldens } from './golden.ts';

const jobOf = (g: { mode: string; shape: string; inputs: Record<string, string> }): AppJob =>
  ({ mode: g.mode, shape: g.shape, inputs: { ...g.inputs }, origin: 'typed' }) as AppJob;
const drawn = (g: { mode: string; shape: string; inputs: Record<string, string> }): DrawingModel | null =>
  sectionDrawing(jobOf(g), runJob(jobOf(g)));
/** Every result golden of a built pair: Step-Backwater's results are not built, so not drawn. */
const results = goldens().filter((g) => g.outcome === 'result' && runJob(jobOf(g)).outcome === 'result');

describe('the drawing labels', () => {
  it('never overlap, and stay inside the drawing, on every result golden', () => {
    let checked = 0;
    for (const g of results) {
      const m = drawn(g);
      if (!m) continue;
      checked++;
      const labels = placeLabels(m, frameFor(m));
      for (const l of labels) {
        expect(l.box.x0, `${g.id} ${l.text}`).toBeGreaterThanOrEqual(0);
        expect(l.box.y0, `${g.id} ${l.text}`).toBeGreaterThanOrEqual(0);
        expect(l.box.x1, `${g.id} ${l.text}`).toBeLessThanOrEqual(BOX.width);
        expect(l.box.y1, `${g.id} ${l.text}`).toBeLessThanOrEqual(BOX.height);
      }
      for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
        expect(overlaps(labels[i]!.box, labels[j]!.box), `${g.id}: "${labels[i]!.text}" over "${labels[j]!.text}"`).toBe(false);
      }
    }
    expect(checked).toBe(results.length);
  });
  it('renders exactly the placed labels as the drawing text', () => {
    for (const g of results) {
      const m = drawn(g)!;
      const placed = placeLabels(m, frameFor(m)).map((l) => l.text).sort();
      const shown = findAll(drawingView(m), (n) => n.tag === 'text').map(textOf).sort();
      expect(shown, g.id).toEqual(placed);
    }
  });
  for (const id of ['nd-irr-000006', 'nd-irr-000010']) {
    it(`${id}: the elevation at the right end of the water line, the banks under their ticks`, () => {
      const m = drawn(golden(id))!;
      const f = frameFor(m);
      const labels = placeLabels(m, f);
      const ws = labels.find((l) => l.role === 'ws')!;
      const right = f.px(Math.max(...m.spans.map((s) => s.to)));
      expect(Math.abs(ws.x - right), 'the elevation starts or ends at the line\'s right end').toBeLessThanOrEqual(6);
      const banks = labels.filter((l) => l.role === 'bank');
      expect(banks.map((b) => b.x)).toEqual(m.banks.map((x) => f.px(x)));
      for (const b of banks) {
        const v = m.values.find((x) => x.role === 'bank' && f.px(x.at.x) === b.x)!;
        expect(b.box.y0, b.text).toBeGreaterThanOrEqual(f.py(v.at.y));
      }
    });
  }
  it('puts the full-pipe assumption above the water line', () => {
    const full = results.map((g) => ({ g, m: drawn(g)! })).filter(({ m }) => m.spans.some((s) => s.assumed));
    expect(full.length).toBeGreaterThan(0);
    for (const { g, m } of full) {
      const f = frameFor(m);
      const l = placeLabels(m, f).find((x) => x.text === DRAWING_WORDS.fullPipe)!;
      expect(l.box.y1, g.id).toBeLessThanOrEqual(f.py(m.waterLevel));
    }
  });
  it('sees an overlap', () => {
    const a: PlacedLabel['box'] = { x0: 0, y0: 0, x1: 10, y1: 10 };
    expect(overlaps(a, { x0: 9, y0: 9, x1: 20, y1: 20 })).toBe(true);
    expect(overlaps(a, { x0: 10, y0: 0, x1: 20, y1: 10 })).toBe(false);
  });
});
