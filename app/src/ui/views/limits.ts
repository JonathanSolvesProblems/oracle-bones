// The limits page (quickened-app design: The limits page; criteria 5.3, 5.4, 5.8, 5.9, 7.3). Built
// from `virtual:quickened/data`, so a change to results/hauntings.md, results/ledger.json,
// results/limits-plain.md or results/known-misses.json shows at the next build with no edit here.
// Five parts: the hauntings as the file words them; the known-miss classes, each by its Limits
// paragraph verbatim with the headline run's cases it holds; the other Limits paragraphs
// verbatim; the pairs not built yet; and the open questions, each with its plain sentences first
// and the ledger's wording under them. A code span of the files is shown as its value in the
// figures face, without its marks (inline.ts).
import type { KnownMissClass, QuickenedData } from '../../../build/data.ts';
import type { Haunting, LimitEntry } from '../../../build/hauntings.ts';
import { isBuilt, type Mode, type Shape } from '../../solver/index.ts';
import { h, type VNode } from '../vnode.ts';
import { inline } from './inline.ts';
import { notBuiltModel } from './notBuilt.ts';
import { MODES, SHAPES, shapeChoice, STEP_BACKWATER_SHAPE } from './picker.ts';

export const HAUNTINGS_HEADING = 'Where QUICK-2 differs from exact hydraulics';
export const KNOWN_MISSES_HEADING = "Where Quickened's answer differs from QUICK-2's";
export const LIMITS_HEADING = 'Where Quickened gives no answer';
export const NOT_BUILT_HEADING = 'Not built yet';
export const NOT_OBSERVED_HEADING = 'Behaviours not observed yet';
export const LEDGER_WORDING = "The ledger's wording";
export const KNOWN_MISSES_INTRO = 'Here both programs give an answer, and a printed number or word is not the same. The cause of each class is not found yet.';

export interface MissEntry extends LimitEntry { classId: string; inHeadline: number | null; }

export interface LimitsModel {
  hauntings: Haunting[];
  /** The Limits entries of the known-miss classes, in the file's order. */
  misses: MissEntry[];
  /** The other Limits entries: where Quickened gives no answer. */
  limits: LimitEntry[];
  notBuilt: { mode: Mode; shape: Shape; heading: string; sentences: string[] }[];
  openQuestions: QuickenedData['openQuestions'];
  headline: QuickenedData['headline'];
}

type LimitsData = Pick<QuickenedData, 'hauntings' | 'limits' | 'openQuestions'> & Partial<Pick<QuickenedData, 'knownMisses' | 'headline'>>;

export function limitsModel(d: LimitsData): LimitsModel {
  const pairs = MODES.flatMap((m) => (shapeChoice(m.mode)
    ? SHAPES.map((s) => ({ mode: m.mode, shape: s.shape })) : [{ mode: m.mode, shape: STEP_BACKWATER_SHAPE }]));
  const classes: readonly KnownMissClass[] = d.knownMisses ?? [];
  const classOf = (l: LimitEntry) => classes.find((c) => c.title === l.title);
  return {
    hauntings: d.hauntings,
    misses: d.limits.flatMap((l) => {
      const c = classOf(l);
      return c ? [{ ...l, classId: c.id, inHeadline: c.inHeadline }] : [];
    }),
    limits: d.limits.filter((l) => !classOf(l)),
    notBuilt: pairs.filter((p) => !isBuilt(p.mode, p.shape)).map((p) => {
      const m = notBuiltModel(p.mode, p.shape);
      return { ...p, heading: m.heading, sentences: m.sentences };
    }),
    openQuestions: d.openQuestions,
    headline: d.headline ?? null,
  };
}

function term(label: string, text: string): VNode[] {
  return [h('dt', {}, inline(label)), h('dd', {}, inline(text))];
}

function hauntingView(x: Haunting): VNode {
  return h('article', { class: 'limit-entry', id: `haunting-${x.id}` },
    h('h3', {}, inline(`${x.id}: ${x.title}`)),
    h('dl', { class: 'limit-terms' },
      term(x.cases.length > 1 ? 'Cases' : 'Case', x.caseText),
      term('QUICK-2 printed', x.printed),
      term(`Exact answer${x.assumption ? ` ${x.assumption}` : ''}`, x.exactAnswer),
      term('Difference', x.difference)));
}

/** How many of the headline run's cases a class holds, or nothing without a headline run. */
function headlineCount(m: MissEntry, headline: LimitsModel['headline']): VNode | null {
  if (!headline || m.inHeadline === null) return null;
  return h('p', { class: 'miss-count' }, m.inHeadline === 0
    ? `None of the headline run's ${headline.total} cases.`
    : `${m.inHeadline} of the headline run's ${headline.total} cases.`);
}

function missesIntro(m: LimitsModel): VNode[] {
  const out = [h('p', {}, KNOWN_MISSES_INTRO)];
  const h0 = m.headline;
  if (h0 && m.misses.every((x) => x.inHeadline !== null)) {
    const sum = m.misses.reduce((s, x) => s + x.inHeadline!, 0);
    out.push(h('p', {}, `Of the ${h0.total} cases of the headline run, Quickened prints what QUICK-2 printed in ${h0.matched}; the other ${sum} are in these classes.`));
  }
  return out;
}

export function limitsView(m: LimitsModel): VNode {
  return h('section', { class: 'limits-page' },
    h('h1', {}, 'Limits'),
    h('section', { id: 'hauntings' }, h('h2', {}, HAUNTINGS_HEADING), m.hauntings.map(hauntingView)),
    h('section', { id: 'known-misses' }, h('h2', {}, KNOWN_MISSES_HEADING), missesIntro(m),
      m.misses.map((l) => h('article', { class: 'limit-entry', id: `miss-${l.classId}` },
        h('h3', {}, inline(l.title)), headlineCount(l, m.headline), h('p', {}, inline(l.paragraph))))),
    h('section', { id: 'no-answer' }, h('h2', {}, LIMITS_HEADING),
      m.limits.map((l) => h('article', { class: 'limit-entry' }, h('h3', {}, inline(l.title)), h('p', {}, inline(l.paragraph))))),
    h('section', { id: 'not-built' }, h('h2', {}, NOT_BUILT_HEADING),
      m.notBuilt.map((p) => h('article', { class: 'limit-entry' }, h('h3', {}, p.heading), p.sentences.map((s) => h('p', {}, s))))),
    h('section', { id: 'not-observed' }, h('h2', {}, NOT_OBSERVED_HEADING),
      m.openQuestions.map((q) => h('article', { class: 'limit-entry', id: `question-${q.id}` },
        h('p', {}, inline(q.plain ?? '')),
        h('div', { class: 'ledger-wording' },
          h('h3', {}, LEDGER_WORDING),
          h('p', {}, h('span', { class: 'figures' }, q.id), ' ', inline(q.question)))))),
  );
}
