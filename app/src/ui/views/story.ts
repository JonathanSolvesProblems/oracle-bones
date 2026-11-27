// The story page, #/story (quickened-app criterion 11.4): how Quickened was made, in a reviewer's
// words, with every number read from the repository's files at build time and every claim linked
// to the file that holds it. Added 2026-11-27, when the practitioner who tried the site asked that
// the project be transparent and that its story be part of the result.
import type { QuickenedData } from '../../../build/data.ts';
import { h, type Child, type VNode } from '../vnode.ts';
import { INTRO_FEMA_PIECES } from './intro.ts';
import { REPOSITORY_URL } from './shell.ts';

export const STORY_TITLE = 'How Quickened was made';

/** A file or folder of the source repository, on its main branch. */
export function repoLink(path: string, dir = false): string {
  return `${REPOSITORY_URL}/${dir ? 'tree' : 'blob'}/main/${path}`;
}

export interface StoryModel {
  year: string;
  recorded: string;
  drawn: string;
  /** The headline run: Quickened's matches of the cases the original answered; null before a run. */
  headline: { matched: number; total: number } | null;
  baseline: { matched: number; total: number };
  sessions: number;
  prompts: number;
  /** The known-miss classes that hold at least one of the headline run's cases. */
  missClasses: number;
}

export function storyModel(d: Pick<QuickenedData, 'story' | 'headline' | 'program' | 'knownMisses'>): StoryModel {
  return {
    year: d.program.year,
    recorded: d.story.text.recorded,
    drawn: d.story.text.drawn,
    headline: d.headline ? { matched: d.headline.matched, total: d.headline.total } : null,
    baseline: d.story.baseline,
    sessions: d.story.sessions,
    prompts: d.story.prompts,
    missClasses: d.knownMisses.filter((c) => (c.inHeadline ?? 0) > 0).length,
  };
}

/** A count under 1,000, as digits; the two larger counts come formatted from the build (build/story.ts). */
const n = (x: number): string => String(x);
const a = (href: string, text: string): VNode => h('a', { href, rel: href.startsWith('#') ? undefined : 'noopener' }, text);

function section(heading: string, ...paragraphs: Child[][]): VNode {
  return h('section', {}, h('h2', {}, heading), paragraphs.map((p) => h('p', {}, p)));
}

export function storyView(m: StoryModel): VNode {
  const hl = m.headline;
  return h('article', { class: 'story-page' },
    h('h1', {}, STORY_TITLE),
    h('p', { class: 'story-lead' },
      'Everything behind Quickened is open: the code, every case it was checked against, every prompt that built it, and a log of each working session. They are in the ',
      a(REPOSITORY_URL, 'source repository'), '. This page is the short version.'),
    section('The problem',
      [INTRO_FEMA_PIECES[0], m.year, ' DOS program for the water-surface elevation at one cross section of a stream. There is no source code to read, only the program, and it does not start on a locked-down modern computer.']),
    section('Asking the original',
      ['The original program was run, unchanged, in a DOS emulator inside a container with no network. A script typed each case into it the way a person would and read the screen back as text. ',
        a(repoLink('oracle/goldens', true), `${m.recorded} cases`), ' were recorded this way, each with every screen it showed.'],
      ['Every rule in Quickened was written from what the original printed, not from a textbook. Where the two disagree, Quickened prints what QUICK-2 printed, and ',
        a('#/limits', 'the limits page'), ' says where QUICK-2 differs from the exact hydraulics.']),
    section('Predictions before runs',
      ['Each time a rule was proposed, what it predicted for cases nobody had run was committed to the repository first, and only then were those cases run on the original. ',
        a(repoLink('results/held-out.md'), 'The record'), ' keeps every round, misses included.']),
    section('The test',
      hl
        ? [`With the solver frozen, ${m.drawn} inputs were drawn at random and given to the original, which answered ${n(hl.total)}. Quickened prints the same outcome and the same text in every field on ${n(hl.matched)} of them. `,
          a('#/proof', 'The proof page'), " shows QUICK-2's own screens beside Quickened's answers."]
        : ['No headline run has been recorded yet.'],
      [`For comparison, a rebuild made from one prompt to the same AI model, with public knowledge of the method and no recorded answers, matches ${n(m.baseline.matched)} of ${n(m.baseline.total)} by the same rule (`,
        a(repoLink('results/ablation-manual-only.md'), 'the comparison'), '). The gap is what asking the original added.']),
    section('Who made it, and with what',
      ['Made by Jonathan Andrei, as an entry to Kiroween 2026, a coding competition for Kiro.'],
      ['Most of the code was written in Kiro, an AI coding environment. ',
        a(repoLink('docs/prompts.md'), `Every prompt of its ${n(m.sessions)} sessions`), ` (${n(m.prompts)} prompts) is published word for word, and `,
        a(repoLink('docs/build-log.md'), 'the build log'),
        ' records each session: what was asked, what it cost, and where the AI changed the plan. Work done outside Kiro, with another AI coding assistant, is marked there, this page included.'],
      ['A practitioner who works out advisory flood heights tried the site on a phone. After that, the paste box moved to the top of the section and the words on the results became plainer.']),
    section('Where it falls short',
      ['Step-Backwater is not built. ',
        hl ? `On ${n(hl.total - hl.matched)} of the headline cases Quickened's answer differs from QUICK-2's; they fall in ${n(m.missClasses)} classes, each on ` : 'Where Quickened differs from QUICK-2 is on ',
        a('#/limits', 'the limits page'), hl ? ', and no cause is found yet for any of them.' : '.']),
    section('Use it, check it, reuse it',
      ['The code is under the MIT license. The worked example\'s ground and flow come from public USGS services, and every query is in ',
        a(repoLink('realdata', true), 'the repository'), '.'],
      ['QUICK-2 itself is not in the repository: a setup script downloads the program\'s archive from its public address and stops unless the file\'s hash is the pinned one.'],
      ['The same method is packaged as ', a(repoLink('powers/oracle-bones', true), 'Oracle Bones'),
        ', a Kiro power: pointed at another old program that has no source code, it boots the program in the emulator and drafts a profile to question it by.']),
  );
}
