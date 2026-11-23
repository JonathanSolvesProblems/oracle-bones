// Paint a result screen the way QUICK-2 does and cut each field's window from it.
//
// A screen layout is the screen's rows as text, with each value's place marked by its PRINT
// USING picture (`##.#`) or, for text, a run of `@`. The picture's first column is where
// QuickBASIC starts printing the value. Painting starts from the rows with every picture
// blanked, then writes each value at its picture's first column, in paint order, overwriting
// whatever is there: an overflowing value runs over the next label and over the box border
// (`%793879552epth (ft)`). Each field's text is then cut from its window, so `%-1.0000` shows as
// `%-1.00` in a narrow window.
//
// The paint order (inputs in prompt order, then outputs row by row) only matters when one
// value's overflow reaches another field's window. No golden shows that; it is an assumption.

import { printUsing } from './printUsing.ts';

export interface Window { row: number; col: number; width: number; }

export interface Picture {
  row: number;
  col: number;
  /** The picture text: a numeric format, or a run of `@` for text. */
  text: string;
  numeric: boolean;
}

export interface ScreenLayout {
  /** The screen's rows, values marked by their pictures. */
  rows: readonly string[];
  /** Field names in the order QUICK-2 paints them. */
  paintOrder: readonly string[];
  /** Each field's window, as the profile maps it. */
  windows: Readonly<Record<string, Window>>;
}

/** A picture: a numeric format with at least two characters, or a run of `@`. */
const PICTURE = /#+\.#+|#{2,}|@+/g;

/** Every picture on the screen. A lone `#` (as in "Froude #") is label text. */
export function pictures(rows: readonly string[]): Picture[] {
  const out: Picture[] = [];
  rows.forEach((text, row) => {
    for (const m of text.matchAll(PICTURE)) {
      out.push({ row, col: m.index, text: m[0], numeric: !m[0].startsWith('@') });
    }
  });
  return out;
}

/** The one picture inside a field's window. */
export function pictureFor(layout: ScreenLayout, field: string): Picture {
  const w = layout.windows[field];
  if (!w) throw new Error(`no window for field ${field}`);
  const inside = pictures(layout.rows).filter(
    (p) => p.row === w.row && p.col >= w.col && p.col + p.text.length <= w.col + w.width,
  );
  if (inside.length !== 1) throw new Error(`field ${field} has ${inside.length} pictures in its window`);
  return inside[0]!;
}

/** The screen's rows with every picture blanked: the labels and the box alone. */
export function blankRows(rows: readonly string[]): string[] {
  return rows.map((r) => r.replace(PICTURE, (m) => ' '.repeat(m.length)));
}

function paintAt(row: string, col: number, text: string): string {
  const padded = row.length < col ? row.padEnd(col, ' ') : row;
  return padded.slice(0, col) + text + padded.slice(col + text.length);
}

/** A value to paint: a number printed with its picture, or text written as it is. */
export type Value = number | string;

/** Paint the values onto the screen. Fields without a value are left blank. */
export function paint(layout: ScreenLayout, values: Readonly<Record<string, Value>>): string[] {
  const rows = blankRows(layout.rows);
  for (const field of layout.paintOrder) {
    const v = values[field];
    if (v === undefined) continue;
    const p = pictureFor(layout, field);
    const text = typeof v === 'number' ? printUsing(v, p.text) : v;
    rows[p.row] = paintAt(rows[p.row]!, p.col, text);
  }
  return rows;
}

/** Cut each field's window from painted rows, untrimmed. */
export function cut(layout: ScreenLayout, rows: readonly string[], fields: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of fields) {
    const w = layout.windows[field];
    if (!w) throw new Error(`no window for field ${field}`);
    out[field] = (rows[w.row] ?? '').slice(w.col, w.col + w.width).padEnd(w.width, ' ');
  }
  return out;
}

/** Paint and cut in one step: the printed text of every field that has a value. */
export function printed(layout: ScreenLayout, values: Readonly<Record<string, Value>>): Record<string, string> {
  const fields = layout.paintOrder.filter((f) => values[f] !== undefined);
  return cut(layout, paint(layout, values), fields);
}
