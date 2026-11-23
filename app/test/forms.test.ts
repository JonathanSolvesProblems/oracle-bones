// The regular forms: prompt order against the golden transcripts, holds against every rejected
// golden, echoes against the captures of the overflow cases, and Properties 2 and 3.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { solve } from '../src/solver/index.ts';
import { echoes, readRegularForm, regularPrompts } from '../src/solver/forms.ts';
import { readSingle } from '../src/solver/parse.ts';
import type { RegularMode, RegularShape } from '../src/solver/types.ts';
import { REGULAR_MODES, REGULAR_RESULT, REGULAR_SHAPES } from '../src/format/layout.ts';
import { formatWidth, parseFormat, printUsing } from '../src/format/printUsing.ts';
import { cut, paint, pictureFor } from '../src/format/screen.ts';
import { finalCapture, golden, goldens, type Golden } from './golden.ts';

const isRegular = (g: Golden) =>
  (REGULAR_MODES as readonly string[]).includes(g.mode) && (REGULAR_SHAPES as readonly string[]).includes(g.shape);

/** The values typed on the form, in order, without the final Begin Enter. */
function typed(g: Golden): string[] {
  const out: string[] = [];
  for (const t of g.transcript) {
    if (!t.expect || !/_form$/.test(t.expect)) continue;
    for (const m of t.keys.matchAll(/([^{]*)\{Enter\}/g)) out.push(m[1]!);
  }
  if (out[out.length - 1] === '') out.pop();
  return out;
}

const regular = goldens().filter(isRegular);

describe('regular prompt order against the golden transcripts', () => {
  const cases = regular.filter((g) => g.outcome !== 'observed');
  it('covers every regular pair', () => {
    const pairs = new Set(cases.map((g) => `${g.mode}/${g.shape}`));
    expect(pairs.size).toBe(REGULAR_MODES.length * REGULAR_SHAPES.length);
  });
  for (const g of cases) {
    const prompts = regularPrompts(g.mode as RegularMode, g.shape as RegularShape);
    it(`${g.id}: ${prompts.join(', ')}`, () => {
      const want = prompts.map((p) => g.inputs[p]);
      const got = typed(g);
      if (g.outcome === 'rejected') {
        const at = prompts.indexOf(g.held_prompt!);
        expect(at).toBeGreaterThanOrEqual(0);
        expect(got).toEqual(want.slice(0, at + 1));
      } else {
        expect(got).toEqual(want);
      }
    });
  }
});

describe('holds against every rejected regular golden', () => {
  const rejectedCases = regular.filter((g) => g.outcome === 'rejected');
  it('finds the rejected goldens', () => expect(rejectedCases.length).toBe(47));
  for (const g of rejectedCases) {
    it(`${g.id} holds ${g.held_prompt}`, () => {
      const r = solve({ mode: g.mode as RegularMode, shape: g.shape as RegularShape, inputs: g.inputs });
      expect(r).toMatchObject({ outcome: 'rejected', held: g.held_prompt, message: g.message, printed: {} });
    });
  }
  it('no accepted regular golden is held', () => {
    for (const g of regular.filter((x) => x.outcome === 'result')) {
      expect(readRegularForm(g.mode as RegularMode, g.shape as RegularShape, g.inputs).ok, g.id).toBe(true);
    }
  });
});

describe('echoes against the captured forms', () => {
  // [case, mode, shape]: forms typed to the end with values at and past their fields' edges.
  const forms: [string, RegularMode, RegularShape][] = [
    ['obs-fieldover-000001', 'channel_capacity', 'trapezoid'],
    ['obs-fieldedge-000001', 'channel_capacity', 'trapezoid'],
    ['obs-fieldedge-000002', 'critical_depth', 'circle'],
    ['obs-smallaccept-000001', 'normal_depth', 'trapezoid'],
  ];
  for (const [id, mode, shape] of forms) {
    it(`${id}: each echo window equals the final capture`, () => {
      const prompts = regularPrompts(mode, shape);
      const values = typed(golden(id));
      expect(values).toHaveLength(prompts.length);
      const inputs = Object.fromEntries(prompts.map((p, i) => [p, values[i]!]));
      const read = readRegularForm(mode, shape, inputs);
      if (!read.ok) throw new Error(`held at ${read.held}`);
      const layout = REGULAR_RESULT[mode][shape];
      const shown = echoes(read.values);
      const fields = Object.keys(shown);
      const painted = cut(layout, paint(layout, shown), fields);
      const shot = cut(layout, finalCapture(id)!, fields);
      expect(painted).toEqual(shot);
    });
  }
});

// Property 2: for any regular-form inputs where some value reads as 0, the outcome is rejected
// and the held prompt is the first such prompt. The other values are drawn so that no other
// hold rule applies: positive, and a Channel Capacity circle depth inside the pipe.
const pairArb = fc.record({
  mode: fc.constantFrom(...REGULAR_MODES),
  shape: fc.constantFrom(...REGULAR_SHAPES),
});
const positive = fc.integer({ min: 1, max: 999999 }).map((x) => (x / 1000).toString());
const zero = fc.constantFrom('0', '0.0', '.000', '-0', '00');

describe('Property 2: the first zero is held', () => {
  it('holds the first prompt that reads as 0', () => {
    fc.assert(fc.property(pairArb, fc.array(positive, { minLength: 6, maxLength: 6 }), fc.array(fc.boolean(), { minLength: 6, maxLength: 6 }), zero,
      ({ mode, shape }, values, zeros, z) => {
        const prompts = regularPrompts(mode, shape);
        fc.pre(prompts.some((_, i) => zeros[i]));
        const inputs: Record<string, string> = {};
        prompts.forEach((p, i) => { inputs[p] = zeros[i] ? z : values[i]!; });
        if (mode === 'channel_capacity' && shape === 'circle' && !zeros[prompts.indexOf('depth')] && inputs.diameter !== z) {
          inputs.depth = (readSingle(inputs.diameter!) / 24).toString();
          fc.pre(readSingle(inputs.depth) !== 0);
        }
        const first = prompts.find((p) => readSingle(inputs[p]!) === 0)!;
        const r = solve({ mode, shape, inputs });
        expect(r).toMatchObject({ outcome: 'rejected', held: first, printed: {}, message: null });
      }), { numRuns: 500 });
  });
});

// Property 3: for any accepted typed value, the echo has the field's decimals and no `%` when the
// rounded value fits the format, and starts with `%` when it does not.
const typedValue = fc.oneof(
  fc.integer({ min: -99999999, max: 99999999 }).chain((x) => fc.integer({ min: 0, max: 6 }).map((d) => (x / 10 ** d).toString())),
  fc.double({ min: -1e10, max: 1e10, noNaN: true }).map((x) => String(x)),
);
const echoFields = REGULAR_MODES.flatMap((m) => REGULAR_SHAPES.flatMap((s) => {
  const layout = REGULAR_RESULT[m][s];
  return Object.keys(layout.windows).filter((f) => f.startsWith('in_')).map((f) => pictureFor(layout, f).text);
}));

describe('Property 3: echoes fit or overflow', () => {
  it('finds the echo pictures', () => expect(new Set(echoFields)).toEqual(new Set(['##.#', '####.#', '#.####', '######', '###.##'])));
  it('fits with the field decimals, or starts with %', () => {
    fc.assert(fc.property(typedValue, fc.constantFrom(...new Set(echoFields)), (text, picture) => {
      const x = readSingle(text);
      fc.pre(x !== 0 && Number.isFinite(x));
      const f = parseFormat(picture);
      const rounded = Number(Math.abs(x).toFixed(f.dec));
      // A negative value that rounds below 1 has not been typed (whether QuickBASIC drops the
      // leading 0 for it is unobserved), so the property leaves it out.
      fc.pre(!(x < 0 && rounded < 1));
      const room = x < 0 ? f.int - 1 : f.int;
      const fits = rounded < 10 ** room;
      const echo = printUsing(x, picture);
      if (fits) {
        expect(echo).toHaveLength(formatWidth(f));
        expect(echo).not.toContain('%');
        const decimals = f.point ? new RegExp(`^ *-?\\d*\\.\\d{${f.dec}}$`) : /^ *-?\d+$/;
        expect(echo).toMatch(decimals);
      } else {
        expect(echo.startsWith('%')).toBe(true);
      }
    }), { numRuns: 2000 });
  });
});
