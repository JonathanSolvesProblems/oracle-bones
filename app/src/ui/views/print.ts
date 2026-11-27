// The print view (quickened-app design: The print view; criteria 4.1, 4.3 to 4.6, 2.3). What the
// browser prints from the results route: a header with "Quickened", the date of printing as
// yyyy-mm-dd, the version and the build's commit; the engineer's inputs as QUICK-2 echoed them;
// the ground points four pairs to a row, as QUICK-2's editor shows them; the outputs with the
// exact values where the results screen shows them; every flag sentence; the drawing; the
// sources and discharge sentence of either worked example; and the notice. No control, no link.
import { data } from 'virtual:quickened/data';
import { enter, sectionKeys } from '../../solver/groundPoints.ts';
import { sectionDrawing, type DrawingModel } from '../drawing/section.ts';
import { drawingView, wsMarkSymbol } from '../drawing/svg.ts';
import type { AppJob } from '../job.ts';
import type { ShownState } from '../state.ts';
import { h, type Child, type VNode } from '../vnode.ts';
import { dischargeSentence } from './example.ts';
import { NOTICE } from './notice.ts';
import { COMPUTED_HEADING, ECHOED_HEADING, EXACT_HEADER, exactCaptionWords, resultsModel, type PrintedRow, type ResultsModel } from './results.ts';
import { limitsNote } from './hauntings.ts';
import type { FlagLine } from './states.ts';

export { PRINT_ACTION } from './results.ts';

export const GROUND_POINTS_PER_ROW = 4;
export const GROUND_HEADING = "Ground points, as QUICK-2's editor took them";

export interface PrintModel {
  header: { name: string; date: string; version: string; commit: string };
  mainFigure: ResultsModel['mainFigure'];
  inputs: PrintedRow[];
  outputs: PrintedRow[];
  exact: ResultsModel['exact'];
  flags: FlagLine[];
  drawing: DrawingModel | null;
  /** Station and elevation pairs as typed, four to a row. */
  groundRows: [string, string][][];
  sources: { items: { name: string; text: string }[]; caveats: string[]; discharge: string } | null;
  notice: string;
}

/** The local date as yyyy-mm-dd. */
export function printDate(d: Date): string {
  const two = (n: number) => String(n).padStart(2, '0');
  return `${String(d.getFullYear()).padStart(4, '0')}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}

export function printModel(job: AppJob, state: Extract<ShownState, { kind: 'result' }>, date: Date): PrintModel {
  const rm = resultsModel(job, state);
  const pairs: [string, string][] = job.shape === 'irregular'
    ? enter(sectionKeys(job.inputs)).points.map((p) => [p.stationText, p.elevationText]) : [];
  const groundRows: [string, string][][] = [];
  for (let i = 0; i < pairs.length; i += GROUND_POINTS_PER_ROW) groundRows.push(pairs.slice(i, i + GROUND_POINTS_PER_ROW));
  return {
    header: { name: 'Quickened', date: printDate(date), version: data.build.version, commit: data.build.commit },
    mainFigure: rm.mainFigure,
    inputs: rm.inputs,
    outputs: rm.outputs,
    exact: rm.exact,
    flags: rm.flags,
    drawing: sectionDrawing(job, state.result),
    groundRows,
    sources: job.origin === 'typed' ? null
      : { items: data.sources.items, caveats: data.sources.caveats, discharge: dischargeSentence(job.origin) },
    notice: NOTICE,
  };
}

/** Each distinct note of the rows, numbered in the order the rows first give it. */
function notesOf(rows: readonly PrintedRow[]): string[] {
  const out: string[] = [];
  for (const r of rows) for (const n of r.notes) if (!out.includes(n)) out.push(n);
  return out;
}

/**
 * One side of the sheet: its head and one row per field, QUICK-2's label and the printed text
 * side by side, the exact value after it where there is one, then the flag and note numbers.
 */
function side(cls: string, head: string, rows: readonly PrintedRow[], exact: PrintModel['exact'], notes: readonly string[]): VNode {
  const withExact = exact !== null && rows.some((r) => r.exact !== null);
  return h('section', { class: cls },
    h('h2', {}, head),
    h('table', { class: 'print-table' },
      h('tbody', {}, rows.map((r) => {
        const marks = [
          r.flagNumbers.length ? `Flag ${r.flagNumbers.join(', ')}.` : '',
          ...r.notes.map((n) => `Note ${notes.indexOf(n) + 1}.`),
        ].filter((s) => s !== '').join(' ');
        return h('tr', { class: r.flagNumbers.length ? 'marked' : undefined },
          h('th', { scope: 'row', class: 'quick2' }, r.rowHeading ? `${r.rowHeading} ` : null, r.label),
          h('td', { class: 'figures', 'data-field': r.field }, r.text),
          withExact ? h('td', r.exact !== null ? { class: 'exact figures', 'data-exact': r.field } : { class: 'exact' },
            r.exact !== null ? [h('span', { class: 'exact-label' }, EXACT_HEADER), ' ', r.exact] : null) : null,
          h('td', { class: 'row-extra' }, marks));
      }))),
    withExact ? h('p', { class: 'exact-caption' }, `${exactCaptionWords(exact!.assumption)} ${limitsNote(exact!.haunting)}.`) : null);
}

function groundTable(rows: PrintModel['groundRows']): VNode | null {
  if (rows.length === 0) return null;
  const heads: Child[] = [];
  for (let i = 0; i < GROUND_POINTS_PER_ROW; i++) heads.push(h('th', { scope: 'col' }, 'Station'), h('th', { scope: 'col' }, 'Elev'));
  return h('table', { class: 'ground-print' },
    h('caption', {}, GROUND_HEADING),
    h('thead', {}, h('tr', {}, heads)),
    h('tbody', {}, rows.map((row) => h('tr', {}, row.flatMap(([s, e]) => [h('td', { class: 'figures' }, s), h('td', { class: 'figures' }, e)])))));
}

export const SOURCES_HEADING = 'Where this example comes from';

/**
 * The sheet (criteria 4.1, 4.4, 4.5): one header line; the main figure and the drawing; inputs and
 * outputs side by side; the notes, ground points, flags and the notice, all on one US Letter page.
 * A worked example's sources follow on a page of their own, under their own head.
 */
export function printView(m: PrintModel): VNode {
  const notes = notesOf([...m.inputs, ...m.outputs]);
  return h('article', { class: 'print-view' },
    wsMarkSymbol(),
    h('div', { class: 'print-job' },
      h('header', { class: 'print-header' },
        h('p', {}, h('span', { class: 'print-name' }, m.header.name),
          ` · Printed ${m.header.date} · Version ${m.header.version}, build ${m.header.commit}`)),
      h('p', { class: 'main-figure' },
        h('span', { class: 'main-label quick2' }, m.mainFigure.label), ' ', h('span', { class: 'main-value figures' }, m.mainFigure.text)),
      m.drawing ? drawingView(m.drawing, { links: false }) : null,
      h('div', { class: 'print-fields' },
        side('print-inputs', ECHOED_HEADING, m.inputs, m.exact, notes),
        side('print-outputs', COMPUTED_HEADING, m.outputs, m.exact, notes)),
      notes.length ? h('ol', { class: 'print-notes' }, notes.map((n, i) => h('li', { value: String(i + 1) }, `Note: ${n}`))) : null,
      groundTable(m.groundRows),
      m.flags.length ? h('ol', { class: 'flags' }, m.flags.map((f) => h('li', { value: String(f.number) },
        f.text, f.fields.length ? ` Fields: ${f.fields.join(', ')}.` : ''))) : null,
      h('p', { class: 'notice' }, m.notice)),
    m.sources ? h('section', { class: 'print-sources' },
      h('h2', {}, SOURCES_HEADING),
      h('dl', {}, m.sources.items.flatMap((i) => [h('dt', {}, i.name), h('dd', {}, i.text)])),
      h('p', {}, m.sources.discharge),
      h('ul', {}, m.sources.caveats.map((c) => h('li', {}, c)))) : null);
}
