// Read-only access to the stored goldens, captures and profile, for tests only. The solver and
// format source never read these.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const GOLDENS = join(ROOT, 'oracle', 'goldens');

export interface Golden {
  id: string;
  mode: string;
  shape: string;
  inputs: Record<string, string>;
  outcome: 'result' | 'rejected' | 'error' | 'observed';
  printed: Record<string, string>;
  message: string | null;
  held_prompt?: string | null;
  transcript: { step: number; expect: string | null; keys: string }[];
  [k: string]: unknown;
}

export function goldenIds(): string[] {
  return readdirSync(join(GOLDENS, 'cases'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -'.json'.length))
    .sort();
}

export function golden(id: string): Golden {
  return JSON.parse(readFileSync(join(GOLDENS, 'cases', `${id}.json`), 'utf-8')) as Golden;
}

export function goldens(): Golden[] {
  return goldenIds().map(golden);
}

function rowsOf(text: string): string[] {
  return (text.endsWith('\n') ? text.slice(0, -1) : text).split('\n');
}

/** Captured screens of a case, in order. */
export function captures(id: string): string[][] {
  const dir = join(GOLDENS, 'captures', id);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((f) => /^screen-(\d+)\.txt$/.exec(f))
    .filter((m): m is RegExpExecArray => m !== null)
    .sort((a, b) => Number(a[1]) - Number(b[1]))
    .map((m) => rowsOf(readFileSync(join(dir, m[0]), 'utf-8')));
}

export function finalCapture(id: string): string[] | null {
  const all = captures(id);
  return all.length ? all[all.length - 1]! : null;
}

export interface ProfileField { name: string; row: number; col: number; width: number; }
export interface ProfileScreen { id: string; fields?: ProfileField[]; message?: ProfileField; [k: string]: unknown; }

export function profile(): { screens: ProfileScreen[]; [k: string]: unknown } {
  return JSON.parse(readFileSync(join(ROOT, 'oracle', 'targets', 'quick2.json'), 'utf-8'));
}

export function profileScreen(id: string): ProfileScreen {
  const s = profile().screens.find((x) => x.id === id);
  if (!s) throw new Error(`no screen ${id} in the profile`);
  return s;
}
