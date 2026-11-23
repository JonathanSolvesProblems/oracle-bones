// QuickBASIC's plain PRINT of a single-precision number: a sign position (a space, or `-`),
// up to SINGLE_PRINT_DIGITS significant digits with trailing zeros dropped and no leading zero
// before the point, then one trailing space. Only whole numbers have been observed (`35`,
// `-50`); fractions and the exponent form are written from the manual and are unobserved.

import { SINGLE_PRINT_DIGITS } from '../solver/constants.ts';

export function printNumber(x: number): string {
  const v = Math.fround(x);
  const sign = v < 0 ? '-' : ' ';
  let digits = Math.abs(v).toPrecision(SINGLE_PRINT_DIGITS);
  if (digits.includes('e')) {
    const [m, e] = digits.split('e') as [string, string];
    const mant = m.includes('.') ? m.replace(/0+$/, '').replace(/\.$/, '') : m;
    const exp = Number(e);
    digits = `${mant}E${exp < 0 ? '-' : '+'}${String(Math.abs(exp)).padStart(2, '0')}`;
  } else if (digits.includes('.')) {
    digits = digits.replace(/0+$/, '').replace(/\.$/, '');
  }
  if (digits.startsWith('0.')) digits = digits.slice(1);
  return `${sign}${digits} `;
}
