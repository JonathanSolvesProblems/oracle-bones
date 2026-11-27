// The worked examples (quickened-app design: The worked examples; criteria 8.1 to 8.9). Two
// controls above the picker load a golden's inputs text for text into the Normal Depth,
// Irregular Channel form and calculate. The sources block under the form names where the
// example's data comes from, read at build time from realdata/huntington-section-01.json.
import { data } from 'virtual:quickened/data';
import type { Mode, Shape } from '../../solver/index.ts';
import type { AppJob, Origin, Row } from '../job.ts';
import { sectionDrawing } from '../drawing/section.ts';
import { thumbSvg } from '../drawing/thumb.ts';
import { runJob } from '../state.ts';
import { h, type VNode } from '../vnode.ts';

export type ExampleOrigin = Exclude<Origin, 'typed'>;

export interface Example { origin: ExampleOrigin; caseId: string; label: string; }

export const EXAMPLES: readonly Example[] = [
  { origin: 'main_example', caseId: data.examples.main.id, label: 'Grapevine Branch, WV: the 1-percent flood, 1,200 cfs' },
  { origin: 'cutoff_example', caseId: data.examples.cutoff.id, label: 'Same section at a test discharge of 3,000 cfs: how QUICK-2 counts cut-off low ground' },
];

export const EXAMPLES_HEADING = 'Worked examples';
export const SOURCES_HEADING = 'Where this example comes from';
export const NO_LONGER_RECORDED = 'You have changed an input, so this job is no longer the recorded case, and Quickened shows no exact value for it.';

const caseOf = (origin: ExampleOrigin) => (origin === 'main_example' ? data.examples.main : data.examples.cutoff);

/** The example's job: its golden's inputs, text for text, on its golden's pair. */
export function exampleJob(origin: ExampleOrigin): AppJob {
  const c = caseOf(origin);
  return { mode: c.mode as Mode, shape: c.shape as Shape, inputs: { ...c.inputs }, origin };
}

/** The example as the form holds it: the ground-point rows and the other fields' values. */
export function exampleForm(origin: ExampleOrigin): { rows: Row[]; values: Record<string, string> } {
  const inputs = caseOf(origin).inputs;
  const rows: Row[] = [];
  for (let i = 1; ; i++) {
    const n = String(i).padStart(2, '0');
    const station = inputs[`sta_${n}`];
    const elevation = inputs[`elev_${n}`];
    if (station === undefined || elevation === undefined) break;
    rows.push({ station, elevation });
  }
  const values = Object.fromEntries(Object.entries(inputs).filter(([k]) => !/^(sta|elev)_\d+$/.test(k)));
  return { rows, values };
}

/** Each example's section, drawn once: the same model the result's drawing is made from. */
const thumbs = new Map<ExampleOrigin, VNode | null>();
function thumbOf(origin: ExampleOrigin): VNode | null {
  if (!thumbs.has(origin)) {
    const job = exampleJob(origin);
    const m = sectionDrawing(job, runJob(job));
    thumbs.set(origin, m ? thumbSvg(m) : null);
  }
  return thumbs.get(origin)!;
}

/** The two examples, each with a small drawing of its section; the one loaded, and not edited since, is pressed (10.11). */
export function examplesView(selected: ExampleOrigin | null = null): VNode {
  return h('section', { class: 'examples', 'aria-label': EXAMPLES_HEADING },
    EXAMPLES.map((e) => h('button', { type: 'button', class: 'example', 'aria-pressed': e.origin === selected ? 'true' : 'false',
      on: { click: { type: 'example', origin: e.origin } } }, thumbOf(e.origin), h('span', { class: 'example-label' }, e.label))));
}

/** The discharge sentence of an example (8.8, 8.9). */
export function dischargeSentence(origin: ExampleOrigin): string {
  return origin === 'main_example' ? data.sources.mainDischarge : data.sources.cutoffDischarge;
}

/**
 * The sources block of the loaded example, closed under its heading so the result stays near the top (criterion
 * 10.10); after an edit it says, outside the closed part, that the job is no longer the recorded case.
 */
export function exampleBlock(loaded: ExampleOrigin, origin: Origin): VNode {
  const changed = origin !== loaded;
  const discharge = changed ? null : dischargeSentence(loaded);
  return h('section', { class: 'example-sources' },
    changed ? h('p', { class: 'no-longer' }, NO_LONGER_RECORDED) : null,
    h('details', {},
      h('summary', {}, SOURCES_HEADING),
      h('dl', {}, data.sources.items.flatMap((i) => [h('dt', {}, i.name), h('dd', {}, i.text)])),
      discharge ? h('p', { class: 'discharge-sentence' }, discharge) : null,
      h('h3', {}, 'Caveats from the data file'),
      h('ul', {}, data.sources.caveats.map((c) => h('li', {}, c)))));
}
