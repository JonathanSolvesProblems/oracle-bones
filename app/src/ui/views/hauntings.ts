// The links to the hauntings that describe a result or a refusal (quickened-app criteria 2.4,
// 11.3). The calculate page says what they are in a reviewer's words; the word "haunting" is
// defined and used on the limits page only.
import type { HauntingLink } from '../hauntingLinks.ts';
import { h, type VNode } from '../vnode.ts';

export const LINKS_HEADING = 'Where QUICK-2 differs from the exact answer';

/** How a link to one entry of the limits page reads: "Limits, note H-001". */
export function limitsNote(id: string): string {
  return `Limits, note ${id}`;
}

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
