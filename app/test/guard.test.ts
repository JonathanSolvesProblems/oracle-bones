// Guard tests (design: When the rebuild and the oracle disagree, rules 1 to 3).
//
// Rule 2: no case id and no golden path in the solver or format source. Case ids are allowed
//   in one place only: the `@cite` comments of constants.ts, which no code can read.
// Rule 3: numeric literals other than 0, 1, 2 (and -1, written as minus 1) appear only in
//   constants.ts and in layout.ts's WINDOWS table, which is a copy of the profile's windows
//   checked by layout.test.ts. Every constant in constants.ts carries a `@cite`. No literal
//   anywhere equals a printed golden value of three or more characters containing a digit,
//   except the constants listed in COINCIDENCES, each with its reason.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { ROOT, goldens } from './golden.ts';

const FOLDERS = ['app/src/solver', 'app/src/format'];
const CONSTANTS = 'app/src/solver/constants.ts';
const LAYOUT = 'app/src/format/layout.ts';
const EXEMPT_TABLE = 'WINDOWS';
const CASE_ID = /(nd|cd|cc|sb|obs)-[a-z]+-\d{6}/;
const ALLOWED_NUMBERS = new Set([0, 1, 2]);

/** Constants whose value happens to equal a printed value somewhere, and why that is fine. */
const COINCIDENCES: Record<string, string> = {
  G: 'g = 32.2 ft/s² is physics; 32.2 is also printed as a field value in some goldens',
  PRISMATIC_STEP: 'the 0.5 ft search step; 0.5 is also a printed Froude number',
  IRREGULAR_START: 'the 0.1 ft start above the lowest point; 0.1 is also a printed value',
  IRREGULAR_STEP: 'the 0.5 ft irregular search step; 0.5 is also a printed Froude number',
  CIRCLE_STEP: 'the 0.1 ft circle search step; 0.1 is also a printed value',
  CIRCLE_CD_STEP: 'the 0.2 ft circle Critical Depth search step; 0.2 is also a printed Froude number and Hyd Radius',
};

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.ts')) out.push(relative(ROOT, p).replaceAll('\\', '/'));
    }
  };
  for (const f of FOLDERS) walk(join(ROOT, f));
  return out.sort();
}

function parse(file: string): ts.SourceFile {
  return ts.createSourceFile(file, readFileSync(join(ROOT, file), 'utf-8'), ts.ScriptTarget.Latest, true);
}

/** The source text with every comment removed. */
function withoutComments(sf: ts.SourceFile): string {
  const printer = ts.createPrinter({ removeComments: true });
  return printer.printFile(sf);
}

function visit(node: ts.Node, fn: (n: ts.Node) => void): void {
  fn(node);
  node.forEachChild((c) => visit(c, fn));
}

/** The name of the top-level variable a node belongs to, if any. */
function topVariable(node: ts.Node): string | null {
  let n: ts.Node | undefined = node;
  while (n && !ts.isSourceFile(n)) {
    if (ts.isVariableDeclaration(n) && ts.isVariableStatement(n.parent.parent) && ts.isSourceFile(n.parent.parent.parent)) {
      return n.name.getText();
    }
    n = n.parent;
  }
  return null;
}

interface Literal { file: string; text: string; value: string; owner: string | null; numeric: boolean; line: number; }

function literals(file: string): Literal[] {
  const sf = parse(file);
  const out: Literal[] = [];
  visit(sf, (n) => {
    const line = sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
    if (ts.isNumericLiteral(n) || ts.isBigIntLiteral(n)) {
      out.push({ file, text: n.getText(), value: n.text, owner: topVariable(n), numeric: true, line });
    } else if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) {
      out.push({ file, text: n.getText(), value: n.text, owner: topVariable(n), numeric: false, line });
    }
  });
  return out;
}

function printedValues(): Set<string> {
  const out = new Set<string>();
  for (const g of goldens()) {
    for (const v of Object.values(g.printed)) {
      const t = v.trim();
      if (t.length >= 3 && /\d/.test(t)) out.add(t);
    }
  }
  return out;
}

const files = sourceFiles();

describe('guard: rule 2, no case ids and no golden paths', () => {
  it('finds the source files', () => {
    expect(files).toContain(CONSTANTS);
    expect(files).toContain(LAYOUT);
  });
  for (const file of files) {
    it(`${file} names no case id and no goldens`, () => {
      const sf = parse(file);
      const text = file === CONSTANTS ? withoutComments(sf) : sf.getFullText();
      expect(text).not.toMatch(CASE_ID);
      expect(text).not.toMatch(/goldens/);
    });
  }
});

describe('guard: rule 3, no printed value typed into the source', () => {
  it('numeric literals other than 0, 1 and 2 appear only in constants.ts and WINDOWS', () => {
    const bad = files.flatMap(literals).filter((l) => l.numeric
      && !ALLOWED_NUMBERS.has(Number(l.value))
      && l.file !== CONSTANTS
      && !(l.file === LAYOUT && l.owner === EXEMPT_TABLE));
    expect(bad.map((l) => `${l.file}:${l.line} ${l.text}`)).toEqual([]);
  });

  it('every constant in constants.ts carries a citation', () => {
    const sf = parse(CONSTANTS);
    const missing: string[] = [];
    let count = 0;
    for (const st of sf.statements) {
      if (!ts.isVariableStatement(st)) continue;
      for (const d of st.declarationList.declarations) {
        count += 1;
        const cite = ts.getJSDocTags(d).find((t) => t.tagName.text === 'cite');
        const text = typeof cite?.comment === 'string' ? cite.comment : ts.getTextOfJSDocComment(cite?.comment);
        if (!text || !text.trim()) missing.push(d.name.getText());
      }
    }
    expect(count).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });

  it('no literal equals a printed golden value', () => {
    const printed = printedValues();
    const hits = files.flatMap(literals).filter((l) => {
      const asWritten = l.numeric ? l.text : l.value.trim();
      const asNumber = l.numeric ? String(Number(l.value)) : asWritten;
      return (printed.has(asWritten) || printed.has(asNumber))
        && !(l.file === CONSTANTS && l.owner !== null && l.owner in COINCIDENCES);
    });
    expect(hits.map((l) => `${l.file}:${l.line} ${l.text}`)).toEqual([]);
  });

  it('each listed coincidence is still a constant in constants.ts', () => {
    const owners = new Set(literals(CONSTANTS).map((l) => l.owner));
    for (const name of Object.keys(COINCIDENCES)) expect(owners).toContain(name);
  });
});
