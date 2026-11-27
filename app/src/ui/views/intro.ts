// The opening of the first screen (quickened-app criteria 8.10 and 10.3), beside the main
// example's reach block: what QUICK-2 is, that it does not start on a modern locked-down computer,
// and that Quickened gives its answers in a browser, checked against the original, with the
// headline count and a link to the proof page. No number is typed: the count comes from
// results/headline.md, the year from the realdata file. The notice is in the footer of every page.
import type { QuickenedData } from '../../../build/data.ts';
import { h, type VNode } from '../vnode.ts';
import { NO_HEADLINE } from './proof.ts';

/** FEMA's list of accepted hydraulic models, where QUICK-2 is named. */
export const FEMA_LIST_URL = 'https://www.fema.gov/flood-maps/products-tools/numerical-models/hydraulic';
export const INTRO_TITLE = "QUICK-2's answers, in a browser";
/** The two pieces of the opening that name FEMA, for the identity test's allowed list (criterion 9.2): FEMA published QUICK-2 and keeps the list. */
export const INTRO_FEMA_PIECES = ["QUICK-2 is FEMA's ", "FEMA's list of accepted models"] as const;
export const INTRO_DOS = ' DOS program for the water-surface elevation at one cross section of a stream. It is still on ';
export const INTRO_ZONE = ' for one cross section in Zone A, but it does not start on a locked-down modern computer.';
export const INTRO_BROWSER = 'Quickened gives its answers in a browser, checked against the original.';

/** The opening; `title: false` leaves the heading to the first screen, which places it (criterion 10.12). */
export function introView(headline: QuickenedData['headline'], program: QuickenedData['program'], opts: { title?: boolean } = {}): VNode {
  return h('section', { class: 'intro', 'aria-label': 'About Quickened' },
    opts.title === false ? null : h('h1', {}, INTRO_TITLE),
    h('p', { class: 'intro-lead' },
      "QUICK-2 is FEMA's ", program.year, INTRO_DOS,
      h('a', { href: FEMA_LIST_URL, rel: 'noopener' }, "FEMA's list of accepted models"),
      INTRO_ZONE),
    h('p', {},
      `${INTRO_BROWSER} `,
      headline
        ? `In the headline run it printed what QUICK-2 printed in ${headline.matched} of ${headline.total} cases; see `
        : `${NO_HEADLINE} See `,
      h('a', { href: '#/proof' }, 'the proof page'),
      '. Where it differs from QUICK-2 or gives no answer is on ',
      h('a', { href: '#/limits' }, 'the limits page'),
      '. ',
      // Criterion 11.4: the story is part of the result.
      h('a', { href: '#/story' }, 'How it was made'),
      ' is open too, down to every prompt.'));
}
