// The form view model for a pair (quickened-app design: The form; criteria 1.1, 1.4, 1.6, 2.5).
//
// One field per prompt, in the solver's prompt order, with QUICK-2's label for it. The label is
// read from the pair's result screen in layout.ts: the text just before the field's echo
// picture, so it cannot drift from QUICK-2's. The fixed fields of FIXED_FIELDS are shown as the
// text QUICK-2 prints for them, painted with the screen's own picture, and are not editable.
// Fields are grouped by the engineer's parts, named in Quickened's words.
import { isBuilt, type Mode, type Shape } from '../solver/index.ts';
import { FIXED_FIELDS, ND_IRREGULAR_PROMPTS, regularPrompts } from '../solver/forms.ts';
import { GROUND_POINTS_MAX } from '../solver/constants.ts';
import { ND_IRR_RESULT, REGULAR_RESULT, type ResultScreen } from '../format/layout.ts';
import { pictureFor, printed } from '../format/screen.ts';

type RegularMode = Exclude<Mode, 'step_backwater'>;
type RegularShape = Exclude<Shape, 'irregular'>;

export type Part = 'section' | 'banks' | 'n' | 'flow' | 'slope';

export interface FormField {
  /** The contract's input name. */
  key: string;
  /** The result screen's window that echoes it (`in_...`). */
  window: string;
  /** QUICK-2's label, from the result screen's row. */
  label: string;
  editable: boolean;
  /** For a fixed field, the text QUICK-2 prints for it; null for an editable field. */
  text: string | null;
}

export interface FormGroup { part: Part; heading: string; fields: FormField[]; }

export interface GroundPointsModel {
  /** QUICK-2's column heads over the grid. */
  stationLabel: string;
  elevationLabel: string;
  max: number;
}

export interface FormModel {
  mode: Mode;
  shape: Shape;
  /** Quickened's heading over the engineer's inputs (criterion 2.5). */
  heading: string;
  groups: FormGroup[];
  /** The ground points, on the irregular section only. */
  groundPoints: GroundPointsModel | null;
}

export const INPUTS_HEADING = 'Your inputs';

const PART_OF: Readonly<Record<string, Part>> = {
  left_slope: 'section', right_slope: 'section', bottom_width: 'section', diameter: 'section',
  bank_left: 'banks', bank_right: 'banks',
  n: 'n', n_left: 'n', n_channel: 'n', n_right: 'n',
  discharge: 'flow', depth: 'flow',
  slope: 'slope',
};
const PARTS: readonly Part[] = ['section', 'banks', 'n', 'flow', 'slope'];

function partHeading(part: Part, keys: readonly string[]): string {
  switch (part) {
    case 'section': return 'The section';
    case 'banks': return 'Bank stations';
    case 'n': return "Manning's n";
    case 'flow': return keys.includes('depth') ? 'Depth' : 'Discharge';
    case 'slope': return 'Slope';
  }
}

/** The text before a field's picture on its row: the last label there, without a row heading. */
function labelFor(layout: ResultScreen, window: string): string {
  const p = pictureFor(layout, window);
  const before = (layout.rows[p.row] ?? '').slice(0, p.col);
  const chunks = before.split(/\s{2,}|[║╔╗╚╝╟╢]/).map((s) => s.trim()).filter((s) => s !== '');
  const last = chunks[chunks.length - 1] ?? '';
  const heading = last.lastIndexOf(': ');
  return heading >= 0 ? last.slice(heading + ': '.length) : last;
}

/** The echo window of an input on a layout: `in_<key>`, or `in_irr_<key>` on the irregular screen. */
function windowOf(layout: ResultScreen, key: string): string {
  const plain = `in_${key}`;
  if (plain in layout.windows) return plain;
  const irregular = `in_irr_${key}`;
  if (irregular in layout.windows) return irregular;
  throw new Error(`no echo window for ${key}`);
}

function group(fields: FormField[]): FormGroup[] {
  return PARTS.map((part) => {
    const mine = fields.filter((f) => PART_OF[f.key] === part);
    return { part, heading: partHeading(part, mine.map((f) => f.key)), fields: mine };
  }).filter((g) => g.fields.length > 0 || g.part === 'section');
}

function regularForm(mode: RegularMode, shape: RegularShape): FormModel {
  const layout = REGULAR_RESULT[mode][shape];
  const prompts = regularPrompts(mode, shape);
  const fixed = FIXED_FIELDS[shape];
  const keys = [...prompts, ...Object.keys(fixed)];
  const byWindow = new Map(keys.map((k) => [windowOf(layout, k), k]));
  // The screen's paint order puts each fixed field where the screen reads it.
  const order = layout.paintOrder.filter((w) => byWindow.has(w));
  const fixedText = printed(layout, Object.fromEntries(Object.entries(fixed).map(([k, v]) => [windowOf(layout, k), v])));
  const fields = order.map((window): FormField => {
    const key = byWindow.get(window)!;
    const isFixed = key in fixed;
    return { key, window, label: labelFor(layout, window), editable: !isFixed, text: isFixed ? fixedText[window]!.trim() : null };
  });
  return { mode, shape, heading: INPUTS_HEADING, groups: group(fields), groundPoints: null };
}

function irregularForm(mode: Mode): FormModel {
  const layout = ND_IRR_RESULT;
  const fields = ND_IRREGULAR_PROMPTS.map((key): FormField => {
    const window = windowOf(layout, key);
    return { key, window, label: labelFor(layout, window), editable: true, text: null };
  });
  return {
    mode, shape: 'irregular', heading: INPUTS_HEADING, groups: group(fields),
    groundPoints: { stationLabel: 'STAT', elevationLabel: 'ELEV', max: GROUND_POINTS_MAX },
  };
}

/** The form of a built pair; null for a pair the solver does not compute. */
export function formFor(mode: Mode, shape: Shape): FormModel | null {
  if (!isBuilt(mode, shape)) return null;
  if (shape === 'irregular') return mode === 'normal_depth' ? irregularForm(mode) : null;
  if (mode === 'step_backwater') return null;
  return regularForm(mode, shape);
}
