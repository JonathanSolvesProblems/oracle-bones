// The proof page's case list (quickened-app task 10.1; criterion 5.1). Each rule of the design's
// list is checked against the goldens: a result per built pair, every haunting case, both worked
// examples, a held prompt, a bank message, the circle message and the two known differences, each
// with a reason, and each id's golden and final capture on disk.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { data } from 'virtual:quickened/data';
import { isBuilt, type Mode, type Shape } from '../src/solver/index.ts';
import { MODES, SHAPES, shapeChoice, STEP_BACKWATER_SHAPE } from '../src/ui/views/picker.ts';
import { finalCapture, golden, goldenIds } from './golden.ts';

const LIST = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'src', 'ui', 'proof', 'cases.json'), 'utf-8')) as { id: string; reason: string }[];
const ids = LIST.map((c) => c.id);
const listed = LIST.map((c) => golden(c.id));
const PAIRS: { mode: Mode; shape: Shape }[] = MODES.flatMap((m) => (shapeChoice(m.mode)
  ? SHAPES.map((s) => ({ mode: m.mode, shape: s.shape })) : [{ mode: m.mode, shape: STEP_BACKWATER_SHAPE }]));
/** The known differences of the solver design (Circle), as task 10.1 names them. */
const KNOWN_DIFFERENCES = ['cc-circ-000035', 'nd-circ-000020'];

describe('the proof list', () => {
  it('lists each case once, each with a one-line reason', () => {
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of LIST) {
      expect(c.reason.trim(), c.id).not.toBe('');
      expect(c.reason, c.id).not.toContain('\n');
    }
  });
  it("has each id's golden and final capture", () => {
    const all = new Set(goldenIds());
    for (const id of ids) {
      expect(all.has(id), id).toBe(true);
      expect(finalCapture(id), id).not.toBeNull();
    }
  });
  it('has at least one result golden per built pair', () => {
    for (const p of PAIRS.filter((x) => isBuilt(x.mode, x.shape))) {
      expect(listed.some((g) => g.mode === p.mode && g.shape === p.shape && g.outcome === 'result'), `${p.mode}/${p.shape}`).toBe(true);
    }
  });
  it('has the case of every haunting and both worked examples', () => {
    for (const h of data.hauntings) for (const c of h.cases) expect(ids, `${h.id} ${c}`).toContain(c);
    expect(ids).toContain(data.examples.main.id);
    expect(ids).toContain(data.examples.cutoff.id);
  });
  it('has a held prompt, a bank message and the circle message', () => {
    expect(listed.some((g) => g.outcome === 'rejected' && !!g.held_prompt)).toBe(true);
    expect(listed.some((g) => g.outcome === 'rejected' && /Bank Station/.test(g.message ?? ''))).toBe(true);
    expect(listed.some((g) => g.outcome === 'rejected' && g.shape === 'circle' && !!g.message?.trim())).toBe(true);
  });
  it('has the two known differences', () => {
    for (const id of KNOWN_DIFFERENCES) expect(ids).toContain(id);
  });
});
