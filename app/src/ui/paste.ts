// The tab-delimited paste reader (quickened-app criteria 1.7, 1.8; design: Ground points).
// - split on LF, with a trailing CR removed from each line; empty lines are skipped;
// - each line must be two plain decimals separated by exactly one tab;
// - more than 40 rows, or one bad line, loads nothing and says which line failed (its number
//   and text) or how many rows the paste had and that QUICK-2 takes at most 40;
// - otherwise the pasted rows replace the table's rows, text as pasted.
import { GROUND_POINTS_MAX } from '../solver/constants.ts';
import type { Row } from './job.ts';
import { isPlainDecimal } from './validate.ts';

export type PasteResult =
  | { ok: true; rows: Row[] }
  | { ok: false; message: string; line: number | null; count: number | null };

export function readPaste(text: string): PasteResult {
  const rows: Row[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.endsWith('\r') ? lines[i]!.slice(0, -1) : lines[i]!;
    if (line === '') continue;
    const parts = line.split('\t');
    if (parts.length !== 2 || !parts.every(isPlainDecimal)) {
      return {
        ok: false, line: i + 1, count: null,
        message: `Line ${i + 1} is not a station and an elevation separated by one tab: "${line}". Nothing was loaded.`,
      };
    }
    rows.push({ station: parts[0]!, elevation: parts[1]! });
  }
  if (rows.length === 0) return { ok: false, line: null, count: 0, message: 'The paste had no rows. Nothing was loaded.' };
  if (rows.length > GROUND_POINTS_MAX) {
    return {
      ok: false, line: null, count: rows.length,
      message: `The paste had ${rows.length} rows, and QUICK-2 takes at most ${GROUND_POINTS_MAX} ground points. Nothing was loaded.`,
    };
  }
  return { ok: true, rows };
}
