import { describe, expect, it } from 'vitest';
import { search } from '../src/solver/search.ts';
import { solve } from '../src/solver/index.ts';
import { readFileSync } from 'node:fs';
import { SNAPSHOT_PATH, computeSnapshot, entryOf, exactDecimal, searchOf, type SnapshotEntry } from './searchSnapshot.ts';
import { golden } from './golden.ts';

const spec = { bottom: 0, first: 0.5, step: 0.5 };

describe('search', () => {
  it('stops on a step when a trial is within 1%', () => {
    const r = search((y) => y * y, 4.03, spec);
    expect(r).toMatchObject({ ok: true, y: 2 });
  });
  it('interpolates from the last trial below, and undershoots on a convex F', () => {
    const r = search((y) => y * y, 5, spec);
    if (!r.ok) throw new Error('search failed');
    expect(r.y).toBeLessThan(Math.sqrt(5));
    expect(Math.abs(r.value - 5)).toBeLessThanOrEqual(0.05);
  });
  it('brackets from the bottom when the first trial is already over', () => {
    const r = search((y) => y * y * y, 0.01, spec);
    if (!r.ok) throw new Error('search failed');
    expect(r.y).toBeGreaterThan(0);
    expect(r.y).toBeLessThan(0.5);
  });
  it('gives up, instead of hanging, when F can never reach q', () => {
    expect(search((y) => -y, 100, spec)).toEqual({ ok: false, reason: 'never_finishes' });
    expect(search(() => 0, 100, spec)).toEqual({ ok: false, reason: 'never_finishes' });
  });
  it('reports a value that is not a number', () => {
    expect(search(() => NaN, 100, spec)).toEqual({ ok: false, reason: 'not_a_number' });
  });
});

describe('search options: tol and afterShortChord (circle-outputs 2.5 to 2.7)', () => {
  /** y⁴ on 1 ft steps from 1 ft, with every trial depth recorded. */
  const quartic = () => {
    const ys: number[] = [];
    return { ys, F: (y: number) => { ys.push(y); return y ** 4; } };
  };
  const steps = { bottom: 0, first: 1, step: 1 };

  it('tol: a trial within 1% but not 0.5% stops by default and not with tol 0.005', () => {
    // y² at 2 is 4, 0.74% below 4.03.
    expect(search((y) => y * y, 4.03, spec)).toMatchObject({ ok: true, y: 2 });
    const r = search((y) => y * y, 4.03, { ...spec, tol: 0.005 });
    if (!r.ok) throw new Error('search failed');
    expect(r.y).toBeGreaterThan(2);
    expect(r.y).toBeLessThan(2.5);
    expect(Math.abs(r.value - 4.03)).toBeLessThanOrEqual(0.005 * 4.03);
  });
  it('the defaults are the 1% stop and the resume rule', () => {
    const a = quartic();
    const b = quartic();
    expect(search(a.F, 10, steps)).toEqual(search(b.F, 10, { ...steps, tol: 0.01, afterShortChord: 'resume' }));
    expect(a.ys).toEqual(b.ys);
  });
  it("'resume': after a short chord the next trial is one step above it", () => {
    // Trials 1 (1) and 2 (16) bracket 10; the chord at 1.6 gives 6.55, short.
    const t = quartic();
    const r = search(t.F, 10, { ...steps, tol: 0.005 });
    expect(r.ok).toBe(true);
    expect(t.ys.slice(0, 4)).toEqual([1, 2, Math.fround(1.6), Math.fround(Math.fround(1.6) + 1)]);
  });
  it("'narrow': after a short chord every later trial stays inside [chord, upper trial]", () => {
    const t = quartic();
    const r = search(t.F, 10, { ...steps, tol: 0.005, afterShortChord: 'narrow' });
    if (!r.ok) throw new Error('search failed');
    expect(t.ys.slice(0, 3)).toEqual([1, 2, Math.fround(1.6)]);
    const later = t.ys.slice(3);
    expect(later.length).toBeGreaterThan(1);
    for (let i = 0; i < later.length; i++) {
      expect(later[i]).toBeLessThan(2);
      expect(later[i]).toBeGreaterThan(i === 0 ? Math.fround(1.6) : later[i - 1]!);
    }
    expect(Math.abs(r.value - 10)).toBeLessThanOrEqual(0.005 * 10);
    expect(r.trials).toBe(t.ys.length);
  });
});

describe('preservation: the prismatic and irregular searches return what they returned before circle-outputs (3.6)', () => {
  const { _note: note, ...snapshot } = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf-8')) as Record<string, SnapshotEntry> & { _note: string };
  it('the snapshot says where it came from', () => {
    expect(note).toMatch(/at commit [0-9a-f]{7,}/);
  });
  it('writes doubles as exact decimals', () => {
    expect(exactDecimal(0.5)).toBe('0.5');
    expect(exactDecimal(0.1)).toBe('0.1000000000000000055511151231257827021181583404541015625');
    expect(exactDecimal(-3)).toBe('-3');
  });
  it('every prismatic and irregular golden that reaches the search is in the snapshot, and no other', () => {
    expect(Object.keys(computeSnapshot()).sort()).toEqual(Object.keys(snapshot).sort());
  });
  for (const [id, entry] of Object.entries(snapshot)) {
    it(`${id}: same depth, value and trial count`, () => {
      const r = searchOf(golden(id));
      if (!r) throw new Error(`${id} no longer reaches the search`);
      expect(entryOf(entry.pair, r)).toEqual(entry);
    });
  }
});

describe('solve', () => {
  it('answers not built for pairs not built yet', () => {
    expect(solve({ mode: 'step_backwater', shape: 'irregular', inputs: {} })).toMatchObject({ outcome: 'error', message: 'not built' });
  });
  it('holds the first prompt that reads as 0', () => {
    const r = solve({ mode: 'normal_depth', shape: 'trapezoid', inputs: { left_slope: '3', right_slope: '0', bottom_width: '0', n: '.035', discharge: '300', slope: '.005' } });
    expect(r).toMatchObject({ outcome: 'rejected', held: 'right_slope', printed: {}, message: null });
  });
});
