// What the files of results/ write for the repository, kept off the plain sentence of a public
// page (criterion 10.6; charter law 13): run ids, golden, ledger wording, decision numbers,
// "the person", attempt ids and file paths. A sentence that carries one goes into a closed
// details element under its entry; the plain sentences stand alone above it.
import { h, type Child, type VNode } from '../vnode.ts';

export const FOR_REPOSITORY = 'For the repository';

/** Words and marks of the repository: a sentence holding one is not for a reviewer's first reading. */
export const REPO_WORDS = new RegExp([
  '\\bgolden', '\\bledger', 'the person', '\\bA-\\d{3}\\b', '\\bQ-\\d{3}\\b', '\\b\\d{8}-\\d{6}(?:-[0-9a-f]+)?\\b',
  '\\bdecision \\d', 'results/', 'scripts/', '\\bobs-[a-z]+-\\d+', 'circle-short-chord', '\\.mts\\b',
].join('|'), 'i');

/** The sentences of a text, each with its end mark; a sentence ends at . ! or ? and a space. */
export function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+(?=[A-Z0-9(“"'`])/).map((s) => s.trim()).filter((s) => s !== '');
}

/** A text divided into the sentences for a reader and the sentences for the repository. */
export function splitRepo(text: string): { plain: string; repo: string[] } {
  const parts = sentences(text);
  return { plain: parts.filter((s) => !REPO_WORDS.test(s)).join(' '), repo: parts.filter((s) => REPO_WORDS.test(s)) };
}

/** A closed details element for the repository's wording, or nothing when there is none. */
export function forRepo(...content: (Child | readonly Child[] | null | false)[]): VNode | null {
  const shown = content.flat().filter((c): c is Child => c !== null && c !== false);
  if (shown.length === 0) return null;
  return h('details', { class: 'for-repo' }, h('summary', {}, FOR_REPOSITORY), shown);
}
