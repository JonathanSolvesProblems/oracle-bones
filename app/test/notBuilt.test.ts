// The not-built view (quickened-app criterion 7.3). For Step-Backwater it names what QUICK-2 asks
// for (solver 11.1, 11.2) and the first-section limit; for Critical Depth and Channel Capacity on
// the irregular section it says the pair is not observed; each links the limits page and has no
// form that could be calculated.
import { describe, expect, it } from 'vitest';
import { isBuilt, type Mode, type Shape } from '../src/solver/index.ts';
import { notBuiltModel, notBuiltView } from '../src/ui/views/notBuilt.ts';
import { calculatePage, SKETCH_EMPTY } from '../src/ui/views/calculate.ts';
import { MODES, SHAPES, shapeChoice, STEP_BACKWATER_SHAPE } from '../src/ui/views/picker.ts';
import { findAll, textOf, type VNode } from '../src/ui/vnode.ts';
import { captures } from './golden.ts';

const PAIRS: { mode: Mode; shape: Shape }[] = MODES.flatMap((m) => (shapeChoice(m.mode)
  ? SHAPES.map((s) => ({ mode: m.mode, shape: s.shape })) : [{ mode: m.mode, shape: STEP_BACKWATER_SHAPE }]));
const NOT_BUILT = PAIRS.filter((p) => !isBuilt(p.mode, p.shape));

const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();
/** Anything that could take a value or start a calculation; the picker's radio buttons are not. */
const noForm = (v: VNode) => findAll(v, (n) => ['form', 'textarea', 'select'].includes(n.tag)
  || (n.tag === 'input' && n.attrs.type !== 'radio') || (n.tag === 'button' && n.attrs.type === 'submit'));

describe('the not-built view', () => {
  it('covers Step-Backwater and the irregular Critical Depth and Channel Capacity', () => {
    expect(NOT_BUILT.map((p) => `${p.mode}/${p.shape}`)).toEqual(['critical_depth/irregular', 'channel_capacity/irregular', 'step_backwater/irregular']);
  });

  for (const { mode, shape } of NOT_BUILT) {
    it(`${mode}/${shape}: says Quickened does not compute it, links the limits page, has no form`, () => {
      const v = notBuiltView(notBuiltModel(mode, shape));
      expect(textOf(v)).toMatch(/Quickened does not compute .+ yet\./);
      expect(findAll(v, (n) => n.tag === 'a' && n.attrs.href === '#/limits')).toHaveLength(1);
      expect(noForm(v)).toEqual([]);
      const page = calculatePage({ mode, shape: shapeChoice(mode) ? shape : null, values: {}, rows: [], marked: new Set() });
      expect(noForm(page)).toEqual([]);
      expect(textOf(page)).toContain(textOf(v));
    });
  }

  it('Step-Backwater: what QUICK-2 asks for, in its words as sb-irr-000001 shows them, and the first-section limit', () => {
    const m = notBuiltModel('step_backwater', 'irregular');
    const screens = captures('sb-irr-000001').map((rows) => collapse(rows.join('\n')));
    expect(m.quick2Texts.length).toBeGreaterThanOrEqual(4);
    for (const t of m.quick2Texts) expect(screens.some((s) => s.includes(collapse(t))), t).toBe(true);
    const text = textOf(notBuiltView(m));
    for (const part of ['ground points', 'bank stations', 'n values', 'Discharge', 'no shape']) expect(text).toContain(part);
    expect(text).toMatch(/first \(downstream\) cross section/);
    expect(text).toMatch(/not been observed/);
  });

  it('before a calculation the right page is the ruled sketch page with its one line', () => {
    const page = calculatePage({ mode: null, shape: null, values: {}, rows: [], marked: new Set() });
    const sketch = findAll(page, (n) => n.attrs.id === 'results')[0]!;
    const empty = findAll(sketch, (n) => n.attrs.class === 'sketch-empty');
    expect(empty).toHaveLength(1);
    expect(textOf(sketch)).toBe(SKETCH_EMPTY);
  });

  for (const mode of ['critical_depth', 'channel_capacity'] as const) {
    it(`${mode} on the irregular section: says the pair has not been observed`, () => {
      const text = textOf(notBuiltView(notBuiltModel(mode, 'irregular')));
      expect(text).toMatch(/has not been observed/);
      expect(text).toContain(MODES.find((m) => m.mode === mode)!.name);
      expect(text).toContain('Irregular Channel');
    });
  }
});
