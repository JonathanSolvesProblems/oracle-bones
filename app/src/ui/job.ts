// The app's Job, built from the form (quickened-app design: The Job model; criterion 1.5).
// Inputs stay strings, exactly as typed, keyed by the contract's input names: sta_01, elev_01,
// ... in row order for the ground points, and the form's prompt keys for the rest. The Job is
// held in memory only. `origin` never reaches the solver.
import type { Mode, Shape } from '../solver/index.ts';
import type { FormModel } from './forms.ts';

export type Origin = 'typed' | 'main_example' | 'cutoff_example';

export interface AppJob {
  mode: Mode;
  /** 'irregular' for Step-Backwater, as the solver keys it. */
  shape: Shape;
  /** Typed text, keyed by the contract's input names. */
  inputs: Record<string, string>;
  /** An example until any input is edited (criterion 8.6). */
  origin: Origin;
}

export interface Row { station: string; elevation: string; }

/** The contract keys of ground point `index` (from 1). */
export function rowKeys(index: number): { station: string; elevation: string } {
  const n = String(index).padStart(2, '0');
  return { station: `sta_${n}`, elevation: `elev_${n}` };
}

/** The Job of a form: the rows, then every editable field, each as typed (empty if untouched). */
export function buildJob(form: FormModel, values: Readonly<Record<string, string>>, rows: readonly Row[], origin: Origin = 'typed'): AppJob {
  const inputs: Record<string, string> = {};
  if (form.groundPoints) {
    if (rows.length > form.groundPoints.max) throw new Error(`more than ${form.groundPoints.max} ground points`);
    rows.forEach((row, i) => {
      const keys = rowKeys(i + 1);
      inputs[keys.station] = row.station;
      inputs[keys.elevation] = row.elevation;
    });
  }
  for (const group of form.groups) {
    for (const field of group.fields) if (field.editable) inputs[field.key] = values[field.key] ?? '';
  }
  return { mode: form.mode, shape: form.shape, inputs, origin };
}
