// The reach block (quickened-app design: The cross-section drawing, amended by task 17.2;
// charter laws 7 to 10). The section the user typed is the front face of a block extruded
// upstream in an oblique projection: the top surface shaded by slope, the cut face hatched, the
// water a level plane between its two edges and a body in front. The high-water mark is painted
// on the block's end wall at the water's level, skewed to lie on it, the printed figure lettered
// above it. The vertical scale is a staff gauge. A circle is a pipe through the same block.
//
// The block's depth is drawn, not computed, and the caption says so. Nothing is drawn that is not
// the section, the water, a printed value or the scale. Colours and type come from the stylesheet
// by class. The text is 16 units in a 440-unit-wide viewBox, which is 12.5 px on a 343 px phone.
import { h, type Child, type VNode } from '../vnode.ts';
import { angleText, coord, frameFor, gaugeFigure, niceAtLeast, scaleText, stationText, type DrawingBox, type Frame } from './axis.ts';
import { overlaps, type Anchor, type Box } from './labels.ts';
import { DRAWING_WORDS, type DrawingModel, type Pt } from './section.ts';

export const BLOCK = { width: 440, height: 244 } as const;
/** The room the front face has in the viewBox: the gauge to its left, the extrusion to its right. */
export const BLOCK_BOX: DrawingBox = { width: BLOCK.width, height: BLOCK.height, left: 76, right: 132, top: 78, bottom: 34 };
/** The block's depth, drawn: one extrusion for every result, up and to the right. */
export const DEPTH = { dx: 100, dy: -52 } as const;
/** The type of the drawing, in viewBox units: --text-md. 16 units x 343/440 = 12.5 px on a phone. */
export const TEXT = 16;
const CHAR = 8.4;
const ASCENT = 14;
const DESCENT = 4;
const LINE = 18;
const GAP = 6;
/** The least space between two figures on the gauge, in viewBox units: a line of type and a little air. */
export const GAUGE_GAP = 20;

/** Quickened's short words on the drawing; the full sentences are in the caption. */
export const BLOCK_WORDS = { cutOff: 'cut off', wall: "QUICK-2's wall", fullPipe: 'assumed', left: 'Left', right: 'Right' } as const;

export interface BlockLabel {
  cls: string;
  role: 'gauge' | 'tick' | 'bank' | 'words';
  text: string;
  x: number;
  y: number;
  anchor: Anchor;
  box: Box;
  /** A bank label's stake, from the ground up to the label. */
  stem: [Pt, Pt] | null;
}

export interface BlockLayout {
  f: Frame;
  /** Front-face corners and baseline, in viewBox units. */
  face: { x0: number; x1: number; yBase: number };
  /** The solid's ground line: the section, or a flat top for a pipe. */
  ground: Pt[];
  labels: BlockLabel[];
  gauge: { x: number; width: number; top: number; bottom: number; unit: number; step: number; decimals: number;
    marks: { v: number; y: number; major: boolean }[] };
  /** The high-water mark on the end wall. */
  mark: { x: number; y: number; length: number; angle: number; text: string; level: number } | null;
  wall: { quad: Pt[]; extension: Pt[] | null };
  /** Lines a label must stay off, in viewBox units. */
  lines: [Pt, Pt][];
  /** Regions a label must stay out of. */
  keepOut: Box[];
}

interface Spot { x: number; y: number; anchor: Anchor; }

function boxOf(text: string, x: number, y: number, anchor: Anchor): Box {
  const w = text.length * CHAR;
  const x0 = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
  return { x0, y0: y - ASCENT, x1: x0 + w, y1: y + DESCENT };
}

/** Whether the segment passes through the box's interior (Liang-Barsky). */
export function hitsBox(a: Pt, b: Pt, box: Box): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const p = [-dx, dx, -dy, dy];
  const q = [a.x - box.x0, box.x1 - a.x, a.y - box.y0, box.y1 - a.y];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i]! <= 0) return false; continue; }
    const r = q[i]! / p[i]!;
    if (p[i]! < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return t1 - t0 > 1e-6;
}

const within = (b: Box): boolean => b.x0 >= 0 && b.y0 >= 0 && b.x1 <= BLOCK.width && b.y1 <= BLOCK.height;
const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));

/** The solid to draw: the section with its base lowered, or a pipe in a block of cover. */
function solidOf(m: DrawingModel): { ground: Pt[]; bounds: DrawingModel['bounds'] } {
  const b = m.bounds;
  if (m.circle) {
    const d = m.circle.r * 2;
    const half = m.circle.r * 1.75;
    const bounds = { xMin: -half, xMax: half, yMin: -0.3 * d, yMax: 1.3 * d };
    return { ground: [{ x: -half, y: bounds.yMax }, { x: half, y: bounds.yMax }], bounds };
  }
  const span = Math.max(b.yMax - b.yMin, 1e-6);
  return { ground: m.ground, bounds: { ...b, yMin: b.yMin - 0.15 * span, yMax: Math.max(b.yMax, m.waterLevel) } };
}

const NICE = [1, 2, 5];
function niceUp(minimum: number): number {
  for (let k = 0; k < 60; k++) {
    const n = NICE[k % 3]! * 10 ** (Math.floor(k / 3) - 4);
    if (n >= minimum) return n;
  }
  return 1e9;
}

function decimalsOf(step: number): number {
  let d = 0;
  while (d < 4 && Math.abs(step * 10 ** d - Math.round(step * 10 ** d)) > 1e-9) d++;
  return d;
}

export function blockLayout(m: DrawingModel): BlockLayout {
  const solid = solidOf(m);
  const f = frameFor({ ...m, bounds: solid.bounds }, BLOCK_BOX);
  const P = (x: number, y: number): Pt => ({ x: f.px(x), y: f.py(y) });
  const back = (p: Pt): Pt => ({ x: p.x + DEPTH.dx, y: p.y + DEPTH.dy });
  const x0 = f.px(solid.bounds.xMin);
  const x1 = f.px(solid.bounds.xMax);
  const yBase = f.py(solid.bounds.yMin);
  const ws = f.py(m.waterLevel);
  const last = solid.ground[solid.ground.length - 1]!;
  const rEnd = P(last.x, last.y);
  const top = f.py(Math.max(last.y, m.waterLevel));

  // The end wall, and QUICK-2's extension of it where the water is above the ground's end.
  const quad = [{ x: x1, y: rEnd.y }, back({ x: x1, y: rEnd.y }), back({ x: x1, y: yBase }), { x: x1, y: yBase }];
  const extension = top < rEnd.y - 0.01
    ? [{ x: x1, y: top }, back({ x: x1, y: top }), back({ x: x1, y: rEnd.y }), { x: x1, y: rEnd.y }] : null;

  // The staff gauge: a mark every unit, a figure every fifth unit, a unit chosen so the figures are 24 units apart.
  const perFoot = Math.abs(f.py(1) - f.py(0));
  const step = niceUp(GAUGE_GAP / perFoot);
  const unit = step / 5;
  const decimals = decimalsOf(step);
  const lo = solid.bounds.yMin;
  const hi = solid.bounds.yMax;
  const marks: BlockLayout['gauge']['marks'] = [];
  for (let k = Math.ceil(lo / unit - 1e-9); k * unit <= hi + 1e-9; k++) {
    const v = Math.round(k * unit * 10 ** (decimals + 1)) / 10 ** (decimals + 1);
    marks.push({ v, y: f.py(v), major: k % 5 === 0 });
  }
  const widest = Math.max(...marks.filter((x) => x.major).map((x) => gaugeFigure(x.v, decimals).length), 1);
  const gauge = { x: 4, width: 18 + widest * CHAR, top: f.py(hi), bottom: yBase, unit, step, decimals, marks };

  const lines: [Pt, Pt][] = [];
  const keepOut: Box[] = [
    { x0: gauge.x - 2, y0: gauge.top - 2, x1: gauge.x + gauge.width + 2, y1: gauge.bottom + 2 },
    { x0: x1, y0: Math.min(...[...quad, ...(extension ?? [])].map((p) => p.y)), x1: x1 + DEPTH.dx, y1: yBase },
  ];
  const ground = solid.ground.map((p) => P(p.x, p.y));
  for (let i = 0; i + 1 < ground.length; i++) lines.push([ground[i]!, ground[i + 1]!]);
  lines.push([{ x: x0, y: yBase }, { x: x1, y: yBase }], [{ x: x0, y: yBase }, ground[0]!], [{ x: x1, y: yBase }, ground[ground.length - 1]!]);
  for (const s of m.spans) lines.push([P(s.from, m.waterLevel), P(s.to, m.waterLevel)]);
  for (const w of m.walls) lines.push([P(w.x, w.bottom), P(w.x, w.top)]);
  if (m.circle) {
    const { cx, cy, r } = m.circle;
    for (let i = 0; i < 24; i++) {
      const a = (2 * Math.PI * i) / 24;
      const b = (2 * Math.PI * (i + 1)) / 24;
      lines.push([P(cx + r * Math.sin(a), cy - r * Math.cos(a)), P(cx + r * Math.sin(b), cy - r * Math.cos(b))]);
    }
  }
  const mainSpan = m.spans.find((s) => !s.cutOff) ?? m.spans[0];
  if (mainSpan) lines.push([P(mainSpan.to, m.waterLevel), { x: x1, y: ws }]);

  const labels: BlockLabel[] = [];
  const fixed = (role: BlockLabel['role'], cls: string, text: string, s: Spot): void => {
    labels.push({ cls, role, text, ...s, box: boxOf(text, s.x, s.y, s.anchor), stem: null });
  };
  for (const g of marks.filter((x) => x.major)) fixed('gauge', 'scale gauge-figure', gaugeFigure(g.v, decimals), { x: gauge.x + 18, y: g.y + 5, anchor: 'start' });
  if (m.stations) {
    const sx = f.px(1) - f.px(0);
    for (let k = 0; k < 60; k++) {
      const s = NICE[k % 3]! * 10 ** Math.floor(k / 3);
      if (s < niceAtLeast((solid.bounds.xMax - solid.bounds.xMin) / 12)) continue;
      const ticks: number[] = [];
      for (let t = Math.ceil(solid.bounds.xMin / s) * s; t <= solid.bounds.xMax; t += s) ticks.push(t);
      const longest = Math.max(...ticks.map((t) => stationText(t, 0).length), 1);
      if (s * sx >= longest * CHAR + 10) {
        for (const t of ticks) fixed('tick', 'scale', stationText(t, 0), { x: f.px(t), y: yBase + 22, anchor: 'middle' });
        break;
      }
    }
  }

  const free = (b: Box, own?: [Pt, Pt]): boolean => within(b)
    && !labels.some((l) => overlaps(l.box, b))
    && !keepOut.some((k) => overlaps(k, b))
    && !lines.some(([a, c]) => hitsBox(a, c, b))
    && !labels.some((l) => l.stem && hitsBox(l.stem[0], l.stem[1], b))
    && !(own && labels.some((l) => hitsBox(own[0], own[1], l.box)));
  const put = (role: BlockLabel['role'], cls: string, text: string, spots: Spot[], dirs: number[]): void => {
    for (let k = 0; k <= 14; k++) {
      for (const s of spots) {
        for (const d of k === 0 ? [0] : dirs) {
          const at = { ...s, y: s.y + d * k * LINE };
          const b = boxOf(text, at.x, at.y, at.anchor);
          if (free(b)) { labels.push({ cls, role, text, ...at, box: b, stem: null }); return; }
        }
      }
    }
    const s = spots[0]!;
    labels.push({ cls, role, text, ...s, box: boxOf(text, s.x, s.y, s.anchor), stem: null });
  };

  // The bank stations: a stake from the ground up, the station lettered at its head.
  const banks = m.values.filter((v) => v.role === 'bank');
  banks.forEach((v, i) => {
    const text = `${i === 0 ? BLOCK_WORDS.left : BLOCK_WORDS.right} ${v.text}`;
    // The stake stands on the top surface, over the bank station, partway back; the labels fan outward from the stakes.
    const at0 = P(v.at.x, v.at.y);
    const foot = { x: at0.x + DEPTH.dx * 0.55, y: at0.y + DEPTH.dy * 0.55 };
    const order = i === 0 ? (['end', 'middle', 'start'] as const) : (['start', 'middle', 'end'] as const);
    for (let k = 0; k <= 12; k++) {
      for (const anchor of order) {
        const head = { x: foot.x, y: foot.y - 10 - k * LINE };
        const at = { x: foot.x, y: head.y - 2 - DESCENT, anchor };
        const b = boxOf(text, at.x, at.y, anchor);
        const stem: [Pt, Pt] = [foot, head];
        if (free(b, stem) && !lines.some(([a, c]) => hitsBox(a, c, { x0: foot.x - 0.5, y0: head.y, x1: foot.x + 0.5, y1: foot.y - 1 }))) {
          labels.push({ cls: 'value bank-value', role: 'bank', text, ...at, box: b, stem });
          return;
        }
      }
    }
    labels.push({ cls: 'value bank-value', role: 'bank', text, x: foot.x, y: foot.y - 14, anchor: 'middle', box: boxOf(text, foot.x, foot.y - 14, 'middle'), stem: [foot, { x: foot.x, y: foot.y - 10 }] });
  });

  for (const w of m.words) {
    if (!w.at) continue;
    const at = P(w.at.x, w.at.y);
    if (w.text === DRAWING_WORDS.fullPipe) {
      put('words', 'words', BLOCK_WORDS.fullPipe, [{ x: at.x, y: ws - GAP - DESCENT, anchor: 'middle' }], [-1]);
    } else if (w.text === DRAWING_WORDS.wall) {
      const left = at.x <= (x0 + x1) / 2;
      put('words', 'words', BLOCK_WORDS.wall, [{ x: at.x + (left ? GAP : -GAP), y: at.y + DESCENT, anchor: left ? 'start' : 'end' }], [1, -1]);
    } else {
      put('words', 'words', BLOCK_WORDS.cutOff, [{ x: at.x, y: at.y + LINE, anchor: 'middle' }], [1, -1]);
    }
  }

  const level = m.values.find((v) => v.role === 'ws' || v.role === 'depth');
  const mark = level ? {
    x: x1 + DEPTH.dx * 0.1, y: ws + DEPTH.dy * 0.1, length: DEPTH.dx * 0.8,
    angle: (Math.atan2(DEPTH.dy, DEPTH.dx) * 180) / Math.PI, text: level.text, level: ws,
  } : null;

  return { f, face: { x0, x1, yBase }, ground, labels, gauge, mark, wall: { quad, extension }, lines, keepOut };
}

/** The drawing's caption: the scale, that the depth is drawn, and Quickened's words in full. */
function caption(m: DrawingModel, f: Frame, links: boolean): VNode {
  const n = f.exaggeration;
  return h('figcaption', {},
    h('p', { class: 'note' }, `${scaleText(n)}: ${n === 1 ? 'drawn at one scale across and up' : `elevations are drawn ${n} times the horizontal scale`}. The block runs upstream; its depth is drawn, not computed.`),
    m.words.map((w) => h('p', { class: 'note' }, w.text,
      w.haunting ? [' ', links ? h('a', { href: '#/limits' }, `Haunting ${w.haunting} on the limits page`) : `Haunting ${w.haunting} on the limits page`, '.'] : null)));
}

/** The block's drawing: a `figure` with the SVG and its caption. `id` keeps two drawings on a page apart. */
export function blockView(m: DrawingModel, opts: { links?: boolean; id?: string } = {}): VNode {
  const id = opts.id ?? 'block';
  const L = blockLayout(m);
  const { f, face, gauge, mark, wall } = L;
  const P = (x: number, y: number): Pt => ({ x: f.px(x), y: f.py(y) });
  const back = (p: Pt): Pt => ({ x: p.x + DEPTH.dx, y: p.y + DEPTH.dy });
  const pts = (list: readonly Pt[]) => list.map((p) => `${coord(p.x)},${coord(p.y)}`).join(' ');
  const g = L.ground;
  const first = g[0]!;
  const lastPt = g[g.length - 1]!;
  const ws = f.py(m.waterLevel);
  const dir = m.circle ? [] : m.ground;

  // The top surface, strip by strip: lit where the ground faces up and left.
  const strips: Child[] = [];
  const data = m.circle ? [] : dir;
  const surface = m.circle ? [{ x: first.x, y: first.y }, { x: lastPt.x, y: lastPt.y }] : g;
  for (let i = 0; i + 1 < surface.length; i++) {
    const a = surface[i]!;
    const b = surface[i + 1]!;
    const slope = m.circle ? 0 : (data[i + 1]!.y - data[i]!.y) / Math.max(data[i + 1]!.x - data[i]!.x, 1e-6);
    const quad = pts([a, b, back(b), back(a)]);
    strips.push(h('polygon', { class: 'top-shade', points: quad }));
    const lit = coord(clamp01(0.5 + slope * 2.2));
    strips.push(h('polygon', { class: 'top-lit', points: quad, 'fill-opacity': lit, 'stroke-opacity': lit }));
  }
  const backEdge = h('polyline', { class: 'back-edge', points: pts(surface.map(back)) });

  const planes = m.spans.map((s) => {
    const a = P(s.from, m.waterLevel);
    const b = P(s.to, m.waterLevel);
    return h('polygon', { class: s.cutOff ? 'water-plane cut-off' : 'water-plane', points: pts([a, b, back(b), back(a)]),
      style: s.cutOff ? `fill:url(#${id}-cutoff)` : undefined, 'clip-path': m.circle ? `url(#${id}-bore)` : undefined });
  });
  const bodies = m.spans.map((s) => h('polygon', { class: s.cutOff ? 'water cut-off' : 'water', points: pts(s.outline.map((p) => P(p.x, p.y))),
    style: s.cutOff ? `fill:url(#${id}-cutoff)` : undefined }));

  const faceFill = m.circle
    ? h('path', { class: 'cut-face', 'fill-rule': 'evenodd', fill: `url(#${id}-soil)`,
      d: `M${coord(face.x0)},${coord(first.y)} L${coord(face.x1)},${coord(lastPt.y)} L${coord(face.x1)},${coord(face.yBase)} L${coord(face.x0)},${coord(face.yBase)} Z `
        + circlePath(P(m.circle.cx, m.circle.cy), f, m.circle.r) })
    : h('polygon', { class: 'cut-face', fill: `url(#${id}-soil)`, points: `${pts(g)} ${coord(face.x1)},${coord(face.yBase)} ${coord(face.x0)},${coord(face.yBase)}` });
  const pipe = m.circle ? (() => {
    const c = P(m.circle.cx, m.circle.cy);
    const r = m.circle.r * (f.px(1) - f.px(0));
    return [
      h('circle', { class: 'bore', cx: coord(c.x), cy: coord(c.y), r: coord(r) }),
      h('circle', { class: 'bore-far', cx: coord(c.x + DEPTH.dx), cy: coord(c.y + DEPTH.dy), r: coord(r), 'clip-path': `url(#${id}-bore)` }),
    ];
  })() : [];
  const groundLine = m.circle
    ? [h('polyline', { class: 'ground-line', points: pts([{ x: face.x0, y: first.y }, { x: face.x1, y: lastPt.y }]) })]
    : [h('polyline', { class: 'ground-line', points: pts(g) })];
  const outline = h('polyline', { class: 'block-edge', points: pts([{ x: face.x0, y: first.y }, { x: face.x0, y: face.yBase }, { x: face.x1, y: face.yBase }, { x: face.x1, y: lastPt.y }]) });
  const circleLine = m.circle ? (() => {
    const c = P(m.circle.cx, m.circle.cy);
    return h('circle', { class: 'pipe', cx: coord(c.x), cy: coord(c.y), r: coord(m.circle.r * (f.px(1) - f.px(0))) });
  })() : null;

  const mainSpan = m.spans.find((s) => !s.cutOff) ?? m.spans[0];
  const clip = m.circle ? (() => {
    const c = P(m.circle.cx, m.circle.cy);
    return h('clipPath', { id: `${id}-bore` }, h('circle', { cx: coord(c.x), cy: coord(c.y), r: coord(m.circle.r * (f.px(1) - f.px(0))) }));
  })() : null;

  const hwm = mark ? h('g', { class: 'hwm', transform: `translate(${coord(mark.x)} ${coord(mark.y)}) skewY(${angleText(mark.angle)})` },
    h('line', { class: 'hwm-line', x1: '0', y1: '0', x2: coord(mark.length), y2: '0' }),
    h('line', { class: 'hwm-line', x1: '0', y1: '-8', x2: '0', y2: '8' }),
    h('line', { class: 'hwm-line', x1: coord(mark.length), y1: '-8', x2: coord(mark.length), y2: '8' }),
    h('text', { class: 'hwm-figure', x: coord(mark.length / 2), y: '-11', 'text-anchor': 'middle' }, mark.text)) : null;

  const staff = h('g', { class: 'gauge' },
    h('rect', { class: 'gauge-plate', x: coord(gauge.x), y: coord(gauge.top), width: coord(gauge.width), height: coord(gauge.bottom - gauge.top) }),
    h('line', { class: 'gauge-stem', x1: coord(gauge.x + 4), x2: coord(gauge.x + 4), y1: coord(gauge.top), y2: coord(gauge.bottom) }),
    gauge.marks.map((k) => h('line', { class: k.major ? 'gauge-mark major' : 'gauge-mark', x1: coord(gauge.x + 4), x2: coord(gauge.x + (k.major ? 16 : 11)), y1: coord(k.y), y2: coord(k.y) })),
    h('line', { class: 'gauge-water', x1: coord(gauge.x - 3), x2: coord(gauge.x + gauge.width + 3), y1: coord(ws), y2: coord(ws) }));

  return h('figure', { class: 'drawing' },
    h('svg', { class: 'section-drawing reach-block', viewBox: `0 0 ${BLOCK.width} ${BLOCK.height}`, role: 'img', 'aria-label': m.alt },
      h('defs', {},
        h('pattern', { id: `${id}-soil`, width: '8', height: '8', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
          h('rect', { class: 'soil', width: '8', height: '8' }),
          h('path', { class: 'hatch-line', d: 'M0 0 V8' })),
        h('pattern', { id: `${id}-cutoff`, width: '6', height: '6', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
          h('rect', { class: 'cutoff-ground', width: '6', height: '6' }),
          h('path', { class: 'cutoff-line', d: 'M0 0 V6' })),
        clip),
      strips,
      backEdge,
      planes,
      h('polygon', { class: 'end-wall', points: pts(wall.quad) }),
      wall.extension ? h('polygon', { class: 'end-wall-extension', points: pts(wall.extension) }) : null,
      faceFill,
      pipe,
      bodies,
      groundLine,
      circleLine,
      outline,
      m.spans.map((s) => h('line', { class: s.assumed ? 'ws-line assumed' : 'ws-line', x1: coord(f.px(s.from)), x2: coord(f.px(s.to)), y1: coord(ws), y2: coord(ws) })),
      m.walls.map((w) => h('line', { class: 'wall', x1: coord(f.px(w.x)), x2: coord(f.px(w.x)), y1: coord(f.py(w.bottom)), y2: coord(f.py(w.top)) })),
      mainSpan && f.px(mainSpan.to) < face.x1 - 1 ? h('line', { class: 'level', x1: coord(f.px(mainSpan.to)), x2: coord(face.x1), y1: coord(ws), y2: coord(ws) }) : null,
      hwm,
      staff,
      f.ticks.length || m.stations ? L.labels.filter((l) => l.role === 'tick').map((l) => h('line', { class: 'tick', x1: coord(l.x), x2: coord(l.x), y1: coord(face.yBase), y2: coord(face.yBase + 6) })) : null,
      L.labels.filter((l) => l.stem).map((l) => h('line', { class: 'bank', x1: coord(l.stem![0].x), x2: coord(l.stem![1].x), y1: coord(l.stem![0].y), y2: coord(l.stem![1].y) })),
      L.labels.filter((l) => l.role !== 'gauge').map((l) => h('rect', { class: 'label-ground', x: coord(l.box.x0 - 2), y: coord(l.box.y0 - 2), width: coord(l.box.x1 - l.box.x0 + 4), height: coord(l.box.y1 - l.box.y0 + 4) })),
      L.labels.map((l) => h('text', { class: l.cls, x: coord(l.x), y: coord(l.y), 'text-anchor': l.anchor }, l.text))),
    caption(m, f, opts.links ?? true));
}

/** A circle as a path, to cut the pipe's opening out of the front face. */
function circlePath(c: Pt, f: Frame, r: number): string {
  const rr = r * (f.px(1) - f.px(0));
  return `M${coord(c.x - rr)},${coord(c.y)} a${coord(rr)},${coord(rr)} 0 1,0 ${coord(2 * rr)},0 a${coord(rr)},${coord(rr)} 0 1,0 ${coord(-2 * rr)},0 Z`;
}
