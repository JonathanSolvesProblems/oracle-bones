// The Vite plugin that serves `virtual:quickened/data` (quickened-app design: Components). The
// module is built at each build from the files in results/ and the goldens they name, so a change
// to a file shows at the next build with no edit to the app (criterion 5.4). Vite and Vitest both
// load it. A file that cannot be read fails the build with the file and the reason.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { readGolden, readProofCase, type ProofCase } from './goldens.ts';
import { readHeadline, type Headline } from './headline.ts';
import { readHauntings, type Haunting, type LimitEntry } from './hauntings.ts';
import { readOpenQuestions } from './ledger.ts';
import { readPlain } from './plain.ts';
import { readSources, type Sources } from './sources.ts';

export const DATA_ID = 'virtual:quickened/data';
export const DATA_PLUGIN = 'quickened-data';
const RESOLVED = `\0${DATA_ID}`;

/** The repository root, two levels above this file. */
export const ROOT = fileURLToPath(new URL('../../', import.meta.url));

/** A golden the pages need: its pair, its inputs as typed and its printed keys. */
export interface CaseData { id: string; mode: string; shape: string; inputs: Readonly<Record<string, string>>; printedKeys: readonly string[]; }

export interface QuickenedData {
  hauntings: Haunting[];
  limits: LimitEntry[];
  /**
   * Every open question of results/ledger.json, id and text verbatim, with its plain sentences
   * from results/limits-plain.md, or null where the file has no entry (criterion 5.7's test fails).
   */
  openQuestions: { id: string; question: string; plain: string | null }[];
  /** The proof page's cases, from src/ui/proof/cases.json, with their goldens and final captures. */
  proof: ProofCase[];
  /** results/headline.md's count and date, or null while the file does not exist (criterion 5.2). */
  headline: Headline | null;
  /** Every case a haunting names, by id. */
  cases: Record<string, CaseData>;
  /** The worked examples' goldens (criteria 8.2, 8.4). */
  examples: { main: CaseData; cutoff: CaseData };
  sources: Sources;
  /** package.json's version and the build's short commit, for the print header (criterion 4.1). */
  build: { version: string; commit: string };
}

/** The short commit the build is made from; the build fails outside a git checkout. */
function shortCommit(root: string): string {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf-8' }).trim();
  } catch (e) {
    throw new Error(`cannot read the build's commit with git rev-parse: ${(e as Error).message}`);
  }
}

/** The worked examples' cases (design: The worked examples). */
export const EXAMPLE_CASES = { main: 'nd-irr-000006', cutoff: 'nd-irr-000010' } as const;

/** The files the module is built from. */
export function sourceFiles(root: string): string[] {
  return [join(root, 'results', 'hauntings.md'), join(root, 'results', 'ledger.json'), join(root, 'results', 'limits-plain.md'),
    join(root, 'results', 'headline.md'), join(root, 'app', 'src', 'ui', 'proof', 'cases.json'),
    join(root, 'realdata', 'huntington-section-01.json')];
}

function readText(path: string): string {
  try {
    return readFileSync(path, 'utf-8');
  } catch (e) {
    throw new Error(`cannot read ${path}: ${(e as Error).message}`);
  }
}

function caseData(root: string, id: string): CaseData {
  const g = readGolden(root, id);
  return { id, mode: g.mode, shape: g.shape, inputs: { ...g.inputs }, printedKeys: [...g.printedKeys] };
}

export function buildData(root: string = ROOT): QuickenedData {
  const file = readHauntings(readText(join(root, 'results', 'hauntings.md')), (id) => readGolden(root, id).printedKeys);
  const cases: Record<string, CaseData> = {};
  for (const id of file.hauntings.flatMap((h) => h.cases)) cases[id] ??= caseData(root, id);
  const main = caseData(root, EXAMPLE_CASES.main);
  const cutoff = caseData(root, EXAMPLE_CASES.cutoff);
  const n = { left: main.inputs.n_left ?? '', channel: main.inputs.n_channel ?? '', right: main.inputs.n_right ?? '' };
  const plain = readPlain(readText(join(root, 'results', 'limits-plain.md')));
  const openQuestions = readOpenQuestions(readText(join(root, 'results', 'ledger.json')))
    .map((q) => ({ ...q, plain: plain.find((p) => p.id === q.id)?.text ?? null }));
  const list = JSON.parse(readText(join(root, 'app', 'src', 'ui', 'proof', 'cases.json'))) as { id: string; reason: string }[];
  const proof = list.map((c) => readProofCase(root, c.id, c.reason));
  return { hauntings: file.hauntings, limits: file.limits, openQuestions, proof, headline: readHeadline(root), cases, examples: { main, cutoff }, sources: readSources(root, n, cutoff.inputs.discharge ?? ''),
    build: {
      version: String((JSON.parse(readText(join(root, 'app', 'package.json'))) as { version: string }).version),
      commit: shortCommit(root),
    },
  };
}

export function quickenedData(root: string = ROOT): Plugin {
  return {
    name: DATA_PLUGIN,
    resolveId(id) {
      return id === DATA_ID ? RESOLVED : null;
    },
    load(id) {
      if (id !== RESOLVED) return null;
      const data = buildData(root);
      for (const f of sourceFiles(root)) this.addWatchFile(f);
      return `export const data = ${JSON.stringify(data)};\n`;
    },
  };
}
