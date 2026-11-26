// The plain-decimal rule (quickened-app criterion 1.9; design: Validation). Every field is
// checked before solve() is called. An empty field or any other text is not sent: what QUICK-2
// does with such text has not been observed (ledger Q-004, Q-019). Zero and negative values are
// plain decimals and go to the solver, which holds, rejects or computes them as QUICK-2 did.
import type { Job } from '../solver/index.ts';

const PLAIN_DECIMAL = /^-?(\d+\.?\d*|\.\d+)$/;

export function isPlainDecimal(text: string): boolean {
  return PLAIN_DECIMAL.test(text);
}

/** The keys whose text is not a plain decimal, in input order. */
export function invalidFields(inputs: Readonly<Record<string, string>>): string[] {
  return Object.keys(inputs).filter((k) => !isPlainDecimal(inputs[k]!));
}

export interface Invalid { kind: 'invalid'; fields: string[]; }

/** Run the job only when every field is a plain decimal; otherwise name the fields, unrun. */
export function whenValid<T>(job: Job, run: (job: Job) => T): Invalid | T {
  const fields = invalidFields(job.inputs);
  return fields.length ? { kind: 'invalid', fields } : run(job);
}
