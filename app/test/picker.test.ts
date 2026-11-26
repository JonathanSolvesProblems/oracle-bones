// The picker's names and order are QUICK-2's menus' (quickened-app criteria 7.1, 7.2).
import { describe, expect, it } from 'vitest';
import { isBuilt } from '../src/solver/index.ts';
import { MODES, NOT_BUILT_YET, SHAPES, picker, pickerModel } from '../src/ui/views/picker.ts';
import { textOf } from '../src/ui/vnode.ts';
import { captures } from './golden.ts';

/** The menu rows of a capture, box drawing and the key column removed, runs of spaces collapsed. */
function menuRows(rows: string[]): string[] {
  return rows.map((r) => r.replace(/[║╔╗╚╝╟╢═─█]/g, ' ').replace(/\s+/g, ' ').trim());
}

describe('the picker', () => {
  it('offers the four modes in the main menu\'s order and names (obs-menudrop-000001 screen 1)', () => {
    const rows = menuRows(captures('obs-menudrop-000001')[1]!);
    const at = MODES.map((m) => rows.findIndex((r) => r.startsWith(`${m.name} `)));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('offers the five shapes in the shape menu\'s order and names (cd-vdit-000001 screen 2)', () => {
    const rows = menuRows(captures('cd-vdit-000001')[2]!);
    const at = SHAPES.map((s) => rows.findIndex((r) => r.startsWith(`${s.name} `)));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('gives Step-Backwater no shape choice', () => {
    expect(pickerModel('step_backwater', null).shapes).toBeNull();
    expect(pickerModel('normal_depth', null).shapes).toHaveLength(SHAPES.length);
  });

  it('marks "not built yet" from isBuilt, and hides nothing', () => {
    for (const m of MODES) {
      const model = pickerModel(m.mode, null);
      expect(model.modes).toHaveLength(MODES.length);
      for (const s of model.shapes ?? []) expect(s.built).toBe(isBuilt(m.mode, s.value));
    }
    const sb = pickerModel(null, null).modes.find((m) => m.value === 'step_backwater')!;
    expect(sb.built).toBe(isBuilt('step_backwater', 'irregular'));
    const text = textOf(picker(pickerModel('critical_depth', null)));
    expect(text).toContain(`Irregular Channel ${NOT_BUILT_YET}`);
    expect(text).toContain(`Step-Backwater ${NOT_BUILT_YET}`);
  });
});
