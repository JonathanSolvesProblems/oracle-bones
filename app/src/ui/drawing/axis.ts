// Quickened's scale for the drawing (quickened-app design: The cross-section drawing, Scale). The
// only number formatting in ui/: survey stationing on the axis, the vertical exaggeration, and the
// SVG coordinates. None of it is a QUICK-2 value, and the drawing labels it as the scale.
import type { DrawingModel } from './section.ts';

/** The drawing's box in SVG units, 2:1, and the room kept round the section for labels. */
export const BOX = { width: 640, height: 320, left: 24, right: 24, top: 48, bottom: 56 } as const;

/** A drawing's box in SVG units and the room kept round the section. */
export interface DrawingBox { width: number; height: number; left: number; right: number; top: number; bottom: number; }

/** Survey stationing: 179.49 ft is 1+79.49, 150 ft at no decimals is 1+50. */
export function stationText(ft: number, decimals: number): string {
  const scale = 10 ** decimals;
  const total = Math.round(Math.abs(ft) * scale);
  const hundreds = Math.floor(total / (100 * scale));
  const rest = (total - hundreds * 100 * scale) / scale;
  const restText = rest.toFixed(decimals).padStart(decimals > 0 ? 3 + decimals : 2, '0');
  return `${ft < 0 && total > 0 ? '-' : ''}${hundreds}+${restText}`;
}

/** The vertical exaggeration, written as plotted cross sections are labelled. */
export function scaleText(n: number): string {
  return `Vertical scale ×${n}`;
}

/** A figure on the staff gauge: the elevation at a mark, to the decimals of the gauge's step. Quickened's scale, never a QUICK-2 value. */
export function gaugeFigure(v: number, decimals: number): string {
  return v.toFixed(decimals);
}

/** An angle in degrees, to a hundredth, for the skew of the high-water mark. */
export function angleText(degrees: number): string {
  return degrees.toFixed(2);
}

/** An SVG coordinate, to a tenth of a unit. */
export function coord(n: number): string {
  return n.toFixed(1);
}

export interface Frame {
  exaggeration: number;
  scaleLabel: string;
  /** Station ticks, irregular section only. */
  ticks: { x: number; label: string }[];
  px: (x: number) => number;
  py: (y: number) => number;
}

/** 1, 2, 5, 10, 20, 50, ...: the largest at or below `limit`, never below 1. */
function niceAtMost(limit: number): number {
  let n = 1;
  for (let k = 0; k < 40; k++) {
    const next = [2, 5, 10][k % 3]! * 10 ** Math.floor(k / 3);
    if (next > limit) break;
    n = next;
  }
  return n;
}

/** The scale that makes the section fill the box, with a round vertical exaggeration (ine: to two figures, so the section fills the box's height). */
/** The largest exaggeration of two significant figures at or below `r`, never below 1: at most 10% short of it. */
function niceFine(r: number): number {
  if (r < 1) return 1;
  const q = 10 ** Math.max(Math.floor(Math.log10(r)) - 1, -1);
  return Math.max(1, Math.round(Math.floor(r / q + 1e-9) * q * 10) / 10);
}
export function frameFor(m: DrawingModel, box: DrawingBox = BOX, opts: { fine?: boolean } = {}): Frame {
  const w = box.width - box.left - box.right;
  const h = box.height - box.top - box.bottom;
  const xSpan = Math.max(m.bounds.xMax - m.bounds.xMin, 1e-6);
  const ySpan = Math.max(m.bounds.yMax - m.bounds.yMin, 1e-6);
  const fitX = w / xSpan;
  const fitY = h / ySpan;
  const exaggeration = fitY >= fitX ? (opts.fine ? niceFine(fitY / fitX) : niceAtMost(fitY / fitX)) : 1;
  const sx = fitY >= fitX ? fitX : fitY;
  const sy = sx * exaggeration;
  const ox = box.left + (w - xSpan * sx) / 2;
  const oy = box.top + (h - ySpan * sy) / 2;
  const px = (x: number) => ox + (x - m.bounds.xMin) * sx;
  const py = (y: number) => oy + (m.bounds.yMax - y) * sy;
  const ticks: Frame['ticks'] = [];
  if (m.stations) {
    const step = Math.max(1, niceAtLeast(xSpan / 6));
    for (let t = Math.ceil(m.bounds.xMin / step) * step; t <= m.bounds.xMax; t += step) ticks.push({ x: t, label: stationText(t, 0) });
  }
  return { exaggeration, scaleLabel: scaleText(exaggeration), ticks, px, py };
}

/** 1, 2, 5, 10, ...: the smallest at or above `limit`. */
export function niceAtLeast(limit: number): number {
  for (let k = 0; k < 40; k++) {
    const n = [1, 2, 5][k % 3]! * 10 ** Math.floor(k / 3);
    if (n >= limit) return n;
  }
  return 10 ** 13;
}
