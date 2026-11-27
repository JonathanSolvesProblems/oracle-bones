// The paste panel, the first thing under "The section" on the irregular form (quickened-app
// criteria 1.7, 1.8, 11.1). While no ground point has been entered it is open: a heading, one
// line on what it takes, the text box, "Load stations", and "Paste from clipboard" where the
// browser offers the clipboard. Once rows are loaded it closes to one control, "Paste again".
import { h, type VNode } from '../vnode.ts';

export interface PasteState {
  open: boolean;
  text: string;
  message: string | null;
  /** Whether the browser offers navigator.clipboard.readText. */
  clipboard: boolean;
}

export const PASTE_HEADING = 'Paste the section';
export const PASTE_HELP = 'Up to 40 stations, distance then elevation, as copied from a profile tool, Excel or HEC-RAS.';
export const PASTE_REPLACES = 'The pasted stations replace the rows in the table.';
export const LOAD_LABEL = 'Load stations';
export const CLIPBOARD_LABEL = 'Paste from clipboard';
export const PASTE_AGAIN = 'Paste again';
export const PASTE_STATIONS = 'Paste stations';
export const CLIPBOARD_REFUSED = 'The browser did not let the page read the clipboard. Paste into the box instead.';

export interface PasteContext {
  /** Whether any ground point has a station or an elevation. */
  hasRows: boolean;
  /** Whether the rows were pasted or loaded from an example, rather than typed. */
  loaded: boolean;
}

/** Whether a ground point has been entered: any row with a station or an elevation. */
export function hasGroundPoints(rows: readonly { station: string; elevation: string }[]): boolean {
  return rows.some((r) => r.station !== '' || r.elevation !== '');
}

export function pasteControl(p: PasteState, c: PasteContext): VNode {
  if (!p.open && c.hasRows) {
    return h('div', { class: 'paste' },
      h('button', { type: 'button', id: 'paste-open', on: { click: { type: 'paste-open' } } }, c.loaded ? PASTE_AGAIN : PASTE_STATIONS));
  }
  return h('div', { class: 'paste open' },
    h('label', { for: 'paste-text', class: 'paste-heading' }, PASTE_HEADING),
    h('p', { class: 'note', id: 'paste-help' }, c.hasRows ? `${PASTE_HELP} ${PASTE_REPLACES}` : PASTE_HELP),
    h('textarea', {
      id: 'paste-text', class: 'figures', rows: '5', value: p.text, spellcheck: 'false', autocomplete: 'off',
      'aria-describedby': 'paste-help', on: { input: { type: 'paste-text' } },
    }),
    p.message ? h('p', { class: 'paste-error', role: 'alert' }, p.message) : null,
    h('div', { class: 'row-controls' },
      h('button', { type: 'button', id: 'paste-load', class: 'primary', on: { click: { type: 'paste-load' } } }, LOAD_LABEL),
      p.clipboard ? h('button', { type: 'button', id: 'paste-clipboard', on: { click: { type: 'paste-clipboard' } } }, CLIPBOARD_LABEL) : null,
      c.hasRows ? h('button', { type: 'button', on: { click: { type: 'paste-close' } } }, 'Cancel') : null),
  );
}
