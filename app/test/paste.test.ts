// Property 3: paste reads what was copied (quickened-app criteria 1.7, 1.8; design: Ground
// points). For 1 to 40 pairs of plain decimals joined as tab-delimited lines (LF or CRLF) the
// paste gives the same rows, text for text. For 41 or more rows, or any line that is not two
// plain decimals and one tab, it loads nothing and the error names the line or the count.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readPaste } from '../src/ui/paste.ts';
import { ROOT } from './golden.ts';

const MAX = 40;
const digits = fc.string({ unit: fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), minLength: 1, maxLength: 5 });
const decimal = fc.tuple(fc.boolean(), digits, fc.option(fc.string({ unit: fc.constantFrom('0', '5', '9'), maxLength: 3 }), { nil: undefined }))
  .map(([neg, a, b]) => `${neg ? '-' : ''}${a}${b === undefined ? '' : `.${b}`}`);
const row = fc.record({ station: decimal, elevation: decimal });
const eol = fc.constantFrom('\n', '\r\n');

/** A line that is not two plain decimals and one tab. */
const badLine = fc.oneof(
  decimal,                                                         // one value
  fc.tuple(decimal, decimal).map(([a, b]) => `${a} ${b}`),          // a space, not a tab
  fc.tuple(decimal, decimal).map(([a, b]) => `${a}\t\t${b}`),       // two tabs
  fc.tuple(decimal, decimal, decimal).map(([a, b, c]) => `${a}\t${b}\t${c}`), // three values
  fc.tuple(decimal, decimal).map(([a, b]) => `${a}\t${b} `),        // a trailing blank
  fc.tuple(decimal, fc.constantFrom('x', '1e3', '+1', '', '.', '1,5')).map(([a, b]) => `${a}\t${b}`), // not a plain decimal
);

const join_ = (lines: string[], end: string, trailing: boolean) => lines.join(end) + (trailing ? end : '');

describe('Property 3: paste reads what was copied', () => {
  it('1 to 40 rows give the same rows, text for text, with LF or CRLF line ends', () => {
    fc.assert(fc.property(fc.array(row, { minLength: 1, maxLength: MAX }), eol, fc.boolean(), (rows, end, trailing) => {
      const r = readPaste(join_(rows.map((x) => `${x.station}\t${x.elevation}`), end, trailing));
      expect(r).toEqual({ ok: true, rows });
    }));
  });

  it('empty lines are skipped', () => {
    expect(readPaste('1\t2\n\n3\t4\r\n\r\n')).toEqual({ ok: true, rows: [{ station: '1', elevation: '2' }, { station: '3', elevation: '4' }] });
  });

  it('41 or more rows load nothing, and the error gives the count and the limit of 40', () => {
    fc.assert(fc.property(fc.array(row, { minLength: MAX + 1, maxLength: MAX + 20 }), eol, (rows, end) => {
      const r = readPaste(join_(rows.map((x) => `${x.station}\t${x.elevation}`), end, false));
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.count).toBe(rows.length);
      expect(r.message).toContain(String(rows.length));
      expect(r.message).toContain(String(MAX));
    }));
  });

  it('any bad line loads nothing, and the error names its line number and text', () => {
    fc.assert(fc.property(fc.array(row, { maxLength: MAX - 1 }), fc.nat(), badLine, eol, (rows, at, bad, end) => {
      const lines = rows.map((x) => `${x.station}\t${x.elevation}`);
      const i = at % (lines.length + 1);
      fc.pre(bad !== '');
      lines.splice(i, 0, bad);
      const r = readPaste(join_(lines, end, false));
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.line).toBe(i + 1);
      expect(r.message).toContain(`Line ${i + 1}`);
      expect(r.message).toContain(bad.replace(/\r$/, ''));
    }));
  });

  it('a paste with no rows loads nothing', () => {
    expect(readPaste('').ok).toBe(false);
    expect(readPaste('\n\r\n').ok).toBe(false);
  });
});

describe('the Grapevine section pastes', () => {
  it('realdata/huntington-section-01.tsv pastes as 40 rows, text as in the file', () => {
    const text = readFileSync(join(ROOT, 'realdata', 'huntington-section-01.tsv'), 'utf-8');
    const r = readPaste(text);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rows).toHaveLength(MAX);
    const lines = text.split('\n').filter((l) => l !== '');
    expect(r.rows.map((x) => `${x.station}\t${x.elevation}`)).toEqual(lines);
  });
});
