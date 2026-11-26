// The ground points as QUICK-2's editor takes them (quickened-app criterion 1.10; design: Ground
// points). The rows are entered the way the editor takes keys: sectionKeys gives the keys and
// enter() the points it keeps. A row is flagged exactly when it is not among the kept points as
// typed (Property 4), and the grid names the row and the rule that applied:
// - an elevation of 0 is shown but not taken; the next value replaces it (solver 10.6);
// - a negative elevation is blanked and entry goes back to the station (solver 10.7);
// - a station not greater than the one before it is refused (solver 10.3, 10.4).
// The editor reads each value in turn, so after one of these the values of later rows go to
// other fields; such rows are flagged with that reason.
import { enter, sectionKeys } from '../solver/groundPoints.ts';
import { rowKeys } from './job.ts';

export interface GridPoint { stationText: string; elevationText: string; }

export interface GridRow {
  /** Row number, from 1. */
  index: number;
  station: string;
  elevation: string;
  /** Whether the editor kept this row's station and elevation as typed. */
  taken: boolean;
  /** The rules that applied to this row's values, in Quickened's words. */
  notes: string[];
}

export interface GridModel {
  /** The points the editor keeps, with their typed text. */
  points: GridPoint[];
  rows: GridRow[];
  /** The row whose station the editor refused first, or null. */
  refusedRow: number | null;
}

export const ZERO_RULE = "QUICK-2's editor shows an elevation of 0 but does not take it: the next value typed becomes this point's elevation.";
export const NEGATIVE_RULE = "QUICK-2's editor blanks a negative elevation and goes back to the same point's station.";
export const STATION_RULE = "QUICK-2's editor refuses a station that is not greater than the one before it, and shows ERROR ... NOT INCREASING.";
export const SHIFT_RULE = "Not taken as typed: QUICK-2's editor reads each value in turn, so after a value above was refused or not taken, this row's values went to other fields.";

type Cell = 'station' | 'elevation';
const COLUMN: Readonly<Record<Cell, string>> = { station: 'STAT', elevation: 'ELEV' };

function rowsOf(inputs: Readonly<Record<string, string>>): { station: string; elevation: string }[] {
  const rows: { station: string; elevation: string }[] = [];
  for (let i = 1; ; i++) {
    const k = rowKeys(i);
    const station = inputs[k.station];
    const elevation = inputs[k.elevation];
    if (station === undefined || elevation === undefined) return rows;
    rows.push({ station, elevation });
  }
}

export function gridOf(inputs: Readonly<Record<string, string>>): GridModel {
  const rows = rowsOf(inputs);
  const keys = sectionKeys(inputs);
  const kept = enter(keys).points;
  const points = kept.map((p) => ({ stationText: p.stationText, elevationText: p.elevationText }));

  // Replay the keys one at a time to see which rule each value met.
  const notes: string[][] = rows.map(() => []);
  let refusedRow: number | null = null;
  let before = enter([]);
  for (let k = 0; k < keys.length; k++) {
    const key = keys[k]!;
    const after = enter(keys.slice(0, k + 1));
    if (key.kind === 'value') {
      const row = Math.floor(k / 2);
      const cell: Cell = k % 2 === 0 ? 'station' : 'elevation';
      const role = before.field;
      const where = `${COLUMN[cell]} ${key.text}${role !== cell && role !== 'done' ? `, read as ${role === 'station' ? 'a station' : 'an elevation'}` : ''}: `;
      if (after.error !== null) {
        notes[row]!.push(where + STATION_RULE);
        if (refusedRow === null) refusedRow = row + 1;
      } else if (role === 'elevation' && after.shownElevation !== null) {
        notes[row]!.push(where + ZERO_RULE);
      } else if (role === 'elevation' && after.field === 'station' && after.points.length === before.points.length) {
        notes[row]!.push(where + NEGATIVE_RULE);
      }
    }
    before = after;
  }

  // A kept point claims the first unclaimed row with the same text; the rest are flagged.
  const claimed = rows.map(() => false);
  for (const p of points) {
    const i = rows.findIndex((r, j) => !claimed[j] && r.station === p.stationText && r.elevation === p.elevationText);
    if (i >= 0) claimed[i] = true;
  }
  return {
    points,
    refusedRow,
    rows: rows.map((r, i) => ({
      index: i + 1, station: r.station, elevation: r.elevation, taken: claimed[i]!,
      notes: !claimed[i] && notes[i]!.length === 0 ? [SHIFT_RULE] : notes[i]!,
    })),
  };
}
