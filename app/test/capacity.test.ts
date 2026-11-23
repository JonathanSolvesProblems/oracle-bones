// Channel Capacity on the V-ditch, rectangle and trapezoid: what the comparator does not grade.
import { describe, expect, it } from 'vitest';
import { solve } from '../src/solver/index.ts';
import { golden } from './golden.ts';

describe('Channel Capacity, prismatic: flags and unobserved inputs', () => {
  it('computes with n of -1 and raises negative_input (cc-trap-000015)', () => {
    const r = solve({ mode: 'channel_capacity', shape: 'trapezoid', inputs: golden('cc-trap-000015').inputs });
    expect(r.outcome).toBe('result');
    expect(r.raw.discharge!).toBeLessThan(0);
    expect(r.flags).toEqual([expect.objectContaining({ code: 'negative_input', fields: ['in_bottom_width', 'in_n'] })]);
  });
  it('answers not observed for a negative slope, which no case has tried', () => {
    const r = solve({ mode: 'channel_capacity', shape: 'rectangle', inputs: { bottom_width: '10', n: '.035', depth: '3', slope: '-1' } });
    expect(r).toMatchObject({ outcome: 'error', message: 'not observed', printed: {} });
  });
});
