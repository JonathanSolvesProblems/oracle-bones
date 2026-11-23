import { describe, expect, it } from 'vitest';
import { ND_TRAP_RESULT } from '../src/format/layout.ts';
import { paint, printed } from '../src/format/screen.ts';

describe('screen painting', () => {
  it('cuts an overflowing value to its window', () => {
    const p = printed(ND_TRAP_RESULT, { in_n: -1, in_left_slope: 100 });
    expect(p.in_n!.trim()).toBe('%-1.00');
    expect(p.in_left_slope!.trim()).toBe('%100');
  });
  it('lets an overflow run over the next label', () => {
    const rows = paint(ND_TRAP_RESULT, { in_discharge: 793879552 });
    expect(rows[10]).toContain('%793879552epth (ft)');
  });
  it('writes text at its picture start', () => {
    const p = printed(ND_TRAP_RESULT, { flow_type: 'SUBCRITICAL' });
    expect(p.flow_type).toBe('  SUBCRITICAL   ');
  });
  it('keeps windows untrimmed', () => {
    expect(printed(ND_TRAP_RESULT, { in_left_slope: 3 }).in_left_slope).toBe(' 3.0');
  });
});
