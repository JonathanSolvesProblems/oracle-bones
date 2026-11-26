// Starts the app and routes on the location hash: #/ (calculate), #/limits and #/proof. Holds
// the calculator's state in memory only; nothing is stored in the browser (criterion 1.12).
import type { Mode, Shape } from '../solver/index.ts';
import { render, type Dispatch } from './dom.ts';
import type { Row } from './job.ts';
import { calculatePage, type CalculatorState } from './views/calculate.ts';
import { shapeChoice, STEP_BACKWATER_SHAPE } from './views/picker.ts';
import { placeholder, routeOf, shell, type Route } from './views/shell.ts';
import type { Action, Child } from './vnode.ts';

const emptyRow = (): Row => ({ station: '', elevation: '' });

const state: CalculatorState = { mode: null, shape: null, values: {}, rows: [emptyRow()], marked: new Set() };

function page(route: Route): Child {
  switch (route) {
    case 'limits': return placeholder('Limits', 'The limits page is not built yet.');
    case 'proof': return placeholder('Proof', 'The proof page is not built yet.');
    default: return calculatePage(state);
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

function draw(): void {
  const route = routeOf(location.hash);
  render(root!, shell(route, page(route)), dispatch);
}

window.addEventListener('hashchange', draw);
draw();
