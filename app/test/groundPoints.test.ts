import { describe, expect, it } from 'vitest';
import {
  LEFT_BANK_ERROR, RIGHT_BANK_ERROR, bankMatches, enter, press, sectionKeys, startEditor,
  type EditorKey, type EditorState,
} from '../src/solver/groundPoints.ts';
import { ND_IRREGULAR_PROMPTS } from '../src/solver/forms.ts';
import { captures, golden, goldens, profileScreen } from './golden.ts';

/** Every key typed into the GROUND POINTS editor screens, in order. */
function typedKeys(id: string): EditorKey[] {
  const out: EditorKey[] = [];
  for (const t of golden(id).transcript) {
    if (t.expect !== 'irr_editor') continue;
    for (const m of t.keys.matchAll(/([^{]*)\{(Enter|F10)\}/g)) {
      out.push(m[2] === 'F10' ? { kind: 'f10' } : { kind: 'value', text: m[1]! });
    }
  }
  return out;
}

/** Feed keys until entry ends; return the state and the keys left over. */
function untilDone(keys: EditorKey[]): { state: EditorState; rest: EditorKey[] } {
  let state = startEditor();
  let i = 0;
  while (i < keys.length && state.field !== 'done' && state.error === null) state = press(state, keys[i++]!);
  return { state, rest: keys.slice(i) };
}

/** Row 24 of a capture, cut to the rejected screens' message window. */
function messageWindow(rows: string[]): string {
  const m = profileScreen('irr_station_rejected').message!;
  return rows[m.row]!.slice(m.col, m.col + m.width);
}

const values = (keys: EditorKey[]) => keys.map((k) => (k.kind === 'value' ? k.text : '{F10}'));

describe('ground-points editor against the captures', () => {
  it('obs-irrelev-000001: elevation 0 shown not taken, negative elevation back to station, equal stations refused', () => {
    const keys = typedKeys('obs-irrelev-000001');
    const shots = captures('obs-irrelev-000001');
    // 20 then 0: the 0 is shown (screen 5) and the point is still open.
    const afterZero = enter(keys.slice(0, 4));
    expect(afterZero.shownElevation).toBe('0');
    expect(afterZero.field).toBe('elevation');
    expect(shots[5]![4]).toContain('20        0');
    // 5 replaces it as the same point's elevation (screen 6).
    const afterFive = enter(keys.slice(0, 5));
    expect(afterFive.points.map((p) => [p.stationText, p.elevationText])).toEqual([['0', '10'], ['20', '5']]);
    // 30 then -2: the elevation is blanked and entry is back at the station (screen 7).
    const afterNeg = enter(keys.slice(0, 7));
    expect(afterNeg.field).toBe('station');
    expect(afterNeg.points).toHaveLength(2);
    // 35 then 3 become that point (screen 8); 35 again is refused (screen 9).
    const { state } = untilDone(keys);
    expect(state.points.map((p) => [p.station, p.elevation])).toEqual([[0, 10], [20, 5], [35, 3]]);
    expect(state.error).toBe(messageWindow(shots[9]!));
    expect(state.error).toContain('ERROR ... Stations  35  ,  35  are NOT INCREASING !');
  });

  it('obs-irrstation-000001: a negative first station is taken, a lower one refused', () => {
    const keys = typedKeys('obs-irrstation-000001');
    const shots = captures('obs-irrstation-000001');
    const first = enter(keys.slice(0, 1));
    expect(first.field).toBe('elevation');
    expect(first.pending).toEqual({ station: -50, text: '-50' });
    const { state } = untilDone(keys);
    expect(state.error).toBe(messageWindow(shots[5]!));
    expect(state.error).toContain('ERROR ... Stations -50  , -60  are NOT INCREASING !');
  });

  it('obs-irrtwopt-000001: F10 after the second point ends entry', () => {
    const { state, rest } = untilDone(typedKeys('obs-irrtwopt-000001'));
    expect(state.field).toBe('done');
    expect(state.points.map((p) => [p.station, p.elevation])).toEqual([[0, 10], [10, 2]]);
    expect(values(rest)).toEqual(['0', '10', '.05', '.035', '.05', '100', '.005', '']);
    expect(captures('obs-irrtwopt-000001')[5]!.join('\n')).toMatch(/Enter\s+LEFT\s+Channel Bank Station/);
  });

  it('F10 after the first point ends entry too (nd-irr-000026)', () => {
    const { state } = untilDone(typedKeys('nd-irr-000026'));
    expect(state.field).toBe('done');
    expect(state.points).toHaveLength(1);
  });

  it('obs-bankreject-000001: entry ends after the 40th point; a LEFT bank off every station is refused', () => {
    const { state, rest } = untilDone(typedKeys('obs-bankreject-000001'));
    expect(state.field).toBe('done');
    expect(state.points).toHaveLength(40);
    expect(values(rest)).toEqual(['155']);
    expect(bankMatches(state.points, '155')).toBe(false);
    const shots = captures('obs-bankreject-000001');
    expect(LEFT_BANK_ERROR).toBe(messageWindow(shots[14]!));
  });

  it('obs-bankreject-000002: a matching LEFT bank is taken, a RIGHT bank off every station refused', () => {
    const { state, rest } = untilDone(typedKeys('obs-bankreject-000002'));
    expect(values(rest)).toEqual(['150', '255']);
    expect(bankMatches(state.points, '150')).toBe(true);
    expect(bankMatches(state.points, '255')).toBe(false);
    expect(RIGHT_BANK_ERROR).toBe(messageWindow(captures('obs-bankreject-000002')[15]!));
  });

  it('nd-irr-000009: a bank matches a station as entered, not as printed', () => {
    const g = golden('nd-irr-000009');
    const { state } = untilDone(sectionKeys(g.inputs));
    expect(bankMatches(state.points, '230.77')).toBe(true);
    expect(bankMatches(state.points, g.inputs.bank_right!)).toBe(false);
    expect(g.message).toBe(RIGHT_BANK_ERROR);
  });
});

describe('irregular prompt order against the golden transcripts', () => {
  const irregular = goldens().filter((g) => g.shape === 'irregular' && g.mode === 'normal_depth' && g.outcome !== 'observed');
  it('covers the irregular goldens', () => expect(irregular.length).toBeGreaterThan(20));
  for (const g of irregular) {
    it(`${g.id}: points, then ${ND_IRREGULAR_PROMPTS.join(', ')}`, () => {
      const keys = typedKeys(g.id);
      expect(values(keys).slice(0, sectionKeys(g.inputs).length)).toEqual(values(sectionKeys(g.inputs)));
      const { rest } = untilDone(keys);
      const want = ND_IRREGULAR_PROMPTS.map((p) => g.inputs[p]);
      const got = values(rest).slice(0, want.length);
      expect(got).toEqual(want.slice(0, got.length));
      if (g.outcome !== 'rejected') expect(got).toHaveLength(want.length);
    });
  }
});
