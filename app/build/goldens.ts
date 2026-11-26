// Reads the goldens the pages need, read-only (quickened-app design: Components; criteria 2.2,
// 5.6). A missing golden fails the build, naming the case and the file.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface GoldenCase {
  id: string;
  mode: string;
  shape: string;
  inputs: Readonly<Record<string, string>>;
  printed: Readonly<Record<string, string>>;
  printedKeys: readonly string[];
}

export function goldenPath(root: string, id: string): string {
  return join(root, 'oracle', 'goldens', 'cases', `${id}.json`);
}

export function readGolden(root: string, id: string): GoldenCase {
  const path = goldenPath(root, id);
  if (!existsSync(path)) throw new Error(`the golden of ${id} is missing: ${path}`);
  const g = JSON.parse(readFileSync(path, 'utf-8')) as { mode: string; shape: string; inputs: Record<string, string>; printed?: Record<string, string> };
  const printed = Object.freeze({ ...(g.printed ?? {}) });
  return Object.freeze({
    id, mode: g.mode, shape: g.shape,
    inputs: Object.freeze({ ...g.inputs }), printed, printedKeys: Object.freeze(Object.keys(printed)),
  });
}
