// The limits page (quickened-app design: The limits page; criteria 5.3, 5.4, 7.3). Built from
// `virtual:quickened/data`, so a change to results/hauntings.md, results/ledger.json or
// results/limits-plain.md shows at the next build with no edit here. Four parts: the hauntings as
// the file words them, the Limits paragraphs verbatim, the pairs not built yet, and the open
// questions, each with its plain sentences first and the ledger's wording under them.
import type { QuickenedData } from '../../../build/data.ts';
import type { Haunting, LimitEntry } from '../../../build/hauntings.ts';
import { isBuilt, type Mode, type Shape } from '../../solver/index.ts';
import { h, type VNode } from '../vnode.ts';
import { notBuiltModel } from './notBuilt.ts';
import { MODES, SHAPES, shapeChoice, STEP_BACKWATER_SHAPE } from './picker.ts';

export const HAUNTINGS_HEADING = 'Where QUICK-2 differs from exact hydraulics';
export const LIMITS_HEADING = 'Where Quickened gives no answer';
export const NOT_BUILT_HEADING = 'Not built yet';
export const NOT_OBSERVED_HEADING = 'Behaviours not observed yet';
export const LEDGER_WORDING = "The ledger's wording";

export interface LimitsModel {
  hauntings: Haunting[];
  limits: LimitEntry[];
  notBuilt: { mode: Mode; shape: Shape; heading: string; sentences: string[] }[];
  openQuestions: QuickenedData['openQuestions'];
}

type LimitsData = Pick<QuickenedData, 'hauntings' | 'limits' | 'openQuestions'>;

export function limitsModel(d: LimitsData): LimitsModel {
  const pairs = MODES.flatMap((m) => (shapeChoice(m.mode)
    ? SHAPES.map((s) => ({ mode: m.mode, shape: s.shape })) : [{ mode: m.mode, shape: STEP_BACKWATER_SHAPE }]));
  return {
    hauntings: d.hauntings,
    limits: d.limits,
    notBuilt: pairs.filter((p) => !isBuilt(p.mode, p.shape)).map((p) => {
      const m = notBuiltModel(p.mode, p.shape);
      return { ...p, heading: m.heading, sentences: m.sentences };
    }),
    openQuestions: d.openQuestions,
  };
}

function term(label: string, text: string): VNode[] {
  return [h('dt', {}, label), h('dd', {}, text)];
}

function hauntingView(x: Haunting): VNode {
  return h('article', { class: 'limit-entry', id: `haunting-${x.id}` },
    h('h3', {}, `${x.id}: ${x.title}`),
    h('dl', { class: 'limit-terms' },
      term(x.cases.length > 1 ? 'Cases' : 'Case', x.caseText),
      term('QUICK-2 printed', x.printed),
      term(`Exact answer${x.assumption ? ` ${x.assumption}` : ''}`, x.exactAnswer),
      term('Difference', x.difference)));
}

export function limitsView(m: LimitsModel): VNode {
  return h('section', { class: 'limits-page' },
    h('h1', {}, 'Limits'),
    h('section', { id: 'hauntings' }, h('h2', {}, HAUNTINGS_HEADING), m.hauntings.map(hauntingView)),
    h('section', { id: 'no-answer' }, h('h2', {}, LIMITS_HEADING),
      m.limits.map((l) => h('article', { class: 'limit-entry' }, h('h3', {}, l.title), h('p', {}, l.paragraph)))),
    h('section', { id: 'not-built' }, h('h2', {}, NOT_BUILT_HEADING),
      m.notBuilt.map((p) => h('article', { class: 'limit-entry' }, h('h3', {}, p.heading), p.sentences.map((s) => h('p', {}, s))))),
    h('section', { id: 'not-observed' }, h('h2', {}, NOT_OBSERVED_HEADING),
      m.openQuestions.map((q) => h('article', { class: 'limit-entry', id: `question-${q.id}` },
        h('p', {}, q.plain ?? ''),
        h('div', { class: 'ledger-wording' },
          h('h3', {}, LEDGER_WORDING),
          h('p', {}, h('span', { class: 'figures' }, q.id), ' ', q.question))))),
  );
}
