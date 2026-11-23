// Normal Depth on an irregular section (design: Normal Depth, irregular section).
//
// The search runs on the water-surface elevation with Q = ΣK · √S, from the lowest ground
// point plus 0.1 ft in 0.5 ft steps; the bottom of the first bracket is the lowest point. At
// its elevation: Depth = WS − lowest elevation; Area, Top Wid and Wet Per are totals over every
// wet part; Hyd R = A/P; Chan Vel = q · Kch/K / Ach; Froude = √α · (q/A)/√(g·A/T).

import { G, IRREGULAR_START, IRREGULAR_STEP } from '../constants.ts';
import { flag, irregularFlags } from '../flags.ts';
import { ND_IRREGULAR_PROMPTS } from '../forms.ts';
import { flowAt, type IrregularFlow, type IrregularSection } from '../geometry/irregular.ts';
import { LEFT_BANK_ERROR, RIGHT_BANK_ERROR, bankMatches, enter, sectionKeys, type GroundPoint } from '../groundPoints.ts';
import { readSingle } from '../parse.ts';
import { search } from '../search.ts';
import { store } from '../single.ts';
import { failed, rejected, type Result } from '../types.ts';
import { flowType } from './normalDepth.ts';
import { ND_IRR_RESULT } from '../../format/layout.ts';
import { printed } from '../../format/screen.ts';

export interface IrregularInputs {
  points: GroundPoint[];
  section: IrregularSection;
  discharge: number;
  slope: number;
  lowest: number;
}

/**
 * Enter the section and the prompts after it, in order. A refused station or bank ends the
 * entry with the program's ERROR line as the message.
 */
export function readIrregular(inputs: Readonly<Record<string, string>>, prompts: readonly string[] = ND_IRREGULAR_PROMPTS):
  { ok: true; value: IrregularInputs; values: Record<string, number> } | { ok: false; result: Result } {
  const editor = enter(sectionKeys(inputs));
  if (editor.error !== null) return { ok: false, result: rejected(null, editor.error) };
  if (editor.field !== 'done') return { ok: false, result: failed('ground-point entry did not end') };
  const points = editor.points;
  const values: Record<string, number> = {};
  for (const p of prompts) {
    const text = inputs[p] ?? '';
    if (p === 'bank_left' && !bankMatches(points, text)) return { ok: false, result: rejected(null, LEFT_BANK_ERROR) };
    if (p === 'bank_right' && !bankMatches(points, text)) return { ok: false, result: rejected(null, RIGHT_BANK_ERROR) };
    values[p] = readSingle(text);
  }
  const lowest = Math.min(...points.map((p) => p.elevation));
  return {
    ok: true,
    values,
    value: {
      points,
      section: {
        points,
        bankLeft: values.bank_left!, bankRight: values.bank_right!,
        nLeft: values.n_left!, nChannel: values.n_channel!, nRight: values.n_right!,
      },
      discharge: values.discharge ?? 0,
      slope: values.slope ?? 0,
      lowest,
    },
  };
}

/** The water-surface search shared by Normal Depth and Step-Backwater's slope start. */
export function irregularNormalWs(s: IrregularSection, q: number, slope: number, lowest: number) {
  const root = Math.sqrt(slope);
  return search((ws) => flowAt(s, ws).conveyance * root, q, {
    bottom: lowest, first: lowest + IRREGULAR_START, step: IRREGULAR_STEP,
  });
}

/** Values at a water-surface elevation, stored as QUICK-2 keeps them. */
export function irregularOutputs(s: IrregularSection, ws: number, q: number) {
  const f: IrregularFlow = flowAt(s, ws);
  const area = store(f.area);
  const perimeter = store(f.perimeter);
  const topWidth = store(f.topWidth);
  const hydR = store(area / perimeter);
  const chanVel = f.channel.area > 0 ? store(((q * f.channel.conveyance) / f.conveyance) / f.channel.area) : 0;
  const froude = store((Math.sqrt(f.alpha) * (q / area)) / Math.sqrt((G * area) / topWidth));
  return { flow: f, area, perimeter, topWidth, hydR, chanVel, froude };
}

export function normalDepthIrregular(inputs: Readonly<Record<string, string>>): Result {
  const read = readIrregular(inputs);
  if (!read.ok) return read.result;
  const { section, discharge: q, slope, lowest } = read.value;
  const found = irregularNormalWs(section, q, slope, lowest);
  if (!found.ok) return failed(null, [flag('never_finishes')]);
  const ws = found.y;
  const depth = store(ws - lowest);
  const o = irregularOutputs(section, ws, q);
  const v = read.values;
  const values = {
    in_bank_left: v.bank_left!, in_bank_right: v.bank_right!,
    in_n_left: v.n_left!, in_n_channel: v.n_channel!, in_n_right: v.n_right!,
    in_irr_discharge: q, in_irr_slope: slope,
    depth, ws_elev: ws, area: o.area, top_width: o.topWidth, hyd_radius: o.hydR,
    flow_type: flowType(o.froude), chan_velocity: o.chanVel, wet_perimeter: o.perimeter, froude: o.froude,
  };
  return {
    outcome: 'result',
    printed: printed(ND_IRR_RESULT, values),
    message: null,
    held: null,
    flags: irregularFlags(read.value.points, ws, o.flow.spans),
    raw: {
      ws_elev: ws, depth, area: o.area, top_width: o.topWidth, wet_perimeter: o.perimeter, hyd_radius: o.hydR,
      chan_velocity: o.chanVel, froude: o.froude, alpha: o.flow.alpha, search_discharge: found.value,
    },
  };
}
