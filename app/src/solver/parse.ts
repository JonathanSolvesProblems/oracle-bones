// Typed text to stored value, and the hold rules a prompt applies to it.
//
// QUICK-2 reads each prompt with QuickBASIC's VAL and stores the result in a single-precision
// variable. Only plain decimals have been typed so far (optional sign, digits, one point, a
// leading point allowed). Exponents, embedded blanks, empty Enter and non-numeric text are
// unobserved (ledger Q-004, Q-019); `val` follows VAL's documented rules for them.

import { store } from './single.ts';

const NUMBER_START = /^[+-]?(\d+\.?\d*|\.\d+)([eEdD][+-]?\d+)?/;

/**
 * QuickBASIC VAL: blanks, tabs and line feeds are ignored, then the longest leading number is
 * read (sign, digits, one point, an optional E or D exponent). No number reads as 0.
 */
export function val(text: string): number {
  const cleaned = text.replace(/[ \t\n\r]/g, '');
  const m = NUMBER_START.exec(cleaned);
  if (!m) return 0;
  const n = Number(m[0].replace(/[dD]/, 'e'));
  return Number.isFinite(n) ? n : 0;
}

/** The value QUICK-2 stores for typed text: VAL, rounded to single precision. */
export function readSingle(text: string): number {
  return store(val(text));
}

/**
 * A value of 0 holds its prompt at every prompt of every regular form, `.000` included
 * (criteria 1.1, 8.6). Small non-zero values are accepted (criterion 8.4). Shape-specific
 * holds (a Diameter of -1, a circle Depth above the diameter) belong to the form that asks.
 */
export function heldAsZero(value: number): boolean {
  return value === 0;
}
