// The reach block (quickened-app design: The cross-section drawing, amended by task 17.2;
// charter laws 7 to 10). The section the user typed is the front face of a block extruded
// upstream in an oblique projection: the top surface shaded by slope, the cut face hatched, the
// water a level plane between its two edges and a body in front. A surveyed section is drawn in
// the band round its water and cut off above it with a break line (criterion 10.7). The high-water
// mark is painted on the block's end wall: a stripe at the water's level, the water-surface symbol
// and the printed figure on a plate, the wall washed below it (10.8). The banks and the cut-off
// water are labelled in one row above the block, each on a stake from its true station (10.9).
// The vertical scale is a staff gauge. A circle is a pipe through the same block.
//
// The block's depth is drawn, not computed, and the caption says so. Nothing is drawn that is not
// the section, the water, a printed value or the scale. Colours and type come from the stylesheet
// by class. The text is 16 units in a 440-unit-wide viewBox, which is 12.5 px on a 343 px phone.
import { h, type Child, type VNode } from '../vnode.ts';
import { coord, frameFor, gaugeFigure, niceAtLeast, scaleText, stationText, type DrawingBox, type Frame } from './axis.ts';
import { overlaps, type Anchor, type Box } from './labels.ts';
import { DRAWING_WORDS, type DrawingModel, type Pt } from './section.ts';
import { limitsNote } from '../views/hauntings.ts';

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
/** The room above the block for the row of labels, and below it for the stations, in px. */
const LABEL_ROOM = 26;
const FOOT_ROOM = 28;
/** The room the front face has in the drawing: the gauge to its left, the extrusion to its right. */
function boxFor(width: number, stations: boolean, bounds: DrawingModel['bounds']): DrawingBox {
  const { dx, dy } = depthFor(width);
  // The widest gauge figure: the whole feet, a sign, and a decimal point and digit in case the step is fine.
  const whole = String(Math.floor(Math.max(Math.abs(bounds.yMin), Math.abs(bounds.yMax)))).length;
  return { width, height: frameHeight(width), left: 4 + GAUGE_PLATE + (whole + 3) * CHAR + 6, right: dx + 6, top: -dy + LABEL_ROOM, bottom: stations ? FOOT_ROOM : 10 };
}
/** The gauge plate's width beyond its widest figure: the marks and the room between them and the figures. */
const GAUGE_PLATE = 22;

/**
 * The band drawn on a surveyed section (criterion 10.7): from a little below the lowest ground to a
 * few feet of dry bank above the water, so the flood fills the drawing; ground that rises out of it
 * is cut off at the top with a break line. Above the water: the depth, between 2 and 6 ft; below
 * the lowest ground: a quarter of the rest, between 0.5 and 3 ft.
 */
export function bandOf(yMin: number, yMax: number, water: number): { bottom: number; top: number } {
  const depth = Math.max(water - yMin, 0);
  const above = Math.min(6, Math.max(2, depth));
  const top = Math.max(water, Math.min(yMax, water + above));
  const below = Math.min(3, Math.max(0.5, 0.25 * (top - yMin)));
  return { bottom: yMin - below, top };
}

/** The ground cut at `top`: the points, each segment's "is a cut" flag, and the runs cut off, in feet. */
export function clipGround(pts: readonly Pt[], top: number): { pts: Pt[]; cut: boolean[]; runs: [number, number][] } {
  const out: Pt[] = [];
  const runs: [number, number][] = [];
  let start: number | null = pts[0] && pts[0].y > top ? pts[0].x : null;
  pts.forEach((p, i) => {
    const q = pts[i - 1];
    if (q && (q.y > top) !== (p.y > top)) {
      const x = q.x + ((top - q.y) * (p.x - q.x)) / (p.y - q.y);
      out.push({ x, y: top });
      if (p.y > top) start = x;
      else { runs.push([start!, x]); start = null; }
    }
    out.push({ x: p.x, y: Math.min(p.y, top) });
  });
  if (start !== null) runs.push([start, pts[pts.length - 1]!.x]);
  const cut = out.slice(1).map((b, i) => {
    const a = out[i]!;
    return a.y === top && b.y === top && runs.some(([r0, r1]) => a.x >= r0 - 1e-9 && b.x <= r1 + 1e-9);
  });
  return { pts: out, cut, runs };
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

/**
 * The high-water mark, painted on the end wall (criterion 10.8): a stripe across the wall at the
 * water's level, the water-surface symbol at its front end, the printed figure upright in ink
 * inside the wall, and the wall below the stripe washed in the water's colour.
 */
export interface HighWaterMark {
  stripe: [Pt, Pt];
  symbol: Pt[];
  text: string;
  /** The figure's size in px, and its baseline's start. */
  size: number;
  x: number;
  y: number;
  box: Box;
  wash: Pt[];
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
  /** The solid's ground line, cut at the band's top on a surveyed section: the section, or a flat top for a pipe. */
  ground: Pt[];
  /** The same in feet, for the slope of each strip of the top surface. */
  groundFeet: Pt[];
  /** For each segment of the ground line, whether it is the cut at the band's top rather than ground. */
  cut: boolean[];
  /** The runs of the front face cut off at the band's top, in px: each gets a break line. */
  breaks: { x0: number; x1: number; y: number }[];
  labels: BlockLabel[];
  gauge: { x: number; width: number; top: number; bottom: number; unit: number; step: number; decimals: number;
    /** Where the figures end (they stand left of the marks) and where the marks begin. */
    figuresRight: number; marksLeft: number;
    marks: { v: number; y: number; major: boolean }[] };
  mark: HighWaterMark | null;
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

const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));

interface Solid { ground: Pt[]; cut: boolean[]; runs: [number, number][]; bounds: DrawingModel['bounds']; }

/**
 * The solid to draw: a surveyed section in the band round its water, cut at the top where the
 * ground rises out of it; a regular shape with its base lowered; or a pipe in a block of cover.
 */
function solidOf(m: DrawingModel): Solid {
  const b = m.bounds;
  if (m.circle) {
    const d = m.circle.r * 2;
    const half = m.circle.r * 1.75;
    const bounds = { xMin: -half, xMax: half, yMin: -0.3 * d, yMax: 1.3 * d };
    return { ground: [{ x: -half, y: bounds.yMax }, { x: half, y: bounds.yMax }], cut: [false], runs: [], bounds };
  }
  if (m.stations) {
    const band = bandOf(b.yMin, b.yMax, m.waterLevel);
    const c = clipGround(m.ground, band.top);
    return { ground: c.pts, cut: c.cut, runs: c.runs, bounds: { ...b, yMin: band.bottom, yMax: band.top } };
  }
  const span = Math.max(b.yMax - b.yMin, 1e-6);
  return { ground: m.ground, cut: m.ground.slice(1).map(() => false), runs: [],
    bounds: { ...b, yMin: b.yMin - 0.15 * span, yMax: Math.max(b.yMax, m.waterLevel) } };
}

/** The frame a model is drawn in at `width`. */
function frameOf(m: DrawingModel, width: number): Frame {
  const bounds = solidOf(m).bounds;
  return frameFor({ ...m, bounds }, boxFor(width, !!m.stations, bounds), { fine: true });
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
  const f = frameOf(m, width);
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
  // The figures stand left of the marks, so the water's bar, drawn across the marks only, never crosses one.
  const gauge = { x: 4, width: GAUGE_PLATE + widest * CHAR, top: f.py(hi), bottom: yBase, unit, step, decimals, marks,
    figuresRight: 4 + 2 + widest * CHAR, marksLeft: 4 + GAUGE_PLATE + widest * CHAR - 15 };

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
  for (const g of marks.filter((x) => x.major)) fixed('gauge', 'scale gauge-figure', gaugeFigure(g.v, decimals), { x: gauge.figuresRight, y: g.y + 4, anchor: 'end' });
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

  // The bank stations and the cut-off water (criterion 10.9): each a stake from its true station on the front face
  // up to one row of labels above the block, the text on a canvas chip just above the stake's head. A bank's stake
  // stands on the ground line; the cut-off label's leader comes from the hatched pocket of water it names.
  const pins: { text: string; cls: string; role: BlockLabel['role']; foot: Pt }[] = [];
  m.values.filter((v) => v.role === 'bank').forEach((v, i) => {
    pins.push({ text: `${i === 0 ? BLOCK_WORDS.left : BLOCK_WORDS.right} ${v.text}`, cls: 'value bank-value', role: 'bank',
      foot: P(v.at.x, Math.min(v.at.y, solid.bounds.yMax)) });
  });
  for (const w of m.words) {
    if (w.at && w.text === DRAWING_WORDS.cutOff) pins.push({ text: BLOCK_WORDS.cutOff, cls: 'words', role: 'words', foot: P(w.at.x, w.at.y) });
    // QUICK-2's wall: its stake rises from the wall's top, where the water meets it.
    if (w.at && w.text === DRAWING_WORDS.wall) pins.push({ text: BLOCK_WORDS.wall, cls: 'words', role: 'words', foot: P(w.at.x, m.waterLevel) });
  }
  const blockTop = Math.min(...ground.map((p) => p.y + depth.dy), top + depth.dy, ...quad.map((p) => p.y), ...(extension ?? []).map((p) => p.y));
  // Each label takes a row (the lowest first) and a side of its stake; every combination is tried, and the one with
  // the fewest raised rows and centred labels wins among those where no label meets another or another's stake.
  const sorted = [...pins].sort((a, b) => a.foot.x - b.foot.x);
  // Over the stake's head (centred, or hanging a little to one side), then beside it, for a stake that shares its
  // station with another (a bank at QUICK-2's wall).
  const SIDES: { anchor: Anchor; dx: number }[] = [
    { anchor: 'middle', dx: 0 }, { anchor: 'start', dx: -3 }, { anchor: 'end', dx: 3 }, { anchor: 'start', dx: 4 }, { anchor: 'end', dx: -4 }];
  const choices = sorted.map((pin) => {
    const out: { label: BlockLabel; cost: number }[] = [];
    for (let k = 0; k < 3; k++) {
      SIDES.forEach(({ anchor, dx }, a) => {
        const s = { x: pin.foot.x + dx, y: blockTop - 8 - DESCENT - k * LINE, anchor };
        const b = boxOf(pin.text, s.x, s.y, s.anchor);
        const label: BlockLabel = { cls: pin.cls, role: pin.role, text: pin.text, ...s, box: b, stem: [pin.foot, { x: pin.foot.x, y: b.y1 + 2 }] };
        // Out of bounds is kept only as a last resort, so every label has somewhere to go.
        out.push({ label, cost: 10 * k + a + (b.x0 < 0 || b.x1 > width || keepOut.some((o) => overlaps(o, b)) ? 1000 : 0) });
      });
    }
    return out;
  });
  const clash = (p: BlockLabel, q: BlockLabel): boolean => overlaps(p.box, { x0: q.box.x0 - 4, y0: q.box.y0, x1: q.box.x1 + 4, y1: q.box.y1 })
    || hitsBox(p.stem![0], p.stem![1], q.box) || hitsBox(q.stem![0], q.stem![1], p.box);
  let best: { labels: BlockLabel[]; cost: number } | null = null;
  const search = (i: number, picked: BlockLabel[], cost: number): void => {
    if (best && cost >= best.cost) return;
    if (i === choices.length) { best = { labels: picked, cost }; return; }
    for (const c of choices[i]!) if (!picked.some((p) => clash(p, c.label))) search(i + 1, [...picked, c.label], cost + c.cost);
  };
  search(0, [], 0);
  labels.push(...((best as { labels: BlockLabel[] } | null)?.labels ?? choices.map((c) => c[0]!.label)));
  for (const w of m.words) {
    if (!w.at) continue;
    const at = P(w.at.x, w.at.y);
    if (w.text === DRAWING_WORDS.fullPipe) {
      put('words', 'words', BLOCK_WORDS.fullPipe, [{ x: at.x, y: ws - GAP - DESCENT, anchor: 'middle' }], [-1]);
    }
  }

  const level = m.values.find((v) => v.role === 'ws' || v.role === 'depth');
  const mark = level ? highWaterMark(level.text, { x1, ws, yBase, wallTop: Math.min(top, rEnd.y), depth, width }) : null;

  // The viewBox is fitted to what is drawn: the highest of the extrusion's back edge, the end wall, the gauge and
  // the row of labels down to the stations, with a few px of air; no band above or below.
  const highest = Math.min(top + depth.dy, ws + depth.dy, ...ground.map((p) => p.y + depth.dy), ...quad.map((p) => p.y), ...(extension ?? []).map((p) => p.y),
    gauge.top - 3, ...labels.map((l) => l.box.y0 - 3), ...labels.flatMap((l) => (l.stem ? [l.stem[1].y] : [])));
  const lowest = Math.max(yBase + 3, ...labels.map((l) => l.box.y1 + 3));
  const y = Math.floor(highest - 4);
  const view = { y, height: Math.ceil(lowest + 4) - y };

  const breaks = solid.runs.map(([a, b]) => ({ x0: f.px(a), x1: f.px(b), y: f.py(solid.bounds.yMax) }));
  return { f, width, depth, view, face: { x0, x1, yBase, top: f.py(solid.bounds.yMax) }, ground, groundFeet: solid.ground, cut: solid.cut, breaks,
    labels, gauge, mark, wall: { quad, extension }, lines, keepOut };
}

/** The figure's size on the wall: 18 px on a desktop, 14 on a phone, smaller only if the wall is too narrow for it. */
export const markSize = (width: number): number => (width >= 560 ? 18 : 14);
/** A figure's advance in Plex Sans Condensed, as a share of its size: an upper bound for digits and the point. */
const FIGURE_ADVANCE = 0.56;
/** The plate's margin round the figure, and the room kept between the plate and the wall's edges, in px. */
const PLATE = 3;
const WALL_PAD = 6;

/**
 * The painted mark on the end wall (criterion 10.8). The wall's top and bottom edges and the water's stripe all
 * rise to the right at the extrusion's slope. The figure's plate goes above the stripe where the wall has room
 * there, and below it otherwise.
 */
function highWaterMark(text: string, w: { x1: number; ws: number; yBase: number; wallTop: number; depth: { dx: number; dy: number }; width: number }): HighWaterMark {
  const { x1, ws, yBase, wallTop, depth } = w;
  const k = depth.dy / depth.dx;
  const size = Math.min(markSize(w.width), (depth.dx - 2 * WALL_PAD - 2 * PLATE) / (text.length * FIGURE_ADVANCE));
  const asc = 0.72 * size;
  const desc = 0.22 * size;
  const textW = text.length * FIGURE_ADVANCE * size;
  const at = (y0: number, x: number) => y0 + (x - x1) * k;
  const left = x1 + WALL_PAD + PLATE;
  const right = left + textW + PLATE;
  // Above: the plate's bottom clears the stripe at the plate's right end, its top clears the wall's top at its left.
  let y = at(ws, right) - WALL_PAD - PLATE - desc;
  if (y - asc - PLATE < at(wallTop, left - PLATE) + WALL_PAD) y = at(ws, left - PLATE) + WALL_PAD + PLATE + asc;
  return {
    stripe: [{ x: x1, y: ws }, { x: x1 + depth.dx, y: ws + depth.dy }],
    symbol: [{ x: x1 - 6, y: ws - 10 }, { x: x1 + 6, y: ws - 10 }, { x: x1, y: ws - 2 }],
    text, size, x: left, y,
    box: { x0: left - PLATE, y0: y - asc - PLATE, x1: right, y1: y + desc + PLATE },
    wash: [{ x: x1, y: ws }, { x: x1 + depth.dx, y: ws + depth.dy }, { x: x1 + depth.dx, y: yBase + depth.dy }, { x: x1, y: yBase }],
  };
}
/** The drawing's caption: the scale, that the depth is drawn, and Quickened's words in full. */
function caption(m: DrawingModel, f: Frame, links: boolean): VNode {
  const n = f.exaggeration;
  return h('figcaption', {},
    h('p', { class: 'note' }, `${scaleText(n)}: ${n === 1 ? 'drawn at one scale across and up' : `elevations are drawn ${n} times the horizontal scale`}. The section is drawn extended upstream; that length is drawn, not computed.`),
    m.words.map((w) => h('p', { class: 'note' }, w.text,
      w.haunting ? [' ', links ? h('a', { href: '#/limits' }, limitsNote(w.haunting)) : limitsNote(w.haunting), '.'] : null)));
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
    caption(m, frameOf(m, width), opts.links ?? true));
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

  // The top surface, strip by strip: lit where the ground faces up and left; where the ground was cut off at the
  // band's top, the cut itself, hatched like the front face.
  const strips: Child[] = [];
  const data = m.circle ? [] : L.groundFeet;
  const surface = m.circle ? [{ x: first.x, y: first.y }, { x: lastPt.x, y: lastPt.y }] : g;
  for (let i = 0; i + 1 < surface.length; i++) {
    const a = surface[i]!;
    const b = surface[i + 1]!;
    const quad = pts([a, b, back(b), back(a)]);
    if (L.cut[i]) {
      strips.push(h('polygon', { class: 'top-cut', points: quad, fill: `url(#${id}-soil)` }));
      continue;
    }
    const slope = m.circle ? 0 : (data[i + 1]!.y - data[i]!.y) / Math.max(data[i + 1]!.x - data[i]!.x, 1e-6);
    strips.push(h('polygon', { class: 'top-shade', points: quad }));
    const lit = coord(clamp01(0.5 + slope * 2.2));
    strips.push(h('polygon', { class: 'top-lit', points: quad, 'fill-opacity': lit, 'stroke-opacity': lit }));
  }
  // The ground line, in runs between the cuts; each cut gets a break line on the front face's edge.
  const runs: Pt[][] = [];
  g.forEach((p, i) => {
    if (i === 0 || L.cut[i - 1]) runs.push([p]);
    else runs[runs.length - 1]!.push(p);
  });
  const breakLines = L.breaks.map((r) => {
    const mid = (r.x0 + r.x1) / 2;
    const z = Math.min(6, (r.x1 - r.x0) / 4);
    return h('polyline', { class: 'break-line', points: pts([{ x: r.x0, y: r.y }, { x: mid - z, y: r.y }, { x: mid - z / 2, y: r.y - 2 * z },
      { x: mid + z / 2, y: r.y + 2 * z }, { x: mid + z, y: r.y }, { x: r.x1, y: r.y }]) });
  });
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
    : runs.filter((r) => r.length > 1).map((r) => h('polyline', { class: 'ground-line', points: pts(r) }));
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

  // The painted mark: the wash below the stripe, the stripe, the water-surface symbol, the figure on its plate. The
  // group carries the figure's size, which the text inherits.
  const hwm = mark ? h('g', { class: 'hwm', 'font-size': coord(mark.size) },
    h('polygon', { class: 'hwm-wash', points: pts(mark.wash) }),
    h('line', { class: 'hwm-stripe', x1: coord(mark.stripe[0].x), y1: coord(mark.stripe[0].y), x2: coord(mark.stripe[1].x), y2: coord(mark.stripe[1].y) }),
    h('polygon', { class: 'hwm-symbol', points: pts(mark.symbol) }),
    h('rect', { class: 'hwm-plate', x: coord(mark.box.x0), y: coord(mark.box.y0), width: coord(mark.box.x1 - mark.box.x0), height: coord(mark.box.y1 - mark.box.y0) }),
    h('text', { class: 'hwm-figure', x: coord(mark.x), y: coord(mark.y) }, mark.text)) : null;

  // The staff gauge: the figures at the left, the stem and its marks at the right; the water's bar across the marks.
  const stem = gauge.x + gauge.width - 4;
  const staff = h('g', { class: 'gauge' },
    h('rect', { class: 'gauge-plate', x: coord(gauge.x), y: coord(gauge.top), width: coord(gauge.width), height: coord(gauge.bottom - gauge.top) }),
    h('line', { class: 'gauge-stem', x1: coord(stem), x2: coord(stem), y1: coord(gauge.top), y2: coord(gauge.bottom) }),
    gauge.marks.map((k) => h('line', { class: k.major ? 'gauge-mark major' : 'gauge-mark', x1: coord(stem), x2: coord(stem - (k.major ? 11 : 6)), y1: coord(k.y), y2: coord(k.y) })),
    h('line', { class: 'gauge-water', x1: coord(gauge.marksLeft), x2: coord(gauge.x + gauge.width + 3), y1: coord(ws), y2: coord(ws) }));

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
      breakLines,
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
