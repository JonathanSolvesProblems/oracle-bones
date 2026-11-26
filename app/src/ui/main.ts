// Starts the app and routes on the location hash: #/ (calculate), #/limits and #/proof. Holds
// the calculator's state in memory only; nothing is stored in the browser (criterion 1.12).
import type { Mode, Shape } from '../solver/index.ts';
import { render, type Dispatch } from './dom.ts';
import { formFor } from './forms.ts';
import { buildJob, originAfterEdit, type AppJob, type Origin, type Row } from './job.ts';
import { exampleBlock, exampleForm, exampleJob, examplesView, type ExampleOrigin } from './views/example.ts';
import { readPaste } from './paste.ts';
import { calculate, type ScreenState } from './state.ts';
import { calculatePage, type CalculatorState } from './views/calculate.ts';
import { gridParts } from './views/grid.ts';
import { pasteControl, type PasteState } from './views/paste.ts';
import { shapeChoice, STEP_BACKWATER_SHAPE } from './views/picker.ts';
import { placeholder, routeOf, shell, type Route } from './views/shell.ts';
import { screenView } from './views/screen.ts';
import type { Action, Child } from './vnode.ts';

const emptyRow = (): Row => ({ station: '', elevation: '' });

const state: CalculatorState = { mode: null, shape: null, values: {}, rows: [emptyRow()], marked: new Set() };
const paste: PasteState = { open: false, text: '', message: null };
/** The worked example loaded into the form, if any, and whether the job is still that example (8.6). */
let loaded: ExampleOrigin | null = null;
let origin: Origin = 'typed';
/** The last calculation, until an input or the pair changes. */
let last: { job: AppJob; screen: ScreenState } | null = null;

function page(route: Route): Child {
  switch (route) {
    case 'limits': return placeholder('Limits', 'The limits page is not built yet.');
    case 'proof': return placeholder('Proof', 'The proof page is not built yet.');
    default: {
      const grid = gridParts(state.rows);
      const view = last ? screenView(last.job, last.screen) : null;
      state.marked = new Set(view?.marked ?? []);
      return calculatePage(state, {
        aboveRows: pasteControl(paste), rowNotes: grid.rowNotes, belowRows: grid.summary,
        results: view?.node ?? null,
        examples: examplesView(),
        afterForm: loaded ? exampleBlock(loaded, origin) : null,
      });
    }
  }
}

/** Actions that change the job end the last calculation's state. */
const EDITS = new Set(['pick-mode', 'pick-shape', 'field', 'row', 'add-row', 'remove-row', 'paste-load']);

function update(action: Action, value: string | null): void {
  if (EDITS.has(action.type)) {
    last = null;
    origin = originAfterEdit(origin);
  }
  if (action.type === 'pick-mode' || action.type === 'pick-shape') loaded = null;
  switch (action.type) {
    case 'example': {
      const which = action.origin as ExampleOrigin;
      const job = exampleJob(which);
      const f = exampleForm(which);
      Object.assign(state, { mode: job.mode, shape: job.shape, values: f.values, rows: f.rows });
      Object.assign(paste, { open: false, text: '', message: null });
      loaded = which;
      origin = which;
      const form = formFor(job.mode, job.shape);
      if (form) {
        const built = buildJob(form, state.values, state.rows, origin);
        last = { job: built, screen: calculate(built) };
        focusAfterDraw = 'results';
      }
      break;
    }
    case 'pick-mode': {
      const mode = action.value as Mode;
      if (!shapeChoice(mode)) state.shape = STEP_BACKWATER_SHAPE;
      else if (state.mode !== null && !shapeChoice(state.mode)) state.shape = null;
      state.mode = mode;
      break;
    }
    case 'pick-shape':
      state.shape = action.value as Shape;
      break;
    case 'field':
      state.values = { ...state.values, [action.key as string]: value ?? '' };
      break;
    case 'row': {
      const i = action.index as number;
      const part = action.part as keyof Row;
      state.rows = state.rows.map((r, j) => (j === i ? { ...r, [part]: value ?? '' } : r));
      break;
    }
    case 'add-row':
      state.rows = [...state.rows, emptyRow()];
      break;
    case 'remove-row':
      state.rows = state.rows.slice(0, -1);
      break;
    case 'paste-open':
      Object.assign(paste, { open: true, message: null });
      focusAfterDraw = 'paste-text';
      break;
    case 'paste-text':
      paste.text = value ?? '';
      break;
    case 'paste-load': {
      const r = readPaste(paste.text);
      if (r.ok) {
        state.rows = r.rows;
        Object.assign(paste, { open: false, text: '', message: null });
        focusAfterDraw = 'paste-open';
      } else {
        paste.message = r.message;
      }
      break;
    }
    case 'paste-close':
      Object.assign(paste, { open: false, message: null });
      focusAfterDraw = 'paste-open';
      break;
    case 'calculate': {
      const form = state.mode && state.shape ? formFor(state.mode, state.shape) : null;
      if (!form) break;
      const job = buildJob(form, state.values, form.groundPoints ? state.rows : [], origin);
      last = { job, screen: calculate(job) };
      focusAfterDraw = 'results';
      break;
    }
    default:
      break;
  }
}

const root = document.getElementById('app');
if (!root) throw new Error('index.html has no #app element');

const dispatch: Dispatch = (action, value) => {
  update(action, value);
  draw();
};

/** An element to move focus to once the page is drawn, when an action opens or closes a part. */
let focusAfterDraw: string | null = null;

function draw(): void {
  const route = routeOf(location.hash);
  render(root!, shell(route, page(route)), dispatch);
  if (focusAfterDraw) {
    document.getElementById(focusAfterDraw)?.focus();
    focusAfterDraw = null;
  }
}

window.addEventListener('hashchange', draw);
draw();
