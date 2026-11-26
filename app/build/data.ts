// The Vite plugin that serves `virtual:quickened/data` (quickened-app design: Components). The
// module is built at each build from the files in results/ and the goldens they name, so a change
// to a file shows at the next build with no edit to the app (criterion 5.4). Vite and Vitest both
// load it. A file that cannot be read fails the build with the file and the reason.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { readGolden } from './goldens.ts';
import { readHauntings, type Haunting, type LimitEntry } from './hauntings.ts';

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
  /** Every case a haunting names, by id. */
  cases: Record<string, CaseData>;
}

/** The files the module is built from. */
export function sourceFiles(root: string): string[] {
  return [join(root, 'results', 'hauntings.md')];
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
  return { hauntings: file.hauntings, limits: file.limits, cases };
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
