// The notice of criterion 2.3, on every results screen whatever the outcome, and on the print view.
import { h, type VNode } from '../vnode.ts';

export const NOTICE = "Quickened is an independent rebuild of QUICK-2 v1.0. It is not a FEMA product and is not accepted by FEMA: FEMA's list of accepted models names QUICK-2, not Quickened. Use it as a cross-check.";

export function noticeView(): VNode {
  return h('p', { class: 'notice' }, NOTICE);
}
