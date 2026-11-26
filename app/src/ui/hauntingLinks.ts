// Which haunting a result links to, and the exact values of a recorded case (quickened-app
// design: Which haunting a result links to, Exact values by field; criteria 2.2, 2.4). Flags map
// from each entry's **Flag:** line in results/hauntings.md; pairs map from each entry's text, as
// the design lists them. A job is a haunting's recorded case when its pair is the case's and its
// inputs equal the case golden's, key for key and text for text.
import { data } from 'virtual:quickened/data';
import type { Mode, Result, Shape } from '../solver/index.ts';
import type { AppJob } from './job.ts';

/** A haunting's Exact by field values for a recorded case; `values` is empty for a `none` line. */
export interface ExactByField { haunting: string; title: string; assumption: string; caseId: string; values: Readonly<Record<string, string>>; }
/** A haunting a result links to. */
export interface HauntingLink { haunting: string; title: string; }

const PRISMATIC: readonly Shape[] = ['trapezoid', 'v_ditch', 'rectangle'];

export interface PairRule { haunting: string; modes: readonly Mode[]; shapes: readonly Shape[]; outcome: Result['outcome']; }

/** The pairs each haunting describes, from its entry's text. */
export const PAIR_RULES: readonly PairRule[] = [
  { haunting: 'H-005', modes: ['normal_depth', 'critical_depth'], shapes: PRISMATIC, outcome: 'result' },
  { haunting: 'H-006', modes: ['normal_depth', 'critical_depth', 'channel_capacity'], shapes: PRISMATIC, outcome: 'result' },
  { haunting: 'H-003', modes: ['normal_depth', 'critical_depth', 'channel_capacity'], shapes: ['circle'], outcome: 'result' },
  { haunting: 'H-004', modes: ['critical_depth'], shapes: ['circle'], outcome: 'result' },
  { haunting: 'H-007', modes: ['critical_depth'], shapes: ['circle'], outcome: 'result' },
  { haunting: 'H-009', modes: ['critical_depth'], shapes: ['circle'], outcome: 'rejected' },
];

/** Flag code to the hauntings whose **Flag:** line names it. */
export function flagLinks(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const h of data.hauntings) for (const code of h.flagCodes) (out[code] ??= []).push(h.id);
  return out;
}

const titleOf = (id: string) => data.hauntings.find((h) => h.id === id)?.title ?? id;

function sameInputs(a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>): boolean {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => Object.hasOwn(b, k) && a[k] === b[k]);
}

/** The haunting case this job is, with its Exact by field values, or null. */
export function recordedCase(job: AppJob): ExactByField | null {
  for (const h of data.hauntings) {
    for (const line of h.exactByField) {
      const c = data.cases[line.caseId];
      if (c && c.mode === job.mode && c.shape === job.shape && sameInputs(c.inputs, job.inputs)) {
        return { haunting: h.id, title: h.title, assumption: h.assumption, caseId: line.caseId, values: line.values ?? {} };
      }
    }
  }
  return null;
}

/** The hauntings a Result is of the kind of: by its flags first, then by its pair. */
export function linksFor(job: AppJob, r: Result): HauntingLink[] {
  const flags = flagLinks();
  const ids = [
    ...r.flags.flatMap((f) => flags[f.code] ?? []),
    // A refusal links only when QUICK-2 gave its message, not when it holds a prompt.
    ...PAIR_RULES.filter((p) => p.outcome === r.outcome && p.modes.includes(job.mode) && p.shapes.includes(job.shape)
      && (r.outcome !== 'rejected' || (r.held === null && r.message !== null))).map((p) => p.haunting),
  ];
  return [...new Set(ids)].map((haunting) => ({ haunting, title: titleOf(haunting) }));
}
