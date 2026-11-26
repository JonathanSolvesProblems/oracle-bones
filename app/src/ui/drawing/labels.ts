// Where the drawing's texts go (quickened-app design: The cross-section drawing). Each text gets a
// box from its length at the drawing's type size, and is placed at the first of its positions that
// stays inside the drawing and overlaps no text placed before it: the scale and the station ticks
// first, then the printed values, then Quickened's words. The water-surface elevation (or the
// depth) sits at the right end of the water line, each bank station under its tick, and a full
// pipe's assumption above the line.
import { BOX, type Frame } from './axis.ts';
import { DRAWING_WORDS, type DrawingModel } from './section.ts';

export interface Box { x0: number; y0: number; x1: number; y1: number; }
export type Anchor = 'start' | 'middle' | 'end';

export interface PlacedLabel {
  /** The SVG class: `value ws-value`, `value bank-value`, `value depth-value`, `words` or `scale`. */
  cls: string;
  role: 'ws' | 'bank' | 'depth' | 'words' | 'scale';
  text: string;
  /** The anchor point: `x` per `anchor`, `y` the baseline. */
  x: number;
  y: number;
  anchor: Anchor;
  box: Box;
}

/** The drawing's type is 12 px (--text-xs); a character is taken as 0.6 em, IBM Plex Mono's advance, for both faces. */
const CHAR = 7.2;
const ASCENT = 12;
const DESCENT = 4;
/** The step between tried positions: one line of the drawing's type. */
const LINE = 16;
/** Room between a line end and the text beside it. */
const GAP = 6;
const MARK = 24;

export function overlaps(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

function boxOf(text: string, x: number, y: number, anchor: Anchor): Box {
  const w = text.length * CHAR;
  const x0 = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
  return { x0, y0: y - ASCENT, x1: x0 + w, y1: y + DESCENT };
}

const inside = (b: Box): boolean => b.x0 >= 0 && b.y0 >= 0 && b.x1 <= BOX.width && b.y1 <= BOX.height;

interface Spot { x: number; y: number; anchor: Anchor; }

/** A spot moved sideways, if it must be, to keep its box inside the drawing's width. */
function keptIn(text: string, s: Spot): Spot {
  const b = boxOf(text, s.x, s.y, s.anchor);
  const dx = b.x0 < 0 ? -b.x0 : b.x1 > BOX.width ? BOX.width - b.x1 : 0;
  return { ...s, x: s.x + dx };
}

export function placeLabels(m: DrawingModel, f: Frame): PlacedLabel[] {
  const placed: PlacedLabel[] = [];
  const obstacles: Box[] = [];
  const bottom = BOX.height - BOX.bottom;
  const fixed = (role: PlacedLabel['role'], cls: string, text: string, s: Spot): void => {
    placed.push({ cls, role, text, ...s, box: boxOf(text, s.x, s.y, s.anchor) });
  };
  /** The first spot, then each moved by whole lines in the directions given, that fits. */
  const put = (role: PlacedLabel['role'], cls: string, text: string, spots: Spot[], dirs: number[]): void => {
    const tries: Spot[] = [];
    for (let k = 0; k <= 12; k++) for (const s of spots) for (const d of k === 0 ? [0] : dirs) tries.push({ ...s, y: s.y + d * k * LINE });
    for (const t of tries) {
      const s = keptIn(text, t);
      const b = boxOf(text, s.x, s.y, s.anchor);
      if (inside(b) && !placed.some((p) => overlaps(p.box, b)) && !obstacles.some((o) => overlaps(o, b))) {
        placed.push({ cls, role, text, ...s, box: b });
        return;
      }
    }
    const s = keptIn(text, spots[0]!);
    placed.push({ cls, role, text, ...s, box: boxOf(text, s.x, s.y, s.anchor) });
  };

  fixed('scale', 'scale', f.scaleLabel, { x: BOX.left, y: BOX.height - 8, anchor: 'start' });
  for (const t of f.ticks) fixed('scale', 'scale', t.label, { x: f.px(t.x), y: bottom + 20, anchor: 'middle' });

  const ws = f.py(m.waterLevel);
  const main = m.spans.find((s) => !s.cutOff) ?? m.spans[0];
  if (main) {
    const cx = f.px((main.from + main.to) / 2);
    obstacles.push({ x0: cx - MARK / 2, y0: ws - MARK / 2, x1: cx + MARK / 2, y1: ws + MARK / 2 });
  }
  const right = m.spans.length ? f.px(Math.max(...m.spans.map((s) => s.to))) : f.px(m.bounds.xMax);

  for (const v of m.values) {
    const text = v.prefix + v.text;
    if (v.role === 'ws' || v.role === 'depth') {
      put(v.role, v.role === 'ws' ? 'value ws-value' : 'value depth-value', text,
        [{ x: right + GAP, y: ws + DESCENT, anchor: 'start' }, { x: right, y: ws - GAP, anchor: 'end' }], [-1, 1]);
    }
  }
  for (const v of m.values) {
    if (v.role !== 'bank') continue;
    const x = f.px(v.at.x);
    put('bank', 'value bank-value', v.prefix + v.text, [{ x, y: f.py(v.at.y) + ASCENT + GAP, anchor: 'middle' }], [1, -1]);
  }
  for (const w of m.words) {
    if (!w.at) continue;
    const x = f.px(w.at.x);
    const y = f.py(w.at.y);
    if (w.text === DRAWING_WORDS.fullPipe) {
      put('words', 'words', w.text, [{ x, y: ws - GAP - DESCENT, anchor: 'middle' }], [-1]);
    } else {
      put('words', 'words', w.text, [{ x, y: y + LINE, anchor: 'middle' }], [1, -1]);
    }
  }
  return placed;
}

/** The bank tick's top, above the ground or the water at the bank station. */
export function bankTickTop(m: DrawingModel, f: Frame, x: number): number {
  const v = m.values.find((y) => y.role === 'bank' && y.at.x === x);
  return f.py(v?.at.y ?? m.waterLevel);
}
