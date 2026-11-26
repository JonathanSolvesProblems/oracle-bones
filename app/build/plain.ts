// Reads results/limits-plain.md for the limits page (quickened-app design: The limits page;
// criteria 5.3, 5.7): each `## Q-NNN` heading and the text under it, up to the next heading, with
// its line breaks joined by single spaces. The file's opening paragraphs, before the first `##`,
// are not read. `checkPlainCoverage` compares the entries with the ledger's open questions both
// ways and lists each problem, naming the question.
import type { OpenQuestion } from './ledger.ts';

export interface PlainEntry { id: string; text: string; }

const HEADING = /^## (Q-\d{3})\s*$/;

export function readPlain(source: string): PlainEntry[] {
  const out: PlainEntry[] = [];
  let current: { id: string; lines: string[] } | null = null;
  const close = (): void => {
    if (current) out.push({ id: current.id, text: current.lines.join(' ').replace(/\s+/g, ' ').trim() });
  };
  for (const line of source.replace(/\r\n/g, '\n').split('\n')) {
    const m = HEADING.exec(line);
    if (m) {
      close();
      current = { id: m[1]!, lines: [] };
    } else if (line.startsWith('#')) {
      close();
      current = null;
    } else if (current) {
      current.lines.push(line);
    }
  }
  close();
  return out;
}

/**
 * Every way the entries fail to follow the ledger (criterion 5.7): an open question with no entry,
 * an entry for a question that is not open, an entry for an id the ledger does not have, an entry
 * with no text, or two entries for one question. Empty when the file follows the ledger.
 */
export function checkPlainCoverage(open: readonly OpenQuestion[], entries: readonly PlainEntry[], ledgerIds: readonly string[]): string[] {
  const problems: string[] = [];
  const openIds = new Set(open.map((q) => q.id));
  const known = new Set(ledgerIds);
  const seen = new Set<string>();
  for (const q of open) if (!entries.some((e) => e.id === q.id)) problems.push(`${q.id}: an open question with no entry in results/limits-plain.md`);
  for (const e of entries) {
    if (seen.has(e.id)) problems.push(`${e.id}: two entries in results/limits-plain.md`);
    seen.add(e.id);
    if (!known.has(e.id)) problems.push(`${e.id}: an entry for a question not in the ledger`);
    else if (!openIds.has(e.id)) problems.push(`${e.id}: an entry for a question that is not open`);
    if (!e.text) problems.push(`${e.id}: an entry with no text`);
  }
  return problems;
}
