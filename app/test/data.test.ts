// The goldens reader and the virtual:quickened/data module (quickened-app task 6.3; criteria 2.2,
// 5.6). build/goldens.ts gives each haunting case's inputs and printed keys, read-only, and fails
// the build on a missing golden. The data module is built from the real files and is the same in
// Vite and Vitest.
import { describe, expect, it } from 'vitest';
import { data } from 'virtual:quickened/data';
import { readGolden } from '../build/goldens.ts';
import { buildData, DATA_PLUGIN } from '../build/data.ts';
import viteConfig from '../vite.config.ts';
import vitestConfig from '../vitest.config.ts';
import { golden, ROOT } from './golden.ts';

const pluginNames = (config: unknown) => ((config as { plugins?: { name: string }[] }).plugins ?? []).map((p) => p.name);

describe('build/goldens.ts', () => {
  it('gives a golden\'s inputs and printed keys as the file holds them, frozen', () => {
    const g = readGolden(ROOT, 'nd-irr-000010');
    const file = golden('nd-irr-000010');
    expect(g.inputs).toEqual(file.inputs);
    expect(g.printedKeys).toEqual(Object.keys(file.printed));
    expect(Object.isFrozen(g.inputs)).toBe(true);
    expect(Object.isFrozen(g.printedKeys)).toBe(true);
  });

  it('fails on a missing golden, naming it', () => {
    expect(() => readGolden(ROOT, 'nd-irr-999999')).toThrow(/nd-irr-999999/);
  });
});

describe('virtual:quickened/data', () => {
  it('holds the hauntings and, for every case a haunting names, its golden\'s inputs', () => {
    expect(data).toEqual(buildData(ROOT));
    const named = data.hauntings.flatMap((h) => h.cases);
    expect(Object.keys(data.cases).sort()).toEqual([...new Set(named)].sort());
    for (const id of named) {
      const g = golden(id);
      expect(data.cases[id], id).toEqual({ id, mode: g.mode, shape: g.shape, inputs: g.inputs, printedKeys: Object.keys(g.printed) });
    }
  });

  it('is served by the same plugin in Vite and in Vitest', () => {
    expect(pluginNames(viteConfig)).toContain(DATA_PLUGIN);
    expect(pluginNames(vitestConfig)).toContain(DATA_PLUGIN);
  });
});
