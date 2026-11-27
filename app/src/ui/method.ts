// QUICK-2's method for a pair: the values that come from the program, not from the engineer
// (quickened-app criterion 2.6; design: The results screen, item 6). Each value is read from its
// export in constants.ts, never typed here. The list ends, wherever the pair searches, with the
// search limit, which is Quickened's choice and not QUICK-2's.
import * as K from '../solver/constants.ts';
import type { Mode, Shape } from '../solver/index.ts';
import { h, type VNode } from './vnode.ts';

type Constant = keyof typeof K;

export type MethodPart = 'constant' | 'exponent' | 'first_trial' | 'step' | 'stop' | 'circle' | 'walls' | 'limit';

export interface MethodItem {
  name: string;
  /** The constants.ts export the value is, or null for an item with no number. */
  constant: Constant | null;
  value: number | null;
  unit: string | null;
  /** What the value does, in Quickened's words. */
  role: string;
  part: MethodPart;
  source: 'QUICK-2' | 'Quickened';
}

export const METHOD_SENTENCE = "These values come from QUICK-2's program, not from your inputs. Quickened uses the same ones.";
/** The method list's heading, in a reviewer's words (criterion 11.3). */
export const METHOD_HEADING = 'How QUICK-2 computes this';

function item(constant: Constant, name: string, unit: string | null, role: string, part: MethodPart, source: MethodItem['source'] = 'QUICK-2'): MethodItem {
  return { name, constant, value: K[constant], unit, role, part, source };
}

const manning = () => item('MANNING_K', 'Manning constant', null, "in Manning's equation, US customary units", 'constant');
const gravity = (role: string) => item('G', 'g', 'ft/s²', role, 'constant');
const exponent = (constant: 'EXP_A' | 'EXP_B', role: string) => item(constant, 'Exponent on the hydraulic radius', null, role, 'exponent');
const limit = () => item('SEARCH_DEPTH_LIMIT', 'Search limit', 'ft',
  "Quickened stops searching when the trial depth passes this, where QUICK-2 would keep searching. Quickened's choice, not QUICK-2's", 'limit', 'Quickened');

function prismatic(mode: Mode): MethodItem[] {
  if (mode === 'channel_capacity') {
    return [manning(), exponent('EXP_A', 'in the discharge and the velocity'), gravity('in the Froude number')];
  }
  const search = [
    item('PRISMATIC_STEP', 'First trial depth', 'ft', 'the depth the search tries first', 'first_trial'),
    item('PRISMATIC_STEP', 'Depth step', 'ft', 'added to the trial depth until a trial is close enough', 'step'),
    item('SEARCH_TOL', 'Stop', null, 'the search stops at the first trial whose discharge is within this fraction of the target', 'stop'),
  ];
  if (mode === 'critical_depth') {
    return [manning(), gravity('in the critical-flow condition and the Froude number'), exponent('EXP_A', 'in the Critical Slope'), ...search, limit()];
  }
  return [manning(), exponent('EXP_A', 'in the search discharge'), gravity('in the Froude number'), ...search, limit()];
}

function circle(mode: Mode): MethodItem[] {
  const shared = [
    item('PI_QUICK2', 'π', null, "as QUICK-2 writes it, in the circle's wetted angle", 'circle'),
    item('MAX_DISCHARGE_DEPTH', 'Max Discharge depth', null, 'Max Discharge is the Manning flow at this fraction of the diameter', 'circle'),
  ];
  if (mode === 'channel_capacity') {
    return [manning(), exponent('EXP_B', 'in the discharge and Max Discharge'), gravity('in the Froude number'), ...shared];
  }
  if (mode === 'critical_depth') {
    return [
      manning(), gravity('in the critical-flow condition and the Froude number'),
      exponent('EXP_A', 'in the Critical Slope'), exponent('EXP_B', 'in Max Discharge'), ...shared,
      item('CIRCLE_CD_STEP', 'First trial depth', 'ft', 'the depth the search tries first', 'first_trial'),
      item('CIRCLE_CD_STEP', 'Depth step', 'ft', 'added to the trial depth until a trial is close enough', 'step'),
      item('CIRCLE_TOL', 'Stop', null, 'the search stops at the first trial within this fraction of the target', 'stop'),
      item('CIRCLE_CD_DEPTH_OFFSET', 'Printed depth offset', 'ft', 'Depth is printed this far below the depth at which the other fields are computed', 'constant'),
      limit(),
    ];
  }
  return [
    manning(), exponent('EXP_B', 'in the search discharge and Max Discharge'), gravity('in the Froude number'), ...shared,
    item('CIRCLE_STEP', 'First trial depth', 'ft', 'the depth the search tries first', 'first_trial'),
    item('CIRCLE_STEP', 'Depth step', 'ft', 'added to the trial depth until a trial is close enough', 'step'),
    item('CIRCLE_TOL', 'Stop', null, 'the search stops at the first trial whose discharge is within this fraction of the target', 'stop'),
    limit(),
  ];
}

function irregular(): MethodItem[] {
  return [
    manning(), exponent('EXP_B', 'in the conveyance of each part of the section'), gravity('in the Froude number'),
    item('IRREGULAR_START', 'First trial', 'ft', 'the search first tries a water surface this far above the lowest ground point', 'first_trial'),
    item('IRREGULAR_STEP', 'Step', 'ft', 'added to the trial water surface until a trial is close enough', 'step'),
    item('SEARCH_TOL', 'Stop', null, 'the search stops at the first trial whose discharge is within this fraction of the target', 'stop'),
    {
      name: 'Vertical end walls', constant: null, value: null, unit: null, part: 'walls', source: 'QUICK-2',
      role: 'where the water surface is above an end of the section, QUICK-2 treats that end as a vertical wall',
    },
    limit(),
  ];
}

/** The method list of a built pair. */
export function methodList(mode: Mode, shape: Shape): MethodItem[] {
  if (shape === 'irregular') return mode === 'normal_depth' ? irregular() : [];
  if (mode === 'step_backwater') return [];
  return shape === 'circle' ? circle(mode) : prismatic(mode);
}

export function methodView(items: readonly MethodItem[]): VNode {
  return h('section', { class: 'method' },
    h('h3', {}, METHOD_HEADING),
    h('p', {}, METHOD_SENTENCE),
    h('ul', {}, items.map((i) => h('li', { class: i.source === 'Quickened' ? 'quickened' : undefined },
      h('span', { class: 'method-name' }, i.name),
      i.value !== null ? [' ', h('span', { class: 'figures' }, String(i.value)), i.unit ? ` ${i.unit}` : ''] : null,
      `: ${i.role}.`))),
  );
}
