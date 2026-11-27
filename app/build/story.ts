// The story page's counts (quickened-app criterion 11.4), read from the repository's files at each
// build so the page never types a number: the recorded cases under oracle/goldens/cases, the
// headline batch's drawn inputs from results/headline.md, the baseline rebuild's matches from
// results/ablation-manual-only.md, and the sessions and prompts from docs/prompts.md. A file that
// does not hold its line fails the build with the file and the line it looked for.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface Story {
  /** Cases recorded from the original program: the JSON files under oracle/goldens/cases. */
  recorded: number;
  /** Inputs drawn for the headline batch, before the program answered. */
  drawn: number;
  /** The rebuild made from one prompt, with no recorded answers, on the headline batch. */
  baseline: { matched: number; total: number };
  /** Kiro sessions and prompts, as docs/prompts.md counts them. */
  sessions: number;
  prompts: number;
  /** The counts as the page writes them, with thousands separated by commas; formatted here because the ui guard lets no view format a number. */
  text: { recorded: string; drawn: string };
}

function line(path: string, re: RegExp, what: string): RegExpExecArray {
  const m = re.exec(readFileSync(path, 'utf-8'));
  if (!m) throw new Error(`${path}: no ${what}`);
  return m;
}

export function readStory(root: string): Story {
  const cases = readdirSync(join(root, 'oracle', 'goldens', 'cases'), { recursive: true })
    .filter((f) => String(f).endsWith('.json')).length;
  const drawn = line(join(root, 'results', 'headline.md'), /\| Drawn by the generator[^|]*\| (\d+) \|/, 'row "Drawn by the generator"');
  const base = line(join(root, 'results', 'ablation-manual-only.md'), /\| The headline batch \(seed \d+\) \| (\d+) \| (\d+) \(/, 'row "The headline batch"');
  const prompts = line(join(root, 'docs', 'prompts.md'), /^(\d+) sessions, (\d+) prompts/m, 'line "<n> sessions, <n> prompts"');
  return {
    recorded: cases,
    drawn: Number(drawn[1]),
    baseline: { matched: Number(base[2]), total: Number(base[1]) },
    sessions: Number(prompts[1]),
    prompts: Number(prompts[2]),
    text: { recorded: cases.toLocaleString('en-US'), drawn: Number(drawn[1]).toLocaleString('en-US') },
  };
}
