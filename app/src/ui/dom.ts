// Turns a VNode into DOM. The only file besides main.ts that touches the document.
import { redrawBlock } from './drawing/block.ts';
import type { Action, Child } from './vnode.ts';

export type Dispatch = (action: Action, value: string | null) => void;

const SVG_NS = 'http://www.w3.org/2000/svg';

function create(node: Child, dispatch: Dispatch, inSvg: boolean): Node {
  if (typeof node === 'string') return document.createTextNode(node);
  const svg = inSvg || node.tag === 'svg';
  const el = svg ? document.createElementNS(SVG_NS, node.tag) : document.createElement(node.tag);
  for (const [k, v] of Object.entries(node.attrs)) {
    if (v === true) el.setAttribute(k, '');
    else if (typeof v === 'string') el.setAttribute(k, v);
  }
  if ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && typeof node.attrs.value === 'string') {
    el.value = node.attrs.value;
  }
  for (const [event, action] of Object.entries(node.on)) {
    el.addEventListener(event, (e) => {
      if (event === 'submit') e.preventDefault();
      const t = e.currentTarget;
      const value = t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement ? t.value : null;
      dispatch(action, value);
    });
  }
  for (const c of node.children) el.appendChild(create(c, dispatch, svg && node.tag !== 'foreignObject'));
  return el;
}

let watcher: ResizeObserver | null = null;
/**
 * The reach block is laid out in its container's width in CSS px. Each host is watched, and its SVG is drawn again
 * whenever the width it has differs from the width it was laid out in (the first measure comes at once).
 */
function fitBlocks(root: Element, dispatch: Dispatch): void {
  watcher?.disconnect();
  watcher = null;
  const hosts = root.querySelectorAll<HTMLElement>('[data-block]');
  if (hosts.length === 0 || typeof ResizeObserver === 'undefined') return;
  const seen = new ResizeObserver((entries) => {
    for (const e of entries) {
      const host = e.target as HTMLElement;
      const width = Math.floor(e.contentRect.width);
      if (width < 200 || host.dataset.width === String(width)) continue;
      const node = redrawBlock(host.dataset.block!, width);
      if (!node) continue;
      host.dataset.width = String(width);
      host.replaceChildren(create(node, dispatch, false));
    }
  });
  hosts.forEach((h) => seen.observe(h));
  watcher = seen;
}

/** Replace the contents of `root` with the node, keeping focus on the element with the same id. */
export function render(root: Element, node: Child, dispatch: Dispatch): void {
  const active = document.activeElement;
  const id = active && root.contains(active) ? active.id : '';
  const caret = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement
    ? [active.selectionStart, active.selectionEnd] as const : null;
  root.replaceChildren(create(node, dispatch, false));
  fitBlocks(root, dispatch);
  if (!id) return;
  const again = document.getElementById(id);
  if (!(again instanceof HTMLElement)) return;
  again.focus();
  if (caret && (again instanceof HTMLInputElement || again instanceof HTMLTextAreaElement) && caret[0] !== null) {
    again.setSelectionRange(caret[0], caret[1]);
  }
}
