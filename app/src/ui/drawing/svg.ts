// Renders the drawing model as SVG on the cross-section paper (quickened-app design: The
// cross-section drawing; The signature element). Colours and type come from the stylesheet by
// class, so the drawing holds no colour of its own. The water-surface mark is one symbol,
// #ws-mark, used on the drawing at the water surface and before the main figure.
import { h, type Child, type VNode } from '../vnode.ts';
import { BOX, coord, frameFor } from './axis.ts';
import { bankTickTop, placeLabels } from './labels.ts';
import type { DrawingModel, Pt } from './section.ts';

const MARK = 24;
/** Room round a label's box on its paper ground, in SVG units. */
const GROUND_PAD = 2;

/** The one definition of the water-surface mark: an inverted triangle on the water line, two shorter lines under it. */
export function wsMarkSymbol(): VNode {
  return h('svg', { class: 'ws-sprite', 'aria-hidden': 'true', focusable: 'false' },
    h('symbol', { id: 'ws-mark', viewBox: '0 0 24 24' },
      h('path', { d: 'M4 2 H20 L12 12 Z', fill: 'currentColor' }),
      h('path', { d: 'M6 12 H18 M8 15.5 H16 M10 19 H14', stroke: 'currentColor', 'stroke-width': '1.5', fill: 'none' })));
}

/** The mark beside text, as before the main figure. */
export function wsMark(): VNode {
  return h('svg', { class: 'ws-mark', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, h('use', { href: '#ws-mark' }));
}

/** The drawing; `links: false` names a haunting as text, for the print. */
export function drawingView(m: DrawingModel, opts: { links: boolean } = { links: true }): VNode {
  const f = frameFor(m);
  const pts = (list: readonly Pt[]) => list.map((p) => `${coord(f.px(p.x))},${coord(f.py(p.y))}`).join(' ');
  const text = (cls: string, x: number, y: number, s: string, anchor = 'middle') =>
    h('text', { class: cls, x: coord(x), y: coord(y), 'text-anchor': anchor }, s);
  const bottom = BOX.height - BOX.bottom;
  const first = m.ground[0]!;
  const last = m.ground[m.ground.length - 1]!;
  const ground: Child[] = m.circle
    ? [h('circle', { class: 'pipe', cx: coord(f.px(m.circle.cx)), cy: coord(f.py(m.circle.cy)), r: coord(m.circle.r * (f.px(1) - f.px(0))) })]
    : [h('polygon', { class: 'ground-fill', points: `${pts(m.ground)} ${coord(f.px(last.x))},${coord(bottom)} ${coord(f.px(first.x))},${coord(bottom)}` })];
  const groundLine = m.circle ? null : h('polyline', { class: 'ground-line', points: pts(m.ground) });
  const main = m.spans.find((s) => !s.cutOff) ?? m.spans[0];
  const ws = f.py(m.waterLevel);
  const labels = placeLabels(m, f);
  return h('figure', { class: 'drawing' },
    h('svg', { class: 'section-drawing', viewBox: `0 0 ${BOX.width} ${BOX.height}`, role: 'img', 'aria-label': m.alt },
      h('defs', {},
        h('pattern', { id: 'paper-grid', width: '16', height: '16', patternUnits: 'userSpaceOnUse' },
          h('path', { class: 'grid-line', d: 'M16 0 V16 M0 16 H16' })),
        h('pattern', { id: 'ground-hatch', width: '8', height: '8', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
          h('path', { class: 'hatch-line', d: 'M0 0 V8' })),
        h('pattern', { id: 'cutoff-hatch', width: '6', height: '6', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
          h('rect', { class: 'cutoff-ground', width: '6', height: '6' }),
          h('path', { class: 'cutoff-line', d: 'M0 0 V6' }))),
      h('rect', { class: 'paper', width: String(BOX.width), height: String(BOX.height) }),
      m.spans.map((s) => h('polygon', { class: s.cutOff ? 'water cut-off' : 'water', points: pts(s.outline) })),
      ground,
      groundLine,
      m.spans.map((s) => h('line', { class: s.assumed ? 'ws-line assumed' : 'ws-line', x1: coord(f.px(s.from)), x2: coord(f.px(s.to)), y1: coord(ws), y2: coord(ws) })),
      m.walls.map((w) => h('line', { class: 'wall', x1: coord(f.px(w.x)), x2: coord(f.px(w.x)), y1: coord(f.py(w.bottom)), y2: coord(f.py(w.top)) })),
      m.banks.map((x) => {
        const top = bankTickTop(m, f, x);
        return h('line', { class: 'bank', x1: coord(f.px(x)), x2: coord(f.px(x)), y1: coord(top - 4), y2: coord(top - 16) });
      }),
      main ? h('use', { href: '#ws-mark', class: 'ws-mark-on', x: coord(f.px((main.from + main.to) / 2) - MARK / 2), y: coord(ws - MARK / 2), width: String(MARK), height: String(MARK) }) : null,
      f.ticks.map((t) => h('line', { class: 'tick', x1: coord(f.px(t.x)), x2: coord(f.px(t.x)), y1: coord(bottom), y2: coord(bottom + 6) })),
      // Each label on a ground of the paper colour, over every line, so no line crosses its letters (2.7).
      // The grounds all go first, so one label's ground never covers the letters of the next.
      labels.map((l) => h('rect', { class: 'label-ground', x: coord(l.box.x0 - GROUND_PAD), y: coord(l.box.y0 - GROUND_PAD),
        width: coord(l.box.x1 - l.box.x0 + 2 * GROUND_PAD), height: coord(l.box.y1 - l.box.y0 + 2 * GROUND_PAD) })),
      labels.map((l) => text(l.cls, l.x, l.y, l.text, l.anchor))),
    m.words.some((w) => !w.at)
      ? h('figcaption', {}, m.words.filter((w) => !w.at).map((w) => h('p', { class: 'note' }, w.text,
        w.haunting ? [' ', opts.links ? h('a', { href: '#/limits' }, `Haunting ${w.haunting} on the limits page`) : `Haunting ${w.haunting} on the limits page`, '.'] : null)))
      : null);
}
