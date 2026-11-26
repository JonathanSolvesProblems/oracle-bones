// The view of each screen state (quickened-app design: Screen states; criteria 1.2, 1.9, 2.3,
// 6.2 to 6.7, 6.9). QUICK-2's messages are shown trimmed and otherwise as the solver returns
// them, in quotation marks, labelled as QUICK-2's. Flag sentences are shown verbatim, in the
// solver's order, with the fields each names. The notice is in every state.
import type { Flag, Result } from '../../solver/index.ts';
import { screenLabel } from '../forms.ts';
import type { AppJob } from '../job.ts';
import type { ScreenState } from '../state.ts';
import { h, type Child, type VNode } from '../vnode.ts';
import { NOTICE, noticeView } from './notice.ts';

export const QUICK2_MESSAGE = "QUICK-2's message:";
export const QUICKENED_MESSAGE = "Quickened's message:";
export const NO_RESULT = 'There is no result.';
export const KEY_LINE_SENTENCE = 'QUICK-2 writes this message over its key line and leaves the rest of that line on the screen:';
export const HELD_SENTENCE = 'QUICK-2 keeps this prompt and shows no message: it does not take the value. Your other values are kept.';
export const INVALID_SENTENCE = 'Quickened sends QUICK-2 only plain decimals, such as 12, .035 or -1. What QUICK-2 does with an empty field or other text has not been observed.';

export interface FlagLine { number: number; text: string; fields: string[]; }

export interface StateModel {
  kind: Exclude<ScreenState['kind'], 'idle'>;
  heading: string;
  /** Quickened's sentences, in order. */
  sentences: string[];
  /** QUICK-2's message, trimmed; null when there is none. */
  quick2Message: string | null;
  /** For a station error: the rest of the key line QUICK-2 leaves on the screen, trimmed. */
  keyLineRest: string | null;
  /** Quickened's message for a `failed` state. */
  quickenedMessage: string | null;
  flags: FlagLine[];
  /** Contract keys or printed fields to mark with the pencil-red rule. */
  marked: string[];
  notice: string;
  /** The Result, for the states that have one. */
  result: Result | null;
}

function labelOf(job: AppJob, field: string): string {
  return screenLabel(job.mode, job.shape, field) ?? field;
}

function flagLines(job: AppJob, flags: readonly Flag[]): FlagLine[] {
  return flags.map((f, i) => ({ number: i + 1, text: f.text, fields: f.fields.map((x) => labelOf(job, x)) }));
}

function base(kind: StateModel['kind'], heading: string, job: AppJob, result: Result | null): StateModel {
  const flags = result ? flagLines(job, result.flags) : [];
  return {
    kind, heading, sentences: [], quick2Message: null, keyLineRest: null, quickenedMessage: null, flags,
    marked: result ? [...new Set(result.flags.flatMap((f) => f.fields))] : [], notice: NOTICE, result,
  };
}

export function stateModel(job: AppJob, state: Exclude<ScreenState, { kind: 'idle' }>): StateModel {
  switch (state.kind) {
    case 'invalid': {
      const m = base('invalid', 'Not calculated', job, null);
      m.sentences = [`Check ${state.fields.map((f) => labelOf(job, f)).join(', ')}.`, INVALID_SENTENCE];
      m.marked = [...state.fields];
      return m;
    }
    case 'held': {
      const m = base('held', 'QUICK-2 holds a prompt', job, state.result);
      m.sentences = [`The prompt: ${labelOf(job, state.prompt)}.`, HELD_SENTENCE, NO_RESULT];
      m.quick2Message = state.message?.trim() ?? null;
      m.marked = [state.prompt, ...m.marked.filter((x) => x !== state.prompt)];
      return m;
    }
    case 'rejected': {
      const m = base('rejected', 'QUICK-2 refuses this input', job, state.result);
      m.quick2Message = state.message.trim();
      m.keyLineRest = state.keyLineRest === null ? null : state.keyLineRest.trim();
      m.sentences = [NO_RESULT];
      return m;
    }
    case 'stopped': {
      const m = base('stopped', 'No result', job, state.result);
      m.sentences = [NO_RESULT];
      return m;
    }
    case 'failed': {
      const m = base('failed', 'No result', job, state.result);
      m.quickenedMessage = state.message;
      m.sentences = [NO_RESULT];
      return m;
    }
    case 'not_built': {
      const m = base('not_built', 'Not built yet', job, state.result);
      m.sentences = ['Quickened does not compute this pair yet.'];
      return m;
    }
    case 'result': {
      const m = base('result', 'Result', job, state.result);
      return m;
    }
  }
}

export function flagList(flags: readonly FlagLine[]): VNode | null {
  if (flags.length === 0) return null;
  return h('ol', { class: 'flags' }, flags.map((f) => h('li', { value: String(f.number) },
    h('span', { class: 'flag-text' }, f.text),
    f.fields.length ? h('span', { class: 'flag-fields' }, ' Fields: ', h('span', { class: 'quick2' }, f.fields.join(', ')), '.') : null)));
}

export function stateView(m: StateModel, body: Child | null = null): VNode {
  return h('section', { class: `state state-${m.kind}`, 'aria-live': 'polite' },
    h('h2', {}, m.heading),
    m.sentences.length ? m.sentences.map((s) => h('p', {}, s)) : null,
    m.quick2Message !== null ? h('p', { class: 'message' },
      h('span', { class: 'message-label' }, QUICK2_MESSAGE), ' ', h('span', { class: 'figures' }, `“${m.quick2Message}”`)) : null,
    m.keyLineRest !== null ? h('p', { class: 'key-line' },
      KEY_LINE_SENTENCE, ' ', h('span', { class: 'figures' }, m.keyLineRest)) : null,
    m.quickenedMessage !== null ? h('p', { class: 'message' },
      h('span', { class: 'message-label' }, QUICKENED_MESSAGE), ' ', m.quickenedMessage) : null,
    body,
    flagList(m.flags),
    noticeView(),
  );
}
