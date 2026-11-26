// The results screen (quickened-app design: The results screen; criteria 2.1, 2.3, 2.5, 6.1, 6.7).
// Every value shown is a printed field's window text with its leading and trailing spaces
// removed and nothing else changed. Inputs as QUICK-2 echoed them come under the engineer's
// heading, outputs under QUICK-2's method. Fields a flag names carry the flag's number.
import type { Mode, Shape } from '../../solver/index.ts';
import { screenLabel, screenOf, screenRowHeading } from '../forms.ts';
import type { AppJob } from '../job.ts';
import type { ShownState } from '../state.ts';
import { h, type Child, type VNode } from '../vnode.ts';
import { noticeView } from './notice.ts';
import { wsMark, wsMarkSymbol } from '../drawing/svg.ts';
import { flagList, type FlagLine } from './states.ts';

export const ECHOED_HEADING = 'Your inputs, as QUICK-2 read them';
export const COMPUTED_HEADING = "Computed by QUICK-2's method";

export interface PrintedRow {
  field: string;
  /** QUICK-2's label for the field. */
  label: string;
  /** QUICK-2's heading of the field's row, where the row has one ("CHANNEL BANK STATIONS:"). */
  rowHeading: string | null;
  /** The printed text, trimmed. */
  text: string;
  /** The numbers of the flags that name this field. */
  flagNumbers: number[];
  /** Quickened's lines beside the field (the cut-off line). */
  notes: string[];
}

/** Beside the fields the cut_off_area_counted flag names: Area, Top Wid and Wet Per (6.8). */
export const CUT_OFF_LINE = 'Includes low ground cut off from the channel, which QUICK-2 counts as flowing.';

export interface ResultsModel {
  heading: string;
  mainFigure: { field: string; label: string; text: string };
  inputs: PrintedRow[];
  outputs: PrintedRow[];
  flags: FlagLine[];
}

/** The field the results screen leads with (design: The results screen, item 1). */
export function mainFigureField(mode: Mode, shape: Shape): string {
  if (shape === 'irregular') return 'ws_elev';
  return mode === 'channel_capacity' ? 'discharge' : 'depth';
}

export function resultsModel(job: AppJob, state: Extract<ShownState, { kind: 'result' }>): ResultsModel {
  const r = state.result;
  const layout = screenOf(job.mode, job.shape);
  const order = layout ? layout.paintOrder.filter((f) => f in r.printed) : [];
  const rest = Object.keys(r.printed).filter((f) => !order.includes(f));
  const flags: FlagLine[] = r.flags.map((f, i) => ({
    number: i + 1, text: f.text, fields: f.fields.map((x) => screenLabel(job.mode, job.shape, x) ?? x),
  }));
  const row = (field: string): PrintedRow => ({
    field,
    label: screenLabel(job.mode, job.shape, field) ?? field,
    rowHeading: screenRowHeading(job.mode, job.shape, field),
    text: r.printed[field]!.trim(),
    flagNumbers: r.flags.flatMap((f, i) => (f.fields.includes(field) ? [i + 1] : [])),
    notes: r.flags.some((f) => f.code === 'cut_off_area_counted' && f.fields.includes(field)) ? [CUT_OFF_LINE] : [],
  });
  const rows = [...order, ...rest].map(row);
  const main = mainFigureField(job.mode, job.shape);
  return {
    heading: 'Result',
    mainFigure: { field: main, label: screenLabel(job.mode, job.shape, main) ?? main, text: (r.printed[main] ?? '').trim() },
    inputs: rows.filter((x) => x.field.startsWith('in_')),
    outputs: rows.filter((x) => !x.field.startsWith('in_')),
    flags,
  };
}

function printedTable(caption: string, rows: readonly PrintedRow[], extra: (row: PrintedRow) => Child | null): VNode {
  return h('table', { class: 'printed' },
    h('caption', {}, caption),
    h('tbody', {}, rows.map((x) => h('tr', { class: x.flagNumbers.length ? 'marked' : undefined },
      h('th', { scope: 'row', class: 'quick2' }, x.rowHeading ? h('span', { class: 'row-heading' }, `${x.rowHeading} `) : null, x.label),
      h('td', { class: 'figures', 'data-field': x.field }, x.text),
      h('td', { class: 'row-extra' },
        x.flagNumbers.length ? h('span', { class: 'flag-ref' }, `Flag ${x.flagNumbers.join(', ')}`) : null,
        x.notes.map((n) => h('span', { class: 'field-note' }, n)),
        extra(x))))));
}

export interface ResultsParts {
  /** Shown in a printed field's row, after the value (the cut-off line). */
  rowExtra?: (row: PrintedRow) => Child | null;
  /** After the flags (the method list). */
  afterFlags?: Child | null;
  /** After the main figure (the cross-section drawing). */
  drawing?: Child | null;
}

export function resultsView(m: ResultsModel, parts: ResultsParts = {}): VNode {
  const extra = parts.rowExtra ?? (() => null);
  return h('section', { class: 'state state-result', 'aria-live': 'polite' },
    wsMarkSymbol(),
    h('h2', {}, m.heading),
    h('p', { class: 'main-figure' },
      wsMark(),
      h('span', { class: 'main-label quick2' }, m.mainFigure.label),
      ' ',
      h('span', { class: 'main-value figures' }, m.mainFigure.text)),
    parts.drawing ?? null,
    printedTable(ECHOED_HEADING, m.inputs, extra),
    printedTable(COMPUTED_HEADING, m.outputs, extra),
    flagList(m.flags),
    parts.afterFlags ?? null,
    noticeView(),
  );
}
