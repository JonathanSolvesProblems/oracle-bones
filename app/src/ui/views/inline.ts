// Markdown code spans in text read from results/ (quickened-app criterion 5.8): each `value` is
// shown as the value alone, in the figures face, and the marks are dropped. A span may cross a
// line break, as the files wrap their bullets; the break reads as one space. Nothing else of
// markdown is read here, and an unpaired mark is left in the text, where the limits page's test
// finds it.
import { h, type Child } from '../vnode.ts';

const SPAN = /`([^`]+)`/g;

export function inline(text: string): Child[] {
  const out: Child[] = [];
  let at = 0;
  for (const m of text.matchAll(SPAN)) {
    if (m.index > at) out.push(text.slice(at, m.index));
    out.push(h('code', { class: 'figures' }, m[1]!.replace(/\s+/g, ' ')));
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}
