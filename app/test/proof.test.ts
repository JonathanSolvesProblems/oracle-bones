// The proof page (quickened-app task 10.3; criteria 5.1, 5.2). For each listed case the view model
// holds the recorded capture, the golden's printed text and runJob's, marked same or different;
// the two known differences are marked different. The expected texts are read here from the
// goldens and captures, never typed.
import { describe, expect, it } from 'vitest';
import { data } from 'virtual:quickened/data';
import { runJob } from '../src/ui/state.ts';
import { NO_HEADLINE, proofModel, proofView } from '../src/ui/views/proof.ts';
import { findAll, textOf } from '../src/ui/vnode.ts';
import type { AppJob } from '../src/ui/job.ts';
import { finalCapture, golden } from './golden.ts';

const model = proofModel(data.proof, data.headline);
const jobOf = (g: { mode: string; shape: string; inputs: Readonly<Record<string, string>> }): AppJob =>
  ({ mode: g.mode, shape: g.shape, inputs: { ...g.inputs }, origin: 'typed' }) as AppJob;

describe('the proof view model', () => {
  it('holds every listed case, in the list order', () => {
    expect(model.cases.map((c) => c.id)).toEqual(data.proof.map((c) => c.id));
    expect(model.cases.length).toBeGreaterThan(0);
  });
  it("holds each case's final capture as recorded, labelled with its date", () => {
    for (const c of model.cases) {
      const g = golden(c.id);
      expect(c.capture, c.id).toBe(finalCapture(c.id)!.join('\n'));
      expect(c.captureLabel, c.id).toBe(`QUICK-2's screen, recorded ${String(g.recorded_at).slice(0, 10)}`);
    }
  });
  it("holds each printed field's golden text and runJob's text, marked same exactly when they are equal", () => {
    for (const c of model.cases) {
      const g = golden(c.id);
      const r = runJob(jobOf(g));
      const fields = c.rows.filter((x) => x.kind === 'printed');
      expect(fields.map((x) => x.field), c.id).toEqual(Object.keys(g.printed));
      for (const x of fields) {
        expect(x.quick2, `${c.id} ${x.field}`).toBe(g.printed[x.field]);
        expect(x.quickened, `${c.id} ${x.field}`).toBe(r.printed[x.field] ?? null);
        expect(x.same, `${c.id} ${x.field}`).toBe(x.quick2 === x.quickened);
      }
      const outcome = c.rows.find((x) => x.kind === 'outcome')!;
      expect([outcome.quick2, outcome.quickened]).toEqual([g.outcome, r.outcome]);
      if (g.outcome === 'rejected') {
        const msg = c.rows.find((x) => x.kind === 'message')!;
        expect([msg.quick2, msg.quickened]).toEqual([g.message ?? null, r.message]);
        const held = c.rows.find((x) => x.kind === 'held')!;
        expect([held.quick2, held.quickened]).toEqual([g.held_prompt ?? null, r.held]);
      }
      expect(c.same, c.id).toBe(c.rows.every((x) => x.same));
    }
  });
  it('marks the two known differences different', () => {
    for (const id of ['cc-circ-000035', 'nd-circ-000020']) expect(model.cases.find((c) => c.id === id)!.same, id).toBe(false);
  });
  it('says no headline run has been recorded, with no count, while results/headline.md is missing', () => {
    expect(data.headline).toBeNull();
    const text = textOf(proofView(model));
    expect(text).toContain(NO_HEADLINE);
    expect(model.headline).toBeNull();
  });
  it('states the count and date when there is a headline', () => {
    const m = proofModel(data.proof, { matched: 1, total: 2, run: '2026-01-02' });
    expect(m.headline).toMatch(/1 of 2.*2026-01-02/);
    expect(textOf(proofView(m))).not.toContain(NO_HEADLINE);
  });
  it('shows each capture in a frame named as QUICK-2s, and each row marked same or different', () => {
    const v = proofView(model);
    for (const c of model.cases) {
      const block = findAll(v, (n) => n.attrs.id === `case-${c.id}`)[0]!;
      const pre = findAll(block, (n) => n.tag === 'pre')[0]!;
      expect(pre.children.join(''), c.id).toBe(c.capture);
      expect(textOf(block)).toContain(c.captureLabel);
      const marks = findAll(block, (n) => n.attrs.class === 'mark').map(textOf);
      expect(marks, c.id).toEqual(c.rows.map((x) => (x.same ? 'same' : 'different')));
    }
  });
});
