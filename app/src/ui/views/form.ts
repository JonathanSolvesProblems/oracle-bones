// The form: the engineer's inputs under "Your inputs", grouped by part, each under QUICK-2's
// label (quickened-app design: The form; criteria 1.1, 1.4, 1.6, 2.5). Fixed fields are shown as
// QUICK-2 prints them and cannot be edited. On the irregular section the ground points come
// first, as rows of a station and an elevation, 1 to 40.
import type { FormField, FormModel } from '../forms.ts';
import { GROUND_SUMMARY_ID, GROUND_TABLE_ID, GROUND_TOGGLE, groundSummary, type GroundView } from '../ground.ts';
import { rowKeys, type Row } from '../job.ts';
import { h, type Child, type VNode } from '../vnode.ts';

export interface FormViewModel {
  form: FormModel;
  values: Readonly<Record<string, string>>;
  rows: readonly Row[];
  /** Contract keys to mark with the pencil-red rule (a held prompt, an invalid field, a flag). */
  marked: ReadonlySet<string>;
  /** Extra content for the ground points, above the table (the paste control). */
  aboveRows?: Child | null;
  /** Per-row notes, by row index from 0 (the grid's not-taken rows). */
  rowNotes?: Readonly<Record<number, Child>>;
  /** Under the table: the points the editor keeps, when a row was not taken as typed. */
  belowRows?: Child | null;
  /** Once a section is pasted or loaded the table is a summary row that opens on demand (criterion 10.5); undefined or 'typed': the table alone. */
  ground?: GroundView;
}

export const FIXED_NOTE = 'QUICK-2 prints this value without asking for it.';

export function fieldId(key: string): string {
  return `field-${key}`;
}

export function rowId(index: number, part: 'station' | 'elevation'): string {
  return `row-${index + 1}-${part}`;
}

function fieldRow(f: FormField, value: string, marked: boolean): VNode {
  if (!f.editable) {
    return h('div', { class: 'field-row fixed' },
      h('span', { class: 'label quick2' }, f.label),
      h('span', { class: 'value' }, h('span', { class: 'figures' }, f.text ?? ''), h('span', { class: 'note' }, FIXED_NOTE)));
  }
  const id = fieldId(f.key);
  return h('div', { class: `field-row${marked ? ' marked' : ''}` },
    h('label', { class: 'label quick2', for: id }, f.label),
    h('span', { class: 'value' },
      h('input', {
        id, type: 'text', class: 'figures', value, autocomplete: 'off', spellcheck: 'false',
        'aria-invalid': marked ? 'true' : undefined,
        on: { input: { type: 'field', key: f.key } },
      })));
}

function groundPoints(m: FormViewModel): VNode {
  const gp = m.form.groundPoints!;
  const notes = m.rowNotes ?? {};
  const collapsed = m.ground === 'collapsed';
  const summary = m.ground === 'open' || collapsed
    ? h('button', { type: 'button', class: 'ground-summary', id: GROUND_SUMMARY_ID, 'aria-expanded': collapsed ? 'false' : 'true',
      'aria-controls': GROUND_TABLE_ID, on: { click: { type: GROUND_TOGGLE } } }, groundSummary(m.rows))
    : null;
  return h('div', { class: 'ground-points' },
    m.aboveRows ?? null,
    summary,
    collapsed ? null : h('table', { class: 'grid', id: GROUND_TABLE_ID },
      h('caption', {}, `Ground points: from 1 to ${gp.max} rows, station then elevation`),
      h('thead', {}, h('tr', {},
        h('th', { scope: 'col', class: 'row-number' }, 'Row'),
        h('th', { scope: 'col', class: 'quick2' }, gp.stationLabel),
        h('th', { scope: 'col', class: 'quick2' }, gp.elevationLabel))),
      h('tbody', {}, m.rows.map((r, i) => {
        const keys = rowKeys(i + 1);
        const note = notes[i];
        const cell = (part: 'station' | 'elevation', label: string) => h('td', { class: m.marked.has(keys[part]) ? 'marked' : undefined },
          h('input', {
            id: rowId(i, part), type: 'text', class: 'figures', value: r[part], autocomplete: 'off', spellcheck: 'false',
            'aria-label': `Row ${i + 1} ${label}`, 'aria-invalid': m.marked.has(keys[part]) ? 'true' : undefined,
            // A paste of more than one line loads from this row down (criterion 11.2; dom.ts reads the clipboard).
            on: { input: { type: 'row', index: i, part }, paste: { type: 'paste-cell', index: i, part } },
          }));
        return [
          h('tr', { class: note ? 'not-taken' : undefined },
            h('th', { scope: 'row', class: 'row-number' }, String(i + 1)),
            cell('station', gp.stationLabel), cell('elevation', gp.elevationLabel)),
          note ? h('tr', { class: 'row-note' }, h('td', { colspan: '3' }, note)) : null,
        ].filter((x): x is VNode => x !== null);
      }).flat())),
    m.belowRows ?? null,
    collapsed ? null : h('div', { class: 'row-controls' },
      m.rows.length < gp.max
        ? h('button', { type: 'button', on: { click: { type: 'add-row' } } }, 'Add row')
        : h('p', { class: 'note' }, `QUICK-2 takes at most ${gp.max} ground points.`),
      m.rows.length > 1 ? h('button', { type: 'button', on: { click: { type: 'remove-row' } } }, 'Remove last row') : null),
  );
}

export function formView(m: FormViewModel): VNode {
  return h('form', { class: 'inputs', novalidate: true, on: { submit: { type: 'calculate' } } },
    h('h2', {}, m.form.heading),
    m.form.groups.map((g) => h('fieldset', { class: `part part-${g.part}` },
      h('legend', {}, g.heading),
      g.part === 'section' && m.form.groundPoints ? groundPoints(m) : null,
      g.fields.map((f) => fieldRow(f, m.values[f.key] ?? '', m.marked.has(f.key))))),
    h('button', { type: 'submit', class: 'calculate' }, 'Calculate'),
  );
}
