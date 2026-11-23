import { describe, expect, it } from 'vitest';
import { printUsing } from '../src/format/printUsing.ts';
import { readSingle } from '../src/solver/parse.ts';

const echo = (typed: string, picture: string) => printUsing(readSingle(typed), picture).trim();

describe('printUsing, fixed formats', () => {
  it('echoes -1 as the trapezoid form does (criteria 2.2 to 2.4)', () => {
    expect(echo('-1', '##.#')).toBe('-1.0');
    expect(echo('-1', '####.#')).toBe('-1.0');
    expect(echo('-1', '######')).toBe('-1');
    expect(echo('-1', '#.####')).toBe('%-1.0000');
  });
  it('right-aligns in the format width', () => {
    expect(printUsing(readSingle('3'), '##.#')).toBe(' 3.0');
    expect(printUsing(readSingle('300'), '######')).toBe('   300');
    expect(printUsing(readSingle('.035'), '#.####')).toBe('0.0350');
  });
  it('fits the largest values without % (criteria 8.2, 8.3)', () => {
    expect(echo('99.9', '##.#')).toBe('99.9');
    expect(echo('9999.9', '####.#')).toBe('9999.9');
    expect(echo('9.9999', '#.####')).toBe('9.9999');
    expect(echo('999.99', '###.##')).toBe('999.99');
    expect(echo('999999', '######')).toBe('999999');
  });
  it('echoes small non-zero values as zero (criterion 8.4)', () => {
    expect(echo('.04', '##.#')).toBe('0.0');
    expect(echo('.00001', '#.####')).toBe('0.0000');
  });
  it('rounds half away from zero on the single-precision value', () => {
    // 2127.65 is stored as 2127.6499..., which rounds down; 7499.95 as 7499.950195..., up.
    expect(printUsing(Math.fround(2127.65), '####.#').trim()).toBe('2127.6');
    expect(printUsing(Math.fround(7499.95), '####.#').trim()).toBe('7500.0');
    expect(printUsing(0.25, '#.#')).toBe('0.3');
    expect(printUsing(-0.25, '##.#')).toBe('-0.3');
  });
});

describe('printUsing, overflow', () => {
  it('prints % and the number with the format decimals (criterion 8.1)', () => {
    expect(echo('100', '##.#')).toBe('%100.0');
    expect(echo('99999', '####.#')).toBe('%99999.0');
    expect(echo('12.5', '#.####')).toBe('%12.5000');
    expect(echo('1000', '###.##')).toBe('%1000.00');
    expect(echo('1234567', '######')).toBe('%1234567');
  });
  it('prints up to ten characters in full', () => {
    expect(printUsing(793879552, '######')).toBe('%793879552');
    expect(printUsing(3578117632, '######')).toBe('%3578117632');
  });
  it('switches to an exponent past ten characters', () => {
    expect(echo('123456789', '##.#')).toBe('% 1.2E+08');
    expect(printUsing(-3.4654e9, '######')).toBe('%-34654E+05');
    expect(printUsing(1.9078e10, '######')).toBe('% 19078E+06');
  });
});
