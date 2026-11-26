// The proof page (quickened-app design: The proof page; criteria 5.1, 5.2). For each case of
// proof/cases.json: QUICK-2's recorded screen, as captured, in a frame that names it as QUICK-2's,
// and beside it each printed field's text from the golden and from runJob in the browser, marked
// same or different. The header states the headline run from results/headline.md, or says that no
// headline run has been recorded yet and shows no count.
import type { QuickenedData } from '../../../build/data.ts';
import type { Mode, Shape } from '../../solver/index.ts';
import type { AppJob } from '../job.ts';
import { runJob } from '../state.ts';
import { h, type VNode } from '../vnode.ts';

export const NO_HEADLINE = 'No headline run has been recorded yet.';

export interface ProofRow {
  kind: 'outcome' | 'message' | 'held' | 'printed';
  field: string;
  quick2: string | null;
  quickened: string | null;
  same: boolean;
}

export interface ProofCaseModel {
  id: string;
  reason: string;
  captureLabel: string;
  capture: string;
  rows: ProofRow[];
  same: boolean;
}

export interface ProofModel { headline: string | null; cases: ProofCaseModel[]; }

const row = (kind: ProofRow['kind'], field: string, quick2: string | null, quickened: string | null): ProofRow =>
  ({ kind, field, quick2, quickened, same: quick2 === quickened });

export function proofModel(cases: QuickenedData['proof'], headline: QuickenedData['headline']): ProofModel {
  return {
    headline: headline ? `${headline.matched} of ${headline.total} cases matched in the headline run of ${headline.run}.` : null,
    cases: cases.map((c) => {
      const job: AppJob = { mode: c.mode as Mode, shape: c.shape as Shape, inputs: { ...c.inputs }, origin: 'typed' };
      const r = runJob(job);
      const rows = [row('outcome', 'Outcome', c.outcome, r.outcome)];
      if (c.outcome === 'rejected') rows.push(row('message', 'Message', c.message, r.message), row('held', 'Held prompt', c.held, r.held));
      for (const [k, v] of Object.entries(c.printed)) rows.push(row('printed', k, v, r.printed[k] ?? null));
      return {
        id: c.id, reason: c.reason, capture: c.capture,
        captureLabel: `QUICK-2's screen, recorded ${c.recordedAt.slice(0, 10)}`,
        rows, same: rows.every((x) => x.same),
      };
    }),
  };
}

const shown = (s: string | null): string => (s === null ? '(none)' : s);

function caseView(c: ProofCaseModel): VNode {
  return h('article', { class: 'proof-case', id: `case-${c.id}` },
    h('h2', {}, h('span', { class: 'figures' }, c.id), ' ', c.same ? 'same' : 'different'),
    h('p', {}, c.reason),
    h('div', { class: 'proof-pair' },
      h('figure', { class: 'quick2-screen' },
        h('figcaption', {}, c.captureLabel),
        h('pre', { class: 'quick2', tabindex: '0', 'aria-label': c.captureLabel }, c.capture)),
      h('table', { class: 'proof-table' },
        h('caption', {}, `${c.id}: QUICK-2 and Quickened, field by field`),
        h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Field'), h('th', { scope: 'col' }, 'QUICK-2'),
          h('th', { scope: 'col' }, 'Quickened'), h('th', { scope: 'col' }, 'Same?'))),
        h('tbody', {}, c.rows.map((x) => h('tr', { class: x.same ? 'same' : 'different' },
          h('th', { scope: 'row' }, x.field),
          h('td', { class: 'figures' }, shown(x.quick2)),
          h('td', { class: 'figures' }, shown(x.quickened)),
          h('td', {}, h('span', { class: 'mark' }, x.same ? 'same' : 'different'))))))));
}

export function proofView(m: ProofModel): VNode {
  return h('section', { class: 'proof-page' },
    h('h1', {}, 'Proof'),
    h('p', {}, m.headline ?? NO_HEADLINE),
    h('p', {}, "Each case below is QUICK-2's own screen, as recorded, beside the fields Quickened computes for the same inputs in this browser."),
    m.cases.map(caseView));
}
