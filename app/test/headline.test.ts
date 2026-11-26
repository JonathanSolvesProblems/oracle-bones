// The headline reader (quickened-app task 10.2; criterion 5.2). With no results/headline.md it
// returns null; on a fixture it reads the Cases: and Run: lines. The fixture's numbers are a
// fixture's, not a run's.
import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseHeadline, readHeadline } from '../build/headline.ts';

describe('the headline reader', () => {
  it('returns null when results/headline.md does not exist', () => {
    const root = mkdtempSync(join(tmpdir(), 'headline-'));
    expect(readHeadline(root)).toBeNull();
  });
  it('reads the Cases: and Run: lines of a fixture', () => {
    const root = mkdtempSync(join(tmpdir(), 'headline-'));
    mkdirSync(join(root, 'results'));
    writeFileSync(join(root, 'results', 'headline.md'), '# Headline run\n\nCases: 12 of 34\nRun: 2026-01-02\n');
    expect(readHeadline(root)).toEqual({ matched: 12, total: 34, run: '2026-01-02' });
  });
  it('fails on a file without either line, naming the line', () => {
    expect(() => parseHeadline('Run: 2026-01-02\n')).toThrow(/Cases:/);
    expect(() => parseHeadline('Cases: 1 of 2\n')).toThrow(/Run:/);
    expect(() => parseHeadline('Cases: 3 of 2\nRun: 2026-01-02\n')).toThrow(/Cases:/);
  });
});
