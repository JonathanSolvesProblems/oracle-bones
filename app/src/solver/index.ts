// solve(job): dispatch on mode and shape. Its only argument is {mode, shape, inputs}; it never
// sees a case id. Pairs not built yet answer outcome `error` with message `not built`; a regular
// form still applies its hold rules first, so a held prompt is `rejected` in every regular pair.
import { readRegularForm } from './forms.ts';
import { capacityCircle, capacityPrismatic } from './modes/capacity.ts';
import { criticalDepthCircle, normalDepthCircle } from './modes/circle.ts';
import { criticalDepthPrismatic } from './modes/criticalDepth.ts';
import { normalDepthPrismatic } from './modes/normalDepth.ts';
import { normalDepthIrregular } from './modes/normalDepthIrregular.ts';
import { failed, rejected, type Job, type Mode, type RegularMode, type RegularShape, type Result, type Shape } from './types.ts';

export type { Flag, FlagCode, Job, Mode, Result, Shape } from './types.ts';

type Method = (inputs: Readonly<Record<string, string>>) => Result;
type RegularMethod = (values: Readonly<Record<string, number>>) => Result;

const METHODS: Readonly<Record<string, Method>> = {
  'normal_depth/irregular': normalDepthIrregular,
};

const REGULAR_METHODS: Readonly<Record<string, RegularMethod>> = {
  'normal_depth/trapezoid': (v) => normalDepthPrismatic('trapezoid', v),
  'normal_depth/v_ditch': (v) => normalDepthPrismatic('v_ditch', v),
  'normal_depth/rectangle': (v) => normalDepthPrismatic('rectangle', v),
  'critical_depth/trapezoid': (v) => criticalDepthPrismatic('trapezoid', v),
  'critical_depth/v_ditch': (v) => criticalDepthPrismatic('v_ditch', v),
  'critical_depth/rectangle': (v) => criticalDepthPrismatic('rectangle', v),
  'channel_capacity/trapezoid': (v) => capacityPrismatic('trapezoid', v),
  'channel_capacity/v_ditch': (v) => capacityPrismatic('v_ditch', v),
  'channel_capacity/rectangle': (v) => capacityPrismatic('rectangle', v),
  'channel_capacity/circle': capacityCircle,
  'normal_depth/circle': normalDepthCircle,
  'critical_depth/circle': criticalDepthCircle,
};

const REGULAR_MODES = new Set<string>(['normal_depth', 'critical_depth', 'channel_capacity']);
const REGULAR_SHAPES = new Set<string>(['trapezoid', 'v_ditch', 'rectangle', 'circle']);

export const NOT_BUILT = 'not built';

function isRegular(mode: Mode, shape: Shape): boolean {
  return REGULAR_MODES.has(mode) && REGULAR_SHAPES.has(shape);
}

/**
 * Whether solve() computes this pair, read from the tables it dispatches on: false exactly
 * when solve() answers `not built` (quickened-app criterion 7.4). Changes no Result.
 */
export function isBuilt(mode: Mode, shape: Shape): boolean {
  const key = `${mode}/${shape}`;
  return isRegular(mode, shape) ? key in REGULAR_METHODS : key in METHODS;
}

export function solve(job: Job): Result {
  const key = `${job.mode}/${job.shape}`;
  if (isRegular(job.mode, job.shape)) {
    const form = readRegularForm(job.mode as RegularMode, job.shape as RegularShape, job.inputs);
    if (!form.ok) return rejected(form.held);
    const method = REGULAR_METHODS[key];
    return method ? method(form.values) : failed(NOT_BUILT);
  }
  const method = METHODS[key];
  if (!method) return failed(NOT_BUILT);
  return method(job.inputs);
}
