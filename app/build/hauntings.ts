// Reads results/hauntings.md for the app (quickened-app design: Exact values by field; criteria
// 2.2, 5.3, 5.4, 5.6). Every ## H-NNN entry with its title, case ids, what QUICK-2 printed, the
// Exact answer and its label, the difference and the flag; every Exact by field line, values kept
// as the file writes them; and the **Limits page:** paragraph of every Limits entry. A missing
// part or a malformed line fails the build, naming the entry and the part or the line. The pages
// are fed from the file, never copied from it (criterion 5.4).

export interface Bullet { label: string; text: string; }

export interface ExactLine {
  caseId: string;
  /** The line as the file writes it. */
  line: string;
  /** Field to value, as text; null for `none`. */
  values: Readonly<Record<string, string>> | null;
}

export interface Haunting {
  id: string;
  title: string;
  /** The full case ids of the Case or Cases bullet, in order. */
  cases: string[];
  caseText: string;
  printed: string;
  exactAnswer: string;
  /** The Exact answer bullet's label after "Exact answer", such as "with the pocket treated as ineffective (...)". */
  assumption: string;
  difference: string;
  flag: string | null;
  /** The flag codes the Flag bullet names in backquotes. */
  flagCodes: string[];
  exactByField: ExactLine[];
  /** Every bullet of the entry in the file's order, for the limits page. */
  bullets: Bullet[];
}

export interface LimitEntry { title: string; paragraph: string; }

export interface HauntingsFile { hauntings: Haunting[]; limits: LimitEntry[]; }

/** The printed keys of a case's golden; throws when the golden is missing. */
export type PrintedKeys = (caseId: string) => readonly string[];

const CASE_ID = /\b(?:nd|cd|cc|sb)-[a-z]+-\d{6}\b/g;
const EXACT_LINE = /^- \*\*Exact by field \((?<id>(nd|cd|cc|sb)-[a-z]+-\d{6})\):\*\* (?<body>.+)$/;
const PAIR = /^(?<field>[a-z_]+) (?<value>\S+)$/;
const VALUE = /^-?\d+(\.\d+)?(E[+-]\d+)?$/;

interface RawBullet { label: string; text: string; lines: string[]; }

/** The bullets of a block: a line starting "- **" begins one, indented lines continue it. */
function bulletsOf(block: readonly string[]): RawBullet[] {
  const groups: string[][] = [];
  for (const line of block) {
    if (line.startsWith('- **')) groups.push([line]);
    else if (groups.length && line.startsWith('  ')) groups[groups.length - 1]!.push(line);
    else if (groups.length && line.trim() !== '' && !line.startsWith('#')) groups[groups.length - 1]!.push(line);
  }
  return groups.map((lines) => {
    const joined = lines.map((l, i) => (i === 0 ? l : l.trim())).join('\n');
    const m = /^- \*\*([\s\S]+?)\*\*[ \n]?([\s\S]*)$/.exec(joined)!;
    const label = m[1]!.replace(/\s*\n\s*/g, ' ');
    return { label: label.endsWith(':') ? label.slice(0, -1) : label, text: m[2]!.trim(), lines };
  });
}

function fail(where: string, why: string): never {
  throw new Error(`results/hauntings.md: ${where}: ${why}`);
}

function exactLine(id: string, b: RawBullet, named: readonly string[], printedKeys: PrintedKeys): ExactLine {
  const line = b.lines.join(' ');
  const m = b.lines.length === 1 ? EXACT_LINE.exec(line) : null;
  if (!m) fail(id, `the line "${line}" does not match the Exact by field form`);
  const caseId = m.groups!.id!;
  if (!named.includes(caseId)) fail(id, `the line "${line}" names ${caseId}, which the Case or Cases line has not named`);
  const body = m.groups!.body!;
  if (body === 'none') return { caseId, line, values: null };
  const keys = printedKeys(caseId);
  const values: Record<string, string> = {};
  for (const part of body.split('; ')) {
    const p = PAIR.exec(part);
    if (!p) fail(id, `the line "${line}" does not match the Exact by field form at "${part}"`);
    const { field, value } = p.groups as { field: string; value: string };
    if (!keys.includes(field)) fail(id, `the line "${line}" names ${field}, which is not a printed field of ${caseId}'s golden`);
    if (field in values) fail(id, `the line "${line}" names ${field} twice`);
    if (!VALUE.test(value)) fail(id, `the line "${line}" gives ${field} the value ${value}, which is not a number`);
    values[field] = value;
  }
  return { caseId, line, values };
}

function haunting(id: string, title: string, block: readonly string[], printedKeys: PrintedKeys): Haunting {
  const bullets = bulletsOf(block);
  const one = (name: string, test: (label: string) => boolean): RawBullet => {
    const b = bullets.find((x) => test(x.label));
    if (!b) fail(id, `no **${name}** bullet`);
    return b;
  };
  const caseBullet = one('Case', (l) => l === 'Case' || l === 'Cases');
  const cases = [...new Set(caseBullet.text.match(CASE_ID) ?? [])];
  if (cases.length === 0) fail(id, 'the Case or Cases bullet names no case id');
  const exact = one('Exact answer', (l) => l === 'Exact answer' || l.startsWith('Exact answer,'));
  const flag = bullets.find((b) => b.label === 'Flag') ?? null;
  const exactByField = bullets.filter((b) => b.label.startsWith('Exact by field'))
    .map((b) => exactLine(id, b, cases, printedKeys));
  for (const c of cases) {
    const n = exactByField.filter((x) => x.caseId === c).length;
    if (n === 0) fail(id, `${c} has no Exact by field line`);
    if (n > 1) fail(id, `more than one Exact by field line for ${c}`);
  }
  return {
    id, title, cases, caseText: caseBullet.text,
    printed: one('QUICK-2 printed', (l) => l === 'QUICK-2 printed').text,
    exactAnswer: exact.text,
    assumption: exact.label.replace(/^Exact answer,?\s*/, ''),
    difference: one('Difference', (l) => l === 'Difference').text,
    flag: flag?.text ?? null,
    flagCodes: flag ? [...flag.text.matchAll(/`([a-z_]+)`/g)].map((x) => x[1]!) : [],
    exactByField,
    bullets: bullets.map(({ label, text }) => ({ label, text })),
  };
}

export function readHauntings(source: string, printedKeys: PrintedKeys): HauntingsFile {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const limitsAt = lines.indexOf('# Limits');
  const top = limitsAt < 0 ? lines : lines.slice(0, limitsAt);
  const hauntings: Haunting[] = [];
  const heads = top.flatMap((l, i) => (/^## H-\d{3}: /.test(l) ? [i] : []));
  heads.forEach((at, k) => {
    const m = /^## (H-\d{3}): (.+)$/.exec(top[at]!)!;
    hauntings.push(haunting(m[1]!, m[2]!.trim(), top.slice(at + 1, heads[k + 1] ?? top.length), printedKeys));
  });
  const limits: LimitEntry[] = [];
  if (limitsAt >= 0) {
    const rest = lines.slice(limitsAt);
    const limitHeads = rest.flatMap((l, i) => (l.startsWith('### ') ? [i] : []));
    limitHeads.forEach((at, k) => {
      const title = rest[at]!.slice(4).trim();
      const b = bulletsOf(rest.slice(at + 1, limitHeads[k + 1] ?? rest.length)).find((x) => x.label === 'Limits page');
      if (!b) fail(title, 'no **Limits page:** paragraph');
      limits.push({ title, paragraph: b.text.replace(/\n/g, ' ') });
    });
  }
  return { hauntings, limits };
}
