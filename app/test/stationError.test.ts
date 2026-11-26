// The station error and its split (quickened-app criterion 6.10; design: The two solver
// additions; Property 10). The message stays whole; the split names its two parts: the error
// text up to its "!", and the rest of the editor's key line that QUICK-2 leaves on row 24.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  EDITOR_KEY_LINE, LEFT_BANK_ERROR, RIGHT_BANK_ERROR, splitStationError, stationError, stationErrorText,
} from '../src/solver/groundPoints.ts';
import { NOT_BUILT } from '../src/solver/index.ts';
import { readSingle } from '../src/solver/parse.ts';
import { captures, goldens, profileScreen } from './golden.ts';

/** Row 24 of a capture, cut to the rejected screens' message window. */
function messageWindow(rows: string[]): string {
  const m = profileScreen('irr_station_rejected').message!;
  return rows[m.row]!.slice(m.col, m.col + m.width);
}

/** Criteria 10.3 and 10.4: the stations typed, and the capture that shows the error. */
const CASES = [
  { id: 'obs-irrelev-000001', screen: 9, previous: 35, station: 35 },
  { id: 'obs-irrstation-000001', screen: 5, previous: -50, station: -60 },
];

/** The span of stations the recorded cases type; the profile gives no station range. */
function stationSpan(): [number, number] {
  const typed = goldens().flatMap((g) => Object.entries(g.inputs).filter(([k]) => /^sta_\d\d$/.test(k)).map(([, v]) => Number(v)));
  typed.push(...CASES.flatMap((c) => [c.previous, c.station]));
  return [Math.min(...typed), Math.max(...typed)];
}

describe('stationError is unchanged', () => {
  for (const c of CASES) {
    it(`${c.id}: the message equals row 24's window, as before`, () => {
      expect(stationError(c.previous, c.station)).toBe(messageWindow(captures(c.id)[c.screen]!));
    });
  }
});

describe('splitStationError', () => {
  for (const c of CASES) {
    it(`${c.id}: the message splits into stationErrorText and the key line's rest`, () => {
      const message = stationError(c.previous, c.station);
      const split = splitStationError(message);
      expect(split).not.toBeNull();
      expect(split!.text).toBe(stationErrorText(c.previous, c.station));
      expect(split!.text.endsWith('!')).toBe(true);
      expect(split!.text + split!.keyLineRest).toBe(message);
    });

    it(`${c.id}: the capture's row-24 window splits into the error text and "F1 }HELP" with its spaces`, () => {
      const window = messageWindow(captures(c.id)[c.screen]!);
      const split = splitStationError(window);
      expect(split).not.toBeNull();
      expect(split!.text).toBe(stationErrorText(c.previous, c.station));
      expect(split!.keyLineRest.trim()).toBe('F1 }HELP');
      expect(split!.keyLineRest).toBe(EDITOR_KEY_LINE.slice(split!.text.length));
    });
  }

  it('gives null for every other message a golden holds, and for the solver\'s other messages', () => {
    const messages = new Set(goldens().map((g) => g.message).filter((m): m is string => typeof m === 'string'));
    for (const m of [LEFT_BANK_ERROR, RIGHT_BANK_ERROR, NOT_BUILT]) messages.add(m);
    expect(messages.size).toBeGreaterThan(2);
    for (const m of messages) expect(splitStationError(m), m).toBeNull();
  });
});

describe('Property 10: the station error splits at its "!", and the message stays whole', () => {
  const [lo, hi] = stationSpan();
  // Stations as typed in the recorded cases: plain decimals with at most two decimals, read the
  // way the editor reads them.
  const HUNDREDTHS = 100;
  const typed = (a: number, b: number) => fc.integer({ min: Math.ceil(a * HUNDREDTHS), max: Math.floor(b * HUNDREDTHS) })
    .map((k) => readSingle(String(k / HUNDREDTHS)));

  it('for any previous station in the span and any station not greater, the split gives the text and the rest', () => {
    fc.assert(fc.property(
      typed(lo, hi).chain((previous) => fc.tuple(fc.constant(previous), typed(lo, previous))),
      ([previous, station]) => {
        const message = stationError(previous, station);
        const split = splitStationError(message);
        expect(split).not.toBeNull();
        expect(split!.text).toBe(stationErrorText(previous, station));
        expect(split!.keyLineRest).toBe(EDITOR_KEY_LINE.slice(split!.text.length));
        expect(split!.text + split!.keyLineRest).toBe(message);
      },
    ), { numRuns: 500 });
  });

  it('gives null for a string with no "!" before a non-empty end of the key line', () => {
    const n = EDITOR_KEY_LINE.length;
    // Any length other than the key line's.
    fc.assert(fc.property(fc.string({ maxLength: 2 * n }).filter((s) => s.length !== n), (s) => {
      expect(splitStationError(s)).toBeNull();
    }));
    // The key line's length, but its last character differs: the matching end is empty.
    fc.assert(fc.property(fc.string({ minLength: n - 1, maxLength: n - 1 }), fc.string({ minLength: 1, maxLength: 1 }), (s, last) => {
      fc.pre(last !== EDITOR_KEY_LINE[n - 1]);
      expect(splitStationError(s + last)).toBeNull();
    }));
    // A non-empty end of the key line, after a character that is neither "!" nor the key
    // line's own character there.
    fc.assert(fc.property(fc.integer({ min: 1, max: n - 1 }), fc.string({ minLength: n, maxLength: n }), fc.string({ minLength: 1, maxLength: 1 }), (cut, head, c) => {
      fc.pre(c !== '!' && c !== EDITOR_KEY_LINE[cut - 1]);
      const s = head.slice(0, cut - 1) + c + EDITOR_KEY_LINE.slice(cut);
      expect(splitStationError(s)).toBeNull();
    }));
  });
});
