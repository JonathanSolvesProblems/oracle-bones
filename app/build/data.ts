// The Vite plugin that serves `virtual:quickened/data` (quickened-app design: Components). The
// module is built at each build from the files in results/ and the goldens they name, so a change
// to a file shows at the next build with no edit to the app (criterion 5.4). Vite and Vitest both
// load it. A file that cannot be read fails the build with the file and the reason.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { goldenPath, readGolden, readProofCase, type ProofCase } from './goldens.ts';
import { readHeadline, type Headline } from './headline.ts';
import { readHauntings, type Haunting, type LimitEntry } from './hauntings.ts';
import { readOpenQuestions } from './ledger.ts';
import { readPlain } from './plain.ts';
import { readSources, type Sources } from './sources.ts';
import { readStory, type Story } from './story.ts';

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
  /**
   * Each class of results/known-misses.json that has a Limits entry, by that entry's title, with
   * how many of its cases are the headline batch's (their golden's seed is the batch's), or null
   * with no headline run (criterion 5.9).
   */
  knownMisses: KnownMissClass[];
  /** Every case a haunting names, by id. */
  cases: Record<string, CaseData>;
  /** The worked examples' goldens (criteria 8.2, 8.4). */
  examples: { main: CaseData; cutoff: CaseData };
  sources: Sources;
  /** QUICK-2's year, from the `purpose` of realdata/huntington-section-01.json, for the opening (criterion 8.10). */
  program: { year: string };
  /** package.json's version and the build's short commit, for the print header (criterion 4.1). */
  build: { version: string; commit: string };
  /** The story page's counts, each read from its file (criterion 11.4). */
  story: Story;
}

/** The short commit the build is made from; the build fails outside a git checkout. */
function shortCommit(root: string): string {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf-8' }).trim();
  } catch (e) {
    throw new Error(`cannot read the build's commit with git rev-parse: ${(e as Error).message}`);
  }
}

export interface KnownMissClass { id: string; title: string; cases: string[]; inHeadline: number | null; }

/** The known-miss classes with a Limits entry; a class whose entry is missing fails the build. */
export function readKnownMisses(root: string, source: string, limits: readonly LimitEntry[], headline: Headline | null): KnownMissClass[] {
  const file = JSON.parse(source) as { classes: { id: string; limits: string | null; cases: Record<string, string[]> }[] };
  return file.classes.filter((c) => c.limits !== null).map((c) => {
    if (!limits.some((l) => l.title === c.limits)) {
      throw new Error(`results/known-misses.json: class ${c.id} names the Limits entry "${c.limits}", which results/hauntings.md does not have`);
    }
    const cases = Object.keys(c.cases);
    const seedOf = (id: string): unknown => (JSON.parse(readText(goldenPath(root, id))) as { seed?: unknown }).seed;
    const inHeadline = headline?.seed === undefined ? null : cases.filter((id) => seedOf(id) === headline.seed).length;
    return { id: c.id, title: c.limits!, cases, inHeadline };
  });
}

/** QUICK-2's year as the realdata file's purpose writes it, "QUICK-2 (yyyy)"; the build fails without it. */
export function readProgramYear(source: string): string {
  const purpose = String((JSON.parse(source) as { purpose?: unknown }).purpose ?? '');
  const m = /QUICK-2 \((\d{4})\)/.exec(purpose);
  if (!m) throw new Error('realdata/huntington-section-01.json: its purpose does not name "QUICK-2 (yyyy)"');
  return m[1]!;
}

/** The worked examples' cases (design: The worked examples). */
export const EXAMPLE_CASES = { main: 'nd-irr-000006', cutoff: 'nd-irr-000010' } as const;

/** The files the module is built from. */
export function sourceFiles(root: string): string[] {
  return [join(root, 'results', 'hauntings.md'), join(root, 'results', 'ledger.json'), join(root, 'results', 'limits-plain.md'),
    join(root, 'results', 'headline.md'), join(root, 'results', 'known-misses.json'), join(root, 'app', 'src', 'ui', 'proof', 'cases.json'),
    join(root, 'realdata', 'huntington-section-01.json'), join(root, 'results', 'ablation-manual-only.md'), join(root, 'docs', 'prompts.md')];
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
  const headline = readHeadline(root);
  const knownMisses = readKnownMisses(root, readText(join(root, 'results', 'known-misses.json')), file.limits, headline);
  return { hauntings: file.hauntings, limits: file.limits, openQuestions, proof, headline, knownMisses, cases, examples: { main, cutoff }, sources: readSources(root, n, cutoff.inputs.discharge ?? ''),
    program: { year: readProgramYear(readText(join(root, 'realdata', 'huntington-section-01.json'))) },
    build: {
      version: String((JSON.parse(readText(join(root, 'app', 'package.json'))) as { version: string }).version),
      commit: shortCommit(root),
    },
    story: readStory(root),
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
