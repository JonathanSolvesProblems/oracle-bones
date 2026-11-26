// The picker: QUICK-2's four modes and five shapes, in its menus' order and with its names
// (quickened-app criteria 7.1, 7.2; observed: obs-menudrop-000001 screen 1, cd-vdit-000001
// screen 2). Step-Backwater asks for no shape. A pair the solver does not compute carries
// "not built yet"; it is never hidden or disabled.
import { isBuilt, type Mode, type Shape } from '../../solver/index.ts';
import { h, type VNode } from '../vnode.ts';

export const MODES: readonly { mode: Mode; name: string }[] = [
  { mode: 'critical_depth', name: 'Critical Depth' },
  { mode: 'channel_capacity', name: 'Channel Capacity' },
  { mode: 'normal_depth', name: 'Normal Depth' },
  { mode: 'step_backwater', name: 'Step-Backwater' },
];

export const SHAPES: readonly { shape: Shape; name: string }[] = [
  { shape: 'v_ditch', name: 'V - Ditch' },
  { shape: 'rectangle', name: 'Rectangular Channel' },
  { shape: 'trapezoid', name: 'Trapezoidal Channel' },
  { shape: 'circle', name: 'Circular Channel' },
  { shape: 'irregular', name: 'Irregular Channel' },
];

export const NOT_BUILT_YET = 'not built yet';

/** Step-Backwater asks for no shape; the solver keys it as the irregular section. */
export function shapeChoice(mode: Mode): boolean {
  return mode !== 'step_backwater';
}

/** The shape a mode runs on when it asks for none. */
export const STEP_BACKWATER_SHAPE: Shape = 'irregular';

export interface PickerItem<T> { value: T; name: string; built: boolean; selected: boolean; }
export interface PickerModel { modes: PickerItem<Mode>[]; shapes: PickerItem<Shape>[] | null; }

/** A mode is built when the solver computes it on at least one shape. */
function modeBuilt(mode: Mode): boolean {
  return shapeChoice(mode) ? SHAPES.some((s) => isBuilt(mode, s.shape)) : isBuilt(mode, STEP_BACKWATER_SHAPE);
}

export function pickerModel(mode: Mode | null, shape: Shape | null): PickerModel {
  return {
    modes: MODES.map((m) => ({ value: m.mode, name: m.name, built: modeBuilt(m.mode), selected: m.mode === mode })),
    shapes: mode === null || !shapeChoice(mode) ? null
      : SHAPES.map((s) => ({ value: s.shape, name: s.name, built: isBuilt(mode, s.shape), selected: s.shape === shape })),
  };
}

function choice<T extends string>(group: string, item: PickerItem<T>, action: string): VNode {
  const id = `${group}-${item.value}`;
  return h('label', { class: `choice${item.selected ? ' selected' : ''}`, for: id },
    h('input', {
      type: 'radio', id, name: group, value: item.value as string, checked: item.selected,
      on: { change: { type: action, value: item.value } },
    }),
    h('span', { class: 'choice-name' }, item.name),
    item.built ? null : h('span', { class: 'not-built' }, NOT_BUILT_YET),
  );
}

export function picker(model: PickerModel): VNode {
  return h('div', { class: 'picker' },
    h('fieldset', { class: 'modes' },
      h('legend', {}, 'Mode'),
      model.modes.map((m) => choice('mode', m, 'pick-mode'))),
    model.shapes ? h('fieldset', { class: 'shapes' },
      h('legend', {}, 'Shape of cross section'),
      model.shapes.map((s) => choice('shape', s, 'pick-shape'))) : null,
  );
}
