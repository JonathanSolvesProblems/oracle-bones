// Property 3: paste reads what was copied (quickened-app criteria 1.7, 1.8, 11.1, 11.2; design:
// Ground points). For 1 to 40 pairs of plain decimals, one pair to a line (LF or CRLF), separated
// by a tab, a comma, a semicolon or spaces, with or without a header line, the paste gives the
// same rows, text for text. For 41 or more rows, or any line that is not two plain decimals, it
// loads nothing and the error names the line or the count. A paste into a cell loads from that
// row down. Amended 2026-11-27: a practitioner typed a 40-station section one station at a time
// on a phone, so the reader takes what profile tools, Excel and HEC-RAS copy, and the paste
// panel is the first thing the section offers.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readPaste, readPasteInto } from '../src/ui/paste.ts';
import {
  CLIPBOARD_LABEL, hasGroundPoints, LOAD_LABEL, PASTE_AGAIN, PASTE_HEADING, PASTE_HELP, PASTE_STATIONS, pasteControl, type PasteState,
} from '../src/ui/views/paste.ts';
import { findAll, textOf } from '../src/ui/vnode.ts';
import { ROOT } from './golden.ts';

const MAX = 40;
const digits = fc.string({ unit: fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), minLength: 1, maxLength: 5 });
const decimal = fc.tuple(fc.boolean(), digits, fc.option(fc.string({ unit: fc.constantFrom('0', '5', '9'), maxLength: 3 }), { nil: undefined }))
  .map(([neg, a, b]) => `${neg ? '-' : ''}${a}${b === undefined ? '' : `.${b}`}`);
const row = fc.record({ station: decimal, elevation: decimal });
const eol = fc.constantFrom('\n', '\r\n');
/** The separators profile tools, Excel, CSV files and HEC-RAS tables use. */
const sep = fc.constantFrom('\t', ',', ';', ' ', '   ', ', ', ' ; ', ' \t');
/** Header lines with no number in them. */
const header = fc.constantFrom('Distance,Elevation', 'Station\tElevation', 'Distance (ft)\tElevation (ft)', 'STA;ELEV', 'x y');

/** A line that is not two plain decimals: each has a number in it, so it is never taken for a header. */
const badLine = fc.oneof(
  decimal,                                                         // one value
  fc.tuple(decimal, decimal).map(([a, b]) => `${a}\t\t${b}`),       // two tabs: an empty middle value
  fc.tuple(decimal, decimal).map(([a, b]) => `${a},,${b}`),         // two commas
  fc.tuple(decimal, decimal, decimal).map(([a, b, c]) => `${a}\t${b}\t${c}`), // three values
  fc.tuple(decimal, decimal, decimal).map(([a, b, c]) => `${a} ${b} ${c}`),   // three values, spaces
  fc.tuple(decimal, fc.constantFrom('x', '1e3', '+1', '.', '1,5', 'ft')).map(([a, b]) => `${a}\t${b}`), // not a plain decimal
);

const join_ = (lines: string[], end: string, trailing: boolean) => lines.join(end) + (trailing ? end : '');

describe('Property 3: paste reads what was copied', () => {
  it('1 to 40 rows give the same rows, text for text, with any of the separators and LF or CRLF line ends', () => {
    fc.assert(fc.property(fc.array(row, { minLength: 1, maxLength: MAX }), sep, eol, fc.boolean(), (rows, s, end, trailing) => {
      const r = readPaste(join_(rows.map((x) => `${x.station}${s}${x.elevation}`), end, trailing));
      expect(r).toEqual({ ok: true, rows });
    }));
  });

  it('a first line with no number in it is a header and is skipped', () => {
    fc.assert(fc.property(header, fc.array(row, { minLength: 1, maxLength: MAX }), sep, eol, (head, rows, s, end) => {
      const r = readPaste([head, ...rows.map((x) => `${x.station}${s}${x.elevation}`)].join(end));
      expect(r).toEqual({ ok: true, rows });
    }));
  });

  it('a header-like line after the first is a bad line, named by its number', () => {
    const r = readPaste('0\t650\nDistance\tElevation\n10\t649');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.line).toBe(2);
  });

  it('blanks at the ends of a line and empty lines are skipped', () => {
    expect(readPaste('  1\t2 \n\n3 , 4\r\n\r\n')).toEqual({ ok: true, rows: [{ station: '1', elevation: '2' }, { station: '3', elevation: '4' }] });
  });

  it('41 or more rows load nothing, and the error gives the count and the limit of 40', () => {
    fc.assert(fc.property(fc.array(row, { minLength: MAX + 1, maxLength: MAX + 20 }), sep, eol, (rows, s, end) => {
      const r = readPaste(join_(rows.map((x) => `${x.station}${s}${x.elevation}`), end, false));
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
      lines.splice(i, 0, bad);
      const r = readPaste(join_(lines, end, false));
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.line).toBe(i + 1);
      expect(r.message).toContain(`Line ${i + 1}`);
      expect(r.message).toContain(bad);
      expect(r.message).toContain('Nothing was loaded');
    }));
  });

  it('a paste with no rows, or only a header, loads nothing', () => {
    expect(readPaste('').ok).toBe(false);
    expect(readPaste('\n\r\n').ok).toBe(false);
    expect(readPaste('Distance,Elevation\n').ok).toBe(false);
  });
});

describe('the Grapevine section pastes', () => {
  const text = readFileSync(join(ROOT, 'realdata', 'huntington-section-01.tsv'), 'utf-8');
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');

  it('realdata/huntington-section-01.tsv pastes as 40 rows, text as in the file', () => {
    const r = readPaste(text);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rows).toHaveLength(MAX);
    expect(r.rows.map((x) => `${x.station}\t${x.elevation}`)).toEqual(lines.map((l) => l.trim()));
  });

  it('the same section as comma-separated values with a "Distance,Elevation" header pastes as the same 40 rows', () => {
    const csv = ['Distance,Elevation', ...lines.map((l) => l.trim().replace('\t', ','))].join('\r\n');
    const a = readPaste(text);
    const b = readPaste(csv);
    expect(b).toEqual(a);
  });
});

describe('a paste into a cell loads from that row down (criterion 11.2)', () => {
  const empty = [{ station: '', elevation: '' }];
  const three = [{ station: '0', elevation: '10' }, { station: '5', elevation: '9' }, { station: '9', elevation: '10' }];

  it('40 rows pasted into the first cell of an empty table fill it', () => {
    const text = readFileSync(join(ROOT, 'realdata', 'huntington-section-01.tsv'), 'utf-8');
    const r = readPasteInto(text, empty, 0, 'station');
    expect(r).toEqual(readPaste(text));
  });

  it('rows pasted into a lower row replace the rows from there down, and the rows below them stay', () => {
    fc.assert(fc.property(fc.array(row, { minLength: 1, maxLength: 20 }), fc.array(row, { minLength: 1, maxLength: 20 }), fc.nat(), fc.constantFrom('station', 'elevation') as fc.Arbitrary<'station' | 'elevation'>,
      (table, pasted, at, part) => {
        const i = at % table.length;
        const r = readPasteInto(pasted.map((x) => `${x.station}\t${x.elevation}`).join('\n'), table, i, part);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.rows.slice(0, i)).toEqual(table.slice(0, i));
        expect(r.rows.slice(i, i + pasted.length)).toEqual(pasted);
        expect(r.rows.slice(i + pasted.length)).toEqual(table.slice(i + pasted.length));
      }));
  });

  it('one number per line fills that cell\'s column from that row down and leaves the other column', () => {
    const r = readPasteInto('1\n6\n11\n15', three, 1, 'elevation');
    expect(r).toEqual({ ok: true, rows: [
      { station: '0', elevation: '10' }, { station: '5', elevation: '1' }, { station: '9', elevation: '6' },
      { station: '', elevation: '11' }, { station: '', elevation: '15' },
    ] });
  });

  it('rows that would run past row 40 load nothing, and a bad line loads nothing', () => {
    const forty = Array.from({ length: 40 }, (_, k) => `${k}\t${100 - k}`).join('\n');
    const r = readPasteInto(forty, three, 1, 'station');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('row 40');
    expect(readPasteInto('1\t2\nx\t3', three, 0, 'station').ok).toBe(false);
  });
});

describe('the paste panel (criterion 11.1)', () => {
  const closed: PasteState = { open: false, text: '', message: null, clipboard: false };
  const buttons = (v: ReturnType<typeof pasteControl>) => findAll(v, (n) => n.tag === 'button').map(textOf);

  it('is open while no ground point has been entered, even when it was closed, with its heading, its line, the box and "Load stations"', () => {
    const v = pasteControl(closed, { hasRows: false, loaded: false });
    expect(textOf(v)).toContain(PASTE_HEADING);
    expect(textOf(v)).toContain(PASTE_HELP);
    expect(PASTE_HELP).toBe('Up to 40 stations, distance then elevation, as copied from a profile tool, Excel or HEC-RAS.');
    expect(findAll(v, (n) => n.tag === 'textarea')).toHaveLength(1);
    expect(buttons(v)).toEqual([LOAD_LABEL]);
  });

  it('offers "Paste from clipboard" only where the browser has the clipboard', () => {
    expect(buttons(pasteControl({ ...closed, clipboard: true }, { hasRows: false, loaded: false }))).toEqual([LOAD_LABEL, CLIPBOARD_LABEL]);
  });

  it('closes to "Paste again" once rows are loaded, and to "Paste stations" over typed rows', () => {
    expect(buttons(pasteControl(closed, { hasRows: true, loaded: true }))).toEqual([PASTE_AGAIN]);
    expect(buttons(pasteControl(closed, { hasRows: true, loaded: false }))).toEqual([PASTE_STATIONS]);
  });

  it('opened over rows, it says the paste replaces them and can be cancelled', () => {
    const v = pasteControl({ ...closed, open: true }, { hasRows: true, loaded: true });
    expect(textOf(v)).toContain('replace the rows');
    expect(buttons(v)).toContain('Cancel');
  });

  it('a row counts as entered when it has a station or an elevation', () => {
    expect(hasGroundPoints([{ station: '', elevation: '' }])).toBe(false);
    expect(hasGroundPoints([{ station: '', elevation: '' }, { station: '3', elevation: '' }])).toBe(true);
  });
});
