// A worked example's thumbnail (criterion 10.11): the front face of its section in the band round
// its water, cut off above it, with the water in it; drawn from the same model and the same band
// as the result's drawing, small enough to sit in the example's button. Nothing is lettered on it.
import { h, type VNode } from '../vnode.ts';
import { coord } from './axis.ts';
import { bandOf, clipGround } from './block.ts';
import type { DrawingModel, Pt } from './section.ts';

export const THUMB = { width: 96, height: 40 } as const;

export function thumbSvg(m: DrawingModel): VNode {
  const b = m.bounds;
  const band = bandOf(b.yMin, b.yMax, m.waterLevel);
  const ground = clipGround(m.ground, band.top).pts;
  const sx = (THUMB.width - 2) / Math.max(b.xMax - b.xMin, 1e-6);
  const sy = (THUMB.height - 2) / Math.max(band.top - band.bottom, 1e-6);
  const P = (p: Pt): string => `${coord(1 + (p.x - b.xMin) * sx)},${coord(1 + (band.top - p.y) * sy)}`;
  const base = [{ x: b.xMax, y: band.bottom }, { x: b.xMin, y: band.bottom }];
  return h('svg', { class: 'thumb', viewBox: `0 0 ${THUMB.width} ${THUMB.height}`, 'aria-hidden': 'true', focusable: 'false' },
    h('polygon', { class: 'thumb-ground', points: [...ground, ...base].map(P).join(' ') }),
    m.spans.map((s) => h('polygon', { class: s.cutOff ? 'thumb-water cut-off' : 'thumb-water', points: s.outline.map(P).join(' ') })),
    h('polyline', { class: 'thumb-line', points: ground.map(P).join(' ') }));
}
