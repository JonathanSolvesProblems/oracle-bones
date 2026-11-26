// Property 4: the grid shows what QUICK-2's editor kept (quickened-app criterion 1.10; design:
// Ground points). For any rows, the grid's points are enter(sectionKeys(inputs)).points with
// their typed text, and a row is flagged exactly when it is not among them as typed.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { enter, sectionKeys } from '../src/solver/groundPoints.ts';
import { gridOf } from '../src/ui/grid.ts';
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
