// Offline numbers for ledger Q-022 (quick2-solver task 3.6): when circle Critical Depth prints
// "DEPTH is Greater than the DIAMETER", and the predictions of results/attempts.md A-007.
//
//   node scripts/q022_boundary.mts observed   the one run that printed it, trial by trial
//   node scripts/q022_boundary.mts rate       how often the rebuild rejects generated practical cases
//   node scripts/q022_boundary.mts a007       A-007's cases under each candidate rule
//
// It uses the rebuild's own search and circle geometry (app/src). It never runs the program and
// never writes a file. `rate` draws its inputs with oracle/generator.py through Python (PYTHON,
// else the .venv).
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { CIRCLE_CD_STEP, CIRCLE_TOL } from '../app/src/solver/constants.ts';
import { diameterFeet } from '../app/src/solver/geometry/circle.ts';
import { circleCriticalDischarge, searchCircle } from '../app/src/solver/modes/circle.ts';
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

const cmd = process.argv[2];
if (cmd === 'observed') observed();
else if (cmd === 'rate') rate();
else if (cmd === 'a007') a007();
else { console.error('usage: node scripts/q022_boundary.mts observed | rate | a007'); process.exit(4); }
