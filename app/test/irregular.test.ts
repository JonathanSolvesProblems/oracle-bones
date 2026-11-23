import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { flowAt, wetSegment, type IrregularSection } from '../src/solver/geometry/irregular.ts';

const section = (pts: [number, number][], bl: number, br: number): IrregularSection => ({
  points: pts.map(([station, elevation]) => ({ station, elevation })),
  bankLeft: bl, bankRight: br, nLeft: 0.05, nChannel: 0.035, nRight: 0.05,
});

describe('irregular geometry', () => {
  it('cuts a segment where the water surface crosses it', () => {
    const w = wetSegment(0, 10, 10, 2, 6, 0, 10)!;
    expect(w.topWidth).toBeCloseTo(5);
    expect(w.area).toBeCloseTo(10);
    expect(w.perimeter).toBeCloseTo(Math.hypot(5, 4));
    expect([w.from, w.to]).toEqual([5, 10]);
  });

  it('treats the ends as vertical walls that add no perimeter (criterion 3.12)', () => {
    // Two points (0, 10) and (10, 2), water at 12: above both ends.
    const f = flowAt(section([[0, 10], [10, 2]], 0, 10), 12);
    expect(f.topWidth).toBeCloseTo(10);
    expect(f.perimeter).toBeCloseTo(Math.hypot(10, 8));
    expect(f.area).toBeCloseTo(10 * (2 + 10) / 2);
  });

  it('counts low ground cut off from the channel as wet (criterion 9.7)', () => {
    const f = flowAt(section([[0, 10], [10, 0], [20, 10], [25, 8], [30, 6], [40, 10]], 0, 20), 7);
    expect(f.spans).toHaveLength(2);
    expect(f.right.area).toBeGreaterThan(0);
  });

  it('sums overbank conveyance per segment and takes the channel whole', () => {
    const s = section([[0, 5], [10, 1], [20, 0], [30, 1], [40, 5]], 10, 30);
    const f = flowAt(s, 3);
    const one = wetSegment(0, 5, 10, 1, 3, 0, 10)!;
    expect(f.left.area).toBeCloseTo(one.area);
    expect(f.alpha).toBeGreaterThanOrEqual(1);
    expect(f.conveyance).toBeCloseTo(f.left.conveyance + f.channel.conveyance + f.right.conveyance);
  });
});

// Property 4: water above both ends spans the section. Limited to sections whose two ends are
// their highest points, as in every irregular golden; with a higher interior point the water
// would not span it.
describe('Property 4', () => {
  const sectionArb = fc
    .array(fc.tuple(fc.double({ min: 0.5, max: 50, noNaN: true }), fc.double({ min: 0, max: 30, noNaN: true })), { minLength: 2, maxLength: 40 })
    .chain((raw) => fc.record({
      raw: fc.constant(raw),
      endRise: fc.tuple(fc.double({ min: 0.01, max: 10, noNaN: true }), fc.double({ min: 0.01, max: 10, noNaN: true })),
      above: fc.double({ min: 0.01, max: 20, noNaN: true }),
      first: fc.double({ min: -100, max: 100, noNaN: true }),
    }));
  it('Top Wid is the last station minus the first, and Wet Per is the ground length', () => {
    fc.assert(fc.property(sectionArb, ({ raw, endRise, above, first }) => {
      let x = first;
      const pts: [number, number][] = raw.map(([dx, z]) => { const p: [number, number] = [x, z]; x += dx; return p; });
      const top = Math.max(...pts.map((p) => p[1]));
      pts[0]![1] = top + endRise[0];
      pts[pts.length - 1]![1] = top + endRise[1];
      const ws = Math.max(pts[0]![1], pts[pts.length - 1]![1]) + above;
      const span = pts[pts.length - 1]![0] - pts[0]![0];
      let length = 0;
      for (let i = 0; i + 1 < pts.length; i++) length += Math.hypot(pts[i + 1]![0] - pts[i]![0], pts[i + 1]![1] - pts[i]![1]);
      const mid = pts[Math.floor(pts.length / 2)]![0];
      const f = flowAt(section(pts, pts[0]![0], mid), ws);
      expect(f.topWidth).toBeCloseTo(span, 6);
      expect(f.perimeter).toBeCloseTo(length, 6);
    }));
  });
});
