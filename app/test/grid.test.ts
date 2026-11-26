// Property 4: the grid shows what QUICK-2's editor kept (quickened-app criterion 1.10; design:
// Ground points). For any rows, the grid's points are enter(sectionKeys(inputs)).points with
// their typed text, and a row is flagged exactly when it is not among them as typed.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { enter, sectionKeys, splitStationError, stationErrorText } from '../src/solver/groundPoints.ts';
import { solve } from '../src/solver/index.ts';
import { gridOf, STATION_RULE } from '../src/ui/grid.ts';
import { gridParts } from '../src/ui/views/grid.ts';
import { QUICK2_MESSAGE } from '../src/ui/views/states.ts';
import { findAll, textOf } from '../src/ui/vnode.ts';
import { rowKeys, type Row } from '../src/ui/job.ts';
import { golden } from './golden.ts';

function inputsOf(rows: readonly Row[]): Record<string, string> {
  const out: Record<string, string> = {};
  rows.forEach((r, i) => { const k = rowKeys(i + 1); out[k.station] = r.station; out[k.elevation] = r.elevation; });
  return out;
}

/** The values a behaviour case typed into the editor, two to a row in typing order. */
function rowsFromKeys(id: string): Row[] {
  const values: string[] = [];
  for (const t of golden(id).transcript) {
    if (t.expect !== 'irr_editor') continue;
    for (const m of t.keys.matchAll(/([^{]*)\{Enter\}/g)) values.push(m[1]!);
  }
  const rows: Row[] = [];
  for (let i = 0; i < values.length; i += 2) rows.push({ station: values[i]!, elevation: values[i + 1] ?? '' });
  return rows;
}

const pair = (station: string, elevation: string) => `${station}\t${elevation}`;

/** Property 4's condition, by count: a typed pair is flagged as often as it is typed beyond the times it was kept. */
function expectFlagsByCount(rows: readonly Row[]) {
  const grid = gridOf(inputsOf(rows));
  const kept = enter(sectionKeys(inputsOf(rows))).points;
  expect(grid.points).toEqual(kept.map((p) => ({ stationText: p.stationText, elevationText: p.elevationText })));
  const typed = new Map<string, number>();
  const keptCount = new Map<string, number>();
  const flagged = new Map<string, number>();
  for (const r of rows) typed.set(pair(r.station, r.elevation), (typed.get(pair(r.station, r.elevation)) ?? 0) + 1);
  for (const p of kept) keptCount.set(pair(p.stationText, p.elevationText), (keptCount.get(pair(p.stationText, p.elevationText)) ?? 0) + 1);
  for (const r of grid.rows) if (!r.taken) flagged.set(pair(r.station, r.elevation), (flagged.get(pair(r.station, r.elevation)) ?? 0) + 1);
  for (const [k, n] of typed) expect(flagged.get(k) ?? 0, k).toBe(Math.max(0, n - (keptCount.get(k) ?? 0)));
  for (const r of grid.rows) if (!r.taken) expect(r.notes.length, `row ${r.index} names a rule`).toBeGreaterThan(0);
  return grid;
}

describe('Property 4: the grid shows what QUICK-2\'s editor kept', () => {
  it('for any rows, the points are the editor\'s, and the rows not kept as typed are flagged', () => {
    const station = fc.constantFrom('0', '5', '10', '10.0', '20', '-2', '35', '100');
    const elevation = fc.constantFrom('0', '.0', '1', '2.5', '-1', '10', '3');
    fc.assert(fc.property(fc.array(fc.record({ station, elevation }), { minLength: 1, maxLength: 40 }), (rows) => {
      expectFlagsByCount(rows);
    }), { numRuns: 500 });
  });

  it('rows with rising stations and positive elevations are all kept, with no note', () => {
    const grid = gridOf(inputsOf([{ station: '0', elevation: '10' }, { station: '12.82', elevation: '9' }, { station: '25.64', elevation: '9.5' }]));
    expect(grid.rows.every((r) => r.taken && r.notes.length === 0)).toBe(true);
    expect(grid.refusedRow).toBeNull();
  });

  it('obs-irrelev-000001\'s keys: the 0 shown and replaced, the negative elevation, the refused 35', () => {
    const rows = rowsFromKeys('obs-irrelev-000001');
    expect(rows).toHaveLength(5);
    const grid = expectFlagsByCount(rows);
    expect(grid.points.map((p) => [p.stationText, p.elevationText])).toEqual([['0', '10'], ['20', '5'], ['35', '3']]);
    expect(grid.rows.map((r) => r.taken)).toEqual([true, false, false, false, false]);
    expect(grid.rows[1]!.notes.join(' ')).toMatch(/elevation of 0/);
    expect(grid.rows[3]!.notes.join(' ')).toMatch(/negative elevation/);
    expect(grid.rows[4]!.notes.join(' ')).toMatch(/not greater than the one before/);
    expect(grid.refusedRow).toBe(5);
  });

  it('obs-irrstation-000001\'s keys: a negative first station taken, a lower one refused', () => {
    const rows = rowsFromKeys('obs-irrstation-000001');
    const grid = gridOf(inputsOf(rows));
    expect(grid.rows[0]!.taken).toBe(true);
    expect(grid.rows[1]!.taken).toBe(false);
    expect(grid.rows[1]!.notes.join(' ')).toMatch(/not greater than the one before/);
    expect(grid.refusedRow).toBe(2);
  });
});

// The station error is the not-taken row's note (person, 2026-11-26; criteria 1.10, 6.10): QUICK-2's
// own text up to its "!", from the solver's stationErrorText, labelled as QUICK-2's, then
// Quickened's sentence that QUICK-2 does not take the row and goes on. solve() returns no station
// error, so the job computes from the rows QUICK-2 took.
describe('the station error on its row', () => {
  for (const [id, row, previous, station] of [['obs-irrelev-000001', 5, 35, 35], ['obs-irrstation-000001', 2, -50, -60]] as const) {
    it(`${id}: row ${row} carries QUICK-2's text for ${station} after ${previous}, and no other row does`, () => {
      const rows = rowsFromKeys(id);
      const grid = gridOf(inputsOf(rows));
      expect(grid.rows.map((r) => r.quick2)).toEqual(grid.rows.map((r) => (r.index === row ? stationErrorText(previous, station) : null)));
      // The table shows notes once every cell is a plain decimal; a case that ends on a lone
      // station gets an elevation typed after it, which the editor reads as the next station.
      const view = gridParts(rows.map((r) => ({ ...r, elevation: r.elevation === '' ? '1' : r.elevation }))).rowNotes[row - 1]!;
      const text = textOf(view);
      const figures = findAll(view, (n) => String(n.attrs.class ?? '').split(' ').includes('figures')).map((n) => n.children.join(''));
      expect(figures).toEqual([`“${stationErrorText(previous, station).trim()}”`]);
      expect(text.indexOf(QUICK2_MESSAGE)).toBeGreaterThanOrEqual(0);
      expect(text.indexOf(QUICK2_MESSAGE)).toBeLessThan(text.indexOf('ERROR'));
      expect(text.indexOf(STATION_RULE)).toBeGreaterThan(text.indexOf('!'));
      expect(STATION_RULE).toMatch(/does not take/);
      expect(STATION_RULE).toMatch(/goes on/);
    });
  }
  it('the job is computed from the rows QUICK-2 took, with no station error in the result', () => {
    const rows = rowsFromKeys('obs-irrelev-000001');
    const inputs = { ...inputsOf(rows), bank_left: '0', bank_right: '35', n_left: '.04', n_channel: '.04', n_right: '.04', discharge: '10', slope: '.001' };
    const r = solve({ mode: 'normal_depth', shape: 'irregular', inputs });
    expect(r.outcome).toBe('result');
    expect(splitStationError(r.message ?? '')).toBeNull();
  });
});
