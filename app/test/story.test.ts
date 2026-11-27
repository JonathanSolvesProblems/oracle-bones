// Criterion 11.4 (2026-11-27): the practitioner who tried the site asked that the project be
// transparent and that its story be part of the result. The story page says how Quickened was
// made, reads every number from the file that holds it, and links each claim to that file.
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { data } from 'virtual:quickened/data';
import { introView } from '../src/ui/views/intro.ts';
import { REPOSITORY_URL, ROUTES, routeOf, shell } from '../src/ui/views/shell.ts';
import { STORY_TITLE, storyModel, storyView } from '../src/ui/views/story.ts';
import { findAll, textOf } from '../src/ui/vnode.ts';
import { ROOT } from './golden.ts';

const read = (p: string) => readFileSync(join(ROOT, p), 'utf-8');
const m = storyModel(data);
const view = storyView(m);
const text = textOf(view);
const hrefs = findAll(view, (n) => n.tag === 'a').map((a) => String(a.attrs.href));

describe('the story page (criterion 11.4)', () => {
  it('reads each count from its file', () => {
    const goldens = readdirSync(join(ROOT, 'oracle', 'goldens', 'cases'), { recursive: true }).filter((f) => String(f).endsWith('.json'));
    expect(data.story.recorded).toBe(goldens.length);
    expect(m.recorded).toBe(goldens.length.toLocaleString('en-US'));
    const drawn = Number(/\| Drawn by the generator[^|]*\| (\d+) \|/.exec(read('results/headline.md'))![1]);
    expect(data.story.drawn).toBe(drawn);
    expect(m.drawn).toBe(drawn.toLocaleString('en-US'));
    const row = /\| The headline batch \(seed \d+\) \| (\d+) \| (\d+) \(/.exec(read('results/ablation-manual-only.md'))!;
    expect(m.baseline).toEqual({ matched: Number(row[2]), total: Number(row[1]) });
    const head = /^(\d+) sessions, (\d+) prompts/m.exec(read('docs/prompts.md'))!;
    expect([m.sessions, m.prompts]).toEqual([Number(head[1]), Number(head[2])]);
    expect(m.headline).toEqual({ matched: data.headline!.matched, total: data.headline!.total });
    // The headline run's misses all fall in the classes the page counts.
    const inHeadline = data.knownMisses.reduce((s, c) => s + (c.inHeadline ?? 0), 0);
    expect(inHeadline).toBe(m.headline!.total - m.headline!.matched);
  });

  it('types no number: every figure on the page is a count from a file, the year, or the competition\'s year', () => {
    const n = (x: number) => x.toLocaleString('en-US');
    let rest = text.replace(/QUICK-2/g, '').replace('Kiroween 2026', '');
    // Longest first, so a short count never takes a digit out of a longer one.
    const values = [m.year, m.recorded, m.drawn, ...[m.headline!.total, m.headline!.matched, m.baseline.total, m.baseline.matched,
      m.sessions, m.prompts, m.headline!.total - m.headline!.matched, m.missClasses].map(n)].sort((x, y) => y.length - x.length);
    for (const v of values) {
      expect(rest, v).toContain(v);
      rest = rest.replace(v, '');
    }
    expect(rest).not.toMatch(/\d/);
  });

  it('links each claim to a file or folder of the repository that exists, and to the limits and proof pages', () => {
    const repo = hrefs.filter((h) => h.startsWith(REPOSITORY_URL));
    expect(repo.length).toBeGreaterThanOrEqual(7);
    for (const h of repo) {
      const path = h.slice(REPOSITORY_URL.length).replace(/^\/(blob|tree)\/main\/?/, '');
      expect(existsSync(join(ROOT, path)), h).toBe(true);
    }
    for (const p of ['docs/prompts.md', 'docs/build-log.md', 'results/held-out.md', 'results/ablation-manual-only.md']) {
      expect(hrefs).toContain(`${REPOSITORY_URL}/blob/main/${p}`);
    }
    expect(hrefs).toContain('#/limits');
    expect(hrefs).toContain('#/proof');
  });

  it('says who made it, for what, with what tools, and that the work outside Kiro is marked', () => {
    expect(textOf(findAll(view, (n) => n.tag === 'h1')[0]!)).toBe(STORY_TITLE);
    expect(text).toContain('Made by Jonathan Andrei');
    expect(text).toContain('Kiroween 2026');
    expect(text).toContain('Most of the code was written in Kiro');
    expect(text).toContain('Work done outside Kiro, with another AI coding assistant, is marked there, this page included.');
    expect(text).toContain('MIT license');
    expect(read('LICENSE')).toMatch(/^MIT License/);
    expect(text).toContain('QUICK-2 itself is not in the repository');
  });

  it('is a route with its own link in the top line and the footer, and the opening links it', () => {
    expect(routeOf('#/story')).toBe('story');
    expect(ROUTES.map((r) => r.hash)).toContain('#/story');
    const page = shell('story', view);
    expect(findAll(page, (n) => n.tag === 'a' && n.attrs.href === '#/story' && n.attrs['aria-current'] === 'page')).toHaveLength(1);
    expect(findAll(findAll(page, (n) => n.tag === 'footer')[0]!, (n) => n.tag === 'a' && n.attrs.href === '#/story')).toHaveLength(1);
    expect(findAll(introView(data.headline, data.program), (n) => n.tag === 'a' && n.attrs.href === '#/story')).toHaveLength(1);
  });
});
