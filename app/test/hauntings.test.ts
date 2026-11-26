// The hauntings reader (quickened-app tasks 6.1, 6.2; criteria 5.3, 5.4, 5.6, 2.2). It reads
// every ## H-NNN entry of the real results/hauntings.md, every Limits entry's **Limits page:**
// paragraph, and every Exact by field line, values as text. Counts are derived from the file,
// never typed. Fixtures for each way an entry or a line can be wrong fail, naming the haunting and
// the field or line.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readHauntings, type PrintedKeys } from '../build/hauntings.ts';
import { golden, ROOT } from './golden.ts';

const TEXT = readFileSync(join(ROOT, 'results', 'hauntings.md'), 'utf-8').replace(/\r\n/g, '\n');
const keysOf: PrintedKeys = (id) => Object.keys(golden(id).printed);
const file = readHauntings(TEXT, keysOf);

const lines = TEXT.split('\n');
const headingIds = lines.map((l) => /^## (H-\d{3}):/.exec(l)?.[1]).filter((x): x is string => !!x);
const limitsAt = lines.indexOf('# Limits');
const limitTitles = lines.slice(limitsAt).map((l) => /^### (.+)$/.exec(l)?.[1]).filter((x): x is string => !!x);
const exactLines = lines.filter((l) => l.startsWith('- **Exact by field ('));

describe('the hauntings reader on the real file', () => {
  it('reads every ## H-NNN entry, H-005 to H-009 included', () => {
    expect(file.hauntings.map((h) => h.id)).toEqual(headingIds);
    for (const id of ['H-005', 'H-006', 'H-007', 'H-008', 'H-009']) expect(headingIds).toContain(id);
  });

  it('gives each entry its title, case ids, printed, Exact answer label, difference and flag', () => {
    for (const h of file.hauntings) {
      const heading = lines.find((l) => l.startsWith(`## ${h.id}: `))!;
      expect(h.title).toBe(heading.slice(`## ${h.id}: `.length));
      expect(h.cases.length, h.id).toBeGreaterThan(0);
      for (const c of h.cases) expect(c, h.id).toMatch(/^(nd|cd|cc|sb)-[a-z]+-\d{6}$/);
      expect(h.printed, h.id).not.toBe('');
      expect(h.exactAnswer, h.id).not.toBe('');
      expect(h.difference, h.id).not.toBe('');
      // The label is the Exact answer bullet's heading after "Exact answer", as the file words it.
      const bulletStart = lines.findIndex((l, i) => i > lines.indexOf(heading) && l.startsWith('- **Exact answer'));
      let joined = lines[bulletStart]!;
      for (let i = bulletStart + 1; lines[i]!.startsWith('  '); i++) joined += ` ${lines[i]!.trim()}`;
      expect(joined.startsWith(`- **Exact answer${h.assumption ? `, ${h.assumption}` : ''}:**`), h.id).toBe(true);
    }
    const flagged = Object.fromEntries(file.hauntings.filter((h) => h.flag !== null).map((h) => [h.id, h.flagCodes]));
    for (const [id, codes] of Object.entries(flagged)) expect(codes.length, id).toBeGreaterThan(0);
    // The assumption H-001 states, as the design quotes it.
    expect(file.hauntings.find((h) => h.id === 'H-001')!.assumption.startsWith('with the pocket treated as ineffective')).toBe(true);
  });

  it('reads every Limits entry\'s **Limits page:** paragraph verbatim', () => {
    expect(file.limits.map((l) => l.title)).toEqual(limitTitles);
    for (const l of file.limits) {
      const line = lines.find((x) => x.startsWith('- **Limits page:** ') && x.includes(l.paragraph.slice(0, 40)))!;
      expect(l.paragraph).toBe(line.slice('- **Limits page:** '.length));
    }
  });

  it(`gives the file's ${exactLines.length} Exact by field lines, one for each case an entry names, values as text`, () => {
    const read = file.hauntings.flatMap((h) => h.exactByField);
    expect(read.map((x) => x.line)).toEqual(exactLines);
    for (const h of file.hauntings) {
      expect(h.exactByField.map((x) => x.caseId).sort(), h.id).toEqual([...h.cases].sort());
    }
    for (const x of read) {
      if (x.values === null) { expect(x.line.endsWith(':** none')).toBe(true); continue; }
      for (const [field, value] of Object.entries(x.values)) {
        expect(typeof value).toBe('string');
        expect(x.line).toContain(`${field} ${value}`);
      }
    }
  });
});

describe('the hauntings reader on fixtures', () => {
  const entry = (bullets: string[]) => `# Hauntings\n\n## H-901: a fixture\n\n${bullets.join('\n')}\n\n# Limits\n`;
  const base = [
    '- **Case:** nd-irr-000010. A fixture.',
    '- **QUICK-2 printed:** WS ELEV `1`.',
    '- **Exact answer, with a fixture:** WS ELEV 2.',
    '- **Exact by field (nd-irr-000010):** ws_elev 2',
    '- **Difference:** 1 ft.',
  ];
  const without = (prefix: string) => base.filter((b) => !b.startsWith(prefix));
  const read = (bullets: string[]) => () => readHauntings(entry(bullets), keysOf);

  it('passes on a well-formed entry', () => {
    expect(read(base)().hauntings[0]!.exactByField[0]!.values).toEqual({ ws_elev: '2' });
  });

  for (const [field, prefix] of [['Case', '- **Case:**'], ['QUICK-2 printed', '- **QUICK-2 printed:**'], ['Exact answer', '- **Exact answer'], ['Difference', '- **Difference:**']] as const) {
    it(`fails on an entry with no ${field} bullet, naming the entry and the field`, () => {
      expect(read(without(prefix))).toThrow(new RegExp(`H-901.*${field}`));
    });
  }

  it('fails on a Limits entry with no **Limits page:** paragraph', () => {
    const text = `${entry(base)}\n### A limit\n\n- **Cases:** x.\n`;
    expect(() => readHauntings(text, keysOf)).toThrow(/A limit.*Limits page/);
  });

  const exact = (...ls: string[]) => [...without('- **Exact by field'), ...ls];
  const cases: [string, string[], RegExp][] = [
    ['no line for a named case', exact(), /H-901.*nd-irr-000010.*no Exact by field line/],
    ['two lines for one case', exact(base[3]!, base[3]!), /H-901.*more than one Exact by field line.*nd-irr-000010/],
    ['a line for a case not named', exact(base[3]!, '- **Exact by field (nd-irr-000006):** ws_elev 2'), /H-901.*nd-irr-000006.*not named/],
    ['a line that does not match the form', exact('- **Exact by field (nd-irr-000010):** ws_elev=2'), /H-901.*ws_elev=2.*does not match/],
    ['a field not in the case golden\'s printed', exact('- **Exact by field (nd-irr-000010):** no_such_field 2'), /H-901.*no_such_field.*not a printed field/],
    ['a field twice', exact('- **Exact by field (nd-irr-000010):** area 2; area 3'), /H-901.*area.*twice/],
    ['a value that is not a number', exact('- **Exact by field (nd-irr-000010):** area 2.3.4'), /H-901.*2\.3\.4.*not a number/],
  ];
  for (const [name, bullets, message] of cases) {
    it(`fails the build on ${name}, naming the haunting and the line (criterion 5.6)`, () => {
      expect(read(bullets)).toThrow(message);
    });
  }
});
