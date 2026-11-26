// The page frame: the top line with Quickened's name and the links Calculate, Limits and Proof
// (quickened-app design: Desktop layout, Phone layout; criterion 5.5).
import { h, type Child, type VNode } from '../vnode.ts';

export type Route = 'calculate' | 'limits' | 'proof';

export const ROUTES: readonly { route: Route; hash: string; label: string }[] = [
  { route: 'calculate', hash: '#/', label: 'Calculate' },
  { route: 'limits', hash: '#/limits', label: 'Limits' },
  { route: 'proof', hash: '#/proof', label: 'Proof' },
];

/** The route a location hash names; anything unknown is the calculator. */
export function routeOf(hash: string): Route {
  return ROUTES.find((r) => r.hash === hash)?.route ?? 'calculate';
}

export function shell(route: Route, main: Child): VNode {
  return h('div', { class: 'page' },
    h('header', { class: 'top-line' },
      h('a', { class: 'name', href: '#/' }, 'Quickened'),
      h('nav', { 'aria-label': 'Pages' },
        h('ul', {}, ROUTES.map((r) => h('li', {},
          h('a', { href: r.hash, 'aria-current': r.route === route ? 'page' : undefined }, r.label))))),
    ),
    h('main', { id: 'main' }, main),
  );
}

/** A page not built yet: its title and a sentence that says so. */
export function placeholder(title: string, sentence: string): VNode {
  return h('section', { class: 'placeholder' }, h('h1', {}, title), h('p', {}, sentence));
}
