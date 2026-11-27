// Task 17.2 (criterion 10.2): the reach block. Every result golden is drawn as the front face of
// a block extruded upstream, with the water, the high-water mark on the end wall and a staff
// gauge; every value written on it is a printed field's text; no label is on a line.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Mode, Shape } from '../src/solver/index.ts';
import type { AppJob } from '../src/ui/job.ts';
import { runJob, classify } from '../src/ui/state.ts';
import { sectionDrawing, DRAWING_WORDS, type DrawingModel } from '../src/ui/drawing/section.ts';
import { BLOCK, BLOCK_WORDS, DEPTH, GAUGE_GAP, TEXT, blockLayout, blockView, hitsBox } from '../src/ui/drawing/block.ts';
import { overlaps } from '../src/ui/drawing/labels.ts';
import { screenView } from '../src/ui/views/screen.ts';
import { findAll, textOf, type Child, type VNode } from '../src/ui/vnode.ts';
import { goldens, ROOT } from './golden.ts';

const jobOf = (g: { mode: string; shape: string; inputs: Record<string, string> }): AppJob =>
  ({ mode: g.mode as Mode, shape: g.shape as Shape, inputs: { ...g.inputs }, origin: 'typed' });
const all = goldens().filter((g) => g.outcome === 'result' && runJob(jobOf(g)).outcome === 'result');
const drawnOf = (g: (typeof all)[number]): { job: AppJob; m: DrawingModel } => {
  const job = jobOf(g);
  return { job, m: sectionDrawing(job, runJob(job))! };
};
const byId = (id: string) => all.find((g) => g.id === id)!;
const MAIN = byId('nd-irr-000006');
const circle = all.find((g) => g.shape === 'circle' && g.id !== 'cd-circ-000081')!;
const trapezoid = all.find((g) => g.shape === 'trapezoid')!;
const classes = (n: Child) => findAll(n, () => true).map((x) => String(x.attrs.class ?? '').split(' ')).flat();
const count = (n: Child, cls: string) => findAll(n, (x) => String(x.attrs.class ?? '').split(' ').includes(cls)).length;
const svgOf = (v: VNode) => findAll(v, (n) => n.tag === 'svg')[0]!;
const tokensCss = readFileSync(join(ROOT, 'app', 'src', 'ui', 'styles', 'tokens.css'), 'utf-8');
const appCss = readFileSync(join(ROOT, 'app', 'src', 'ui', 'styles', 'app.css'), 'utf-8');

describe('the block is drawn: front face, top surface, end wall, water, gauge, mark', () => {
  for (const [what, g] of [['the main example (irregular)', MAIN], ['a circle', circle], ['a trapezoid', trapezoid]] as const) {
    it(`${what}: the parts are all there`, () => {
      const { m } = drawnOf(g);
      const v = blockView(m);
      const svg = svgOf(v);
      expect(svg.attrs.class).toBe('section-drawing reach-block');
      expect(svg.attrs.role).toBe('img');
      expect(svg.attrs['aria-label']).toBe(m.alt);
      for (const part of ['top-shade', 'top-lit', 'cut-face', 'end-wall', 'water', 'water-plane', 'hwm', 'gauge', 'gauge-plate', 'ws-line']) {
        expect(count(svg, part), `${g.id}: ${part}`).toBeGreaterThan(0);
      }
      expect(count(svg, 'water-plane'), 'a level plane for each span').toBe(m.spans.length);
      expect(count(svg, 'water'), 'a body in front for each span').toBe(m.spans.length);
      expect(classes(svg)).not.toContain('grid-line');
    });
  }

  it('the pipe is seen the same way: a bore through the block, in a circle outline', () => {
    const svg = svgOf(blockView(drawnOf(circle).m));
    for (const part of ['bore', 'bore-far', 'pipe', 'end-wall', 'hwm']) expect(count(svg, part), part).toBeGreaterThan(0);
  });

  it('the full pipe keeps its assumed line, dashed, as before', () => {
    const svg = svgOf(blockView(drawnOf(byId('cd-circ-000081')).m));
    expect(count(svg, 'assumed')).toBe(1);
  });

  it('QUICK-2\'s vertical walls stay, one line for each end the water is above', () => {
    const walled = all.filter((g) => g.shape === 'irregular').map(drawnOf).filter(({ m }) => m.walls.length > 0);
    expect(walled.length).toBeGreaterThan(0);
    for (const { m } of walled) expect(count(svgOf(blockView(m)), 'wall')).toBe(m.walls.length);
  });

  it('cut-off water has its own hatch, defined once under the drawing\'s id, in the plane and in front', () => {
    const cut = all.filter((g) => g.shape === 'irregular').map(drawnOf).filter(({ m }) => m.spans.some((s) => s.cutOff));
    expect(cut.length).toBeGreaterThan(0);
    const { m } = cut[0]!;
    const svg = svgOf(blockView(m, { id: 'a1' }));
    const n = m.spans.filter((s) => s.cutOff).length;
    expect(count(svg, 'cut-off')).toBe(2 * n);
    expect(findAll(svg, (x) => x.tag === 'pattern' && x.attrs.id === 'a1-cutoff')).toHaveLength(1);
    for (const x of findAll(svg, (x) => String(x.attrs.class ?? '').includes('cut-off'))) expect(x.attrs.style).toBe('fill:url(#a1-cutoff)');
  });

  it('two drawings on one page share no id', () => {
    const ids = (v: VNode) => findAll(v, (x) => typeof x.attrs.id === 'string').map((x) => x.attrs.id as string);
    const a = ids(blockView(drawnOf(circle).m, { id: 'one' }));
    const b = ids(blockView(drawnOf(circle).m, { id: 'two' }));
    expect(a.length).toBeGreaterThan(0);
    expect(a.filter((x) => b.includes(x))).toEqual([]);
  });
});

describe('the geometry: an oblique extrusion with the water standing level in it', () => {
  it('the end wall is the front face\'s right edge pushed back by the one extrusion, up and to the right', () => {
    for (const g of [MAIN, circle, trapezoid]) {
      const { wall, face } = blockLayout(drawnOf(g).m);
      const [a, b, c, d] = wall.quad as [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }];
      expect([a.x, d.x], g.id).toEqual([face.x1, face.x1]);
      expect(d.y, g.id).toBeCloseTo(face.yBase, 6);
      expect([b.x - a.x, b.y - a.y], g.id).toEqual([DEPTH.dx, DEPTH.dy]);
      expect([c.x - d.x, c.y - d.y], g.id).toEqual([DEPTH.dx, DEPTH.dy]);
      expect(DEPTH.dx).toBeGreaterThan(0);
      expect(DEPTH.dy).toBeLessThan(0);
    }
  });

  it('the water of each span is a plane at one level: front edge at the water line, back edge one extrusion behind', () => {
    for (const g of [MAIN, circle, trapezoid]) {
      const { m } = drawnOf(g);
      const L = blockLayout(m);
      const svg = svgOf(blockView(m));
      const planes = findAll(svg, (n) => String(n.attrs.class ?? '').startsWith('water-plane'));
      planes.forEach((p, i) => {
        const xy = String(p.attrs.points).split(' ').map((s) => s.split(',').map(Number) as [number, number]);
        const s = m.spans[i]!;
        const ws = L.f.py(m.waterLevel);
        expect(xy[0]![1], g.id).toBeCloseTo(ws, 0);
        expect(xy[1]![1], g.id).toBeCloseTo(ws, 0);
        expect(xy[0]![0], g.id).toBeCloseTo(L.f.px(s.from), 0);
        expect(xy[1]![0], g.id).toBeCloseTo(L.f.px(s.to), 0);
        expect(xy[2]![1] - xy[1]![1], g.id).toBeCloseTo(DEPTH.dy, 0);
        expect(xy[2]![0] - xy[1]![0], g.id).toBeCloseTo(DEPTH.dx, 0);
      });
    }
  });

  it('the high-water mark lies on the end wall at the water\'s level, skewed to the wall, the printed figure above it', () => {
    for (const g of all) {
      const { m } = drawnOf(g);
      const L = blockLayout(m);
      const mark = L.mark!;
      const level = m.values.find((v) => v.role === 'ws' || v.role === 'depth')!;
      expect(mark.text, g.id).toBe(level.text);
      // Quickened's own printed field (the drawing never types a value; a few circle cases print a hundredth otherwise than QUICK-2, a known miss).
      expect(mark.text, g.id).toBe(runJob(jobOf(g)).printed[level.field]!.trim());
      // On the wall: between its front edge and its back edge, at the height the water's level has there.
      const along = (mark.x - L.face.x1) / DEPTH.dx;
      expect(along, g.id).toBeGreaterThan(0);
      expect(along + mark.length / DEPTH.dx, g.id).toBeLessThan(1);
      expect(mark.y - along * DEPTH.dy, g.id).toBeCloseTo(L.f.py(m.waterLevel), 6);
      expect(mark.angle, g.id).toBeCloseTo((Math.atan2(DEPTH.dy, DEPTH.dx) * 180) / Math.PI, 6);
      const svg = svgOf(blockView(m));
      const g1 = findAll(svg, (n) => n.attrs.class === 'hwm')[0]!;
      expect(g1.attrs.transform, g.id).toMatch(/^translate\(.+\) skewY\(-?\d+\.\d\d\)$/);
      expect(findAll(g1, (n) => n.tag === 'line'), g.id).toHaveLength(3);
      expect(textOf(findAll(g1, (n) => n.tag === 'text')[0]!), g.id).toBe(level.text);
    }
  });

  it('the staff gauge: marks a unit apart, a figure every fifth unit, the water\'s line across it', () => {
    for (const g of all) {
      const { m } = drawnOf(g);
      const L = blockLayout(m);
      expect(L.gauge.step, g.id).toBeCloseTo(5 * L.gauge.unit, 9);
      const majors = L.gauge.marks.filter((k) => k.major);
      expect(majors.length, g.id).toBeGreaterThan(0);
      for (let i = 1; i < L.gauge.marks.length; i++) expect(L.gauge.marks[i]!.v - L.gauge.marks[i - 1]!.v, g.id).toBeCloseTo(L.gauge.unit, 6);
      for (let i = 1; i < majors.length; i++) expect(majors[i - 1]!.y - majors[i]!.y, g.id).toBeGreaterThanOrEqual(GAUGE_GAP - 0.1);
      const figs = L.labels.filter((l) => l.role === 'gauge').map((l) => l.text);
      expect(figs, g.id).toEqual(majors.map((k) => k.v.toFixed(L.gauge.decimals)));
      const water = findAll(svgOf(blockView(m)), (n) => n.attrs.class === 'gauge-water')[0]!;
      expect(Number(water.attrs.y1), g.id).toBeCloseTo(L.f.py(m.waterLevel), 0);
      expect(Number(water.attrs.x1), g.id).toBeLessThan(L.gauge.x);
      expect(Number(water.attrs.x2), g.id).toBeGreaterThan(L.gauge.x + L.gauge.width);
    }
  });
});

describe('every value written on the drawing is a printed field\'s text or the scale', () => {
  it('on every result golden', () => {
    const words = new Set<string>(Object.values(BLOCK_WORDS));
    const failed: string[] = [];
    for (const g of all) {
      const { m } = drawnOf(g);
      const L = blockLayout(m);
      const allowed = new Set<string>([...words]);
      for (const v of m.values) {
        expect(v.text, g.id).toBe(runJob(jobOf(g)).printed[v.field]!.trim());
        allowed.add(v.text);
        allowed.add(`${BLOCK_WORDS.left} ${v.text}`);
        allowed.add(`${BLOCK_WORDS.right} ${v.text}`);
      }
      for (const l of L.labels) if (l.role === 'gauge' || l.role === 'tick') allowed.add(l.text);
      for (const l of L.labels.filter((x) => x.role === 'tick')) expect(l.text, g.id).toMatch(/^-?\d+\+\d{2}$/);
      for (const t of findAll(svgOf(blockView(m)), (n) => n.tag === 'text').map((n) => textOf(n).trim())) {
        if (!allowed.has(t)) failed.push(`${g.id}: ${t}`);
      }
      expect(m.alt, g.id).toContain(m.values.find((v) => v.role === 'ws' || v.role === 'depth')!.text);
    }
    expect(failed).toEqual([]);
  });

  it('the caption says the depth is drawn, not computed, gives the scale, and keeps Quickened\'s words in full', () => {
    for (const g of [MAIN, circle, byId('cd-circ-000081')]) {
      const { m } = drawnOf(g);
      const cap = textOf(findAll(blockView(m), (n) => n.tag === 'figcaption')[0]!);
      expect(cap).toMatch(/Vertical scale ×\d+/);
      expect(cap).toContain('its depth is drawn, not computed');
      for (const w of m.words) expect(cap).toContain(w.text);
    }
    expect(Object.values(DRAWING_WORDS).length).toBeGreaterThan(0);
  });
});

describe('labels: never on a line, never over one another, and at least 12 px on a 375 px screen', () => {
  it('on every result golden, each label box is inside the drawing, clear of the others and of every line and region it must avoid', () => {
    const failed: string[] = [];
    for (const g of all) {
      const L = blockLayout(drawnOf(g).m);
      L.labels.forEach((a, i) => {
        const b = a.box;
        if (b.x0 < 0 || b.y0 < 0 || b.x1 > BLOCK.width || b.y1 > BLOCK.height) failed.push(`${g.id}: "${a.text}" leaves the drawing`);
        L.labels.slice(i + 1).forEach((o) => { if (overlaps(b, o.box)) failed.push(`${g.id}: "${a.text}" overlaps "${o.text}"`); });
        if (a.role === 'gauge' || a.role === 'tick') return;
        for (const k of L.keepOut) if (overlaps(b, k)) failed.push(`${g.id}: "${a.text}" is on the gauge or the end wall`);
        for (const [p, q] of L.lines) if (hitsBox(p, q, b)) failed.push(`${g.id}: "${a.text}" sits on a line`);
        if (a.stem) for (const o of L.labels) if (o !== a && hitsBox(a.stem[0], a.stem[1], o.box)) failed.push(`${g.id}: the stake of "${a.text}" crosses "${o.text}"`);
      });
    }
    expect(failed).toEqual([]);
  });

  it('a ground of the canvas colour is drawn under each label that sits on the drawing, after the lines and before the text', () => {
    for (const g of [MAIN, circle, trapezoid]) {
      const { m } = drawnOf(g);
      const svg = svgOf(blockView(m));
      const kids = svg.children as VNode[];
      const grounds = kids.filter((k) => k.attrs.class === 'label-ground');
      const texts = kids.filter((k) => k.tag === 'text');
      const L = blockLayout(m);
      expect(grounds.length, g.id).toBe(L.labels.filter((l) => l.role !== 'gauge').length);
      if (grounds.length === 0) continue;
      const lastLine = Math.max(...kids.map((k, i) => (k.tag === 'line' ? i : -1)));
      expect(kids.indexOf(grounds[0]!), g.id).toBeGreaterThan(lastLine);
      expect(kids.indexOf(texts[0]!), g.id).toBeGreaterThan(kids.indexOf(grounds[grounds.length - 1]!));
      for (const gr of grounds) {
        const x = Number(gr.attrs.x);
        const y = Number(gr.attrs.y);
        expect(L.labels.some((l) => l.box.x0 - 2 === x || Math.abs(l.box.x0 - 2 - x) < 0.06 && Math.abs(l.box.y0 - 2 - y) < 0.06), g.id).toBe(true);
      }
    }
    expect(appCss).toMatch(/\.section-drawing \.label-ground \{[^}]*fill: var\(--canvas\)/);
  });

  it('the type is --text-md in a 440-unit viewBox: 12 px or more on a 375 px phone (343 px of drawing)', () => {
    const md = Number(/--text-md:\s*(\d+)px/.exec(tokensCss)![1]);
    expect(TEXT).toBe(md);
    expect((TEXT * 343) / BLOCK.width).toBeGreaterThanOrEqual(12);
    expect(appCss).toMatch(/\.reach-block text \{[^}]*font: var\(--text-md\)/);
    const lg = Number(/--text-lg:\s*(\d+)px/.exec(tokensCss)![1]);
    expect((lg * 343) / BLOCK.width).toBeGreaterThanOrEqual(12);
    expect(appCss).toMatch(/text\.hwm-figure \{[^}]*font: var\(--text-lg\)/);
  });
});

describe('where the block is used', () => {
  it('the results screen draws the block, and only the block', () => {
    const job = jobOf(MAIN);
    const node = screenView(job, classify(job, runJob(job)))!.node;
    const svgs = findAll(node, (n) => n.tag === 'svg' && String(n.attrs.class ?? '').startsWith('section-drawing'));
    expect(svgs).toHaveLength(1);
    expect(svgs[0]!.attrs.class).toBe('section-drawing reach-block');
    expect(count(node, 'main-figure')).toBe(1);
    expect(findAll(node, (n) => n.tag === 'symbol' && n.attrs.id === 'ws-mark')).toHaveLength(1);
  });

  it('the print view keeps the 2D front face', () => {
    const print = readFileSync(join(ROOT, 'app', 'src', 'ui', 'views', 'print.ts'), 'utf-8');
    expect(print).toContain('drawingView');
    expect(print).not.toContain('blockView');
  });
});
