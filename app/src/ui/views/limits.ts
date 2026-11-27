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
import { h, type Child, type VNode } from '../vnode.ts';
import { inline } from './inline.ts';
import { notBuiltModel, type NotBuiltModel } from './notBuilt.ts';
import { forRepo, splitRepo } from './repo.ts';
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
  notBuilt: { mode: Mode; shape: Shape; heading: string; sentences: string[]; asks: NotBuiltModel['asks'] }[];
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
      return { ...p, heading: m.heading, sentences: m.sentences, asks: m.asks };
    }),
    openQuestions: d.openQuestions,
    headline: d.headline ?? null,
  };
}

export const HAUNTING_DEFINITION = 'A haunting is a place where QUICK-2 prints a value that differs from the exact answer to the same hydraulics problem. Quickened prints what QUICK-2 printed and shows the exact value beside it.';

function term(label: string, text: string): VNode[] {
  return text.trim() === '' ? [] : [h('dt', {}, inline(label)), h('dd', {}, inline(text))];
}

/** A markdown table in a text: the text before it, its rows (header first) and the text after it; or null. */
export function parseTable(text: string): { before: string; rows: string[][]; after: string } | null {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => /^\s*\|/.test(l));
  if (start < 0) return null;
  let end = start;
  while (end < lines.length && /^\s*\|/.test(lines[end]!)) end++;
  const cells = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const block = lines.slice(start, end).map(cells);
  if (block.length < 3 || !block[1]!.every((c) => /^:?-{3,}:?$/.test(c))) return null;
  return { before: lines.slice(0, start).join(' ').trim(), rows: [block[0]!, ...block.slice(2)], after: lines.slice(end).join(' ').trim() };
}

function tableView(rows: readonly (readonly string[])[]): VNode {
  const [head, ...body] = rows;
  return h('table', { class: 'haunting-table' },
    h('thead', {}, h('tr', {}, head!.map((c) => h('th', { scope: 'col' }, inline(c))))),
    h('tbody', {}, body.map((r) => h('tr', {}, r.map((c, i) => (i === 0 ? h('th', { scope: 'row' }, inline(c)) : h('td', {}, inline(c))))))));
}

function hauntingView(x: Haunting): VNode {
  const repo: string[] = [];
  const plain = (text: string): string => {
    const s = splitRepo(text);
    repo.push(...s.repo);
    return s.plain;
  };
  // The label of the exact answer names its assumptions; a command that reproduces it is for the repository.
  const label = `Exact answer${x.assumption ? ` ${x.assumption.replace(/;\s*`[^`]*`/g, (m) => { repo.push(m.replace(/^;\s*/, '')); return ''; })}` : ''}`;
  const table = parseTable(x.exactAnswer);
  return h('article', { class: 'limit-entry', id: `haunting-${x.id}` },
    h('h3', {}, inline(`${x.id}: ${x.title}`)),
    h('dl', { class: 'limit-terms' },
      term(x.cases.length > 1 ? 'Cases' : 'Case', plain(x.caseText)),
      term('QUICK-2 printed', plain(x.printed)),
      table
        ? [h('dt', {}, inline(label)), h('dd', {}, table.before ? inline(plain(table.before)) : null, tableView(table.rows), table.after ? inline(plain(table.after)) : null)]
        : term(label, plain(x.exactAnswer)),
      term('Difference', plain(x.difference))),
    forRepo(repo.map((s) => h('p', {}, inline(s)))));
}

/** A paragraph of the limits file: its plain sentences, and the rest in a closed details under it. */
function paragraphView(text: string): Child[] {
  const s = splitRepo(text);
  return [s.plain ? h('p', {}, inline(s.plain)) : null, forRepo(s.repo.length ? s.repo.map((x) => h('p', {}, inline(x))) : null)]
    .filter((c): c is VNode => c !== null);
}

/** What QUICK-2 asks for, as a list under the sentence that announces it. */
function asksView(asks: NotBuiltModel['asks']): VNode | null {
  return asks.length ? h('ul', { class: 'asks' }, asks.map((a) => h('li', {}, a.text, a.quick2 ? [' ', h('span', { class: 'quick2' }, `“${a.quick2}”`)] : null))) : null;
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
    h('p', { class: 'haunting-definition' }, HAUNTING_DEFINITION),
    h('section', { id: 'hauntings' }, h('h2', {}, HAUNTINGS_HEADING), m.hauntings.map(hauntingView)),
    h('section', { id: 'known-misses' }, h('h2', {}, KNOWN_MISSES_HEADING), missesIntro(m),
      m.misses.map((l) => h('article', { class: 'limit-entry', id: `miss-${l.classId}` },
        h('h3', {}, inline(l.title)), headlineCount(l, m.headline), paragraphView(l.paragraph)))),
    h('section', { id: 'no-answer' }, h('h2', {}, LIMITS_HEADING),
      m.limits.map((l) => h('article', { class: 'limit-entry' }, h('h3', {}, inline(l.title)), paragraphView(l.paragraph)))),
    h('section', { id: 'not-built' }, h('h2', {}, NOT_BUILT_HEADING),
      m.notBuilt.map((p) => h('article', { class: 'limit-entry' }, h('h3', {}, p.heading), p.sentences.map((s) => h('p', {}, s)), asksView(p.asks)))),
    h('section', { id: 'not-observed' }, h('h2', {}, NOT_OBSERVED_HEADING),
      m.openQuestions.map((q) => {
        const plain = splitRepo(q.plain ?? '');
        return h('article', { class: 'limit-entry', id: `question-${q.id}` },
          plain.plain ? h('p', {}, inline(plain.plain)) : null,
          forRepo(
            h('div', { class: 'ledger-wording' },
              h('h3', {}, LEDGER_WORDING),
              h('p', {}, h('span', { class: 'figures' }, q.id), ' ', inline(q.question))),
            plain.repo.length ? plain.repo.map((s) => h('p', {}, inline(s))) : null));
      })),
  );
}
