// How the ground-point table is shown on a phone (criterion 10.5). A section that was typed by hand
// is a table to type into. Once a section has been pasted or loaded, the table collapses to one
// summary row ("40 ground points, 0 to 500") that opens on demand and closes again.
import type { Row } from './job.ts';

export type GroundView = 'typed' | 'open' | 'collapsed';
export const GROUND_TOGGLE = 'ground-toggle';
export const GROUND_TABLE_ID = 'ground-table';
export const GROUND_SUMMARY_ID = 'ground-summary';

/** The view after an action: loading or pasting a section collapses it, the summary row toggles it. */
export function groundAfter(view: GroundView, action: string): GroundView {
  if (action === 'example' || action === 'paste-load') return 'collapsed';
  if (action === GROUND_TOGGLE) return view === 'collapsed' ? 'open' : view === 'open' ? 'collapsed' : view;
  return view;
}

/** The summary row: how many points, from the first station to the last, as the rows hold them. */
export function groundSummary(rows: readonly Row[]): string {
  const n = rows.length;
  const first = rows[0]?.station ?? '';
  const last = rows[n - 1]?.station ?? '';
  return `${n} ground point${n === 1 ? '' : 's'}, ${first} to ${last}`;
}
