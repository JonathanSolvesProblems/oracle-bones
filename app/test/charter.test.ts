// Task 17.1 (criterion 10.1): tokens.css holds the charter's palette, light and dark, and its
// type scale. The charter (.design/CHARTER.md) is the source: its colour table is read here, not
// copied, so a change to the charter fails this test until the tokens follow.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './golden.ts';

const STYLES = join(ROOT, 'app', 'src', 'ui', 'styles');
const read = (f: string) => readFileSync(join(STYLES, f), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '');

/** The charter's token name is `rule`; `--rule` is already the 24px line, so the colour is `--rule-line`. */
const tokenName = (n: string) => (n === 'rule' ? '--rule-line' : `--${n}`);

/** Token -> [light, dark] from the charter's table. Rows holding two tokens ("a / b") hold two values per cell. */
function charter(): Record<string, [string, string]> {
  const out: Record<string, [string, string]> = {};
  const text = readFileSync(join(ROOT, '.design', 'CHARTER.md'), 'utf-8');
  for (const m of text.matchAll(/^\| ([a-z -/]+?) \| ([^|]*#[^|]*) \| ([^|]*#[^|]*) \|/gm)) {
    const names = m[1]!.split(' / ').map((s) => s.trim());
    const light = [...m[2]!.matchAll(/#[0-9A-Fa-f]{6}/g)].map((x) => x[0].toUpperCase());
    const dark = [...m[3]!.matchAll(/#[0-9A-Fa-f]{6}/g)].map((x) => x[0].toUpperCase());
    names.forEach((n, i) => { out[tokenName(n)] = [light[i]!, dark[i]!]; });
  }
  return out;
}

function block(css: string, opener: RegExp): Record<string, string> {
  const m = opener.exec(css);
  const out: Record<string, string> = {};
  for (const d of (m?.[1] ?? '').matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) out[d[1]!] = d[2]!.trim();
  return out;
}
const light = () => block(read('tokens.css'), /:root\s*{([^}]*)}/);
const dark = () => block(read('tokens.css'), /@media\s*\(prefers-color-scheme:\s*dark\)\s*{\s*:root\s*{([^}]*)}/);
const print = () => block(read('tokens.css'), /@media\s+print\s*{\s*:root\s*{([^}]*)}/);

describe('the charter palette', () => {
  it('the charter table has the thirteen colours', () => {
    expect(Object.keys(charter()).sort()).toEqual([
      '--canvas', '--cut-face', '--flag', '--gauge', '--ground-lit', '--ground-shade', '--hatch', '--ink',
      '--ink-muted', '--rule-line', '--water', '--water-line', '--water-top',
    ]);
  });

  it('tokens.css has each colour, light, as the charter gives it', () => {
    for (const [name, [l]] of Object.entries(charter())) expect.soft(light()[name]?.toUpperCase(), name).toBe(l);
  });

  it('and under prefers-color-scheme: dark, as the charter gives it', () => {
    for (const [name, [, d]] of Object.entries(charter())) expect.soft(dark()[name]?.toUpperCase(), name).toBe(d);
  });

  it('has no blue: no colour whose blue channel is above both red and green', () => {
    const hexes = [...Object.values(light()), ...Object.values(dark())].filter((v) => /^#[0-9A-F]{6}$/i.test(v));
    expect(hexes.length).toBeGreaterThan(20);
    for (const h of hexes) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
      expect.soft(b > Math.max(r, g), h).toBe(false);
    }
  });

  it('no stylesheet uses a colour token that tokens.css does not define (the field-book palette is gone)', () => {
    const defined = new Set(Object.keys(light()));
    const used = new Set<string>();
    for (const f of readdirSync(STYLES).filter((x) => x.endsWith('.css'))) {
      for (const m of read(f).matchAll(/var\((--[a-z0-9-]+)/g)) used.add(m[1]!);
    }
    expect([...used].filter((u) => !defined.has(u))).toEqual([]);
    for (const old of ['--paper', '--paper-rule', '--grid', '--pencil', '--water-fill', '--water-cutoff', '--ground']) {
      expect(defined.has(old), old).toBe(false);
    }
  });

  it('print is black on white: white canvas, black ink, text and links black', () => {
    const p = print();
    expect(p['--canvas']?.toUpperCase()).toBe('#FFFFFF');
    for (const t of ['--ink', '--ink-muted', '--flag', '--water-line']) expect.soft(p[t]?.toUpperCase(), t).toBe('#000000');
    // every other colour the print block sets is a charter light value, so a dark theme cannot reach the paper
    const lightValues = new Set(Object.values(charter()).map(([l]) => l));
    for (const v of Object.values(p).filter((x) => /^#/.test(x))) expect.soft(['#FFFFFF', '#000000', ...lightValues]).toContain(v.toUpperCase());
  });
});

describe('the charter type', () => {
  const sizes = () => Object.entries(light()).filter(([k]) => k.startsWith('--text-'))
    .map(([k, v]) => [k, Number(/^(\d+)px/.exec(v)?.[1])] as const);

  it('the sizes are the scale 12, 16, 21, 28, 37, 50, 66', () => {
    expect(sizes().map(([, px]) => px).sort((a, b) => a - b)).toEqual([12, 16, 21, 28, 37, 50, 66]);
  });

  it('every size a stylesheet overrides is on the scale', () => {
    const scale = new Set([12, 16, 21, 28, 37, 50, 66]);
    const css = read('tokens.css');
    for (const m of css.matchAll(/--text-[a-z0-9]+\s*:\s*(\d+)px/g)) expect.soft(scale.has(Number(m[1])), m[0]).toBe(true);
  });

  it('figures are Plex Sans Condensed, tabular; Plex Mono is only the recorded screens', () => {
    const t = light();
    expect(t['--font-figures']).toContain('IBM Plex Sans Condensed');
    expect(t['--font-figures']).not.toContain('Mono');
    expect(t['--font-evidence']).toContain('IBM Plex Mono');
    const app = read('app.css');
    expect(/(^|\n)body\s*{[^}]*font-variant-numeric:\s*tabular-nums/.test(app)).toBe(true);
    const users = app.split('}').filter((rule) => rule.includes('var(--font-evidence)'));
    expect(users.length).toBeGreaterThan(0);
    for (const rule of users) expect(rule.split('{')[0]).toMatch(/quick2-screen/);
    for (const f of readdirSync(STYLES).filter((x) => x.endsWith('.css') && x !== 'tokens.css' && x !== 'fonts.css')) {
      expect(read(f).replace(/var\(--font-evidence\)/g, '').includes('Mono'), f).toBe(false);
    }
  });
});
