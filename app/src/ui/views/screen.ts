// The right-hand page for a screen state, and the fields it marks on the form.
import type { AppJob } from '../job.ts';
import type { ScreenState } from '../state.ts';
import type { VNode } from '../vnode.ts';
import { methodList, methodView } from '../method.ts';
import { sectionDrawing } from '../drawing/section.ts';
import { blockView } from '../drawing/block.ts';
import { resultsModel, resultsView } from './results.ts';
import { stateModel, stateView } from './states.ts';

export function screenView(job: AppJob, screen: ScreenState): { node: VNode; marked: string[] } | null {
  if (screen.kind === 'idle') return null;
  const m = stateModel(job, screen);
  if (screen.kind === 'result') {
    const drawing = sectionDrawing(job, screen.result);
    const node = resultsView(resultsModel(job, screen), {
      afterFlags: methodView(methodList(job.mode, job.shape)),
      drawing: drawing ? blockView(drawing, { id: 'result' }) : null,
    });
    return { node, marked: m.marked };
  }
  return { node: stateView(m), marked: m.marked };
}
