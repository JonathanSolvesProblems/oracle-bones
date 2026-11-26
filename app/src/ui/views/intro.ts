// The opening of the first screen (quickened-app criterion 8.10), above the worked examples: what
// the page does and for whom, how Quickened was rebuilt, the headline count with a link to the
// proof page, a link to the limits page, and the notice of criterion 2.3. No number is typed:
// the count and date come from results/headline.md, the year from the realdata file.
import type { QuickenedData } from '../../../build/data.ts';
import { h, type VNode } from '../vnode.ts';
import { noticeView } from './notice.ts';
import { NO_HEADLINE } from './proof.ts';

export const INTRO_LEAD = "Quickened works out depths, water-surface elevations and channel capacities in open channels by QUICK-2's method. It is for a floodplain reviewer checking one cross section the way QUICK-2 does.";

export function introView(headline: QuickenedData['headline'], program: QuickenedData['program']): VNode {
  return h('section', { class: 'intro', 'aria-label': 'About Quickened' },
    h('p', { class: 'intro-lead' }, INTRO_LEAD),
    h('p', {},
      `It was rebuilt from the running ${program.year} program, by questioning it in an emulator, not from its source. `,
      headline
        ? `In the headline run it printed what QUICK-2 printed in ${headline.matched} of ${headline.total} cases; see `
        : `${NO_HEADLINE} See `,
      h('a', { href: '#/proof' }, 'the proof page'),
      '. Where it differs from QUICK-2 or gives no answer is on ',
      h('a', { href: '#/limits' }, 'the limits page'),
      '.'),
    noticeView());
}
