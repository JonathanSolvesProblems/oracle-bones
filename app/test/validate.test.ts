// Property 6: plain decimals only (quickened-app criterion 1.9; design: Validation).
// validate accepts a string exactly when it is a plain decimal, and for any job with a field
// that is not one, the solver is not called.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { invalidFields, isPlainDecimal, whenValid } from '../src/ui/validate.ts';

/** The glossary's rule, written as a scan: an optional "-", digits with at most one ".", at least one digit. */
function reference(s: string): boolean {
  let i = s.startsWith('-') ? 1 : 0;
  let digits = 0;
  let points = 0;
  if (i === s.length) return false;
  for (; i < s.length; i++) {
    const c = s[i]!;
    if (c >= '0' && c <= '9') digits += 1;
    else if (c === '.') points += 1;
    else return false;
  }
  return digits >= 1 && points <= 1;
}

const digits = fc.string({ unit: fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), maxLength: 6 });
const plainDecimal = fc.tuple(fc.boolean(), digits, fc.boolean(), digits)
  .filter(([, a, point, b]) => (a + b).length >= 1 && (point || b === ''))
  .map(([neg, a, point, b]) => `${neg ? '-' : ''}${a}${point ? '.' : ''}${b}`);
const nearMiss = fc.string({ unit: fc.constantFrom('0', '1', '.', '-', '+', ' ', 'e', 'E', '\t', ',', 'a'), maxLength: 8 });

describe('Property 6: plain decimals only', () => {
  it('the recorded kinds of value are plain decimals', () => {
    for (const s of ['12', '.035', '-1', '0.00', '0', '230.77', '-60', '5.']) expect(isPlainDecimal(s), s).toBe(true);
  });

  it('empty text, blanks, a plus sign, an exponent, two points and no digit are not', () => {
    for (const s of ['', ' ', ' 1', '1 ', '+1', '1e3', '1E3', '1.2.3', '.', '-', '--1', '1,5', '1-']) expect(isPlainDecimal(s), JSON.stringify(s)).toBe(false);
  });

  it('accepts every generated plain decimal', () => {
    fc.assert(fc.property(plainDecimal, (s) => { expect(isPlainDecimal(s)).toBe(true); }));
  });

  it('accepts any string exactly when the glossary\'s rule does', () => {
    fc.assert(fc.property(fc.oneof(fc.string(), nearMiss, plainDecimal), (s) => {
      expect(isPlainDecimal(s)).toBe(reference(s));
    }), { numRuns: 2000 });
  });

  it('names the fields that are not plain decimals, in input order', () => {
    expect(invalidFields({ a: '1', b: '', c: '.5', d: 'x' })).toEqual(['b', 'd']);
  });

  it('for any job with a field that is not a plain decimal, the solver is not called', () => {
    const inputs = fc.dictionary(fc.string({ minLength: 1, maxLength: 8 }), fc.oneof(plainDecimal, nearMiss, fc.string()), { minKeys: 1, maxKeys: 12 });
    fc.assert(fc.property(inputs, (values) => {
      let calls = 0;
      const job = { mode: 'normal_depth' as const, shape: 'trapezoid' as const, inputs: values };
      const out = whenValid(job, () => { calls += 1; return 'ran' as const; });
      const bad = Object.keys(values).filter((k) => !reference(values[k]!));
      if (bad.length) {
        expect(calls).toBe(0);
        expect(out).toEqual({ kind: 'invalid', fields: bad });
      } else {
        expect(calls).toBe(1);
        expect(out).toBe('ran');
      }
    }), { numRuns: 1000 });
  });
});
