// The calculator page: on a desktop, the field notes on the left page (picker and form) and the
// sketch and results on the right page; on a phone, one column (quickened-app design: Desktop
// layout, Phone layout).
import type { Mode, Shape } from '../../solver/index.ts';
import { formFor } from '../forms.ts';
import type { Row } from '../job.ts';
import { h, type Child, type VNode } from '../vnode.ts';
import { formView } from './form.ts';
import { notBuiltModel, notBuiltView } from './notBuilt.ts';
import { picker, pickerModel, shapeChoice, STEP_BACKWATER_SHAPE } from './picker.ts';

export interface CalculatorState {
  mode: Mode | null;
  shape: Shape | null;
  values: Record<string, string>;
  rows: Row[];
  marked: ReadonlySet<string>;
}

export interface CalculatePageParts {
  /** Above the rows of the ground points (the paste control). */
  aboveRows?: Child | null;
  rowNotes?: Readonly<Record<number, Child>>;
  belowRows?: Child | null;
  /** Shown in place of the form for a pair that is not built. */
  notBuilt?: Child | null;
  /** The right-hand page: the screen state. */
  results?: Child | null;
  /** Above the examples: the opening of the first screen (criterion 8.10). */
  intro?: Child | null;
  /** Above the picker: the worked-example controls (criterion 8.1). */
  examples?: Child | null;
  /** Under the form: the loaded example's sources block (criterion 8.7). */
  afterForm?: Child | null;
}

export const PICK_PROMPT = 'Pick a mode and the shape of the cross section.';
/** The right-hand page before a calculation: the ruled sketch page and this one line. */
export const SKETCH_EMPTY = 'The result and the drawing appear here.';

function emptySketch(): VNode {
  return h('div', { class: 'sketch-empty' }, h('p', {}, SKETCH_EMPTY));
}

export function calculatePage(s: CalculatorState, parts: CalculatePageParts = {}): VNode {
  const picked = s.mode !== null && (s.shape !== null || !shapeChoice(s.mode));
  const form = picked ? formFor(s.mode!, s.shape!) : null;
  let left: Child;
  if (!picked) left = h('p', { class: 'prompt' }, PICK_PROMPT);
  else if (!form) left = parts.notBuilt ?? notBuiltView(notBuiltModel(s.mode!, s.shape ?? STEP_BACKWATER_SHAPE));
  else {
    left = formView({
      form, values: s.values, rows: s.rows, marked: s.marked,
      aboveRows: parts.aboveRows, rowNotes: parts.rowNotes, belowRows: parts.belowRows,
    });
  }
  return h('div', { class: 'spread' },
    h('section', { class: 'field-notes', 'aria-label': 'Field notes' },
      h('h1', { class: 'visually-hidden' }, 'Calculate'),
      parts.intro ?? null,
      parts.examples ?? null,
      picker(pickerModel(s.mode, s.shape)),
      left,
      parts.afterForm ?? null),
    h('section', { class: 'sketch', 'aria-label': 'Results', id: 'results', tabindex: '-1' }, parts.results ?? emptySketch()),
  );
}
