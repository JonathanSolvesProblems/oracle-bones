import { describe, expect, it } from 'vitest';
import { search } from '../src/solver/search.ts';
import { solve } from '../src/solver/index.ts';

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

describe('solve', () => {
  it('answers not built for pairs not built yet', () => {
    expect(solve({ mode: 'critical_depth', shape: 'circle', inputs: {} })).toMatchObject({ outcome: 'error', message: 'not built' });
  });
  it('holds the first prompt that reads as 0', () => {
    const r = solve({ mode: 'normal_depth', shape: 'trapezoid', inputs: { left_slope: '3', right_slope: '0', bottom_width: '0', n: '.035', discharge: '300', slope: '.005' } });
    expect(r).toMatchObject({ outcome: 'rejected', held: 'right_slope', printed: {}, message: null });
  });
});
