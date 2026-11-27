// The proof page (quickened-app design: The proof page; criteria 5.1, 5.2). For each case of
// proof/cases.json: QUICK-2's recorded screen, as captured, in a frame that names it as QUICK-2's,
// and beside it each printed field's text from the golden and from runJob in the browser, marked
// same or different. The header states the headline run from results/headline.md, or says that no
// headline run has been recorded yet and shows no count. Under it, the count of the page's cases
// marked same and different, with a link to each case (#/proof/<case id>).
import type { QuickenedData } from '../../../build/data.ts';
import type { Mode, Shape } from '../../solver/index.ts';
import type { AppJob } from '../job.ts';
import { screenLabel, screenRowHeading } from '../forms.ts';
import { runJob } from '../state.ts';
import { h, type Child, type VNode } from '../vnode.ts';
import { forRepo, splitRepo } from './repo.ts';
import { proofCaseHash } from './shell.ts';

export const NO_HEADLINE = 'No headline run has been recorded yet.';
/** The mark's addition on a row the comparator does not compare (criterion 5.10). */
export const NOT_COUNTED = 'not counted';
export const RULE_SENTENCE = "A case is marked same when QUICK-2 and Quickened give the same outcome and every printed field reads the same with its leading and trailing blanks left out, as the checking script marks it. QUICK-2's message and the input it stopped at, if any, are shown beside it, compared the same way, and do not mark the case.";
/** The proof table's row for the input QUICK-2 stopped at (criterion 11.3). */
export const STOPPED_ROW = 'Input QUICK-2 stopped at';

export interface ProofRow {
  kind: 'outcome' | 'message' | 'held' | 'printed';
  /** The printed field's key, or the row's name. */
  field: string;
  /** QUICK-2's label for the field, with its row heading where it has one, as the results screen shows it. */
  label: string;
  /** As recorded and as returned; null where there is none. */
  quick2: string | null;
  quickened: string | null;
  /** Compared with leading and trailing blanks left out. */
  same: boolean;
  /** Whether the comparator compares this row, and so whether it marks the case. */
  counted: boolean;
}

export interface ProofCaseModel {
  id: string;
  reason: string;
  captureLabel: string;
  capture: string;
  rows: ProofRow[];
  same: boolean;
}

export interface ProofModel {
  headline: string | null;
  cases: ProofCaseModel[];
  /** The ids of the cases marked same and different, in the list order. */
  same: string[];
  different: string[];
}

const trimmedSame = (a: string | null, b: string | null): boolean => (a === null || b === null ? a === b : a.trim() === b.trim());

const row = (kind: ProofRow['kind'], field: string, label: string, quick2: string | null, quickened: string | null): ProofRow =>
  ({ kind, field, label, quick2, quickened, same: kind === 'outcome' ? quick2 === quickened : trimmedSame(quick2, quickened), counted: kind === 'outcome' || kind === 'printed' });

/** QUICK-2's label for a field, after its row heading where it has one (as views/results.ts). */
function fieldLabel(mode: Mode, shape: Shape, field: string): string {
  const label = screenLabel(mode, shape, field) ?? field;
  const heading = screenRowHeading(mode, shape, field);
  return heading ? `${heading} ${label}` : label;
}

export function proofModel(cases: QuickenedData['proof'], headline: QuickenedData['headline']): ProofModel {
  const models = caseModels(cases);
  return {
    headline: headline ? `${headline.matched} of ${headline.total} cases matched in the headline run of ${headline.run}.` : null,
    cases: models,
    same: models.filter((c) => c.same).map((c) => c.id),
    different: models.filter((c) => !c.same).map((c) => c.id),
  };
}

function caseModels(cases: QuickenedData['proof']): ProofCaseModel[] {
  return cases.map((c) => {
    const job: AppJob = { mode: c.mode as Mode, shape: c.shape as Shape, inputs: { ...c.inputs }, origin: 'typed' };
    const r = runJob(job);
    const rows = [row('outcome', 'outcome', 'Outcome', c.outcome, r.outcome)];
    if (c.outcome === 'rejected') {
      rows.push(row('message', 'message', "QUICK-2's message", c.message, r.message), row('held', 'held', STOPPED_ROW, c.held, r.held));
    }
    for (const [k, v] of Object.entries(c.printed)) rows.push(row('printed', k, fieldLabel(job.mode, job.shape, k), v, r.printed[k] ?? null));
    // A field Quickened prints and QUICK-2 did not is a difference too, as the comparator reports it.
    for (const k of Object.keys(r.printed).filter((x) => !(x in c.printed))) rows.push(row('printed', k, fieldLabel(job.mode, job.shape, k), null, r.printed[k]!));
    return {
      id: c.id, reason: c.reason, capture: c.capture,
      captureLabel: `QUICK-2's screen, recorded ${c.recordedAt.slice(0, 10)}`,
      rows, same: rows.filter((x) => x.counted).every((x) => x.same),
    };
  });
}

const plural = (n: number): string => (n === 1 ? 'case' : 'cases');

/** A sentence that links each case by its id, as text links inside the sentence. */
function caseLinks(label: string, ids: readonly string[]): VNode {
  const links: Child[] = [];
  ids.forEach((id, i) => {
    if (i > 0) links.push(', ');
    links.push(h('a', { href: proofCaseHash(id) }, id));
  });
  return h('p', {}, `${label}: `, ids.length ? links : 'none', '.');
}

/** The count at the top of the page: the cases marked same and different, each linked. */
export function proofSummary(m: ProofModel): VNode {
  const n = m.cases.length;
  return h('div', { id: 'proof-summary' },
    h('p', {}, `Of the ${n} ${plural(n)} on this page, ${m.same.length} ${m.same.length === 1 ? 'is' : 'are'} marked same and ${m.different.length} different.`),
    caseLinks('Same', m.same),
    caseLinks('Different', m.different));
}

/** A row's text as it is compared: leading and trailing blanks left out. */
const shown = (s: string | null): string => (s === null ? '(none)' : s.trim());

/** Why the case is on the page: the plain sentences, and any wording for the repository in a closed details under them (criterion 10.6). */
function reasonView(reason: string): Child[] {
  const s = splitRepo(reason);
  return [s.plain ? h('p', {}, s.plain) : null, forRepo(s.repo.map((x) => h('p', {}, x)))].filter((c): c is VNode => c !== null);
}

function caseView(c: ProofCaseModel): VNode {
  return h('article', { class: 'proof-case', id: `case-${c.id}` },
    h('h2', {}, h('span', { class: 'figures' }, c.id), ' ', c.same ? 'same' : 'different'),
    reasonView(c.reason),
    h('div', { class: 'proof-pair' },
      h('figure', { class: 'quick2-screen' },
        h('figcaption', {}, c.captureLabel),
        h('pre', { class: 'quick2', tabindex: '0', 'aria-label': c.captureLabel }, c.capture)),
      h('table', { class: 'proof-table' },
        h('caption', {}, `${c.id}: QUICK-2 and Quickened, field by field`),
        h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Field'), h('th', { scope: 'col' }, 'QUICK-2'),
          h('th', { scope: 'col' }, 'Quickened'), h('th', { scope: 'col' }, 'Same?'))),
        h('tbody', {}, c.rows.map((x) => h('tr', { class: x.same ? 'same' : 'different', 'data-kind': x.kind, 'data-field': x.field },
          h('th', { scope: 'row', class: x.kind === 'printed' ? 'quick2' : undefined }, x.label),
          h('td', { class: 'figures', 'data-label': 'QUICK-2' }, shown(x.quick2)),
          h('td', { class: 'figures', 'data-label': 'Quickened' }, shown(x.quickened)),
          h('td', { 'data-label': 'Same?' }, h('span', { class: 'mark' }, `${x.same ? 'same' : 'different'}${x.counted ? '' : `, ${NOT_COUNTED}`}`))))))));
}

export function proofView(m: ProofModel): VNode {
  return h('section', { class: 'proof-page' },
    h('h1', {}, 'Proof'),
    h('p', {}, m.headline ?? NO_HEADLINE),
    proofSummary(m),
    h('p', {}, "Each case below is QUICK-2's own screen, as recorded, beside the fields Quickened computes for the same inputs in this browser."),
    h('p', {}, RULE_SENTENCE),
    m.cases.map(caseView));
}
