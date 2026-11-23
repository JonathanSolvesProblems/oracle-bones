// solve(job): dispatch on mode and shape. Its only argument is {mode, shape, inputs}; it never
// sees a case id. Pairs not built yet answer outcome `error` with message `not built`.

import { normalDepthTrapezoid } from './modes/normalDepth.ts';
import { normalDepthIrregular } from './modes/normalDepthIrregular.ts';
import { failed, type Job, type Result } from './types.ts';

export type { Flag, FlagCode, Job, Mode, Result, Shape } from './types.ts';

type Method = (inputs: Readonly<Record<string, string>>) => Result;

const METHODS: Readonly<Record<string, Method>> = {
  'normal_depth/trapezoid': normalDepthTrapezoid,
  'normal_depth/irregular': normalDepthIrregular,
};

export const NOT_BUILT = 'not built';

export function solve(job: Job): Result {
  const method = METHODS[`${job.mode}/${job.shape}`];
  if (!method) return failed(NOT_BUILT);
  return method(job.inputs);
}
