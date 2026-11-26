// Starts the app and routes on the location hash: #/ (calculate), #/limits and #/proof. Holds
// the calculator's state in memory only; nothing is stored in the browser (criterion 1.12).
import type { Mode, Shape } from '../solver/index.ts';
import { render, type Dispatch } from './dom.ts';
import type { Row } from './job.ts';
import { readPaste } from './paste.ts';
import { calculatePage, type CalculatorState } from './views/calculate.ts';
import { gridParts } from './views/grid.ts';
import { pasteControl, type PasteState } from './views/paste.ts';
import { shapeChoice, STEP_BACKWATER_SHAPE } from './views/picker.ts';
import { placeholder, routeOf, shell, type Route } from './views/shell.ts';
import type { Action, Child } from './vnode.ts';

const emptyRow = (): Row => ({ station: '', elevation: '' });

const state: CalculatorState = { mode: null, shape: null, values: {}, rows: [emptyRow()], marked: new Set() };
const paste: PasteState = { open: false, text: '', message: null };

function page(route: Route): Child {
  switch (route) {
    case 'limits': return placeholder('Limits', 'The limits page is not built yet.');
    case 'proof': return placeholder('Proof', 'The proof page is not built yet.');
    default: {
      const grid = gridParts(state.rows);
      return calculatePage(state, { aboveRows: pasteControl(paste), rowNotes: grid.rowNotes, belowRows: grid.summary });
    }
  }
}

function update(action: Action, value: string | null): void {
  switch (action.type) {
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
