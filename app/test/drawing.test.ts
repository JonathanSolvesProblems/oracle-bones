// Property 5: the drawing agrees with the print (quickened-app criteria 2.7, 2.8, 6.8, 1.11;
// design: The cross-section drawing). For every result golden and for generated jobs with outcome
// `result`, the drawn water surface's total width, stored in single precision and printed in the
// Top Width field's picture, equals the printed top_width. On the irregular section the drawing
// has more than one wet span exactly when the Result has cut_off_area_counted, and a wall exactly
// where extended_section applies. Every text on the drawing is a printed field's text, the scale,
// or one of Quickened's labels, and the drawing has a text alternative.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { Mode, Result, Shape } from '../src/solver/index.ts';
import { readSingle } from '../src/solver/parse.ts';
import { diameterFeet } from '../src/solver/geometry/circle.ts';
import { printed } from '../src/format/screen.ts';
import { screenOf } from '../src/ui/forms.ts';
import type { AppJob } from '../src/ui/job.ts';
import { classify, runJob } from '../src/ui/state.ts';
import { DRAWING_WORDS, depthField, sectionDrawing, waterWidth, type DrawingModel } from '../src/ui/drawing/section.ts';
import { frameFor, scaleText, stationText } from '../src/ui/drawing/axis.ts';
import { drawingView } from '../src/ui/drawing/svg.ts';
import { screenView } from '../src/ui/views/screen.ts';
import { SHAPES } from '../src/ui/views/picker.ts';
import { findAll, type Child } from '../src/ui/vnode.ts';
import { goldens } from './golden.ts';

// The result goldens the solver answers with a result (Step-Backwater's are not built).
const results = goldens().filter((g) => g.outcome === 'result'
  && runJob({ mode: g.mode as Mode, shape: g.shape as Shape, inputs: g.inputs, origin: 'typed' }).outcome === 'result');

/** Run a check on each golden and report every case that fails, not only the first. */
function eachGolden(list: typeof results, check: (job: AppJob) => void): void {
  const failed: string[] = [];
  for (const g of list) {
    try { check(jobOf(g.mode, g.shape, g.inputs)); } catch (e) { failed.push(`${g.id}: ${(e as Error).message.split('\n')[0]}`); }
  }
  expect(failed).toEqual([]);
}
const jobOf = (mode: string, shape: string, inputs: Record<string, string>): AppJob =>
  ({ mode: mode as Mode, shape: shape as Shape, inputs: { ...inputs }, origin: 'typed' });

function drawn(job: AppJob): { r: Result; m: DrawingModel } {
  const r = runJob(job);
  const m = sectionDrawing(job, r);
  if (!m) throw new Error(`no drawing for ${job.mode} ${job.shape}`);
  return { r, m };
}

/** The drawn water width printed in the Top Width field's picture, as the solver prints it. */
function printedWidth(job: AppJob, m: DrawingModel): string {
  const layout = screenOf(job.mode, job.shape);
  if (!layout) throw new Error('no layout');
  return printed(layout, { top_width: Math.fround(waterWidth(m)) }).top_width!;
}

function checkRegular(job: AppJob): void {
  const { r, m } = drawn(job);
  expect(printedWidth(job, m)).toBe(r.printed.top_width);
  expect(m.spans).toHaveLength(1);
  // The water is drawn at the depth at which Area and Top Wid were computed.
  const at = job.mode === 'channel_capacity' ? readSingle(job.inputs.depth!)
    : job.mode === 'critical_depth' && job.shape === 'circle' ? r.raw.search_depth! : r.raw.depth!;
  expect(m.waterLevel).toBe(at);
  const label = m.values.find((v) => v.role === 'depth')!;
  expect(label.field).toBe(depthField(job.mode));
  expect(label.text).toBe(r.printed[label.field]!.trim());
  // A circle Critical Depth result at y = D takes the full pipe, top width D: the pipe is drawn
  // full and the line at the crown is QUICK-2's assumption, labelled, not open water.
  const full = job.mode === 'critical_depth' && job.shape === 'circle'
    && r.raw.search_depth === diameterFeet(readSingle(job.inputs.diameter!));
  expect(m.spans[0]!.assumed).toBe(full);
  expect(m.words.some((w) => w.text === DRAWING_WORDS.fullPipe)).toBe(full);
  const notesH004 = m.words.some((w) => w.haunting === 'H-004');
  expect(notesH004).toBe(job.mode === 'critical_depth' && job.shape === 'circle');
}

function checkIrregular(job: AppJob): void {
  const { r, m } = drawn(job);
  expect(printedWidth(job, m)).toBe(r.printed.top_width);
  const codes = r.flags.map((f) => f.code);
  expect(m.spans.length > 1).toBe(codes.includes('cut_off_area_counted'));
  expect(m.waterLevel).toBe(r.raw.ws_elev);
  const bl = readSingle(job.inputs.bank_left!);
  const br = readSingle(job.inputs.bank_right!);
  for (const s of m.spans) expect(s.cutOff).toBe(!(s.to > bl && s.from < br) && !(s.from <= bl && s.to >= br));
  expect(m.words.some((w) => w.text === DRAWING_WORDS.cutOff)).toBe(m.spans.some((s) => s.cutOff));
  // A wall at each end the water is above, from the end's ground up to the water.
  expect(m.walls.length > 0).toBe(codes.includes('extended_section'));
  const first = m.ground[0]!;
  const last = m.ground[m.ground.length - 1]!;
  const expected = [first, last].filter((p) => m.waterLevel > p.y).map((p) => ({ x: p.x, bottom: p.y, top: m.waterLevel }));
  expect(m.walls).toEqual(expected);
  expect(m.words.some((w) => w.text === DRAWING_WORDS.wall)).toBe(m.walls.length > 0);
  // The values written: WS ELEV in the benchmark style, and the two bank stations.
  const ws = m.values.find((v) => v.role === 'ws')!;
  expect([ws.field, ws.prefix, ws.text]).toEqual(['ws_elev', 'El. ', r.printed.ws_elev!.trim()]);
  const banks = m.values.filter((v) => v.role === 'bank').map((v) => [v.field, v.text]);
  expect(banks).toEqual([['in_bank_left', r.printed.in_bank_left!.trim()], ['in_bank_right', r.printed.in_bank_right!.trim()]]);
}

const decimal = (lo: number, hi: number, d: number) => fc.integer({ min: lo, max: hi }).map((x) => (x / 10 ** d).toFixed(d));
const regularArb = fc.record({
  mode: fc.constantFrom<Mode>('normal_depth', 'critical_depth', 'channel_capacity'),
  shape: fc.constantFrom<Shape>('trapezoid', 'v_ditch', 'rectangle', 'circle'),
  left_slope: decimal(1, 999, 1),
  right_slope: decimal(1, 999, 1),
  bottom_width: decimal(1, 99999, 1),
  diameter: decimal(60, 99999, 1),
  n: decimal(100, 9999, 4),
  discharge: fc.integer({ min: 1, max: 999999 }).map(String),
  depth: decimal(1, 9999, 2),
  slope: decimal(1, 99999, 4),
});

const sectionArb = fc.record({
  gaps: fc.array(fc.integer({ min: 100, max: 5000 }), { minLength: 2, maxLength: 39 }),
  elevs: fc.array(fc.integer({ min: 1, max: 5000 }), { minLength: 40, maxLength: 40 }),
  banks: fc.tuple(fc.nat(), fc.nat()),
  n: fc.tuple(fc.integer({ min: 110, max: 5000 }), fc.integer({ min: 110, max: 5000 }), fc.integer({ min: 110, max: 5000 })),
  q: fc.integer({ min: 1, max: 50000 }),
  slope: fc.integer({ min: 1, max: 500 }),
});

function irregularInputs(a: typeof sectionArb extends fc.Arbitrary<infer T> ? T : never): Record<string, string> {
  const inputs: Record<string, string> = {};
  let x = 0;
  const count = a.gaps.length + 1;
  const key = (i: number) => String(i + 1).padStart(2, '0');
  for (let i = 0; i < count; i++) {
    inputs[`sta_${key(i)}`] = (x / 100).toFixed(2);
    inputs[`elev_${key(i)}`] = (a.elevs[i]! / 100).toFixed(2);
    if (i < a.gaps.length) x += a.gaps[i]!;
  }
  const i1 = a.banks[0] % count;
  const i2 = i1 + (a.banks[1] % (count - i1));
  inputs.bank_left = inputs[`sta_${key(i1)}`]!;
  inputs.bank_right = inputs[`sta_${key(i2)}`]!;
  inputs.n_left = (a.n[0] / 10000).toFixed(4);
  inputs.n_channel = (a.n[1] / 10000).toFixed(4);
  inputs.n_right = (a.n[2] / 10000).toFixed(4);
  inputs.discharge = String(a.q);
  inputs.slope = (a.slope / 10000).toFixed(4);
  return inputs;
}

describe('Property 5: the drawing agrees with the print, regular shapes', () => {
  const regular = results.filter((g) => g.shape !== 'irregular');

  it(`holds for each of the ${regular.length} regular result goldens`, () => {
    expect(regular.length).toBeGreaterThan(0);
    eachGolden(regular, checkRegular);
  });

  it('draws circle Critical Depth at raw.search_depth, where the printed Depth is lower (H-004)', () => {
    const g = regular.find((x) => x.mode === 'critical_depth' && x.shape === 'circle')!;
    const job = jobOf(g.mode, g.shape, g.inputs);
    const { r, m } = drawn(job);
    expect(m.waterLevel).toBe(r.raw.search_depth);
    expect(m.waterLevel).not.toBe(r.raw.depth);
  });

  it('draws a full-pipe result (cd-circ-000081) full, with a dashed, labelled line at the crown', () => {
    const g = regular.find((x) => x.id === 'cd-circ-000081')!;
    const { m } = drawn(jobOf(g.mode, g.shape, g.inputs));
    expect(m.spans[0]!.assumed).toBe(true);
    const lines = findAll(drawingView(m), (n) => n.tag === 'line' && String(n.attrs.class).includes('ws-line'));
    expect(lines.map((l) => l.attrs.class)).toEqual(['ws-line assumed']);
  });

  it('holds for generated regular jobs with outcome result', () => {
    fc.assert(fc.property(regularArb, ({ mode, shape, ...inputs }) => {
      const job = jobOf(mode, shape, inputs);
      fc.pre(runJob(job).outcome === 'result');
      checkRegular(job);
    }), { numRuns: 300 });
  });
});

describe('Property 5: the drawing agrees with the print, irregular section', () => {
  const irregular = results.filter((g) => g.shape === 'irregular');

  it(`holds for each of the ${irregular.length} irregular result goldens, cut-off and walls included`, () => {
    eachGolden(irregular, checkIrregular);
    const flagged = (code: string) => irregular.some((g) => runJob(jobOf(g.mode, g.shape, g.inputs)).flags.some((f) => f.code === code));
    expect(flagged('cut_off_area_counted')).toBe(true);
    expect(flagged('extended_section')).toBe(true);
  });

  it('holds for generated sections with outcome result', () => {
    fc.assert(fc.property(sectionArb, (a) => {
      const job = jobOf('normal_depth', 'irregular', irregularInputs(a));
      fc.pre(runJob(job).outcome === 'result');
      checkIrregular(job);
    }), { numRuns: 200 });
  });
});

/** Every text node under a node. */
function texts(node: Child): string[] {
  if (typeof node === 'string') return [node];
  return node.children.flatMap(texts);
}

describe('the scale and the texts on the drawing', () => {
  it('writes stations in survey stationing', () => {
    expect(stationText(179.49, 2)).toBe('1+79.49');
    expect(stationText(230.77, 2)).toBe('2+30.77');
    expect(stationText(150, 0)).toBe('1+50');
    expect(stationText(5, 0)).toBe('0+05');
    expect(stationText(0, 0)).toBe('0+00');
    expect(stationText(99.996, 2)).toBe('1+00.00');
    expect(stationText(-50, 0)).toBe('-0+50');
  });

  it('writes the vertical exaggeration as "Vertical scale ×N"', () => {
    expect(scaleText(10)).toBe('Vertical scale ×10');
    expect(scaleText(1)).toBe('Vertical scale ×1');
  });

  it('writes on every result golden\'s drawing only printed fields\' text, the scale and Quickened\'s labels, with a text alternative', () => {
    const words = new Set(Object.values(DRAWING_WORDS));
    for (const g of results) {
      const job = jobOf(g.mode, g.shape, g.inputs);
      const { r, m } = drawn(job);
      const frame = frameFor(m);
      expect(frame.scaleLabel, g.id).toMatch(/^Vertical scale ×\d+$/);
      for (const t of frame.ticks) expect(t.label, g.id).toMatch(/^-?\d+\+\d{2}$/);
      expect(frame.ticks.length > 0, g.id).toBe(g.shape === 'irregular');
      const allowed = new Set([frame.scaleLabel, ...frame.ticks.map((t) => t.label), ...words]);
      for (const v of m.values) {
        expect(v.text, g.id).toBe(r.printed[v.field]!.trim());
        allowed.add(v.prefix + v.text);
      }
      const view = drawingView(m);
      const svg = findAll(view, (n) => n.tag === 'svg')[0]!;
      for (const t of texts(svg).map((x) => x.trim()).filter((x) => x !== '')) expect(allowed.has(t), `${g.id}: ${t}`).toBe(true);
      expect(svg.attrs.role).toBe('img');
      expect(svg.attrs['aria-label']).toBe(m.alt);
      const water = m.values.find((v) => v.role === 'ws' || v.role === 'depth')!;
      expect(m.alt, g.id).toContain(water.text);
      expect(m.alt, g.id).toContain(SHAPES.find((s) => s.shape === g.shape)!.name);
    }
  });

  it('the results screen shows the drawing, with the water-surface mark on it and before the main figure', () => {
    const g = results.find((x) => x.id === 'nd-irr-000006')!;
    const job = jobOf(g.mode, g.shape, g.inputs);
    const state = classify(job, runJob(job));
    const node = screenView(job, state)!.node;
    const svgs = findAll(node, (n) => n.tag === 'svg' && n.attrs.class === 'section-drawing');
    expect(svgs).toHaveLength(1);
    const marks = (n: Child) => findAll(n, (x) => x.tag === 'use' && x.attrs.href === '#ws-mark');
    expect(marks(svgs[0]!)).toHaveLength(1);
    const figure = findAll(node, (n) => n.attrs.class === 'main-figure')[0]!;
    expect(marks(figure)).toHaveLength(1);
    expect(findAll(node, (n) => n.tag === 'symbol' && n.attrs.id === 'ws-mark')).toHaveLength(1);
  });
});
