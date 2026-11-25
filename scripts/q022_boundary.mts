// Offline numbers for ledger Q-022 (quick2-solver task 3.6): when circle Critical Depth prints
// "DEPTH is Greater than the DIAMETER", and the predictions of results/attempts.md A-007.
//
//   node scripts/q022_boundary.mts observed   the one run that printed it, trial by trial
//   node scripts/q022_boundary.mts rate       how often the rebuild rejects generated practical cases
//   node scripts/q022_boundary.mts a007       A-007's cases under each candidate rule
//   node scripts/q022_boundary.mts grade-a007 A-008: QUICK-2's four answers against A-007 as committed
//
// It uses the rebuild's own search and circle geometry (app/src). It never runs the program and
// never writes a file. `rate` draws its inputs with oracle/generator.py through Python (PYTHON,
// else the .venv). `grade-a007` reads A-007 from git, the result from the stored golden, and
// each rejection from the run folder that ledger decision 75 names (oracle/out, not committed).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { CIRCLE_CD_STEP, CIRCLE_TOL } from '../app/src/solver/constants.ts';
import { diameterFeet } from '../app/src/solver/geometry/circle.ts';
import { circleCriticalDischarge, DEPTH_ABOVE_DIAMETER, searchCircle } from '../app/src/solver/modes/circle.ts';
import { solve } from '../app/src/solver/index.ts';
import { store } from '../app/src/solver/single.ts';

const ROOT = join(import.meta.dirname, '..');
type Inputs = { diameter: string; n: string; discharge: string; slope: string };

const job = (i: Inputs) => solve({ mode: 'critical_depth', shape: 'circle', inputs: i });

/** The 0.2 ft trials up to the first past the diameter, with A·√(gA/T) at each. */
function trials(diameterIn: number): { y: number; f: number }[] {
  const D = diameterFeet(diameterIn);
  const F = circleCriticalDischarge(D);
  const out: { y: number; f: number }[] = [];
  for (let y = store(CIRCLE_CD_STEP); ; y = store(y + CIRCLE_CD_STEP)) {
    if (y > D) { out.push({ y, f: NaN }); return out; }
    out.push({ y, f: store(F(y)) });
  }
}

/** The largest q that still gives a result: the last trial inside the pipe, over 1 - 0.5%. */
function boundary(diameterIn: number): { yLast: number; fLast: number; qMax: number } {
  const t = trials(diameterIn).filter((x) => !Number.isNaN(x.f));
  const last = t[t.length - 1]!;
  return { yLast: last.y, fLast: last.f, qMax: last.f / (1 - CIRCLE_TOL) };
}

/** Share f of the diameter at which A·√(gA/T) equals q (bisection on the rebuild's function). */
function shareAt(diameterIn: number, q: number): number {
  const D = diameterFeet(diameterIn);
  const F = circleCriticalDischarge(D);
  let lo = 0.01, hi = 0.999;
  for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (F(m * D) < q) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

const outcome0p1 = (i: Inputs) => {
  const D = diameterFeet(Number(i.diameter));
  const r = searchCircle(circleCriticalDischarge(D), Number(i.discharge), D, 0.1);
  return r.ok ? `result (search depth ${r.y.toFixed(5)})` : 'rejected';
};

const OBSERVED: Inputs = { diameter: '9.1', n: '.0216', discharge: '2', slope: '1.9915' };

function observed(): void {
  const d = Number(OBSERVED.diameter);
  console.log(`Run 20261122-214714-6aaf2d: Diameter ${d} in (${diameterFeet(d).toFixed(5)} ft), Discharge ${OBSERVED.discharge}`);
  for (const t of trials(d)) {
    const yd = (t.y / diameterFeet(d)).toFixed(3);
    console.log(Number.isNaN(t.f) ? `  trial ${t.y.toFixed(1)} ft (${yd} D): past the diameter` : `  trial ${t.y.toFixed(1)} ft (${yd} D): ${t.f.toFixed(3)} cfs`);
  }
  console.log(`  rebuild, 0.2 ft: ${job(OBSERVED).outcome} ${job(OBSERVED).message ?? ''}`);
  console.log(`  0.1 ft grid, same ceiling: ${outcome0p1(OBSERVED)}`);
  console.log(`  share of D where A·√(gA/T) = 2: ${shareAt(d, 2).toFixed(3)}; at 0.9 D: ${store(circleCriticalDischarge(diameterFeet(d))(0.9 * diameterFeet(d))).toFixed(3)} cfs`);
}

function rate(): void {
  const SEED = 20261126, COUNT = 2000;
  const py = process.env.PYTHON ?? [join(ROOT, '.venv', 'Scripts', 'python.exe'), join(ROOT, '.venv', 'bin', 'python')].find(existsSync) ?? 'python';
  const code = 'import json\nfrom oracle import generator, profile\np=profile.load()\n' +
    `print(json.dumps(generator.generate(p,${SEED},${COUNT},modes=["critical_depth"],shapes=["circle"],existing_ids=[],range_set="practical")))`;
  const drawn = JSON.parse(execFileSync(py, ['-c', code], { cwd: ROOT, encoding: 'utf-8', maxBuffer: 1 << 26 })) as { inputs: Inputs }[];
  const rej = drawn.filter((c) => job(c.inputs).outcome === 'rejected');
  const ds = rej.map((c) => Number(c.inputs.diameter)).sort((a, b) => a - b);
  console.log(`seed ${SEED}, ${drawn.length} practical Critical Depth circles: ${rej.length} rejected (${(100 * rej.length / drawn.length).toFixed(2)}%)`);
  console.log(`rejected diameters (in): ${ds.join(', ')}`);
  const small = drawn.filter((c) => Number(c.inputs.diameter) < 24);
  console.log(`of the ${small.length} pipes under 24 in: ${rej.length} rejected (${(100 * rej.length / small.length).toFixed(1)}%)`);
}

export const A007: { id: string; inputs: Inputs }[] = [
  { id: 'P1', inputs: { diameter: '10.1', n: '.013', discharge: '3', slope: '.005' } },
  { id: 'P2', inputs: { diameter: '10.1', n: '.013', discharge: '4', slope: '.005' } },
  { id: 'P3', inputs: { diameter: '11.9', n: '.013', discharge: '3', slope: '.005' } },
  { id: 'P4', inputs: { diameter: '11.9', n: '.013', discharge: '4', slope: '.005' } },
];

function a007(): void {
  const fMax = shareAt(Number(OBSERVED.diameter), Number(OBSERVED.discharge));
  console.log(`Fixed-share rules consistent with the observed run: reject when q > A·√(gA/T) at f·D, f < ${fMax.toFixed(3)}`);
  for (const d of [10.1, 11.9]) {
    const b = boundary(d);
    console.log(`Diameter ${d}: last 0.2 ft trial ${b.yLast.toFixed(1)} ft (${(b.yLast / diameterFeet(d)).toFixed(3)} D), ${b.fLast.toFixed(3)} cfs; rebuild gives a result up to q = ${b.qMax.toFixed(3)}`);
  }
  for (const c of A007) {
    const r = job(c.inputs);
    const f = shareAt(Number(c.inputs.diameter), Number(c.inputs.discharge));
    console.log(`\n${c.id}: ${JSON.stringify(c.inputs)}`);
    console.log(`  0.2 ft (rebuild): ${r.outcome}${r.message ? ' "' + r.message + '"' : ''}${r.raw.search_depth ? ` (search depth ${r.raw.search_depth.toFixed(5)})` : ''}`);
    console.log(`  0.1 ft grid: ${outcome0p1(c.inputs)}`);
    console.log(`  fixed share: a result only if f >= ${f.toFixed(3)}; every f < ${fMax.toFixed(3)} ${f >= fMax ? 'rejects' : 'below ' + f.toFixed(3) + ' rejects, above it gives a result'}`);
    if (r.outcome === 'result') console.log('  printed: ' + Object.entries(r.printed).map(([k, v]) => `${k} \`${v.trim()}\``).join(', '));
  }
}

// ---- A-008: grade the A-007 runs against A-007 as committed --------------------------------
/** The commit that holds A-007 as written before the runs. */
const A007_COMMIT = 'dcd4e85';
/** The ledger decision that lists the A-007 runs (the Exhumer's, 2026-11-24). */
const A007_DECISION = 75;
const RESULT_KEYS: Record<string, string> = {
  Diameter: 'in_diameter', n: 'in_n', Discharge: 'in_discharge', Depth: 'depth', Slope: 'in_slope',
  'Critical Slope': 'critical_slope', Area: 'area', 'Wet Per': 'wet_perimeter', Velocity: 'velocity',
  'Hyd R': 'hyd_radius', 'Top Width': 'top_width', 'Froude #': 'froude', 'Max Discharge': 'max_discharge',
  'Flow Type': 'flow_type',
};
interface A007Row { id: string; inputs: Inputs; r1: string; g1: string; sf: string }
interface Observation { outcome: 'result' | 'rejected' | 'other'; source: string; printed?: Record<string, string>; screen?: string[] }

function a007AsCommitted(): { fMax: number; rows: A007Row[]; fields: Map<string, Record<string, string>> } {
  const text = execFileSync('git', ['show', `${A007_COMMIT}:results/attempts.md`], { cwd: ROOT, encoding: 'utf-8' });
  const start = text.indexOf('## A-007');
  if (start < 0) throw new Error(`no A-007 section at ${A007_COMMIT}`);
  const rest = text.slice(start + 1);
  const end = rest.search(/\n## /);
  const lines = (end < 0 ? rest : rest.slice(0, end)).split('\n');
  const cells = (l: string) => l.split('|').slice(1, -1).map((c) => c.trim());
  const rows: A007Row[] = [];
  const fields = new Map<string, Record<string, string>>();
  let fMax = NaN;
  let header: string[] = [];
  for (const l of lines) {
    if (!l.startsWith('| ')) continue;
    const c = cells(l);
    if (c[0] === 'Case') {
      header = c;
      const m = /S\(f\), f < ([\d.]+)/.exec(l);
      if (m) fMax = Number(m[1]);
      continue;
    }
    if (!/^P\d$/.test(c[0]!)) continue;
    if (header.includes('R1 (rebuild)')) {
      rows.push({ id: c[0]!, inputs: { diameter: c[1]!, n: c[2]!, discharge: c[3]!, slope: c[4]! }, r1: c[5]!, g1: c[6]!, sf: c[7]! });
    } else if (header.includes('Critical Slope')) {
      const rec: Record<string, string> = {};
      header.slice(1).forEach((h, i) => { rec[RESULT_KEYS[h]!] = c[i + 1]!; });
      fields.set(c[0]!, rec);
    }
  }
  if (rows.length !== 4 || Number.isNaN(fMax)) throw new Error(`A-007 at ${A007_COMMIT}: read ${rows.length} rows, f bound ${fMax}`);
  return { fMax, rows, fields };
}

const sameInputs = (a: Record<string, string>, b: Record<string, string>) =>
  Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([k, v]) => b[k] === v);

/** What QUICK-2 did for these inputs: a stored golden, else a run listed in ledger decision 75. */
function observe(inputs: Inputs): Observation {
  const cases = join(ROOT, 'oracle', 'goldens', 'cases');
  for (const n of readdirSync(cases).filter((x) => x.endsWith('.json'))) {
    const g = JSON.parse(readFileSync(join(cases, n), 'utf-8'));
    if (g.mode === 'critical_depth' && g.shape === 'circle' && sameInputs(g.inputs, inputs)) {
      return { outcome: g.outcome === 'result' ? 'result' : 'other', source: g.id, printed: g.printed };
    }
  }
  const ledger = JSON.parse(readFileSync(join(ROOT, 'results', 'ledger.json'), 'utf-8'));
  const d = ledger.decisions.find((x: { n: number }) => x.n === A007_DECISION);
  if (!d) throw new Error(`ledger decision ${A007_DECISION} not found`);
  for (const id of d.evidence as string[]) {
    const dir = join(ROOT, 'oracle', 'out', 'runs', id);
    if (!existsSync(join(dir, 'run.json'))) continue;
    const run = JSON.parse(readFileSync(join(dir, 'run.json'), 'utf-8'));
    if (run.mode !== 'critical_depth' || run.shape !== 'circle' || !sameInputs(run.inputs, inputs)) continue;
    const screen = readFileSync(join(dir, 'final.txt'), 'utf-8').split(/\r?\n/);
    const said = screen.some((l) => l.includes(DEPTH_ABOVE_DIAMETER));
    return { outcome: run.outcome === 'timeout' && run.screen_id === 'cd_form' && said ? 'rejected' : 'other', source: `run ${id}`, screen };
  }
  throw new Error(`no golden and no run folder for ${JSON.stringify(inputs)}; ledger decision ${A007_DECISION} lists the runs (oracle/out is not committed)`);
}

/** The share threshold a cell names: "a result needs f ≥ X" or "result for f ≥ X". */
const shareThreshold = (cell: string) => {
  const m = /f ≥ ([\d.]+)/.exec(cell);
  if (!m) throw new Error(`no threshold in "${cell}"`);
  return Number(m[1]);
};

function gradeA007(): void {
  const { fMax, rows, fields } = a007AsCommitted();
  console.log(`A-007 read from ${A007_COMMIT}: ${rows.length} cases, S(f) for f < ${fMax}, predicted fields for ${[...fields.keys()].join(' and ')}.`);
  const score = { R1: 0, G1: 0 };
  let lo = 0, hi = fMax;
  for (const p of rows) {
    const o = observe(p.inputs);
    const said = o.outcome;
    const verdict = (cell: string) => (cell.startsWith(said) ? 'right' : 'wrong');
    if (verdict(p.r1) === 'right') score.R1++;
    if (verdict(p.g1) === 'right') score.G1++;
    const t = shareThreshold(p.sf);
    if (said === 'rejected') hi = Math.min(hi, t); else if (said === 'result') lo = Math.max(lo, t);
    console.log(`\n${p.id} ${JSON.stringify(p.inputs)}: QUICK-2 ${said} (${o.source})`);
    console.log(`  R1 predicted "${p.r1}": ${verdict(p.r1)}`);
    console.log(`  G1 predicted "${p.g1}": ${verdict(p.g1)}`);
    console.log(`  S(f): a result needs f ≥ ${t}; this outcome leaves f ${said === 'rejected' ? '<' : '≥'} ${t}`);
    if (said === 'rejected' && o.screen) {
      const row = o.screen.findIndex((l) => l.includes(DEPTH_ABOVE_DIAMETER));
      const depth = o.screen.find((l) => l.includes('Depth (ft)'));
      const outputs = o.screen.filter((l) => /Area \(sq ft\)|Velocity \(ft\/s\)|Top Width \(ft\)|Max Discharge\(cfs\)/.test(l));
      const blank = outputs.every((l) => !/\d/.test(l.replace(/\(sq ft\)|\(ft\/s\)|\(ft\)|\(cfs\)/g, '')));
      console.log(`  screen: message on 0-based row ${row}; Depth field \`${/Depth \(ft\)\s+(\S+)/.exec(depth ?? '')?.[1] ?? ''}\`; output fields ${blank ? 'all blank' : 'NOT blank'}`);
    }
    const pred = fields.get(p.id);
    if (pred && said === 'result' && o.printed) {
      const diff = Object.entries(pred).filter(([k, v]) => o.printed![k]!.trim() !== v).map(([k, v]) => `${k} predicted \`${v}\`, printed \`${o.printed![k]!.trim()}\``);
      console.log(`  printed fields under R1: ${Object.keys(pred).length - diff.length} of ${Object.keys(pred).length} as predicted${diff.length ? '; ' + diff.join('; ') : ''}`);
    } else if (pred) {
      console.log(`  A-007 predicted fields for ${p.id}; QUICK-2 printed none`);
    }
  }
  console.log(`\nOutcomes: R1 ${score.R1} of ${rows.length}, G1 ${score.G1} of ${rows.length}.`);
  console.log(lo < hi ? `S(f) fits all ${rows.length} for ${lo} ≤ f < ${hi}.` : `No S(f) with f < ${fMax} fits all ${rows.length}.`);
}

const cmd = process.argv[2];
if (cmd === 'observed') observed();
else if (cmd === 'rate') rate();
else if (cmd === 'a007') a007();
else if (cmd === 'grade-a007') gradeA007();
else { console.error('usage: node scripts/q022_boundary.mts observed | rate | a007 | grade-a007'); process.exit(4); }
