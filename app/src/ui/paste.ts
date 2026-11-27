// The paste reader (quickened-app criteria 1.7, 1.8, 11.2; design: Ground points).
// - split on LF, with a trailing CR removed from each line; blank lines are skipped;
// - each line is two plain decimals, a station then an elevation, separated by a tab, a comma, a
//   semicolon or spaces (a tab first, then a semicolon, then a comma, then spaces), with blanks at
//   either end of the line or around a separator ignored;
// - a first line in which no part is a plain decimal is a header ("Distance,Elevation") and is
//   skipped; only the first line can be one;
// - more than 40 rows, or one bad line, loads nothing and says which line failed (its number and
//   text) or how many rows the paste had and that QUICK-2 takes at most 40;
// - otherwise the pasted rows replace the table's rows, each number's text as pasted.
// A paste into a cell of the table (criterion 11.2) loads its rows from that cell's row down,
// the way a spreadsheet does; a paste of one number per line fills that cell's column only.
import { GROUND_POINTS_MAX } from '../solver/constants.ts';
import type { Row } from './job.ts';
import { isPlainDecimal } from './validate.ts';

export type PasteResult =
  | { ok: true; rows: Row[] }
  | { ok: false; message: string; line: number | null; count: number | null };

/** The parts of one line, split on its separator: a tab, else a semicolon, else a comma, else spaces. */
export function partsOf(line: string): string[] {
  const t = line.trim();
  if (t === '') return [];
  const sep = t.includes('\t') ? '\t' : t.includes(';') ? ';' : t.includes(',') ? ',' : null;
  return sep === null ? t.split(/ +/) : t.split(sep).map((p) => p.trim());
}

const TOO_MANY = (n: number) => `The paste had ${n} rows, and QUICK-2 takes at most ${GROUND_POINTS_MAX} ground points. Nothing was loaded.`;

/** The numbered non-blank lines of a paste, with a header first line left out. */
function dataLines(text: string): { n: number; text: string; parts: string[] }[] {
  const out: { n: number; text: string; parts: string[] }[] = [];
  const lines = text.split('\n');
  let first = true;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.endsWith('\r') ? lines[i]!.slice(0, -1) : lines[i]!;
    const parts = partsOf(line);
    if (parts.length === 0) continue;
    // A header: the first line, with no number in it.
    const header = first && !parts.some(isPlainDecimal);
    first = false;
    if (header) continue;
    out.push({ n: i + 1, text: line, parts });
  }
  return out;
}

export function readPaste(text: string): PasteResult {
  const rows: Row[] = [];
  for (const l of dataLines(text)) {
    if (l.parts.length !== 2 || !l.parts.every(isPlainDecimal)) {
      return {
        ok: false, line: l.n, count: null,
        message: `Line ${l.n} is not a station and an elevation: "${l.text}". Each line needs two plain numbers, separated by a tab, a comma, a semicolon or spaces. Nothing was loaded.`,
      };
    }
    rows.push({ station: l.parts[0]!, elevation: l.parts[1]! });
  }
  if (rows.length === 0) return { ok: false, line: null, count: 0, message: 'The paste had no rows. Nothing was loaded.' };
  if (rows.length > GROUND_POINTS_MAX) return { ok: false, line: null, count: rows.length, message: TOO_MANY(rows.length) };
  return { ok: true, rows };
}

/**
 * A paste into the cell of row `index` (from 0): its rows replace the table's rows from that row
 * down and the rows below them stay. A paste of one number per line fills that cell's column
 * from that row down and leaves the other column as it was. Nothing loads on an error, or when
 * the rows would run past row 40.
 */
export function readPasteInto(text: string, rows: readonly Row[], index: number, part: keyof Row): PasteResult {
  const lines = dataLines(text);
  const column = lines.length > 0 && lines.every((l) => l.parts.length === 1 && isPlainDecimal(l.parts[0]!));
  let pasted: ((r: Row) => Row)[];
  if (column) {
    pasted = lines.map((l) => (r: Row) => ({ ...r, [part]: l.parts[0]! }));
  } else {
    const r = readPaste(text);
    if (!r.ok) return r;
    pasted = r.rows.map((x) => () => x);
  }
  const end = index + pasted.length;
  if (end > GROUND_POINTS_MAX) {
    return {
      ok: false, line: null, count: pasted.length,
      message: `The paste had ${pasted.length} rows, and from row ${index + 1} they would run past row ${GROUND_POINTS_MAX}: QUICK-2 takes at most ${GROUND_POINTS_MAX} ground points. Nothing was loaded.`,
    };
  }
  const out = rows.slice();
  for (let i = 0; i < pasted.length; i++) out[index + i] = pasted[i]!(out[index + i] ?? { station: '', elevation: '' });
  return { ok: true, rows: out };
}
