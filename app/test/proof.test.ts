// The proof page (quickened-app task 10.3; criteria 5.1, 5.2). For each listed case the view model
// holds the recorded capture, the golden's printed text and runJob's, marked same or different;
// a case is marked different exactly when it is a known miss (results/known-misses.json). The
// expected texts are read here from the goldens and captures, never typed.
import { describe, expect, it } from 'vitest';
import { data } from 'virtual:quickened/data';
import { runJob } from '../src/ui/state.ts';
import { NO_HEADLINE, NOT_COUNTED, proofModel, proofView } from '../src/ui/views/proof.ts';
import { screenLabel, screenRowHeading } from '../src/ui/forms.ts';
import type { Mode, Shape } from '../src/solver/index.ts';
import { findAll, textOf } from '../src/ui/vnode.ts';
import type { AppJob } from '../src/ui/job.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseHeadline } from '../build/headline.ts';
import { finalCapture, golden, ROOT } from './golden.ts';
import { isKnownMiss } from './knownMisses.ts';
import { proofCaseAnchor, routeOf } from '../src/ui/views/shell.ts';

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
      expect(fields.filter((x) => x.quick2 !== null).map((x) => x.field), c.id).toEqual(Object.keys(g.printed));
      for (const x of fields) {
        expect(x.quick2, `${c.id} ${x.field}`).toBe(g.printed[x.field] ?? null);
        expect(x.quickened, `${c.id} ${x.field}`).toBe(r.printed[x.field] ?? null);
        expect(x.same, `${c.id} ${x.field}`).toBe(x.quick2 !== null && x.quickened !== null && x.quick2.trim() === x.quickened.trim());
      }
      const outcome = c.rows.find((x) => x.kind === 'outcome')!;
      expect([outcome.quick2, outcome.quickened]).toEqual([g.outcome, r.outcome]);
      if (g.outcome === 'rejected') {
        const msg = c.rows.find((x) => x.kind === 'message')!;
        expect([msg.quick2, msg.quickened]).toEqual([g.message ?? null, r.message]);
        const held = c.rows.find((x) => x.kind === 'held')!;
        expect([held.quick2, held.quickened]).toEqual([g.held_prompt ?? null, r.held]);
      }
      expect(c.same, c.id).toBe(c.rows.filter((x) => x.counted).every((x) => x.same));
    }
  });
  // Criterion 5.10 (2026-11-26): the page marked four circle rejections different because QUICK-2's
  // message ends in blanks and Quickened's does not. The comparator (oracle.compare.compare_one)
  // compares the outcome and then each printed field trimmed; the message and the held prompt are
  // shown, compared trimmed, and do not mark the case.
  it("marks a case by the comparator's rule: the outcome, then every printed field trimmed", () => {
    for (const c of model.cases) {
      const g = golden(c.id);
      const r = runJob(jobOf(g));
      const keys = new Set([...Object.keys(g.printed), ...Object.keys(r.printed)]);
      const rule = g.outcome === r.outcome && [...keys].every((k) => g.printed[k] !== undefined && r.printed[k] !== undefined && g.printed[k]!.trim() === r.printed[k]!.trim());
      expect(c.same, c.id).toBe(rule);
      expect(c.rows.filter((x) => x.counted).map((x) => x.kind).every((k) => k === 'outcome' || k === 'printed'), c.id).toBe(true);
      for (const x of c.rows.filter((y) => y.kind === 'message' || y.kind === 'held')) {
        expect(x.counted, `${c.id} ${x.kind}`).toBe(false);
        expect(x.same, `${c.id} ${x.kind}`).toBe((x.quick2 ?? '').trim() === (x.quickened ?? '').trim() && (x.quick2 === null) === (x.quickened === null));
      }
    }
  });
  it('marks different exactly the cases on the page that results/known-misses.json holds', () => {
    expect(model.cases.some((c) => isKnownMiss(c.id))).toBe(true);
    expect(model.different).toEqual(model.cases.filter((c) => isKnownMiss(c.id)).map((c) => c.id));
  });
  it('shows a rejection whose message differs only in its blanks as same, with both messages trimmed', () => {
    const rejected = model.cases.filter((c) => c.rows[0]!.quick2 === 'rejected' && !isKnownMiss(c.id));
    expect(rejected.length).toBeGreaterThan(0);
    const v = proofView(model);
    for (const c of rejected) {
      expect(c.same, c.id).toBe(true);
      const msg = c.rows.find((x) => x.kind === 'message')!;
      const cells = findAll(findAll(v, (n) => n.attrs.id === `case-${c.id}`)[0]!, (n) => n.tag === 'tr' && n.attrs['data-kind'] === 'message')[0]!;
      const tds = findAll(cells, (n) => n.tag === 'td').map((n) => n.children.join(''));
      expect(tds.slice(0, 2), c.id).toEqual([msg.quick2, msg.quickened].map((s) => (s === null ? '(none)' : s.trim())));
    }
  });
  it("labels each printed row with QUICK-2's label for the field, as the results screen does", () => {
    for (const c of model.cases) {
      const g = golden(c.id);
      for (const x of c.rows.filter((y) => y.kind === 'printed')) {
        const label = screenLabel(g.mode as Mode, g.shape as Shape, x.field) ?? x.field;
        const heading = screenRowHeading(g.mode as Mode, g.shape as Shape, x.field);
        expect(x.label, `${c.id} ${x.field}`).toBe(heading ? `${heading} ${label}` : label);
      }
    }
    const irr = model.cases.find((c) => c.rows.some((x) => x.field === 'ws_elev'));
    expect(irr?.rows.find((x) => x.field === 'ws_elev')?.label).toBe(screenLabel('normal_depth', 'irregular', 'ws_elev'));
  });
  it('states the count and date of results/headline.md', () => {
    const file = parseHeadline(readFileSync(join(ROOT, 'results', 'headline.md'), 'utf-8'));
    expect(data.headline).toEqual(file);
    expect(model.headline).toMatch(new RegExp(`${file.matched} of ${file.total}.*${file.run}`));
    expect(textOf(proofView(model))).not.toContain(NO_HEADLINE);
  });
  it('counts the cases marked same and different at the top, with a link to each case', () => {
    expect(model.same).toEqual(model.cases.filter((c) => c.same).map((c) => c.id));
    expect(model.different).toEqual(model.cases.filter((c) => !c.same).map((c) => c.id));
    expect(model.same.length + model.different.length).toBe(model.cases.length);
    const v = proofView(model);
    const summary = findAll(v, (n) => n.attrs.id === 'proof-summary')[0]!;
    expect(textOf(summary)).toContain(`Of the ${model.cases.length} cases on this page, ${model.same.length} are marked same and ${model.different.length} different.`);
    const links = findAll(summary, (n) => n.tag === 'a');
    expect(links.map((a) => a.attrs.href)).toEqual([...model.same, ...model.different].map((id) => `#/proof/${id}`));
    expect(links.map(textOf)).toEqual([...model.same, ...model.different]);
    for (const a of links) {
      expect(routeOf(String(a.attrs.href))).toBe('proof');
      const anchor = proofCaseAnchor(String(a.attrs.href))!;
      expect(findAll(v, (n) => n.attrs.id === anchor).length, anchor).toBe(1);
    }
    // At the top: after the headline, before the first case.
    const text = textOf(v);
    expect(text.indexOf(model.headline!)).toBeLessThan(text.indexOf('Of the '));
    expect(text.indexOf('Of the ')).toBeLessThan(text.indexOf(model.cases[0]!.captureLabel));
  });
  it('says no headline run has been recorded, with no count, when there is none', () => {
    const m = proofModel(data.proof, null);
    expect(m.headline).toBeNull();
    expect(textOf(proofView(m))).toContain(NO_HEADLINE);
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
      expect(marks, c.id).toEqual(c.rows.map((x) => `${x.same ? 'same' : 'different'}${x.counted ? '' : `, ${NOT_COUNTED}`}`));
    }
  });
});
