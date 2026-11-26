// The links to the hauntings that describe a result or a refusal (quickened-app criterion 2.4).
import type { HauntingLink } from '../hauntingLinks.ts';
import { h, type VNode } from '../vnode.ts';

export const LINKS_HEADING = 'Hauntings that describe this kind of answer';

/** Where the limits page shows a haunting. */
export function hauntingHref(_id: string): string {
  return '#/limits';
}

export function hauntingLinksView(links: readonly HauntingLink[]): VNode | null {
  if (links.length === 0) return null;
  return h('section', { class: 'haunting-links' },
    h('h3', {}, LINKS_HEADING),
    h('ul', {}, links.map((l) => h('li', {}, h('a', { href: hauntingHref(l.haunting) }, `${l.haunting}: ${l.title}`)))));
}
