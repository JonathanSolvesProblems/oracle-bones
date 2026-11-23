// Prompt order for each mode and shape, keyed by the input names of the oracle contract, the
// fixed fields a form prints without asking, and the hold rules a regular form applies.
import { INCHES_PER_FOOT } from './constants.ts';
import { heldAsZero, readSingle } from './parse.ts';
import { store } from './single.ts';
import type { RegularMode, RegularShape } from './types.ts';

/**
 * Normal Depth, Irregular Channel: after the ground points, the LEFT and RIGHT bank stations,
 * the LEFT, CHANNEL and RIGHT n values, the Discharge and the Slope (criterion 3.3).
 */
export const ND_IRREGULAR_PROMPTS = ['bank_left', 'bank_right', 'n_left', 'n_channel', 'n_right', 'discharge', 'slope'] as const;

/**
 * The regular forms (criteria 4.1 to 4.4). Every mode asks the shape's values, then Discharge
 * (Critical Depth, Normal Depth) or Depth (Channel Capacity), then Slope.
 */
const SHAPE_PROMPTS: Readonly<Record<RegularShape, readonly string[]>> = {
  trapezoid: ['left_slope', 'right_slope', 'bottom_width', 'n'],
  v_ditch: ['left_slope', 'right_slope', 'n'],
  rectangle: ['bottom_width', 'n'],
  circle: ['diameter', 'n'],
};

export function regularPrompts(mode: RegularMode, shape: RegularShape): readonly string[] {
  return [...SHAPE_PROMPTS[shape], mode === 'channel_capacity' ? 'depth' : 'discharge', 'slope'];
}

/**
 * Fields the form prints without asking: Bottom Width `0.0` on the V-ditch (criterion 4.1),
 * both side slopes `0.0` on the rectangle (criterion 4.2). The circle shows neither (4.4).
 */
export const FIXED_FIELDS: Readonly<Record<RegularShape, Readonly<Record<string, number>>>> = {
  trapezoid: {},
  v_ditch: { bottom_width: 0 },
  rectangle: { left_slope: 0, right_slope: 0 },
  circle: {},
};

export type FormRead = { ok: true; values: Record<string, number> } | { ok: false; held: string };

/**
 * Whether a prompt holds its value. Applied in prompt order, so the first offending prompt is
 * the one held (Property 2):
 * - 0 at any prompt of any regular form, `.000` included (criteria 1.1, 8.6);
 * - a Diameter of -1 (design: Parsing and holds); other negative diameters are unobserved;
 * - a Channel Capacity circle Depth greater than the diameter in feet (criterion 8.5); a depth
 *   equal to the diameter is unobserved.
 */
function holds(mode: RegularMode, shape: RegularShape, prompt: string, value: number, before: Readonly<Record<string, number>>): boolean {
  if (heldAsZero(value)) return true;
  if (prompt === 'diameter' && value === -1) return true;
  if (mode === 'channel_capacity' && shape === 'circle' && prompt === 'depth') {
    return value > store(before.diameter! / INCHES_PER_FOOT);
  }
  return false;
}

/** The echo fields of read values: each input `x` prints in the window `in_x`. */
export function echoes(values: Readonly<Record<string, number>>): Record<string, number> {
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [`in_${k}`, v]));
}

/** Read a regular form's typed values in prompt order; the first prompt that holds ends it. */
export function readRegularForm(mode: RegularMode, shape: RegularShape, inputs: Readonly<Record<string, string>>): FormRead {
  const values: Record<string, number> = {};
  for (const p of regularPrompts(mode, shape)) {
    const v = readSingle(inputs[p] ?? '');
    if (holds(mode, shape, p, v, values)) return { ok: false, held: p };
    values[p] = v;
  }
  return { ok: true, values: { ...FIXED_FIELDS[shape], ...values } };
}
