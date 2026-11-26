// The stylesheet test (criterion 9.4; quickened-app design: Tokens).
//
// - Outside tokens.css, no stylesheet under app/src/ui/styles/ holds a colour literal (hex, a
//   colour function or a named colour) or a length with a unit other than 0, and font-size,
//   line-height, font and letter-spacing take var() only. Lengths in @media conditions are not
//   declarations and are allowed.
// - tokens.css defines every token the design's Tokens section names, with the design's colour,
//   text-size and space values.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './golden.ts';

const STYLES = join(ROOT, 'app', 'src', 'ui', 'styles');
const TOKENS = 'tokens.css';
const DESIGN = join(ROOT, '.kiro', 'specs', 'quickened-app', 'design.md');

const NAMED_COLOURS = (
  'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood '
  + 'cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray '
  + 'darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen '
  + 'darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue '
  + 'firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew '
  + 'hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan '
  + 'lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray '
  + 'lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue '
  + 'mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred '
  + 'midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid '
  + 'palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple '
  + 'rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue '
  + 'slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke '
  + 'yellow yellowgreen'
).split(' ');
const COLOUR_WORD = new RegExp(`(?<![\\w-])(${NAMED_COLOURS.join('|')})(?![\\w-])`, 'i');
const HEX = /#[0-9a-f]{3,8}\b/i;
const COLOUR_FUNCTION = /(?<![\w-])(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(/i;
const LENGTH = /(?<![\w.-])-?(\d*\.\d+|\d+)(px|rem|em|ex|ch|pt|pc|cm|mm|in|q|vh|vw|vmin|vmax|svh|lvh|dvh|svw|lvw|dvw|cqw|cqh)(?![\w-])/i;
const TYPE_PROPERTIES = new Set(['font-size', 'line-height', 'font', 'letter-spacing']);
const CSS_WIDE = /^(inherit|initial|unset|revert|revert-layer)$/;

export interface Declaration { property: string; value: string; }

/** The declarations of a stylesheet, comments and quoted strings removed. */
export function declarations(css: string): Declaration[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/"[^"]*"|'[^']*'/g, '""');
  const out: Declaration[] = [];
  for (const m of text.matchAll(/(-{0,2}[a-z][a-z0-9-]*)\s*:\s*([^;{}]+)(?=;|})/gi)) {
    out.push({ property: m[1]!.toLowerCase(), value: m[2]!.trim() });
  }
  return out;
}

/** Why a declaration outside tokens.css breaks the token rule, or null. */
export function breach(d: Declaration): string | null {
  if (HEX.test(d.value) || COLOUR_FUNCTION.test(d.value) || COLOUR_WORD.test(d.value)) return 'colour literal';
  const len = LENGTH.exec(d.value);
  if (len && Number(len[1]) !== 0) return 'length literal';
  if (TYPE_PROPERTIES.has(d.property) && !d.value.includes('var(') && !CSS_WIDE.test(d.value)) return 'type size not from a token';
  return null;
}

export function breaches(file: string, css: string): string[] {
  return declarations(css).flatMap((d) => {
    const why = breach(d);
    return why ? [`${file}: ${d.property}: ${d.value} (${why})`] : [];
  });
}

function stylesheets(): string[] {
  return existsSync(STYLES) ? readdirSync(STYLES).filter((f) => f.endsWith('.css')).sort() : [];
}

/** The design's Tokens section. */
function tokensSection(): string {
  const text = readFileSync(DESIGN, 'utf-8');
  const start = text.indexOf('### Tokens');
  const end = text.indexOf('### The signature element');
  if (start < 0 || end < start) throw new Error('design.md has no Tokens section');
  return text.slice(start, end);
}

/** Token names the design names, with `-2` after `--space-1` read as `--space-2`. */
function designTokens(): string[] {
  const section = tokensSection();
  const names = new Set<string>();
  for (const m of section.matchAll(/`(--[a-z][a-z0-9-]*)`/g)) names.add(m[1]!);
  for (const m of section.matchAll(/`-(\d+)`/g)) names.add(`--space-${m[1]}`);
  return [...names].sort();
}

/** Design values to compare: hex colours, text sizes, and the space scale. */
function designValues(): Record<string, string> {
  const section = tokensSection();
  const out: Record<string, string> = {};
  for (const m of section.matchAll(/^\| `(--[a-z-]+)` \| `(#[0-9A-F]{6})` \|/gm)) out[m[1]!] = m[2]!.toLowerCase();
  for (const m of section.matchAll(/^\| `(--text-[a-z]+)` \| (\d+px \/ \d+px)/gm)) out[m[1]!] = m[2]!;
  const space = /^\| `--space-1` to `--space-12` \| ([\d, ]+)px \(([^)]*)\)/m.exec(section);
  if (!space) throw new Error('design.md has no space scale row');
  const values = space[1]!.split(',').map((v) => v.trim());
  const steps = [...space[2]!.matchAll(/`-{1,2}(?:space-)?(\d+)`/g)].map((m) => m[1]!);
  expect(steps).toHaveLength(values.length);
  steps.forEach((s, i) => { out[`--space-${s}`] = `${values[i]}px`; });
  return out;
}

/** The custom properties tokens.css defines in its first :root block. */
function definedTokens(css: string): Record<string, string> {
  const root = /:root\s*{([^}]*)}/.exec(css.replace(/\/\*[\s\S]*?\*\//g, ''));
  const out: Record<string, string> = {};
  for (const m of (root?.[1] ?? '').matchAll(/(--[a-z][a-z0-9-]*)\s*:\s*([^;]+);/g)) out[m[1]!] = m[2]!.trim();
  return out;
}

describe('stylesheets take every colour, size and space from tokens.css', () => {
  it('no literal outside tokens.css', () => {
    const bad = stylesheets().filter((f) => f !== TOKENS)
      .flatMap((f) => breaches(f, readFileSync(join(STYLES, f), 'utf-8')));
    expect(bad).toEqual([]);
  });

  it('catches each kind of literal (fixtures in memory)', () => {
    const f = (css: string) => breaches('fixture.css', css);
    expect(f('a { color: #1F2A36; }')).toHaveLength(1);
    expect(f('a { background: rgb(1, 2, 3); }')).toHaveLength(1);
    expect(f('a { border-color: red; }')).toHaveLength(1);
    expect(f('a { font-size: 14px; }')).toHaveLength(1);
    expect(f('a { line-height: 1.5; }')).toHaveLength(1);
    expect(f('a { margin: 0 8px; }')).toHaveLength(1);
    expect(f('a { gap: 1rem; }')).toHaveLength(1);
    expect(f('a { --x: 3px; }')).toHaveLength(1);
    expect(f('a { padding: var(--space-2) 0; color: var(--ink); font: var(--text-md) var(--font-body); }')).toEqual([]);
    expect(f("@font-face { font-family: 'IBM Plex Sans'; src: url('fonts/x.woff2') format('woff2'); font-weight: 400; }")).toEqual([]);
    expect(f('@media (min-width: 960px) { a:hover { width: 100%; } }')).toEqual([]);
    expect(f("a::after { content: 'red 12px'; }")).toEqual([]);
  });
});

describe('tokens.css holds the design tokens', () => {
  const css = () => readFileSync(join(STYLES, TOKENS), 'utf-8');

  it('defines every token the design names', () => {
    const defined = definedTokens(css());
    const missing = designTokens().filter((t) => !(t in defined));
    expect(missing).toEqual([]);
  });

  it('with the design values for colours, text sizes and spaces', () => {
    const defined = definedTokens(css());
    const values = designValues();
    expect(Object.keys(values).length).toBeGreaterThan(20);
    for (const [name, value] of Object.entries(values)) {
      expect.soft(defined[name]?.toLowerCase(), name).toBe(value.toLowerCase());
    }
  });
});
