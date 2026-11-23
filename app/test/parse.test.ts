import { describe, expect, it } from 'vitest';
import { heldAsZero, readSingle, val } from '../src/solver/parse.ts';
import { store } from '../src/solver/single.ts';

describe('val', () => {
  it('reads the plain decimals typed in the goldens', () => {
    expect(val('3')).toBe(3);
    expect(val('.035')).toBe(0.035);
    expect(val('-1')).toBe(-1);
    expect(val('12.5')).toBe(12.5);
    expect(val('9.9999')).toBe(9.9999);
    expect(val('-50')).toBe(-50);
  });
  it('reads .000 as 0, which holds the prompt (criteria 1.1, 8.6)', () => {
    expect(val('.000')).toBe(0);
    expect(heldAsZero(readSingle('.000'))).toBe(true);
    expect(heldAsZero(readSingle('0'))).toBe(true);
  });
  it('stops at the first character that does not fit', () => {
    expect(val('12x4')).toBe(12);
    expect(val('1.2.3')).toBe(1.2);
    expect(val('abc')).toBe(0);
    expect(val('')).toBe(0);
  });
  it('follows VAL for blanks and exponents, which are unobserved', () => {
    expect(val(' 1 2')).toBe(12);
    expect(val('1E3')).toBe(1000);
    expect(val('1D2')).toBe(100);
  });
});

describe('readSingle', () => {
  it('stores in single precision', () => {
    expect(readSingle('.035')).toBe(Math.fround(0.035));
    expect(readSingle('.035')).not.toBe(0.035);
    expect(store(2127.65)).toBeLessThan(2127.65);
  });
  it('accepts -1 at every trapezoid prompt (criterion 2.1)', () => {
    for (const typed of ['-1']) {
      const v = readSingle(typed);
      expect(v).toBe(-1);
      expect(heldAsZero(v)).toBe(false);
    }
  });
  it('accepts small non-zero values (criterion 8.4)', () => {
    for (const typed of ['.04', '.00001']) expect(heldAsZero(readSingle(typed))).toBe(false);
  });
});
