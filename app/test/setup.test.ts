import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const entry = fileURLToPath(new URL('../src/oracle/entry.ts', import.meta.url));

describe('package setup', () => {
  it('runs the entry on Node without a build step', () => {
    const out = execFileSync(process.execPath, [entry], { input: '{"id":"x","mode":"normal_depth","shape":"trapezoid","inputs":{}}\n' });
    expect(JSON.parse(out.toString())).toMatchObject({ id: 'x' });
  });
});
