// Starts the app and routes on the location hash: #/ (calculate), #/limits and #/proof. Holds
// the calculator's state in memory only; nothing is stored in the browser (criterion 1.12).
import { data } from 'virtual:quickened/data';
import type { Mode, Shape } from '../solver/index.ts';
import { limitsModel, limitsView } from './views/limits.ts';
import { proofModel, proofView } from './views/proof.ts';
import { storyModel, storyView } from './views/story.ts';
import { render, type Dispatch } from './dom.ts';
import { formFor } from './forms.ts';
import { buildJob, originAfterEdit, type AppJob, type Origin, type Row } from './job.ts';
import { exampleBlock, exampleForm, exampleJob, examplesView, type ExampleOrigin } from './views/example.ts';
import { heroView } from './views/hero.ts';
import { PRINT_ACTION, printModel, printView } from './views/print.ts';
import { GROUND_TOGGLE, groundAfter } from './ground.ts';
import { readPaste, readPasteInto } from './paste.ts';
import { calculate, type ScreenState } from './state.ts';
import { calculatePage, type CalculatorState } from './views/calculate.ts';
import { gridParts } from './views/grid.ts';
import { CLIPBOARD_REFUSED, hasGroundPoints, pasteControl, type PasteState } from './views/paste.ts';
import { shapeChoice, STEP_BACKWATER_SHAPE } from './views/picker.ts';
import { proofCaseAnchor, RELOAD_ACTION, routeOf, shell, type Route } from './views/shell.ts';
import { screenView } from './views/screen.ts';
import type { Action, Child } from './vnode.ts';

const emptyRow = (): Row => ({ station: '', elevation: '' });

const state: CalculatorState = { mode: null, shape: null, values: {}, rows: [emptyRow()], marked: new Set(), ground: 'typed' };
// The paste panel starts open, so it is the first thing a new section offers (criterion 11.1).
const paste: PasteState = { open: true, text: '', message: null, clipboard: typeof navigator.clipboard?.readText === 'function' };
/** The worked example loaded into the form, if any, and whether the job is still that example (8.6). */
let loaded: ExampleOrigin | null = null;
let origin: Origin = 'typed';
/** While the browser prints: the local date of printing, set on beforeprint (design: The print view). */
let printing: Date | null = null;
/** The last calculation, until an input or the pair changes. */
let last: { job: AppJob; screen: ScreenState } | null = null;

function page(route: Route): Child {
  switch (route) {
    case 'limits': return limitsView(limitsModel(data));
    case 'proof': return proofView(proofModel(data.proof, data.headline));
    case 'story': return storyView(storyModel(data));
    default: {
      if (printing && last && last.screen.kind === 'result') return printView(printModel(last.job, last.screen, printing));
      const grid = gridParts(state.rows);
      const view = last ? screenView(last.job, last.screen) : null;
      state.marked = new Set(view?.marked ?? []);
      return calculatePage(state, {
        aboveRows: pasteControl(paste, { hasRows: hasGroundPoints(state.rows), loaded: (state.ground ?? 'typed') !== 'typed' }),
        rowNotes: grid.rowNotes, belowRows: grid.summary,
        results: view?.node ?? null,
        // The main example's block is the first screen's object; a result brings its own block (criterion 10.3).
        hero: heroView({ block: !view }),
        examples: examplesView(),
        afterForm: loaded ? exampleBlock(loaded, origin) : null,
      });
    }
  }
}

/** Actions that change the job end the last calculation's state. */
const EDITS = new Set(['pick-mode', 'pick-shape', 'field', 'row', 'add-row', 'remove-row', 'paste-load', 'paste-cell']);

function update(action: Action, value: string | null): void {
  if (EDITS.has(action.type)) {
    last = null;
    origin = originAfterEdit(origin);
  }
  if (action.type === 'pick-mode' || action.type === 'pick-shape') loaded = null;
  if (action.type === 'example' || action.type === GROUND_TOGGLE) state.ground = groundAfter(state.ground ?? 'typed', action.type);
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
        state.ground = groundAfter(state.ground ?? 'typed', 'paste-load');
        Object.assign(paste, { open: false, text: '', message: null });
        focusAfterDraw = 'paste-open';
      } else {
        paste.message = r.message;
      }
      break;
    }
    case 'paste-clipboard':
      // One tap: read the clipboard into the box and load it. If the browser refuses, say so and keep the box.
      navigator.clipboard.readText().then(
        (text) => { paste.text = text; dispatch({ type: 'paste-load' }, null); },
        () => { paste.message = CLIPBOARD_REFUSED; draw(); });
      break;
    case 'paste-cell': {
      // More than one line pasted into a cell loads from that row down (criterion 11.2). On an error
      // nothing is loaded, and the panel opens with the text and the reason.
      const r = readPasteInto(value ?? '', state.rows, action.index as number, action.part as keyof Row);
      if (r.ok) {
        state.rows = r.rows;
        paste.message = null;
      } else {
        Object.assign(paste, { open: true, text: value ?? '', message: r.message });
        focusAfterDraw = 'paste-text';
      }
      break;
    }
    case RELOAD_ACTION:
      location.reload();
      break;
    case PRINT_ACTION:
      if (last?.screen.kind === 'result') window.print();
      break;
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
  if (action.type !== RELOAD_ACTION && action.type !== PRINT_ACTION) touched = true;
  update(action, value);
  draw();
};

/** Whether the reader has done anything on the page beyond moving between pages (criterion 1.13). */
let touched = false;

/** An element to move focus to once the page is drawn, when an action opens or closes a part. */
let focusAfterDraw: string | null = null;

/** Whether a newer build's worker has taken over this page since it opened (criterion 1.13). */
let newerBuild = false;

function draw(): void {
  const route = routeOf(location.hash);
  render(root!, shell(route, page(route), { newerBuild }), dispatch);
  if (focusAfterDraw === 'results') {
    // The page goes to the result's heading, with the heading at the top of the screen and no further (10.5).
    const heading = document.getElementById('result-heading') ?? document.querySelector<HTMLElement>('#results h2') ?? document.getElementById('results');
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: 'start' });
    focusAfterDraw = null;
  } else if (focusAfterDraw) {
    document.getElementById(focusAfterDraw)?.focus();
    focusAfterDraw = null;
  }
  // A link from the proof page's count to one case (#/proof/<case id>) scrolls to that case,
  // once for each time the hash names it.
  const anchor = proofCaseAnchor(location.hash);
  if (anchor !== scrolledTo) {
    if (anchor) document.getElementById(anchor)?.scrollIntoView();
    scrolledTo = anchor;
  }
}

let scrolledTo: string | null = null;

window.addEventListener('hashchange', draw);
window.addEventListener('beforeprint', () => { printing = new Date(); draw(); });
window.addEventListener('afterprint', () => { printing = null; draw(); });
draw();
// The service worker exists only in a build (build/serviceWorker.ts); the dev server has none.
// The worker serves the cache first and takes over open pages when a newer build installs, so a
// page opened just after a deploy is the previous build's. The first worker to control a page is
// not a newer build; any later one is. A page where nothing was done but moving between pages
// reloads into the newer build by itself; once the reader has typed or picked anything, the page
// says so in one line and the Reload control is the reader's, so typed values are never lost
// (criterion 1.13, amended 2026-11-27).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  let controlled = navigator.serviceWorker.controller !== null;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (controlled && !newerBuild) {
      newerBuild = true;
      if (touched) draw();
      else location.reload();
    }
    controlled = true;
  });
  void navigator.serviceWorker.register('./sw.js').catch(() => undefined);
}
