// The comparator's known misses (results/known-misses.json), for tests only: every test that
// walks the goldens takes its exclusions from here, never from typed case ids.
// oracle/tests/test_known_misses.py checks that the file is exactly the full set's misses.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './golden.ts';

export interface KnownMissClass { id: string; what: string; limits: string | null; cases: Record<string, string[]>; }

export const KNOWN_MISS_CLASSES: readonly KnownMissClass[] =
  (JSON.parse(readFileSync(join(ROOT, 'results', 'known-misses.json'), 'utf-8')) as { classes: KnownMissClass[] }).classes;

const BY_CASE = new Map(KNOWN_MISS_CLASSES.flatMap((c) => Object.entries(c.cases)));

/** The case ids of every known miss. */
export const KNOWN_MISSES: readonly string[] = [...BY_CASE.keys()].sort();

export function isKnownMiss(id: string): boolean {
  return BY_CASE.has(id);
}

/** The fields (or `outcome`) the comparator reports for a known miss; empty for any other case. */
export function knownMissFields(id: string): readonly string[] {
  return BY_CASE.get(id) ?? [];
}

/** The seed of the headline batch (results/headline-batch-201.json). Its goldens were recorded
 * after the solver's preservation fixtures, so those fixtures do not hold them. */
export const HEADLINE_SEED: number =
  (JSON.parse(readFileSync(join(ROOT, 'results', 'headline-batch-201.json'), 'utf-8')) as { seed: number }).seed;
