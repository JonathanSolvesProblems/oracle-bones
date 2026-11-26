// Reads the open questions of results/ledger.json for the limits page (quickened-app design: The
// limits page; criterion 5.3): every `open_questions` entry with status `open`, its id and its
// question text verbatim, in the file's order. A file without the list, or an open entry without
// an id or text, fails the build, naming the entry.

export interface OpenQuestion { id: string; question: string; }

export function readOpenQuestions(source: string): OpenQuestion[] {
  const file = JSON.parse(source) as { open_questions?: unknown };
  if (!Array.isArray(file.open_questions)) throw new Error('results/ledger.json has no open_questions list');
  const out: OpenQuestion[] = [];
  file.open_questions.forEach((raw, i) => {
    const q = raw as { id?: unknown; question?: unknown; status?: unknown };
    if (q.status !== 'open') return;
    const name = typeof q.id === 'string' && q.id ? q.id : `entry ${i + 1}`;
    if (typeof q.id !== 'string' || !q.id) throw new Error(`results/ledger.json: open question ${name} has no id`);
    if (typeof q.question !== 'string' || !q.question) throw new Error(`results/ledger.json: open question ${name} has no question text`);
    out.push({ id: q.id, question: q.question });
  });
  return out;
}
