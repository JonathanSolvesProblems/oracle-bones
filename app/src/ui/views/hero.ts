// The first screen's one object (criterion 10.3): the main example's reach block, computed live
// on load by the solver from the example's recorded inputs, large, beside the opening.
import { data } from 'virtual:quickened/data';
import { blockView } from '../drawing/block.ts';
import { sectionDrawing, type DrawingModel } from '../drawing/section.ts';
import { runJob } from '../state.ts';
import { h, type VNode } from '../vnode.ts';
import { EXAMPLES, exampleJob } from './example.ts';
import { introView } from './intro.ts';

export const HERO_ID = 'hero';

/** The opening and the main example's block, or the opening alone if the example does not draw. */
let computed: DrawingModel | null | undefined;
/** The solver's answer for the main example, computed on the first draw and kept (the inputs never change). */
function exampleModel(): DrawingModel | null {
  if (computed === undefined) {
    const job = exampleJob('main_example');
    computed = sectionDrawing(job, runJob(job));
  }
  return computed;
}

export function heroView(opts: { block: boolean } = { block: true }): VNode {
  const model = opts.block ? exampleModel() : null;
  return h('section', { class: model ? 'hero' : 'hero hero-text-only', 'aria-label': 'QUICK-2 and Quickened' },
    h('div', { class: 'hero-text' }, introView(data.headline, data.program)),
    model ? h('div', { class: 'hero-block' },
      h('p', { class: 'hero-label' }, EXAMPLES[0]!.label),
      blockView(model, { id: HERO_ID })) : null);
}
