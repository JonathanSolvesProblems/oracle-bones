// The ground-points table's notes: each row the editor did not take as typed, with the rule, and
// the points it keeps (quickened-app criterion 1.10). Shown only once every cell is a plain
// decimal; until then the rows are still being typed.
import { gridOf, type GridModel } from '../grid.ts';
import { rowKeys, type Row } from '../job.ts';
import { isPlainDecimal } from '../validate.ts';
import { h, type VNode } from '../vnode.ts';
import { QUICK2_MESSAGE } from './states.ts';

export interface GridParts { rowNotes: Record<number, VNode>; summary: VNode | null; grid: GridModel | null; }

export function gridParts(rows: readonly Row[]): GridParts {
  if (rows.length === 0 || !rows.every((r) => isPlainDecimal(r.station) && isPlainDecimal(r.elevation))) {
    return { rowNotes: {}, summary: null, grid: null };
  }
  const inputs: Record<string, string> = {};
  rows.forEach((r, i) => { const k = rowKeys(i + 1); inputs[k.station] = r.station; inputs[k.elevation] = r.elevation; });
  const grid = gridOf(inputs);
  const rowNotes: Record<number, VNode> = {};
  for (const r of grid.rows) {
    if (r.taken) continue;
    // A refused station: QUICK-2's own text first, labelled as its message, then Quickened's words.
    rowNotes[r.index - 1] = h('span', {}, `Row ${r.index}: `,
      r.quick2 !== null ? [h('span', { class: 'message-label' }, QUICK2_MESSAGE), ' ', h('span', { class: 'figures' }, `“${r.quick2.trim()}”`), ' '] : null,
      r.notes.join(' '));
  }
  const summary = Object.keys(rowNotes).length === 0 ? null : h('div', { class: 'kept-points' },
    h('p', {}, `QUICK-2's editor keeps ${grid.points.length} of the ${rows.length} rows as these points:`),
    h('ol', { class: 'figures' }, grid.points.map((p) => h('li', {}, `${p.stationText}  ${p.elevationText}`))));
  return { rowNotes, summary, grid };
}
