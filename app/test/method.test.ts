// Property 9: method values are the solver's (quickened-app criterion 2.6). For every built
// pair, every value in the method list is the export of constants.ts it names, compared by
// identity, and no numeric literal appears in method.ts. The list names what 2.6 asks for, and
// ends with the search limit, labelled as Quickened's, wherever the pair searches.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import * as C from '../src/solver/constants.ts';
import { isBuilt, type Mode, type Shape } from '../src/solver/index.ts';
import { methodList, methodView, METHOD_SENTENCE } from '../src/ui/method.ts';
import { textOf } from '../src/ui/vnode.ts';
import { ROOT } from './golden.ts';

const MODES: Mode[] = ['critical_depth', 'channel_capacity', 'normal_depth', 'step_backwater'];
const SHAPES: Shape[] = ['v_ditch', 'rectangle', 'trapezoid', 'circle', 'irregular'];
const BUILT = MODES.flatMap((mode) => SHAPES.filter((shape) => isBuilt(mode, shape)).map((shape) => ({ mode, shape })));

describe('Property 9: method values are the solver\'s', () => {
  for (const { mode, shape } of BUILT) {
    describe(`${mode}/${shape}`, () => {
      const items = methodList(mode, shape);

      it('every value is the constants.ts export it names, by identity', () => {
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
          if (item.constant === null) { expect(item.value, item.name).toBeNull(); continue; }
          expect(Object.is(item.value, (C as Record<string, unknown>)[item.constant]), `${item.name} is ${item.constant}`).toBe(true);
        }
      });

      it('names the Manning constant, g and the exponent on the hydraulic radius', () => {
        const names = items.map((i) => i.constant);
        expect(names).toContain('MANNING_K');
        expect(names).toContain('G');
        expect(names.some((n) => n === 'EXP_A' || n === 'EXP_B')).toBe(true);
        if (shape === 'circle') { expect(names).toContain('PI_QUICK2'); expect(names).toContain('MAX_DISCHARGE_DEPTH'); }
        if (shape === 'irregular') expect(items.some((i) => i.constant === null && /vertical wall/i.test(i.role))).toBe(true);
      });

      it('names the search\'s first trial, step and stop, and ends with Quickened\'s search limit, where the pair searches', () => {
        const searches = mode !== 'channel_capacity';
        const roles = items.map((i) => i.part);
        expect(roles.includes('first_trial') && roles.includes('step') && roles.includes('stop')).toBe(searches);
        const quickened = items.filter((i) => i.source === 'Quickened');
        if (searches) {
          expect(quickened.map((i) => i.constant)).toEqual(['SEARCH_DEPTH_LIMIT']);
          expect(items[items.length - 1]!.source).toBe('Quickened');
        } else {
          expect(quickened).toEqual([]);
        }
      });

      it('the view writes each value from its constant and says these are QUICK-2\'s choices', () => {
        const text = textOf(methodView(items));
        expect(text).toContain(METHOD_SENTENCE);
        for (const item of items) {
          expect(text).toContain(item.name);
          if (item.value !== null) expect(text).toContain(String(item.value));
        }
        expect(text.includes("Quickened's choice, not QUICK-2's")).toBe(mode !== 'channel_capacity');
      });
    });
  }

  it('no numeric literal appears in method.ts', () => {
    const file = join(ROOT, 'app', 'src', 'ui', 'method.ts');
    const sf = ts.createSourceFile(file, readFileSync(file, 'utf-8'), ts.ScriptTarget.Latest, true);
    const found: string[] = [];
    const visit = (n: ts.Node) => { if (ts.isNumericLiteral(n) || ts.isBigIntLiteral(n)) found.push(n.getText()); n.forEachChild(visit); };
    visit(sf);
    expect(found).toEqual([]);
  });
});
