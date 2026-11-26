// Guard test over app/src/ui/ (quickened-app design: How the UI calls solve()).
//
// - An import from app/src/solver/ must be one the design allows: index.ts (solve, isBuilt,
//   NOT_BUILT, and types), forms.ts (prompt order, fixed fields), groundPoints.ts (enter,
//   sectionKeys, splitStationError), geometry/* and constants.ts (any export), parse.ts
//   (readSingle).
// - No toFixed, toPrecision, toLocaleString or Intl.NumberFormat anywhere in ui/ except
//   drawing/axis.ts, so the app cannot print a QUICK-2 value its own way.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, posix, relative } from 'node:path';
import ts from 'typescript';
import { ROOT } from './golden.ts';

const UI = 'app/src/ui';
const SOLVER = 'app/src/solver';
const AXIS = 'app/src/ui/drawing/axis.ts';

/** Allowed names per solver module; `*` allows any export. Type-only imports: index.ts only. */
const ALLOWED: Readonly<Record<string, readonly string[] | '*'>> = {
  'index.ts': ['solve', 'isBuilt', 'NOT_BUILT'],
  'forms.ts': ['regularPrompts', 'ND_IRREGULAR_PROMPTS', 'FIXED_FIELDS'],
  'groundPoints.ts': ['enter', 'sectionKeys', 'splitStationError', 'stationErrorText'],
  'constants.ts': '*',
  'parse.ts': ['readSingle'],
};
const TYPES_FROM = new Set(['index.ts']);
const NUMBER_FORMATTING = new Set(['toFixed', 'toPrecision', 'toLocaleString', 'NumberFormat']);

export interface Source { file: string; text: string; }

function allowedFor(module: string): readonly string[] | '*' | null {
  if (module.startsWith('geometry/')) return '*';
  return ALLOWED[module] ?? null;
}

/** The solver module a specifier from `file` names, relative to the solver folder, or null. */
function solverModule(file: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const target = posix.normalize(posix.join(posix.dirname(file), spec));
  if (target === SOLVER) return 'index.ts';
  if (!target.startsWith(SOLVER + '/')) return null;
  const rest = target.slice(SOLVER.length + 1);
  return rest.endsWith('.ts') ? rest : `${rest}.ts`;
}

export function violations(sources: readonly Source[]): string[] {
  const out: string[] = [];
  for (const { file, text } of sources) {
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const at = (n: ts.Node) => `${file}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`;
    const checkImport = (node: ts.Node, spec: string, names: { name: string; typeOnly: boolean }[] | 'namespace') => {
      const module = solverModule(file, spec);
      if (module === null) return;
      const allowed = allowedFor(module);
      if (allowed === null) { out.push(`${at(node)} imports solver/${module}, which ui/ may not import`); return; }
      if (allowed === '*') return;
      if (names === 'namespace') { out.push(`${at(node)} imports all of solver/${module}`); return; }
      for (const n of names) {
        if (n.typeOnly && TYPES_FROM.has(module)) continue;
        if (!allowed.includes(n.name)) out.push(`${at(node)} imports ${n.name} from solver/${module}`);
      }
    };
    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const clause = node.importClause;
        const typeOnly = !!clause?.isTypeOnly;
        const names: { name: string; typeOnly: boolean }[] = [];
        let namespace = false;
        if (clause?.name) names.push({ name: 'default', typeOnly });
        const bindings = clause?.namedBindings;
        if (bindings && ts.isNamespaceImport(bindings)) namespace = true;
        if (bindings && ts.isNamedImports(bindings)) {
          for (const e of bindings.elements) names.push({ name: (e.propertyName ?? e.name).text, typeOnly: typeOnly || e.isTypeOnly });
        }
        if (!clause) namespace = true; // a side-effect import runs the whole module
        checkImport(node, node.moduleSpecifier.text, namespace ? 'namespace' : names);
      } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const clause = node.exportClause;
        if (!clause || !ts.isNamedExports(clause)) checkImport(node, node.moduleSpecifier.text, 'namespace');
        else checkImport(node, node.moduleSpecifier.text, clause.elements.map((e) => ({ name: (e.propertyName ?? e.name).text, typeOnly: node.isTypeOnly || e.isTypeOnly })));
      } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const arg = node.arguments[0];
        if (arg && ts.isStringLiteralLike(arg)) checkImport(node, arg.text, 'namespace');
      }
      if (file !== AXIS) {
        if ((ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) && NUMBER_FORMATTING.has(node.text)) {
          out.push(`${at(node)} uses ${node.text}`);
        } else if (ts.isStringLiteralLike(node) && NUMBER_FORMATTING.has(node.text)) {
          out.push(`${at(node)} names ${node.text}`);
        }
      }
      node.forEachChild(visit);
    };
    visit(sf);
  }
  return out;
}

function uiSources(): Source[] {
  const dir = join(ROOT, UI);
  if (!existsSync(dir)) return [];
  const out: Source[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.ts')) out.push({ file: relative(ROOT, p).replaceAll('\\', '/'), text: readFileSync(p, 'utf-8') });
    }
  };
  walk(dir);
  return out.sort((a, b) => a.file.localeCompare(b.file));
}

describe('guard over app/src/ui/', () => {
  it('imports from the solver only what the design allows, and formats no number', () => {
    expect(violations(uiSources())).toEqual([]);
  });

  it('catches each kind of break (fixtures in memory)', () => {
    const f = (file: string, text: string) => violations([{ file: `${UI}/${file}`, text }]);
    expect(f('a.ts', "import { search } from '../solver/search.ts';")).toHaveLength(1);
    expect(f('a.ts', "import { readIrregular } from '../solver/modes/normalDepthIrregular.ts';")).toHaveLength(1);
    expect(f('a.ts', "import { solve, failed } from '../solver/index.ts';")).toEqual([`${UI}/a.ts:1 imports failed from solver/index.ts`]);
    expect(f('a.ts', "import { press } from '../solver/groundPoints.ts';")).toHaveLength(1);
    expect(f('a.ts', "import type { GroundPoint } from '../solver/groundPoints.ts';")).toHaveLength(1);
    expect(f('a.ts', "import * as S from '../solver/index.ts';")).toHaveLength(1);
    expect(f('a.ts', "export { val } from '../solver/parse.ts';")).toHaveLength(1);
    expect(f('a.ts', "const m = import('../solver/search.ts');")).toHaveLength(1);
    expect(f('views/a.ts', "import { store } from '../../solver/single.ts';")).toHaveLength(1);
    expect(f('a.ts', "import { solve, isBuilt, NOT_BUILT, type Result } from '../solver/index.ts';")).toEqual([]);
    expect(f('a.ts', "import type { Mode } from '../solver/index.ts';")).toEqual([]);
    expect(f('a.ts', "import { wet } from '../solver/geometry/prismatic.ts'; import { G } from '../solver/constants.ts';")).toEqual([]);
    expect(f('a.ts', 'const s = (1.5).toFixed(2);')).toHaveLength(1);
    expect(f('a.ts', 'const s = x.toPrecision(3);')).toHaveLength(1);
    expect(f('a.ts', 'const s = x.toLocaleString();')).toHaveLength(1);
    expect(f('a.ts', 'const s = new Intl.NumberFormat().format(x);')).toHaveLength(1);
    expect(f('a.ts', "const s = (x as any)['toFixed'](2);")).toHaveLength(1);
    expect(f('drawing/axis.ts', 'const s = x.toFixed(1);')).toEqual([]);
  });
});
