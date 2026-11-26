// Reads the goldens the pages need, read-only (quickened-app design: Components; criteria 2.2,
// 5.6). A missing golden fails the build, naming the case and the file.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface GoldenCase {
  id: string;
  mode: string;
  shape: string;
  inputs: Readonly<Record<string, string>>;
  printed: Readonly<Record<string, string>>;
  printedKeys: readonly string[];
}

/** A case of the proof page: its golden and the last capture of its transcript, as recorded. */
export interface ProofCase {
  id: string;
  reason: string;
  mode: string;
  shape: string;
  inputs: Readonly<Record<string, string>>;
  outcome: string;
  printed: Readonly<Record<string, string>>;
  message: string | null;
  held: string | null;
  recordedAt: string;
  /** The case's last capture file, read as UTF-8, without its final line break. */
  capture: string;
}

/**
 * The last capture of a case: the highest-numbered `screen-NN.txt` under its captures folder.
 * A batch case keeps only its final screen, as `screen-00.txt`, so the file's number is not
 * always the transcript's last step.
 */
export function finalCapturePath(root: string, id: string): string {
  const dir = join(root, 'oracle', 'goldens', 'captures', id);
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => /^screen-\d+\.txt$/.test(f)) : [];
  if (files.length === 0) throw new Error(`the captures of ${id} are missing: ${dir}`);
  files.sort((a, b) => Number(a.slice(7, -4)) - Number(b.slice(7, -4)));
  return join(dir, files[files.length - 1]!);
}

export function readProofCase(root: string, id: string, reason: string): ProofCase {
  const path = goldenPath(root, id);
  if (!existsSync(path)) throw new Error(`the golden of ${id} is missing: ${path}`);
  const g = JSON.parse(readFileSync(path, 'utf-8')) as {
    mode: string; shape: string; inputs: Record<string, string>; outcome: string; printed?: Record<string, string>;
    message?: string | null; held_prompt?: string | null; recorded_at?: string;
  };
  const text = readFileSync(finalCapturePath(root, id), 'utf-8');
  return {
    id, reason, mode: g.mode, shape: g.shape, inputs: { ...g.inputs }, outcome: g.outcome, printed: { ...(g.printed ?? {}) },
    message: g.message ?? null, held: g.held_prompt ?? null, recordedAt: g.recorded_at ?? '',
    capture: text.endsWith('\n') ? text.slice(0, -1) : text,
  };
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
