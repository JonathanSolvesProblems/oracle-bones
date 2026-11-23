import { describe, expect, it } from 'vitest';
import { ND_TRAP_RESULT, WINDOWS } from '../src/format/layout.ts';
import { blankRows, pictureFor, pictures, type ScreenLayout } from '../src/format/screen.ts';
import { finalCapture, profileScreen } from './golden.ts';

const SCREENS: [string, ScreenLayout, string][] = [['nd_trap_result', ND_TRAP_RESULT, 'nd-trap-000001']];

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
  for (const [id, layout, caseId] of SCREENS) {
    it(`${id}: every field has one picture in its window and is painted once`, () => {
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
      expect(blankRows(layout.rows)).toEqual(shot.map((r) => r.join('')));
    });
  }
});
