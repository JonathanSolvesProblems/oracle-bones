// The rebuild contract (oracle-harness Requirement 12): one JSON request per line,
// {"id", "mode", "shape", "inputs"}, and one response per line, {"id", "outcome", "printed",
// "message"}. The id stays here and never reaches solve(); `held`, `flags` and `raw` are not
// part of the contract and are dropped.

import type { Job, Result } from '../solver/index.ts';

export interface Response {
  id: string;
  outcome: Result['outcome'];
  printed: Record<string, string>;
  message: string | null;
}

export type Solver = (job: Job) => Result;

/** The response to one request line, or null for a blank line. */
export function respond(line: string, solver: Solver): Response | null {
  if (line.trim() === '') return null;
  const req = JSON.parse(line) as { id: string; mode: Job['mode']; shape: Job['shape']; inputs: Record<string, string> };
  const id = String(req.id);
  let result: Result;
  try {
    result = solver({ mode: req.mode, shape: req.shape, inputs: { ...req.inputs } });
  } catch (e) {
    return { id, outcome: 'error', printed: {}, message: `rebuild failed: ${e instanceof Error ? e.message : String(e)}` };
  }
  return { id, outcome: result.outcome, printed: result.printed, message: result.message };
}
