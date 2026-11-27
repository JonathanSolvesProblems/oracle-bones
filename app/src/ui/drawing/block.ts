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

/** The width the block is drawn at before its container has been measured. */
export const DEFAULT_WIDTH = 640;
/** The frame's height as a share of its width: taller on a phone, where the width is short. */
export const frameHeight = (width: number): number => Math.round(width * (width >= 560 ? 0.6 : 0.75));
/** The block's depth, drawn: one extrusion for every result, up and to the right, in a share of the width. */
export const depthFor = (width: number): { dx: number; dy: number } => ({ dx: Math.round(width * 0.2), dy: -Math.round(width * 0.12) });
/** The type of the drawing, in px: the viewBox is in CSS px, so every label is this size at any width. */
export const TEXT = 13;
const CHAR = 7.2;
const ASCENT = 11;
const DESCENT = 3;
const LINE = 16;
const GAP = 5;
/** The least space between two figures on the gauge, in px: a line of type and a little air. */
export const GAUGE_GAP = 15;
/** The gauge's figures are at most this many units apart wherever that many units are at least GAUGE_GAP px. */
export const GAUGE_STEP_MAX = 10;
/** The room above the front face for the bank labels, and below it for the stations, in px. */
const LABEL_ROOM = 26;
const FOOT_ROOM = 28;
/** The widest gauge figure the box keeps room for, in characters. */
const GAUGE_CHARS = 6;
/** The room the front face has in the drawing: the gauge to its left, the extrusion to its right. */
function boxFor(width: number, stations: boolean): DrawingBox {
  const { dx, dy } = depthFor(width);
  return { width, height: frameHeight(width), left: 4 + 18 + GAUGE_CHARS * CHAR + 6, right: dx + 6, top: -dy + LABEL_ROOM, bottom: stations ? FOOT_ROOM : 10 };
}

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
  /** The drawing's width in px, and the block's depth, drawn. */
  width: number;
  depth: { dx: number; dy: number };
  /** The viewBox: the full width, fitted in height to what is drawn. */
  view: { y: number; height: number };
  /** Front-face corners and baseline, in viewBox units. */
  face: { x0: number; x1: number; yBase: number; top: number };
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

/** Whether the box meets the polygon: a vertex inside the box, a box corner inside the polygon, or an edge through the box. */
function meetsPolygon(poly: readonly Pt[], b: Box): boolean {
  const inside = (p: Pt): boolean => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i]!;
      const d = poly[j]!;
      if ((a.y > p.y) !== (d.y > p.y) && p.x < ((d.x - a.x) * (p.y - a.y)) / (d.y - a.y) + a.x) c = !c;
    }
    return c;
  };
  if (poly.some((p) => p.x > b.x0 && p.x < b.x1 && p.y > b.y0 && p.y < b.y1)) return true;
  if ([{ x: b.x0, y: b.y0 }, { x: b.x1, y: b.y0 }, { x: b.x0, y: b.y1 }, { x: b.x1, y: b.y1 }].some(inside)) return true;
  return poly.some((p, i) => hitsBox(p, poly[(i + 1) % poly.length]!, b));
}
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

export function blockLayout(m: DrawingModel, width: number = DEFAULT_WIDTH): BlockLayout {
  const solid = solidOf(m);
  const depth = depthFor(width);
  const height = frameHeight(width);
  const f = frameFor({ ...m, bounds: solid.bounds }, boxFor(width, !!m.stations), { fine: true });
  const within = (b: Box): boolean => b.x0 >= 0 && b.y0 >= 0 && b.x1 <= width && b.y1 <= height;
  const P = (x: number, y: number): Pt => ({ x: f.px(x), y: f.py(y) });
  const back = (p: Pt): Pt => ({ x: p.x + depth.dx, y: p.y + depth.dy });
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

  // The staff gauge: a mark every unit, a figure every fifth unit, a unit chosen so the figures are as close as
  // GAUGE_GAP px allows (never wider than GAUGE_STEP_MAX where that many units fit the gap).
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
    { x0: x1, y0: Math.min(...[...quad, ...(extension ?? [])].map((p) => p.y)), x1: x1 + depth.dx, y1: yBase },
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
  for (const g of marks.filter((x) => x.major)) fixed('gauge', 'scale gauge-figure', gaugeFigure(g.v, decimals), { x: gauge.x + 18, y: g.y + 4, anchor: 'start' });
  if (m.stations) {
    const sx = f.px(1) - f.px(0);
    for (let k = 0; k < 60; k++) {
      const s = NICE[k % 3]! * 10 ** Math.floor(k / 3);
      if (s < niceAtLeast((solid.bounds.xMax - solid.bounds.xMin) / 12)) continue;
      const ticks: number[] = [];
      for (let t = Math.ceil(solid.bounds.xMin / s) * s; t <= solid.bounds.xMax; t += s) ticks.push(t);
      const longest = Math.max(...ticks.map((t) => stationText(t, 0).length), 1);
      if (s * sx >= longest * CHAR + 10) {
        for (const t of ticks) fixed('tick', 'scale', stationText(t, 0), { x: f.px(t), y: yBase + 19, anchor: 'middle' });
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

  // The bank stations: a small stake from the top surface up, the station lettered on a canvas chip just above its
  // head. The nearest spot that is clear of the far terrain wins; if none is near, the nearest free spot does.
  const terrain = ground.slice(0, -1).map((a, i) => [a, ground[i + 1]!, back(ground[i + 1]!), back(a)]);
  const banks = m.values.filter((v) => v.role === 'bank');
  banks.forEach((v, i) => {
    const text = `${i === 0 ? BLOCK_WORDS.left : BLOCK_WORDS.right} ${v.text}`;
    const at0 = P(v.at.x, v.at.y);
    const order = i === 0 ? (['end', 'middle', 'start'] as const) : (['start', 'end', 'middle'] as const);
    const attempt = (frac: number, k: number, anchor: Anchor, clear: boolean): boolean => {
      const foot = { x: at0.x + depth.dx * frac, y: at0.y + depth.dy * frac };
      const head = { x: foot.x, y: foot.y - 8 - k * LINE };
      const at = { x: foot.x, y: head.y - 2 - DESCENT, anchor };
      const b = boxOf(text, at.x, at.y, anchor);
      const stem: [Pt, Pt] = [foot, head];
      if (!free(b, stem) || lines.some(([a, c]) => hitsBox(a, c, { x0: foot.x - 0.5, y0: head.y, x1: foot.x + 0.5, y1: foot.y - 1 }))) return false;
      if (clear && terrain.some((poly) => meetsPolygon(poly, b))) return false;
      labels.push({ cls: 'value bank-value', role: 'bank', text, ...at, box: b, stem });
      return true;
    };
    for (const [clear, kMax, fracs] of [[true, 5, [0.5, 0.25, 0.75]], [false, 12, [0.55, 0.3, 0.8, 0.1]]] as const) {
      for (let k = 0; k <= kMax; k++) for (const anchor of order) for (const frac of fracs) if (attempt(frac, k, anchor, clear)) return;
    }
    const foot = { x: at0.x + depth.dx * 0.55, y: at0.y + depth.dy * 0.55 };
    labels.push({ cls: 'value bank-value', role: 'bank', text, x: foot.x, y: foot.y - 12, anchor: 'middle', box: boxOf(text, foot.x, foot.y - 12, 'middle'), stem: [foot, { x: foot.x, y: foot.y - 8 }] });
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
    x: x1 + depth.dx * 0.1, y: ws + depth.dy * 0.1, length: depth.dx * 0.8,
    angle: (Math.atan2(depth.dy, depth.dx) * 180) / Math.PI, text: level.text, level: ws,
  } : null;

  // The viewBox is fitted to what is drawn: the highest of the extrusion's back edge, the end wall, the gauge, the
  // chips and the high-water figure down to the stations, with a few px of air; no band above or below.
  const markTop = mark ? ws + depth.dy * 0.5 - Math.abs(depth.dy / depth.dx) * (mark.text.length * CHAR) / 2 - 9 - ASCENT : Infinity;
  const highest = Math.min(top + depth.dy, ws + depth.dy, ...ground.map((p) => p.y + depth.dy), ...quad.map((p) => p.y), ...(extension ?? []).map((p) => p.y),
    gauge.top - 3, markTop, ...labels.map((l) => l.box.y0 - 3), ...labels.flatMap((l) => (l.stem ? [l.stem[1].y] : [])));
  const lowest = Math.max(yBase + 3, ...labels.map((l) => l.box.y1 + 3));
  const y = Math.floor(highest - 4);
  const view = { y, height: Math.ceil(lowest + 4) - y };

  return { f, width, depth, view, face: { x0, x1, yBase, top: f.py(solid.bounds.yMax) }, ground, labels, gauge, mark, wall: { quad, extension }, lines, keepOut };
}
/** The drawing's caption: the scale, that the depth is drawn, and Quickened's words in full. */
function caption(m: DrawingModel, f: Frame, links: boolean): VNode {
  const n = f.exaggeration;
  return h('figcaption', {},
    h('p', { class: 'note' }, `${scaleText(n)}: ${n === 1 ? 'drawn at one scale across and up' : `elevations are drawn ${n} times the horizontal scale`}. The block runs upstream; its depth is drawn, not computed.`),
    m.words.map((w) => h('p', { class: 'note' }, w.text,
      w.haunting ? [' ', links ? h('a', { href: '#/limits' }, `Haunting ${w.haunting} on the limits page`) : `Haunting ${w.haunting} on the limits page`, '.'] : null)));
}

/** The models drawn, by id, so the page can draw one again at the width its container has. */
const drawn = new Map<string, DrawingModel>();

/**
 * The block's drawing: a `figure` with a host for the SVG and the caption. `id` keeps two drawings on a page apart.
 * The SVG is laid out in `width` px (the container's, once measured; the page redraws it by `redrawBlock`).
 */
export function blockView(m: DrawingModel, opts: { links?: boolean; id?: string; width?: number } = {}): VNode {
  const id = opts.id ?? 'block';
  const width = opts.width ?? DEFAULT_WIDTH;
  drawn.set(id, m);
  return h('figure', { class: 'drawing' },
    h('div', { class: 'block-host', 'data-block': id, 'data-width': String(width) }, blockSvg(m, id, width)),
    caption(m, frameFor({ ...m, bounds: solidOf(m).bounds }, boxFor(width, !!m.stations), { fine: true }), opts.links ?? true));
}

/** The SVG of the drawing `id` at `width` px, or null if no such drawing was made. */
export function redrawBlock(id: string, width: number): VNode | null {
  const m = drawn.get(id);
  return m ? blockSvg(m, id, width) : null;
}

/** The reach block's SVG in a viewBox `width` px wide, fitted in height to what is drawn. */
export function blockSvg(m: DrawingModel, id: string, width: number): VNode {
  const L = blockLayout(m, width);
  const DEPTH = L.depth;
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
    h('line', { class: 'hwm-line', x1: '0', y1: '-6', x2: '0', y2: '6' }),
    h('line', { class: 'hwm-line', x1: coord(mark.length), y1: '-6', x2: coord(mark.length), y2: '6' }),
    h('text', { class: 'hwm-figure', x: coord(mark.length / 2), y: '-9', 'text-anchor': 'middle' }, mark.text)) : null;

  const staff = h('g', { class: 'gauge' },
    h('rect', { class: 'gauge-plate', x: coord(gauge.x), y: coord(gauge.top), width: coord(gauge.width), height: coord(gauge.bottom - gauge.top) }),
    h('line', { class: 'gauge-stem', x1: coord(gauge.x + 4), x2: coord(gauge.x + 4), y1: coord(gauge.top), y2: coord(gauge.bottom) }),
    gauge.marks.map((k) => h('line', { class: k.major ? 'gauge-mark major' : 'gauge-mark', x1: coord(gauge.x + 4), x2: coord(gauge.x + (k.major ? 15 : 10)), y1: coord(k.y), y2: coord(k.y) })),
    h('line', { class: 'gauge-water', x1: coord(gauge.x - 3), x2: coord(gauge.x + gauge.width + 3), y1: coord(ws), y2: coord(ws) }));

  return h('svg', { class: 'section-drawing reach-block', viewBox: `0 ${L.view.y} ${width} ${L.view.height}`, 'font-size': String(TEXT), role: 'img', 'aria-label': m.alt },
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
      L.labels.map((l) => h('text', { class: l.cls, x: coord(l.x), y: coord(l.y), 'text-anchor': l.anchor }, l.text)));
}

/** A circle as a path, to cut the pipe's opening out of the front face. */
function circlePath(c: Pt, f: Frame, r: number): string {
  const rr = r * (f.px(1) - f.px(0));
  return `M${coord(c.x - rr)},${coord(c.y)} a${coord(rr)},${coord(rr)} 0 1,0 ${coord(2 * rr)},0 a${coord(rr)},${coord(rr)} 0 1,0 ${coord(-2 * rr)},0 Z`;
}
