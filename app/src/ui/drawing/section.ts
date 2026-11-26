// The drawing model of a result's cross section (quickened-app design: The cross-section drawing;
// criteria 2.7, 2.8, 6.8, 1.11). Built from the Job and the Result with the solver's own geometry,
// so the drawn water surface is the one the printed fields describe (Property 5). Coordinates are
// feet: station and elevation on the irregular section, offset and height on the regular shapes.
// Every value written on the drawing is a printed field's text; the scale is axis.ts's.
import type { Mode, Result, Shape } from '../../solver/index.ts';
import { FIXED_FIELDS, regularPrompts } from '../../solver/forms.ts';
import { enter, sectionKeys } from '../../solver/groundPoints.ts';
import { readSingle } from '../../solver/parse.ts';
import { flowAt } from '../../solver/geometry/irregular.ts';
import { wet } from '../../solver/geometry/prismatic.ts';
import { diameterFeet, wetCircle } from '../../solver/geometry/circle.ts';
import { screenLabel } from '../forms.ts';
import type { AppJob } from '../job.ts';
import { SHAPES } from '../views/picker.ts';

export interface Pt { x: number; y: number; }

export interface WaterSpan {
  from: number;
  to: number;
  /** Wet ground that does not hold the channel: low ground QUICK-2 counts as flowing (6.8). */
  cutOff: boolean;
  /**
   * The line is QUICK-2's assumption, not open water: a full pipe, whose top width QUICK-2 takes
   * as the diameter (circle-short-chord 2.6 (a)). Drawn dashed, like the vertical walls.
   */
  assumed: boolean;
  /** The water's outline: along the water line from `from` to `to`, then back along the ground. */
  outline: Pt[];
}

/** QUICK-2's vertical wall at an end of the section the water is above (2.8). */
export interface Wall { x: number; bottom: number; top: number; }

/** A printed field's text written on the drawing. */
export interface DrawingValue {
  field: string;
  text: string;
  /** "El. " for an elevation in the benchmark style; otherwise empty. */
  prefix: string;
  role: 'ws' | 'depth' | 'bank';
  at: Pt;
}

/** One of Quickened's labels; `at` null puts it under the drawing, with its haunting linked. */
export interface DrawingWords { text: string; at: Pt | null; haunting?: string; }

export interface DrawingModel {
  shape: Shape;
  /** The ground line, left to right (the pipe's wall, closed, on the circle). */
  ground: Pt[];
  circle: { cx: number; cy: number; r: number } | null;
  waterLevel: number;
  spans: WaterSpan[];
  walls: Wall[];
  /** The bank stations' ticks, irregular section only. */
  banks: number[];
  values: DrawingValue[];
  words: DrawingWords[];
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  /** Whether x is a station (irregular section), so the axis carries survey stationing. */
  stations: boolean;
  /** The text alternative: the shape, the water surface and each wet span (1.11). */
  alt: string;
}

export const DRAWING_WORDS = {
  cutOff: 'cut off, counted by QUICK-2',
  wall: "QUICK-2's vertical wall",
  fullPipe: "QUICK-2's assumption for a full pipe: top width taken as the diameter",
  circleCd: 'QUICK-2 prints Depth a little below the depth at which it computes Area and Top Wid. The water is drawn at that depth.',
} as const;

/** The printed field that labels the water depth on a regular shape. */
export function depthField(mode: Mode): string {
  return mode === 'channel_capacity' ? 'in_depth' : 'depth';
}

/** The drawn water surface's total width. */
export function waterWidth(m: DrawingModel): number {
  return m.spans.reduce((sum, s) => sum + (s.to - s.from), 0);
}

const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const countWords = (n: number) => COUNT_WORDS[n] ?? String(n);
const shapeName = (shape: Shape) => SHAPES.find((s) => s.shape === shape)?.name ?? shape;

function value(r: Result, field: string, role: DrawingValue['role'], at: Pt, prefix = ''): DrawingValue {
  return { field, text: (r.printed[field] ?? '').trim(), prefix, role, at };
}

function labelled(job: AppJob, r: Result, field: string): string {
  return `${screenLabel(job.mode, job.shape, field) ?? field} ${(r.printed[field] ?? '').trim()}`;
}

/** The drawing of a result, or null for any other outcome. */
export function sectionDrawing(job: AppJob, r: Result): DrawingModel | null {
  if (r.outcome !== 'result') return null;
  return job.shape === 'irregular' ? irregular(job, r) : regular(job, r);
}

function boundsOf(pts: readonly Pt[]): DrawingModel['bounds'] {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return { xMin: Math.min(...xs), xMax: Math.max(...xs), yMin: Math.min(...ys), yMax: Math.max(...ys) };
}

function regular(job: AppJob, r: Result): DrawingModel {
  const shape = job.shape;
  if (shape === 'irregular' || job.mode === 'step_backwater') throw new Error('not a regular pair');
  const v: Record<string, number> = { ...FIXED_FIELDS[shape] };
  for (const p of regularPrompts(job.mode, shape)) v[p] = readSingle(job.inputs[p] ?? '');
  const y = job.mode === 'channel_capacity' ? v.depth!
    : job.mode === 'critical_depth' && shape === 'circle' ? r.raw.search_depth! : r.raw.depth!;
  let ground: Pt[];
  let circle: DrawingModel['circle'] = null;
  let span: WaterSpan;
  let full = false;
  if (shape === 'circle') {
    const D = diameterFeet(v.diameter!);
    const rad = D / 2;
    circle = { cx: 0, cy: rad, r: rad };
    const half = wetCircle(D, y).topWidth / 2;
    const alpha = Math.acos(Math.max(-1, Math.min(1, (rad - y) / rad)));
    const arc: Pt[] = [];
    const steps = 32;
    for (let i = 0; i <= steps; i++) {
      const t = alpha - (2 * alpha * i) / steps;
      arc.push({ x: rad * Math.sin(t), y: rad - rad * Math.cos(t) });
    }
    ground = [];
    for (let i = 0; i <= 64; i++) {
      const t = (2 * Math.PI * i) / 64;
      ground.push({ x: rad * Math.sin(t), y: rad - rad * Math.cos(t) });
    }
    // At y = D Critical Depth takes the full pipe's section, as the solver does: the pipe is full
    // and the top width is the diameter.
    full = job.mode === 'critical_depth' && y === D;
    span = full
      ? { from: -rad, to: rad, cutOff: false, assumed: true, outline: ground }
      : { from: -half, to: half, cutOff: false, assumed: false, outline: [{ x: -half, y }, { x: half, y }, ...arc] };
  } else {
    const prism = { z1: v.left_slope!, z2: v.right_slope!, b: v.bottom_width! };
    const top = Math.abs(y) * 1.3 || 1;
    ground = [{ x: -prism.z1 * top, y: top }, { x: 0, y: 0 }, { x: prism.b, y: 0 }, { x: prism.b + prism.z2 * top, y: top }];
    const from = -prism.z1 * y;
    const to = from + wet(prism, y).topWidth;
    span = { from, to, cutOff: false, assumed: false, outline: [{ x: from, y }, { x: to, y }, { x: prism.b, y: 0 }, { x: 0, y: 0 }] };
  }
  const field = depthField(job.mode);
  const bounds = boundsOf([...ground, ...span.outline]);
  const words: DrawingWords[] = [];
  if (full) words.push({ text: DRAWING_WORDS.fullPipe, at: { x: 0, y } });
  if (job.mode === 'critical_depth' && shape === 'circle') words.push({ text: DRAWING_WORDS.circleCd, at: null, haunting: 'H-004' });
  return {
    shape, ground, circle, waterLevel: y, spans: [span], walls: [], banks: [],
    values: [value(r, field, 'depth', { x: span.to, y })],
    words, bounds, stations: false,
    alt: `Cross section of the ${shapeName(shape)} at its entered dimensions, with the water surface at `
      + (full
        ? `${labelled(job, r, field)} with the pipe full; the line at the crown is ${DRAWING_WORDS.fullPipe}, ${labelled(job, r, 'top_width')}.`
        : `${labelled(job, r, field)} across one wet span, ${labelled(job, r, 'top_width')} wide.`),
  };
}

/** The ground elevation at station x, by straight lines between the points. */
function groundAt(pts: readonly Pt[], x: number): number {
  for (let i = 0; i + 1 < pts.length; i++) {
    const p = pts[i]!;
    const q = pts[i + 1]!;
    if (x >= p.x && x <= q.x) return q.x === p.x ? p.y : p.y + ((q.y - p.y) * (x - p.x)) / (q.x - p.x);
  }
  return x < pts[0]!.x ? pts[0]!.y : pts[pts.length - 1]!.y;
}

function irregular(job: AppJob, r: Result): DrawingModel {
  const kept = enter(sectionKeys(job.inputs)).points;
  const ground: Pt[] = kept.map((p) => ({ x: p.station, y: p.elevation }));
  const read = (k: string) => readSingle(job.inputs[k] ?? '');
  const bl = read('bank_left');
  const br = read('bank_right');
  const ws = r.raw.ws_elev!;
  const flow = flowAt({
    points: kept, bankLeft: bl, bankRight: br, nLeft: read('n_left'), nChannel: read('n_channel'), nRight: read('n_right'),
  }, ws);
  const spans: WaterSpan[] = flow.spans.map(([from, to]) => {
    const inside = ground.filter((p) => p.x > from && p.x < to).reverse();
    const bed = (x: number) => ({ x, y: Math.min(groundAt(ground, x), ws) });
    return {
      from, to, assumed: false,
      cutOff: !(to > bl && from < br) && !(from <= bl && to >= br),
      outline: [{ x: from, y: ws }, { x: to, y: ws }, bed(to), ...inside.map((p) => ({ x: p.x, y: Math.min(p.y, ws) })), bed(from)],
    };
  });
  const first = ground[0]!;
  const last = ground[ground.length - 1]!;
  const walls: Wall[] = [first, last].filter((p) => ws > p.y).map((p) => ({ x: p.x, bottom: p.y, top: ws }));
  const channel = spans.find((s) => !s.cutOff) ?? spans[0]!;
  const words: DrawingWords[] = [];
  const cut = spans.filter((s) => s.cutOff).sort((a, b) => (b.to - b.from) - (a.to - a.from))[0];
  if (cut) words.push({ text: DRAWING_WORDS.cutOff, at: { x: (cut.from + cut.to) / 2, y: ws } });
  if (walls.length) words.push({ text: DRAWING_WORDS.wall, at: { x: walls[0]!.x, y: (walls[0]!.bottom + walls[0]!.top) / 2 } });
  const bounds = boundsOf([...ground, { x: first.x, y: ws }]);
  const bankTop = (x: number) => Math.max(groundAt(ground, x), ws);
  const values = [
    value(r, 'ws_elev', 'ws', { x: (channel.from + channel.to) / 2, y: ws }, 'El. '),
    value(r, 'in_bank_left', 'bank', { x: bl, y: bankTop(bl) }),
    value(r, 'in_bank_right', 'bank', { x: br, y: bankTop(br) }),
  ];
  const spanName = (s: WaterSpan) => (!s.cutOff ? 'the span across the channel'
    : `low ground cut off from the channel on its ${s.to <= bl ? 'left' : 'right'}, which QUICK-2 counts as flowing`);
  const wallText = walls.length === 0 ? ''
    : ` QUICK-2's vertical wall stands at ${walls.length === 2 ? 'both ends' : walls[0]!.x === first.x ? 'the left end' : 'the right end'}, where the water is above the ground.`;
  return {
    shape: 'irregular', ground, circle: null, waterLevel: ws, spans, walls, banks: [bl, br], values, words, bounds, stations: true,
    alt: `Cross section of the ${shapeName('irregular')} from the ground points QUICK-2's editor took, with the bank stations at `
      + `${values[1]!.text} and ${values[2]!.text}, and the water surface at ${labelled(job, r, 'ws_elev')} in `
      + `${countWords(spans.length)} wet span${spans.length === 1 ? '' : 's'}: ${spans.map(spanName).join('; ')}.${wallText}`,
  };
}
