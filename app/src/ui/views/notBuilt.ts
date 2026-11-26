// The not-built view (quickened-app criterion 7.3, Requirement 7). Quickened says it does not
// compute the pair yet, says what QUICK-2 asks for where that has been observed, or that it has
// not been observed, links the limits page, and shows no form that could be calculated.
import type { Mode, Shape } from '../../solver/index.ts';
import { h, type VNode } from '../vnode.ts';
import { MODES, SHAPES, shapeChoice } from './picker.ts';

export interface NotBuiltModel {
  heading: string;
  sentences: string[];
  /** What QUICK-2 asks for, in order, where it has been observed. */
  asks: { text: string; quick2: string | null }[];
  /** QUICK-2's own words quoted in `asks`, each from a capture (solver 11.1, 11.2). */
  quick2Texts: string[];
  limitsHref: string;
}

const LIMITS_HREF = '#/limits';

/** Step-Backwater, first cross section (solver 11.1, 11.2; observed: sb-irr-000001 to 000003). */
const STEP_BACKWATER_ASKS: NotBuiltModel['asks'] = [
  { text: 'A starting water surface, by one of two methods:', quick2: 'Starting Water Surface Elevation Method' },
  { text: 'a slope, for', quick2: 'NORMAL DEPTH (Slope-Area)' },
  { text: 'or an elevation, for', quick2: 'KNOWN WATER SURFACE ELEVATION' },
  { text: 'typed at one prompt:', quick2: 'Enter a Slope or an Elevation:' },
  { text: 'Then the ground points, with no shape asked, in an editor titled', quick2: '>> STEP - BACKWATER <<' },
  { text: 'Then the LEFT and RIGHT bank stations, the LEFT, CHANNEL and RIGHT n values, and the Discharge. QUICK-2 asks for no slope, reach length or loss coefficient on this section.', quick2: null },
];

function names(mode: Mode, shape: Shape): string {
  const m = MODES.find((x) => x.mode === mode)?.name ?? mode;
  return shapeChoice(mode) ? `${m} on the ${SHAPES.find((x) => x.shape === shape)?.name ?? shape}` : m;
}

export function notBuiltModel(mode: Mode, shape: Shape): NotBuiltModel {
  const pair = names(mode, shape);
  if (!shapeChoice(mode)) {
    return {
      heading: `${pair}: not built yet`,
      sentences: [
        `Quickened does not compute ${pair} yet.`,
        'What QUICK-2 asks for in this mode, on the first (downstream) cross section, as recorded:',
      ],
      asks: STEP_BACKWATER_ASKS,
      quick2Texts: STEP_BACKWATER_ASKS.flatMap((a) => (a.quick2 ? [a.quick2] : [])),
      limitsHref: LIMITS_HREF,
    };
  }
  return {
    heading: `${pair}: not built yet`,
    sentences: [
      `Quickened does not compute ${pair} yet.`,
      `What QUICK-2 asks for and prints for ${pair} has not been observed: no recorded case has run it.`,
    ],
    asks: [],
    quick2Texts: [],
    limitsHref: LIMITS_HREF,
  };
}

/** Said after the Step-Backwater list: only the first section is known. */
export const FIRST_SECTION_LIMIT = 'Only the first (downstream) cross section has been observed. Adding a second section needs F8 (New XSEC), which has not been recorded, so reach lengths, loss coefficients and the step between sections have not been observed.';

export function notBuiltView(m: NotBuiltModel): VNode {
  return h('section', { class: 'not-built-view' },
    h('h2', {}, m.heading),
    m.sentences.map((s) => h('p', {}, s)),
    m.asks.length ? h('ul', { class: 'asks' }, m.asks.map((a) => h('li', {},
      a.text, a.quick2 ? [' ', h('span', { class: 'quick2' }, `“${a.quick2}”`)] : null))) : null,
    m.asks.length ? h('p', {}, FIRST_SECTION_LIMIT) : null,
    h('p', {}, 'Every pair not built yet, and what is not known about QUICK-2, is on the ', h('a', { href: m.limitsHref }, 'limits page'), '.'),
  );
}
