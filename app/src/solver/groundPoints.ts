// The GROUND POINTS editor's rules, and bank-station matching (design: Parsing and holds).
//
// Each ground point is a station then an elevation, each followed by Enter.
// - Stations must strictly increase; otherwise row 24 shows the NOT INCREASING error and the
//   station is not taken (criteria 10.3, 10.4). A negative first station is accepted (10.5).
// - An elevation of 0 is shown but not taken: the next value replaces it (10.6).
// - A negative elevation is blanked and entry goes back to the same point's station (10.7).
// - Entry ends after the 40th point's elevation (3.2), or on F10 once a point is complete
//   (10.1 after the second point; the one-point behaviour case and golden, which the tests
//   name, after the first).
// Unobserved: what the editor does after a station error, and F10 before any point.
//
// A bank station matches a ground point when its stored value equals a ground station's stored
// value as entered, not as printed (3.4, 3.5, 9.6).

import { printNumber } from '../format/printNumber.ts';
import { GROUND_POINTS_MAX as MAX_POINTS } from './constants.ts';
import { readSingle } from './parse.ts';

export interface GroundPoint {
  station: number;
  elevation: number;
  /** The text typed, which the grid shows (criterion 9.1). */
  stationText: string;
  elevationText: string;
}

export type EditorKey = { kind: 'value'; text: string } | { kind: 'f10' };

export interface EditorState {
  points: GroundPoint[];
  /** The field the next value goes to; `done` once entry has ended. */
  field: 'station' | 'elevation' | 'done';
  /** The station typed for the point in progress. */
  pending: { station: number; text: string } | null;
  /** An elevation shown but not taken (a 0), if any. */
  shownElevation: string | null;
  /** The text row 24 shows, cut to the message window, when the editor reports an error. */
  error: string | null;
}

/** Row 24's key line in the editor, as the message window cuts it. */
export const EDITOR_KEY_LINE = 'F3}Insert GrPt F4}Delete GrPt                            F1 }HELP      ';

export const LEFT_BANK_ERROR = 'ERROR! LEFT Bank Station DOES NOT MATCH a Ground Point.  Press <ENTER> ';
export const RIGHT_BANK_ERROR = 'ERROR! RIGHT Bank Station DOES NOT MATCH a Ground Point. Press <ENTER> ';

/** The station error's own text, up to and including its "!" (criteria 10.3, 10.4). */
export function stationErrorText(previous: number, station: number): string {
  return `ERROR ... Stations ${printNumber(previous)} , ${printNumber(station)} are NOT INCREASING !`;
}

/** The station error as the message window shows it: the error written over the key line. */
export function stationError(previous: number, station: number): string {
  const text = stationErrorText(previous, station);
  return text + EDITOR_KEY_LINE.slice(text.length);
}

/**
 * A station error's two parts: the error text up to its "!", and the rest of the key line that
 * row 24 still shows. For a message as long as the key line, the longest end of it that equals
 * the same end of EDITOR_KEY_LINE is the rest; it must not be empty, and what comes before it
 * must end with "!". Any other message gives null (quickened-app criterion 6.10).
 */
export function splitStationError(message: string): { text: string; keyLineRest: string } | null {
  if (message.length !== EDITOR_KEY_LINE.length) return null;
  let start = message.length;
  while (start > 0 && message[start - 1] === EDITOR_KEY_LINE[start - 1]) start -= 1;
  if (start === message.length) return null;
  const text = message.slice(0, start);
  if (!text.endsWith('!')) return null;
  return { text, keyLineRest: message.slice(start) };
}

export function startEditor(): EditorState {
  return { points: [], field: 'station', pending: null, shownElevation: null, error: null };
}

export function press(state: EditorState, key: EditorKey): EditorState {
  if (state.field === 'done') return state;
  const s: EditorState = { ...state, points: [...state.points], error: null };
  if (key.kind === 'f10') {
    if (s.field === 'station' && s.pending === null && s.points.length >= 1) s.field = 'done';
    return s;
  }
  const value = readSingle(key.text);
  if (s.field === 'station') {
    const last = s.points[s.points.length - 1];
    if (last && !(value > last.station)) {
      s.error = stationError(last.station, value);
      return s;
    }
    s.pending = { station: value, text: key.text };
    s.field = 'elevation';
    return s;
  }
  // elevation
  if (value === 0) {
    s.shownElevation = key.text;
    return s;
  }
  s.shownElevation = null;
  if (value < 0) {
    s.pending = null;
    s.field = 'station';
    return s;
  }
  const p = s.pending!;
  s.points.push({ station: p.station, elevation: value, stationText: p.text, elevationText: key.text });
  s.pending = null;
  s.field = s.points.length >= MAX_POINTS ? 'done' : 'station';
  return s;
}

/** Run a sequence of keys from the start. */
export function enter(keys: readonly EditorKey[]): EditorState {
  return keys.reduce(press, startEditor());
}

/** The keys that enter a section keyed as the contract keys it (sta_01, elev_01, ...). */
export function sectionKeys(inputs: Readonly<Record<string, string>>): EditorKey[] {
  const keys: EditorKey[] = [];
  for (let i = 1; ; i++) {
    const n = String(i).padStart(2, '0');
    const sta = inputs[`sta_${n}`];
    const elev = inputs[`elev_${n}`];
    if (sta === undefined || elev === undefined) break;
    keys.push({ kind: 'value', text: sta }, { kind: 'value', text: elev });
  }
  if (keys.length / 2 < MAX_POINTS) keys.push({ kind: 'f10' });
  return keys;
}

/** Whether a typed bank station matches a ground station, by stored value. */
export function bankMatches(points: readonly GroundPoint[], typed: string): boolean {
  const v = readSingle(typed);
  return points.some((p) => p.station === v);
}
