// A plain description of the page, built by the views and turned into DOM by dom.ts. Views are
// pure functions from a view model to a VNode, so Vitest can read them under Node without a DOM
// (quickened-app design: Components). Events are named actions, which main.ts carries out.

export type Action = { readonly type: string; readonly [k: string]: unknown };

export interface VNode {
  tag: string;
  attrs: Readonly<Record<string, string | boolean>>;
  /** Event name to the action it sends; an input's value travels with it. */
  on: Readonly<Record<string, Action>>;
  children: readonly Child[];
}
export type Child = VNode | string;

type Attrs = Record<string, string | boolean | undefined | null> & { on?: Record<string, Action> };

/** Build a node. Attributes that are `undefined`, `null` or `false` are left out. */
export function h(tag: string, attrs: Attrs = {}, ...children: (Child | null | undefined | false | readonly Child[])[]): VNode {
  const { on = {}, ...rest } = attrs;
  const clean: Record<string, string | boolean> = {};
  for (const [k, v] of Object.entries(rest)) if (v !== undefined && v !== null && v !== false) clean[k] = v;
  const flat: Child[] = [];
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) flat.push(...c);
    else flat.push(c as Child);
  }
  return { tag, attrs: clean, on, children: flat };
}

/** The text of a node and everything under it, joined by single spaces between blocks. */
export function textOf(node: Child): string {
  if (typeof node === 'string') return node;
  return node.children.map(textOf).join(' ').replace(/\s+/g, ' ').trim();
}

/** Every node under `node` (itself included) that passes the test. */
export function findAll(node: Child, test: (n: VNode) => boolean): VNode[] {
  if (typeof node === 'string') return [];
  const out = test(node) ? [node] : [];
  for (const c of node.children) out.push(...findAll(c, test));
  return out;
}
