// runJob and classify: Job -> ScreenState (quickened-app design: How the UI calls solve(),
// Screen states; criteria 1.2, 1.9, 6.1 to 6.6, 6.9). runJob is the only call to solve() in ui/.
import { solve, NOT_BUILT, type Flag, type Mode, type Result, type Shape } from '../solver/index.ts';
import type { AppJob } from './job.ts';
import { whenValid } from './validate.ts';

/** A haunting's Exact by field values for a recorded case (criterion 2.2). Filled in by task 6. */
export interface ExactByField { haunting: string; assumption: string; values: Record<string, string>; }
/** A haunting a result links to (criterion 2.4). Filled in by task 6. */
export interface HauntingLink { haunting: string; }

export type ScreenState =
  | { kind: 'idle' }
  | { kind: 'invalid'; fields: string[] }
  | { kind: 'result'; result: Result; exact: ExactByField | null; links: HauntingLink[] }
  | { kind: 'held'; result: Result; prompt: string; message: string | null }
  | { kind: 'rejected'; result: Result; message: string; keyLineRest: string | null }
  | { kind: 'stopped'; result: Result; flags: Flag[] }
  | { kind: 'not_built'; result: Result; mode: Mode; shape: Shape }
  | { kind: 'failed'; result: Result; message: string };

/** Quickened's sentence for a Result that fits no rule; a test keeps every golden away from it. */
export const UNPLACED = 'Quickened could not place this answer from the solver: it is neither a result, a refusal nor an error it knows.';
/** Quickened's sentence for an error that carries no message. */
export const NO_MESSAGE = 'The solver stopped with an error and gave no message.';

export function runJob(job: AppJob): Result {
  return solve({ mode: job.mode, shape: job.shape, inputs: job.inputs });
}

/** One state for every Result, in the design's order. */
export function classify(job: AppJob, result: Result): ScreenState {
  const r = result;
  if (r.outcome === 'result') return { kind: 'result', result: r, exact: null, links: [] };
  if (r.outcome === 'rejected' && r.held !== null) return { kind: 'held', result: r, prompt: r.held, message: r.message };
  if (r.outcome === 'rejected' && r.message !== null) return { kind: 'rejected', result: r, message: r.message, keyLineRest: null };
  if (r.outcome === 'error' && r.flags.length > 0) return { kind: 'stopped', result: r, flags: r.flags };
  if (r.outcome === 'error' && r.message === NOT_BUILT) return { kind: 'not_built', result: r, mode: job.mode, shape: job.shape };
  if (r.outcome === 'error') return { kind: 'failed', result: r, message: r.message ?? NO_MESSAGE };
  return { kind: 'failed', result: r, message: UNPLACED };
}

/** Validate, then run and classify. A field that is not a plain decimal never reaches solve(). */
export function calculate(job: AppJob): ScreenState {
  return whenValid(job, () => classify(job, runJob(job)));
}
