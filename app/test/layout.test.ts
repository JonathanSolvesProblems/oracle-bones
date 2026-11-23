import { describe, expect, it } from 'vitest';
import {
  ND_IRR_RESULT, ND_TRAP_RESULT, REGULAR_MODES, REGULAR_RESULT, REGULAR_SCREEN, REGULAR_SHAPES, WINDOWS,
} from '../src/format/layout.ts';
import { blankRows, pictureFor, pictures, type ScreenLayout } from '../src/format/screen.ts';
import { finalCapture, profileScreen } from './golden.ts';

// [screen, layout, case whose final screen it is checked against, rows the case fills that
// the layout leaves blank: the irregular screen's GROUND POINTS grid and its row-24 notice]
const GRID_ROWS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 24];
const CODE: Record<string, string> = { trapezoid: 'trap', v_ditch: 'vdit', rectangle: 'rect', circle: 'circ', normal_depth: 'nd', critical_depth: 'cd', channel_capacity: 'cc' };
const REGULAR: [string, ScreenLayout, string, number[]][] = REGULAR_MODES.flatMap((m) => REGULAR_SHAPES.map(
  (s): [string, ScreenLayout, string, number[]] => [REGULAR_SCREEN[m][s]!, REGULAR_RESULT[m][s], `${CODE[m]}-${CODE[s]}-000001`, []],
));
const SCREENS: [string, ScreenLayout, string, number[]][] = [
  ...REGULAR,
  ['nd_trap_result', ND_TRAP_RESULT, 'nd-trap-000001', []],
  ['nd_irr_result', ND_IRR_RESULT, 'nd-irr-000001', GRID_ROWS],
  ['nd_irr_result', ND_IRR_RESULT, 'nd-irr-000002', GRID_ROWS],
];

describe('layout windows', () => {
  for (const id of Object.keys(WINDOWS)) {
    it(`${id} windows equal the profile's`, () => {
      const fromProfile = Object.fromEntries(
        (profileScreen(id).fields ?? []).map((f) => [f.name, { row: f.row, col: f.col, width: f.width }]),
      );
      expect(WINDOWS[id]).toEqual(fromProfile);
    });
  }
});

describe('screen layouts', () => {
  for (const [id, layout, caseId, free] of SCREENS) {
    it(`${id} (${caseId}): every field has one picture in its window and is painted once`, () => {
      const fields = Object.keys(layout.windows).sort();
      expect([...layout.paintOrder].sort()).toEqual(fields);
      for (const f of fields) expect(() => pictureFor(layout, f)).not.toThrow();
      expect(pictures(layout.rows)).toHaveLength(fields.length);
    });
    it(`${id}: the labels and box match ${caseId}'s final screen with its windows blanked`, () => {
      const shot = finalCapture(caseId)!.map((r) => [...r]);
      for (const w of Object.values(layout.windows)) {
        for (let c = w.col; c < w.col + w.width; c++) shot[w.row]![c] = ' ';
      }
      const blank = blankRows(layout.rows);
      for (const r of free) {
        expect(blank[r]!.slice(5, 75).trim()).toBe('');
        shot[r] = [...blank[r]!];
      }
      expect(blank).toEqual(shot.map((r) => r.join('')));
    });
  }
});
