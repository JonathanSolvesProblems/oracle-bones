// The paste control above the ground points (quickened-app criteria 1.7, 1.8). "Paste rows"
// opens a text area; "Load rows" reads it with paste.ts and replaces the rows, or loads nothing
// and says why.
import { h, type VNode } from '../vnode.ts';

export interface PasteState { open: boolean; text: string; message: string | null; }

export const PASTE_HELP = 'One row per line: a station, a tab, then an elevation, as copied from a spreadsheet. The pasted rows replace the rows in the table.';

export function pasteControl(p: PasteState): VNode {
  if (!p.open) {
    return h('div', { class: 'paste' }, h('button', { type: 'button', id: 'paste-open', on: { click: { type: 'paste-open' } } }, 'Paste rows'));
  }
  return h('div', { class: 'paste open' },
    h('label', { for: 'paste-text' }, 'Paste ground points'),
    h('p', { class: 'note', id: 'paste-help' }, PASTE_HELP),
    h('textarea', {
      id: 'paste-text', class: 'figures', rows: '8', value: p.text, spellcheck: 'false', 'aria-describedby': 'paste-help',
      on: { input: { type: 'paste-text' } },
    }),
    p.message ? h('p', { class: 'paste-error', role: 'alert' }, p.message) : null,
    h('div', { class: 'row-controls' },
      h('button', { type: 'button', on: { click: { type: 'paste-load' } } }, 'Load rows'),
      h('button', { type: 'button', on: { click: { type: 'paste-close' } } }, 'Cancel')),
  );
}
