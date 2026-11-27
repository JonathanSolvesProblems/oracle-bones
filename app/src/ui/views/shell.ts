// The page frame: the top line with Quickened's name and the links Calculate, Limits and Proof
// (quickened-app design: Desktop layout, Phone layout; criterion 5.5).
import { h, type Child, type VNode } from '../vnode.ts';
import { NOTICE } from './notice.ts';

export type Route = 'calculate' | 'limits' | 'proof' | 'story';

export const ROUTES: readonly { route: Route; hash: string; label: string }[] = [
  { route: 'calculate', hash: '#/', label: 'Calculate' },
  { route: 'limits', hash: '#/limits', label: 'Limits' },
  { route: 'proof', hash: '#/proof', label: 'Proof' },
  // How it was made (criterion 11.4).
  { route: 'story', hash: '#/story', label: 'Story' },
];

const PROOF_CASE = /^#\/proof\/([a-z]+-[a-z]+-\d{6})$/;

/** The route a location hash names; `#/proof/<case id>` is the proof page at that case; anything
 * unknown is the calculator. */
export function routeOf(hash: string): Route {
  if (PROOF_CASE.test(hash)) return 'proof';
  return ROUTES.find((r) => r.hash === hash)?.route ?? 'calculate';
}

/** The hash of the proof page at one case. */
export function proofCaseHash(id: string): string {
  return `#/proof/${id}`;
}

/** The id of the proof page's element for the case a `#/proof/<case id>` hash names, or null. */
export function proofCaseAnchor(hash: string): string | null {
  const m = PROOF_CASE.exec(hash);
  return m ? `case-${m[1]}` : null;
}

export const UPDATE_LINE = 'A newer build of Quickened has taken over since this page opened.';
export const RELOAD_ACTION = 'reload';

/** The one line of criterion 1.13: a newer build's worker has taken over; reloading is the reader's choice. */
export function updateLine(): VNode {
  return h('p', { id: 'update-line', class: 'update-line', role: 'status' },
    UPDATE_LINE, ' ', h('button', { type: 'button', on: { click: { type: RELOAD_ACTION } } }, 'Reload'));
}

export function shell(route: Route, main: Child, opts: { newerBuild?: boolean } = {}): VNode {
  return h('div', { class: 'page' },
    h('header', { class: 'top-line' },
      h('a', { class: 'name', href: '#/' }, 'Quickened'),
      h('nav', { 'aria-label': 'Pages' },
        h('ul', {}, ROUTES.map((r) => h('li', {},
          h('a', { href: r.hash, 'aria-current': r.route === route ? 'page' : undefined }, r.label))))),
    ),
    opts.newerBuild ? updateLine() : null,
    h('main', { id: 'main' }, main),
    footer(),
  );
}

/** The source repository of the project, linked from every page's footer. */
export const REPOSITORY_URL = 'https://github.com/JonathanSolvesProblems/oracle-bones';

/** The footer of every page (criteria 10.3, 11.4): the source, the limits, proof and story pages, and the notice. */
export function footer(): VNode {
  return h('footer', { class: 'site-footer' },
    h('ul', { class: 'footer-links' },
      h('li', {}, h('a', { href: REPOSITORY_URL, rel: 'noopener' }, 'Source repository')),
      h('li', {}, h('a', { href: '#/limits' }, 'Limits')),
      h('li', {}, h('a', { href: '#/proof' }, 'Proof')),
      h('li', {}, h('a', { href: '#/story' }, 'How it was made'))),
    h('p', { class: 'footer-notice' }, NOTICE));
}

/** A page not built yet: its title and a sentence that says so. */
export function placeholder(title: string, sentence: string): VNode {
  return h('section', { class: 'placeholder' }, h('h1', {}, title), h('p', {}, sentence));
}
