// Task 17.4 (criterion 10.4): nothing implies QUICK-2 ran the user's inputs. The two headings of
// the results, on the screen and in the print view, and nowhere in the app's sources the old ones.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Mode, Shape } from '../src/solver/index.ts';
import type { AppJob } from '../src/ui/job.ts';
import { classify, runJob } from '../src/ui/state.ts';
import { COMPUTED_HEADING, ECHOED_HEADING } from '../src/ui/views/results.ts';
import { printModel, printView } from '../src/ui/views/print.ts';
import { screenView } from '../src/ui/views/screen.ts';
import { findAll, textOf } from '../src/ui/vnode.ts';
import { golden, ROOT } from './golden.ts';

const g = golden('nd-irr-000006');
const job: AppJob = { mode: g.mode as Mode, shape: g.shape as Shape, inputs: { ...g.inputs }, origin: 'typed' };
const state = classify(job, runJob(job));

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sources(p) : /\.(ts|css|html)$/.test(f) ? [p] : [];
  });
}

describe('the two headings say whose work each is', () => {
  it('are "Your inputs, as Quickened read them" and "Computed by Quickened with QUICK-2\'s method"', () => {
    expect(ECHOED_HEADING).toBe('Your inputs, as Quickened read them');
    expect(COMPUTED_HEADING).toBe("Computed by Quickened with QUICK-2's method");
  });
  it('are on the results screen, as the captions of their tables', () => {
    const node = screenView(job, state)!.node;
    const captions = findAll(node, (n) => n.tag === 'caption').map((c) => textOf(c));
    expect(captions).toContain(ECHOED_HEADING);
    expect(captions).toContain(COMPUTED_HEADING);
  });
  it('are in the print view', () => {
    if (state.kind !== 'result') throw new Error('not a result');
    const text = textOf(printView(printModel(job, state, new Date(2026, 0, 1))));
    expect(text).toContain(ECHOED_HEADING);
    expect(text).toContain(COMPUTED_HEADING);
  });
  it('no source of the app says QUICK-2 read the inputs or computed them', () => {
    const bad = sources(join(ROOT, 'app', 'src')).filter((f) => /as QUICK-2 read|Computed by QUICK-2/.test(readFileSync(f, 'utf-8')));
    expect(bad).toEqual([]);
  });
});
