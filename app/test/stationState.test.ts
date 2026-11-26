// The station error's rejected state (quickened-app criteria 6.3, 6.10; Property 10's last
// clause). QUICK-2's message is the text up to its "!", the key line's rest gets Quickened's
// sentence, both from splitStationError, and the state's Result keeps `message` whole.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { Result } from '../src/solver/index.ts';
import { splitStationError, stationError } from '../src/solver/groundPoints.ts';
import { readSingle } from '../src/solver/parse.ts';
import type { AppJob } from '../src/ui/job.ts';
import { classify } from '../src/ui/state.ts';
import { KEY_LINE_SENTENCE, QUICK2_MESSAGE, stateModel, stateView } from '../src/ui/views/states.ts';
import { findAll, textOf } from '../src/ui/vnode.ts';

const job: AppJob = { mode: 'normal_depth', shape: 'irregular', inputs: {}, origin: 'typed' };
const rejectedWith = (message: string): Result => ({ outcome: 'rejected', printed: {}, message, held: null, flags: [], raw: {} });

describe('a station error\'s rejected state', () => {
  for (const [previous, station] of [[35, 35], [-50, -60]] as const) {
    it(`${station} after ${previous}: QUICK-2's message up to its "!", the key line's rest with Quickened's sentence`, () => {
      const message = stationError(previous, station);
      const split = splitStationError(message)!;
      const r = rejectedWith(message);
      const s = classify(job, r);
      expect(s.kind).toBe('rejected');
      if (s.kind !== 'rejected') return;
      expect(s.message).toBe(split.text);
      expect(s.keyLineRest).toBe(split.keyLineRest);
      expect(s.result.message).toBe(message);
      expect(r.message).toBe(message);
      const m = stateModel(job, s);
      const view = stateView(m);
      // The exact texts, spaces kept, in the figures font.
      const figures = findAll(view, (n) => n.attrs.class === 'figures').map((n) => n.children.join(''));
      expect(figures).toEqual([`“${split.text.trim()}”`, split.keyLineRest.trim()]);
      const text = textOf(view);
      expect(text).toContain(QUICK2_MESSAGE);
      expect(text).toContain(KEY_LINE_SENTENCE);
    });
  }

  it('any other message gets no key-line sentence', () => {
    const s = classify(job, rejectedWith('ERROR! RIGHT Bank Station DOES NOT MATCH a Ground Point. Press <ENTER> '));
    expect(s.kind === 'rejected' && s.keyLineRest).toBeNull();
    expect(textOf(stateView(stateModel(job, s)))).not.toContain(KEY_LINE_SENTENCE);
  });

  it('Property 10: the rejected state built from any station error keeps result.message unchanged', () => {
    const typed = fc.integer({ min: -6000, max: 50000 }).map((k) => readSingle(String(k / 100)));
    fc.assert(fc.property(typed.chain((p) => fc.tuple(fc.constant(p), typed.filter((s) => s <= p))), ([previous, station]) => {
      const message = stationError(previous, station);
      const s = classify(job, rejectedWith(message));
      expect(s.kind).toBe('rejected');
      if (s.kind !== 'rejected') return;
      expect(s.result.message).toBe(message);
      expect(s.message + s.keyLineRest).toBe(message);
    }), { numRuns: 300 });
  });
});
