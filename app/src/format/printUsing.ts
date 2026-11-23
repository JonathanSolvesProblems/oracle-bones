// QuickBASIC PRINT USING for the fixed numeric formats QUICK-2 uses (`##.#`, `####.#`,
// `#.####`, `######`, `###.##` and the like).
//
// - The number is rounded half away from zero on its exact stored value (pass the
//   single-precision value) and right-aligned in the format's width.
// - A number too wide for its format prints as `%` and the number with the format's decimals
//   (criterion 8.1).
// - When that text (sign, digits, point and decimals) is longer than OVERFLOW_MAX_CHARS
//   characters, QuickBASIC prints an exponent
//   instead, with the mantissa laid out in the format's own positions: a sign position, then
//   the remaining integer positions, the point and the decimals, then `E+nn`.
//
// Unobserved: negative values that round to zero (printed here with their `-`), formats with
// no integer position, and values that are not finite.

import { DECIMAL_BASE, OVERFLOW_MAX_CHARS } from '../solver/constants.ts';

export interface NumericFormat {
  /** Digit positions before the point. */
  int: number;
  /** Digit positions after the point; 0 when the format has no point. */
  dec: number;
  /** Whether the format has a point. */
  point: boolean;
}

const FORMAT = /^(#+)(?:\.(#+))?$/;

export function parseFormat(picture: string): NumericFormat {
  const m = FORMAT.exec(picture);
  if (!m) throw new Error(`not a numeric format: ${picture}`);
  const intPart = m[1] ?? '';
  const decPart = m[2] ?? '';
  return { int: intPart.length, dec: decPart.length, point: m[2] !== undefined };
}

export function formatWidth(f: NumericFormat): number {
  return f.int + (f.point ? f.dec + 1 : 0);
}

/** `|x|` written with `dec` decimals, rounded half away from zero on x's exact value. */
function fixed(absX: number, dec: number): string {
  return absX.toFixed(dec);
}

function exponentForm(x: number, f: NumericFormat): string {
  const neg = x < 0;
  const ax = Math.abs(x);
  const digitsBefore = Math.max(f.int - 1, 0);
  let e = Math.floor(Math.log10(ax)) - (digitsBefore - 1);
  let mant = fixed(ax / Math.pow(DECIMAL_BASE, e), f.dec);
  // Rounding can carry into one more integer digit (9.99 to 10.0); shift the exponent.
  if (mant.split('.')[0]!.length > digitsBefore) {
    e += 1;
    mant = fixed(ax / Math.pow(DECIMAL_BASE, e), f.dec);
  }
  const exp = Math.abs(e).toString().padStart(2, '0');
  return (neg ? '-' : ' ') + mant + 'E' + (e < 0 ? '-' : '+') + exp;
}

/** PRINT USING `picture`; `x`. */
export function printUsing(x: number, picture: string): string {
  const f = parseFormat(picture);
  const width = formatWidth(f);
  const ax = Math.abs(x);
  const body = fixed(ax, f.dec);
  const text = (x < 0 ? '-' : '') + body;
  if (text.length <= width) return text.padStart(width, ' ');
  if (text.length > OVERFLOW_MAX_CHARS || body.includes('e')) return '%' + exponentForm(x, f);
  return '%' + text;
}
