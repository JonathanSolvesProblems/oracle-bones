// Circle Normal Depth and Channel Capacity results, recorded before the circle-short-chord
// change to the solver (.kiro/specs/circle-short-chord, design: Property 11; requirements 3.2,
// 3.3).
//
// A seeded list of generated inputs, from the practical ranges, the accepted ranges and the
// boundary values of oracle/targets/quick2.json, and the inputs of every circle Normal Depth
// and Channel Capacity golden. For each, the `Result` of `solve()`: outcome, every printed
// field, message, held prompt, flags and every raw value, with doubles written as exact
// decimals so the comparison in circle.test.ts is exact. A flag is recorded by its code and
// fields: its text belongs to flags.ts, and circle-short-chord 2.7 changes the text of
// `returns_to_menu` for every use.
//
// The fixture is written only by the explicit command, never by a test run:
//   npm run snapshot:circle        (in app/; node test/circleSnapshot.ts record)
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { solve } from '../src/solver/index.ts';
import type { Result } from '../src/solver/types.ts';
import { ROOT, goldens } from './golden.ts';
import { exactDecimal } from './searchSnapshot.ts';

export const CIRCLE_SNAPSHOT_PATH = join(ROOT, 'app', 'test', 'fixtures', 'circle-snapshot.json');

export type CircleSnapshotMode = 'normal_depth' | 'channel_capacity';
export interface CircleSnapshotInput { key: string; mode: CircleSnapshotMode; inputs: Record<string, string>; }
export interface CircleSnapshotEntry {
  mode: CircleSnapshotMode;
  inputs: Record<string, string>;
  outcome: Result['outcome'];
  printed: Record<string, string>;
  message: string | null;
  held: string | null;
  flags: { code: string; fields: string[] }[];
  raw: Record<string, string>;
}

const SEED = 20261126;
const PER_MODE = 200;

/** A small seeded generator (an LCG), so the list does not depend on any library. */
function generator(seed: number) {
  let s = seed >>> 0;
  const next = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(next() * xs.length)]!;
  /** A typed decimal from lo to hi with `d` decimals, uniform or log-uniform. */
  const num = (lo: number, hi: number, d: number, log = false) => {
    const x = log ? lo * Math.pow(hi / lo, next()) : lo + next() * (hi - lo);
    return Math.min(hi, Math.max(lo, x)).toFixed(d);
  };
  return { next, pick, num };
}

// The ranges and boundary values of oracle/targets/quick2.json: accepted min, max and decimals;
// the practical bounds for the circle (Diameter 8 to 180 in, n .008 to .033).
const BOUNDARIES: Record<string, readonly string[]> = {
  diameter: ['0', '-1'], n: ['.000', '-1', '12.5'], discharge: ['0', '-1', '1234567'],
  slope: ['0', '-1', '12.5'], depth: ['0', '-1', '1000'],
};

/** The generated inputs, in a fixed order. */
export function generatedInputs(): CircleSnapshotInput[] {
  const g = generator(SEED);
  const out: CircleSnapshotInput[] = [];
  for (const mode of ['normal_depth', 'channel_capacity'] as const) {
    for (let i = 0; i < PER_MODE; i++) {
      const practical = i % 2 === 0;
      const diameter = practical ? g.num(8, 180, 1) : g.num(0.1, 9999.9, 1, true);
      const n = practical ? g.num(0.008, 0.033, 4) : g.num(0.0001, 9.9999, 4, true);
      const slope = g.num(0.0001, 9.9999, 4, true);
      const inputs: Record<string, string> = { diameter, n, slope };
      if (mode === 'normal_depth') inputs.discharge = g.num(1, 999999, 0, true);
      else inputs.depth = practical ? g.num(0.01, Math.max(0.01, (1.05 * Number(diameter)) / 12), 2) : g.num(0.01, 999.99, 2, true);
      // One input in ten takes a boundary value.
      for (const k of Object.keys(inputs)) if (g.next() < 0.1) inputs[k] = g.pick(BOUNDARIES[k]!);
      out.push({ key: `${mode}-${String(i).padStart(3, '0')}`, mode, inputs });
    }
  }
  return out;
}

/** Every circle Normal Depth and Channel Capacity golden, by case id. */
export function goldenInputs(): CircleSnapshotInput[] {
  return goldens()
    .filter((x) => x.shape === 'circle' && (x.mode === 'normal_depth' || x.mode === 'channel_capacity') && !x.id.startsWith('obs-'))
    .map((x) => ({ key: x.id, mode: x.mode as CircleSnapshotMode, inputs: x.inputs }));
}

export function snapshotEntry(c: CircleSnapshotInput): CircleSnapshotEntry {
  const r = solve({ mode: c.mode, shape: 'circle', inputs: c.inputs });
  return {
    mode: c.mode,
    inputs: c.inputs,
    outcome: r.outcome,
    printed: r.printed,
    message: r.message,
    held: r.held,
    flags: r.flags.map((f) => ({ code: f.code, fields: f.fields })),
    raw: Object.fromEntries(Object.entries(r.raw).map(([k, v]) => [k, exactDecimal(v)])),
  };
}

export function snapshotInputs(): CircleSnapshotInput[] {
  return [...generatedInputs(), ...goldenInputs()];
}

// The argument is `record`, not `write`: searchSnapshot.ts, imported above for exactDecimal,
// writes its own fixture when the argument is `write`.
if (process.argv[2] === 'record') {
  const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf-8' }).trim();
  const dirty = execFileSync('git', ['status', '--porcelain', '--', 'app/src'], { cwd: ROOT, encoding: 'utf-8' }).trim();
  if (dirty) throw new Error(`app/src has uncommitted changes; the snapshot must come from a commit:\n${dirty}`);
  const entries = Object.fromEntries(snapshotInputs().map((c) => [c.key, snapshotEntry(c)]));
  const note = `Generated by "npm run snapshot:circle" (app/test/circleSnapshot.ts) at commit ${commit}, `
    + 'from the solver before the circle-short-chord change. Do not edit by hand; circle.test.ts (Property 11) compares against it.';
  writeFileSync(CIRCLE_SNAPSHOT_PATH, `${JSON.stringify({ _note: note, ...entries }, null, 1)}\n`, 'utf-8');
  const tally = new Map<string, number>();
  for (const e of Object.values(entries)) {
    const k = `${e.mode} ${e.outcome}${e.held ? ` held ${e.held}` : ''}${e.flags.length ? ` ${e.flags.map((f) => f.code).join('+')}` : ''}`;
    tally.set(k, (tally.get(k) ?? 0) + 1);
  }
  console.log(`${Object.keys(entries).length} results written to ${CIRCLE_SNAPSHOT_PATH}`);
  for (const [k, n] of [...tally].sort()) console.log(`  ${k}: ${n}`);
}
