import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { respond } from '../src/oracle/contract.ts';
import type { Job, Result } from '../src/solver/index.ts';
import { goldens } from './golden.ts';

const entry = fileURLToPath(new URL('../src/oracle/entry.ts', import.meta.url));

function requests() {
  return goldens()
    .filter((g) => g.outcome !== 'observed')
    .map((g) => ({ id: g.id, mode: g.mode, shape: g.shape, inputs: g.inputs }));
}

function runEntry(lines: string[]): Record<string, unknown>[] {
  const out = execFileSync(process.execPath, [entry], { input: lines.join('\n') + '\n', maxBuffer: 1 << 26 });
  return out.toString().split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l));
}

describe('entry', () => {
  it('answers every request once, with only the contract keys', () => {
    const reqs = requests();
    const res = runEntry(reqs.map((r) => JSON.stringify(r)));
    expect(res.map((r) => r.id).sort()).toEqual(reqs.map((r) => r.id).sort());
    for (const r of res) {
      expect(Object.keys(r).sort()).toEqual(['id', 'message', 'outcome', 'printed']);
      expect(['result', 'rejected', 'error']).toContain(r.outcome);
      for (const v of Object.values(r.printed as object)) expect(typeof v).toBe('string');
    }
  });

  it('keeps the id out of solve()', () => {
    const seen: Job[] = [];
    const spy = (job: Job): Result => {
      seen.push(job);
      return { outcome: 'error', printed: {}, message: 'x', held: 'h', flags: [], raw: { a: 1 } };
    };
    const line = JSON.stringify({ id: 'secret-id', mode: 'normal_depth', shape: 'trapezoid', inputs: { n: '.035' } });
    const res = respond(line, spy);
    expect(seen).toHaveLength(1);
    expect(Object.keys(seen[0]!).sort()).toEqual(['inputs', 'mode', 'shape']);
    expect(JSON.stringify(seen[0])).not.toContain('secret-id');
    expect(res).toEqual({ id: 'secret-id', outcome: 'error', printed: {}, message: 'x' });
  });

  it('answers even when solve() throws', () => {
    const line = JSON.stringify({ id: 'a', mode: 'normal_depth', shape: 'trapezoid', inputs: {} });
    const res = respond(line, () => { throw new Error('boom'); });
    expect(res).toMatchObject({ id: 'a', outcome: 'error' });
  });
});
