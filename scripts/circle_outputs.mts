// Offline scoring for the circle-outputs bugfix spec: reproduces every table of
// results/attempts.md A-004 and prints the predictions of A-005.
//
//   node scripts/circle_outputs.mts a004       every A-004 number, section by section
//   node scripts/circle_outputs.mts a005       A-005's cases and predicted fields
//   node scripts/circle_outputs.mts grade-a005 A-006: the goldens against A-005 as committed
//   node scripts/circle_outputs.mts critical-slope  A-008: cd-circ-000033's Critical Slope
//   node scripts/circle_outputs.mts a009       A-009: the short-chord rule, its scores and predictions
//   node scripts/circle_outputs.mts grade-a009 A-010: QUICK-2's four answers against A-009 as committed
//   node scripts/circle_outputs.mts a011       A-011 and its amendment: trials on the diameter, S1 to S11
//   node scripts/circle_outputs.mts grade-a011 A-012: S1 to S11 against A-011 (b4950f7) and the amendment (3d9bf3a)
//   node scripts/circle_outputs.mts a013       A-013: trial, diameter and test combinations on every circle Critical Depth
//                                              observation, the grid scan (about 45 min), and predictions
//   node scripts/circle_outputs.mts a013 predictions   the same without the check and the grid scan
//   node scripts/circle_outputs.mts a013-amendment     the A-013 amendment: T8 to T10, the survivors, R3 and R5 at 1 ± 1e-6,
//                                              every case at 1 ± 1e-4, the cases kept, the groups (seconds)
//   node scripts/circle_outputs.mts grade-a013         A-014: A-013 (69338b5) and its amendment (6ecfb3c) against the
//                                              goldens, the 184 combinations on every circle Critical Depth golden,
//                                              G3's held-out cases, D1 against D3 (seconds)
//   node scripts/circle_outputs.mts floor      circle-short-chord 2.7: the least A·√(g·A/T) a pipe gives, the discharges
//                                              under or near it, and 1.4's inputs, today and under T1·D1·X2 (about 1 s)
//   node scripts/circle_outputs.mts a016       A-016: predictions for K1 with T1·D1·X2, every model, the 1 ± ε check (about 3 s)
//   node scripts/circle_outputs.mts design     circle-short-chord design: every circle Critical Depth golden today and under
//                                              2.4 with K1, 20000 generated circles, H-009's exact critical depths (about 1 s)
//   node scripts/circle_outputs.mts grade-a016 A-016's twelve answers against A-016 (414cad4), the 184 combinations on every
//                                              circle Critical Depth outcome, the pipes whose diameter is a stepped trial, and the
//                                              tests on q those pipes rule out (about 2 s)
//
// `grade-a009` reads A-009 from git (80c87fd), each result from the stored golden, and each
// rejection from the run folder that ledger decision 80 names. Run folders are under oracle/out,
// which is not committed, so Q1 and Q2 can be graded only on a machine that holds them.
// grade-a011 does the same with decisions 87 and 88: S1 and S6 from their goldens, the other
// nine from their run folders' final screens.
//
// It builds candidate rules on the rebuild's own form reader and printer (app/src) and compares
// printed fields with the stored goldens. It never runs the program and never writes a file.
// Geometry, trials and stored quantities are single precision (Math.fround), as in app/src.
// A-005 (c) draws its inputs with oracle/generator.py through Python (PYTHON, else the .venv).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { printed } from '../app/src/format/screen.ts';
import { REGULAR_RESULT } from '../app/src/format/layout.ts';
import { echoes, readRegularForm } from '../app/src/solver/forms.ts';
import { solve } from '../app/src/solver/index.ts';
import { maxDischarge } from '../app/src/solver/modes/capacity.ts';
import { circleCriticalDischarge, DEPTH_ABOVE_DIAMETER } from '../app/src/solver/modes/circle.ts';
import { diameterFeet, wetCircle } from '../app/src/solver/geometry/circle.ts';
import { search as appSearch } from '../app/src/solver/search.ts';
import { val } from '../app/src/solver/parse.ts';
import { CIRCLE_CD_STEP, CIRCLE_TOL } from '../app/src/solver/constants.ts';

const ROOT = join(import.meta.dirname, '..');
const CASES = join(ROOT, 'oracle', 'goldens', 'cases');
const f = Math.fround;
const G = 32.2, K = 1.486, PI_Q = 3.1416, EXP_A = 0.667, EXP_B = 0.6667;
type Mode = 'channel_capacity' | 'normal_depth' | 'critical_depth';
type Vals = Record<string, number>;
type Out = Record<string, number | string>;
interface Golden { id: string; mode: Mode; shape: string; inputs: Record<string, string>; outcome: string; printed: Record<string, string> }

// ---- goldens, form, printer --------------------------------------------------------------
const ALL: Golden[] = readdirSync(CASES).filter((n) => n.endsWith('.json')).sort()
  .map((n) => JSON.parse(readFileSync(join(CASES, n), 'utf-8')) as Golden);
const circles = (mode: Mode) => ALL.filter((g) => g.shape === 'circle' && g.mode === mode && g.outcome === 'result');
const byId = (id: string) => ALL.find((g) => g.id === id)!;
function vals(mode: Mode, inputs: Record<string, string>): Vals {
  const r = readRegularForm(mode, 'circle', inputs);
  if (!r.ok) throw new Error(`held: ${JSON.stringify(inputs)}`);
  return r.values as Vals;
}
const show = (mode: Mode, v: Vals, out: Out) => printed(REGULAR_RESULT[mode].circle, { ...echoes(v), ...out } as never) as Record<string, string>;
function misses(g: Golden, p: Record<string, string>, skip: string[] = []): string[] {
  return Object.keys(g.printed).filter((k) => !skip.includes(k) && g.printed[k] !== p[k]).map((k) => `${k} ${g.printed[k]!.trim()}/${(p[k] ?? '').trim()}`);
}

// ---- geometry ----------------------------------------------------------------------------
interface Sec { A: number; P: number; T: number }
type Geo = (D: number, y: number) => Sec;
/** As built: A = r²(θ − sin θ)/2, P = rθ, θ = 2(π/2 − ATN(x/√(1−x²))); `mask` stores r, x, √, ATN, θ, sin θ. */
const thetaGeo = (pi: number, mask = 0): Geo => (D, y) => {
  const s = (bit: number, x: number) => (mask & (1 << bit) ? f(x) : x);
  const r = s(0, D / 2), x = s(1, (r - y) / r), root = s(2, Math.sqrt(1 - x * x)), at = s(3, Math.atan(x / root));
  const th = s(4, 2 * (pi / 2 - at)), sn = s(5, Math.sin(th));
  return { A: f((r * r * (th - sn)) / 2), P: f(r * th), T: f(2 * Math.sqrt(y * (D - y))) };
};
/** Sector minus triangle: α = π/2 − ATN(x/√(1−x²)), A = r²α − (r − y)·T/2, P = 2rα. */
const segGeo = (pi: number): Geo => (D, y) => {
  const r = D / 2, x = (r - y) / r, a = pi / 2 - Math.atan(x / Math.sqrt(1 - x * x)), half = Math.sqrt(y * (D - y));
  return { A: f(r * r * a - (r - y) * half), P: f(2 * r * a), T: f(2 * half) };
};
const GEO_BUILT = thetaGeo(PI_Q), GEO_C2 = segGeo(PI_Q), GEO_C3 = segGeo(Math.PI);
const diam = (v: Vals) => f(v.diameter! / 12);
const manning = (geo: Geo, D: number, y: number, k: number) => { const w = geo(D, y); return f(k * w.A * Math.pow(f(w.A / w.P), EXP_B)); };
const kOf = (v: Vals, s: number) => (K / v.n!) * f(Math.sqrt(s));

// ---- Max Discharge rules -----------------------------------------------------------------
type QmaxRule = (geo: Geo, D: number, k: number) => number;
const atShare = (share: number): QmaxRule => (geo, D, k) => manning(geo, D, f(share * D), k);
// A scan's peak sits at the same trial for every n and slope (k only scales it), so the trial
// with the largest A?R^.6667 is found once per pipe and the discharge is taken there and at its
// neighbours with the case's own k.
const peakCache = new Map<string, number[]>();
const scanFt = (step: number): QmaxRule => (geo, D, k) => {
  const key = `${geo === GEO_C2 ? 'c2' : geo === GEO_BUILT ? 'h0' : String(Math.random())}|${D}|${step}`;
  let ys = peakCache.get(key);
  if (!ys) {
    const all: number[] = []; let bi = 0, bv = -Infinity;
    for (let y = f(step); y < D; y = f(y + step)) { const w = geo(D, y), x = w.A * Math.pow(f(w.A / w.P), EXP_B); if (x > bv) { bv = x; bi = all.length; } all.push(y); }
    ys = all.slice(Math.max(0, bi - 3), bi + 4); peakCache.set(key, ys);
  }
  return Math.max(...ys.map((y) => manning(geo, D, y, k)));
};
const scanShare = (share: number): QmaxRule => (geo, D, k) => { let b = -Infinity; for (let i = 1; i * share < 1; i++) b = Math.max(b, manning(geo, D, f(i * share * D), k)); return b; };
/** A-004 scores with M4 (scan 0.01 ft). A-005 predicts with M2 (.9382·D) and adds the 0.01 ft
 * scan's Max Discharge wherever the two print differently. */
let QMAX_RULE: QmaxRule = scanFt(0.01);

// ---- the depth search ----------------------------------------------------------------------
type After = 'resume' | 'narrow' | 'restep10' | 'secant' | 'bisect';
interface Found { y: number; fy: number; trials: [number, number][]; branch: boolean; onStep: boolean }
/** Steps of `step` from `step`; stop within tol·q; chord on the bracket; `after` when the chord is short. */
function search(F: (y: number) => number, q: number, D: number, step: number, tol: number, after: After): Found | null {
  const close = (x: number) => Math.abs(x - q) <= tol * q;
  const trials: [number, number][] = [];
  const ev = (y: number) => { const x = f(F(y)); trials.push([y, x]); return x; };
  let lo = 0, flo = 0, st = step, y = f(step), branch = false;
  for (let guard = 0; guard < 200000; guard++) {
    if (y > D) return null;
    let fy = ev(y);
    if (close(fy)) return { y, fy, trials, branch, onStep: true };
    if (fy < q) { lo = y; flo = fy; y = f(y + st); continue; }
    let hi = y, fhi = fy;
    for (let k = 0; ; k++) {
      if (k > 500) return null;
      const yc = f(lo + ((q - flo) * (hi - lo)) / (fhi - flo)), fc = ev(yc);
      if (close(fc)) return { y: yc, fy: fc, trials, branch, onStep: false };
      branch = true;
      if (after === 'bisect') {
        const ym = f((lo + hi) / 2), fm = ev(ym);
        if (close(fm)) return { y: ym, fy: fm, trials, branch, onStep: false };
        if (fm < q) { lo = ym; flo = fm; } else { hi = ym; fhi = fm; }
        continue;
      }
      if (fc > q) { hi = yc; fhi = fc; continue; }
      if (after === 'resume') { lo = yc; flo = fc; y = f(yc + st); break; }
      if (after === 'restep10') { lo = yc; flo = fc; st = st / 10; y = f(yc + st); break; }
      if (after === 'narrow') { lo = yc; flo = fc; continue; }
      // secant through the two latest trials (the chord and the lower end)
      const y2 = f(yc + ((q - fc) * (yc - lo)) / (fc - flo)); lo = yc; flo = fc;
      const f2 = ev(y2); if (close(f2)) return { y: y2, fy: f2, trials, branch, onStep: false };
      if (f2 < q) { lo = y2; flo = f2; } else { hi = y2; fhi = f2; }
    }
    fy = 0; void fy;
  }
  return null;
}

// ---- the three modes ---------------------------------------------------------------------
const flowType = (fr: number) => (fr < 1 ? 'SUBCRITICAL' : 'SUPERCRITICAL');
function cc(v: Vals, geo: Geo, qmax: QmaxRule): Out {
  const D = diam(v), k = kOf(v, v.slope!), w = geo(D, v.depth!), R = f(w.A / w.P);
  const q = manning(geo, D, v.depth!, k), vel = f(q / w.A), fr = f(vel / Math.sqrt((G * w.A) / w.T));
  return { discharge: q, area: w.A, wet_perimeter: w.P, velocity: vel, hyd_radius: R, top_width: w.T, froude: fr, max_discharge: qmax(geo, D, k), flow_type: flowType(fr) };
}
interface NdRule { step: number; tol: number; after: After }
const ND_RULE: NdRule = { step: 0.1, tol: 0.005, after: 'resume' };
function nd(v: Vals, geo: Geo, qmax: QmaxRule, rule: NdRule = ND_RULE): { out: Out; found: Found } | null {
  const D = diam(v), q = v.discharge!, k = kOf(v, v.slope!);
  const found = search((y) => { const w = geo(D, y); return k * w.A * Math.pow(f(w.A / w.P), EXP_B); }, q, D, rule.step, rule.tol, rule.after);
  if (!found) return null;
  const w = geo(D, found.y), vel = f(q / w.A), fr = f(vel / Math.sqrt((G * w.A) / w.T));
  return { found, out: { depth: found.y, area: w.A, wet_perimeter: w.P, velocity: vel, hyd_radius: f(w.A / w.P), top_width: w.T, froude: fr, max_discharge: qmax(geo, D, k), flow_type: flowType(fr) } };
}
const qc = (geo: Geo, D: number) => (y: number) => { const w = geo(D, y); return w.A * Math.sqrt((G * w.A) / w.T); };
/** Critical Depth fields at the search depth y; Depth printed y − offset; Velocity q/A or √(gA/T). */
function cdFields(v: Vals, geo: Geo, qmax: QmaxRule, y: number, offset: number, velocity: 'q/A' | 'celerity' = 'q/A', Dft?: number): Out {
  const D = Dft ?? diam(v), q = v.discharge!, n = v.n!, w = geo(D, y), R = f(w.A / w.P), cel = Math.sqrt((G * w.A) / w.T);
  const vel = velocity === 'q/A' ? f(q / w.A) : f(cel);
  const sc = f((((q / w.A) * n) / (K * Math.pow(R, EXP_A))) ** 2);
  return { depth: f(y - offset), critical_slope: sc, area: w.A, wet_perimeter: w.P, velocity: vel, hyd_radius: R, top_width: w.T, froude: f(vel / cel), max_discharge: qmax(geo, D, (K / n) * f(Math.sqrt(sc))), flow_type: 'CRITICAL' };
}
interface CdRule { step: number; tol: number; after: After; offset: number }
const CD_RULE: CdRule = { step: 0.2, tol: 0.005, after: 'resume', offset: 0.01 };
function cd(v: Vals, geo: Geo, qmax: QmaxRule, rule: CdRule = CD_RULE): { out: Out; found: Found } | null {
  const D = diam(v), found = search(qc(geo, D), v.discharge!, D, rule.step, rule.tol, rule.after);
  return found ? { found, out: cdFields(v, geo, qmax, found.y, rule.offset) } : null;
}

// ---- scoring helpers ---------------------------------------------------------------------
function count(mode: Mode, run: (v: Vals, g: Golden) => Out | null, skip: string[] = [], list = false, preprinted = false): number {
  let ok = 0;
  for (const g of circles(mode)) {
    const v = vals(mode, g.inputs), out = run(v, g);
    const d = out ? misses(g, preprinted ? (out as Record<string, string>) : show(mode, v, out), skip) : ['no result'];
    if (!d.length) ok++; else if (list) console.log(`      ${g.id}: ${d.join('; ')}`);
  }
  return ok;
}
const pct = (x: number, q: number) => `${((x / q - 1) * 100).toFixed(3)}%`;
const N = (mode: Mode) => circles(mode).length;
const h = (s: string) => console.log(`\n## ${s}`);
const row = (s: string) => console.log(`  ${s}`);

// ---- A-004 -------------------------------------------------------------------------------
function a004() {
  h('Starting point: the rebuild as built (solve), circle results only');
  for (const mode of ['channel_capacity', 'normal_depth', 'critical_depth'] as Mode[]) {
    const ok = count(mode, (_v, g) => solve({ mode, shape: 'circle', inputs: g.inputs }).printed as Out, [], false, true);
    row(`${mode}: ${ok} of ${N(mode)} results match (the comparator's per-pair counts include held goldens)`);
  }

  h('Channel Capacity: ratio of QUICK-2 discharge to the as-built discharge, interval from the printed digits');
  for (const id of ['cc-circ-000027', 'cc-circ-000028', 'cc-circ-000029', 'cc-circ-000031', 'cc-circ-000032', 'cc-circ-000033']) {
    const g = byId(id), v = vals('channel_capacity', g.inputs), q = cc(v, GEO_BUILT, QMAX_RULE).discharge as number;
    const t = g.printed.discharge!.replace('%', '').trim(), dec = t.includes('.') ? t.split('.')[1]!.length : 0, e = 0.5 * 10 ** -dec;
    row(`${id} y/D ${(v.depth! / diam(v)).toFixed(3)}: printed ${t}, as built ${q.toFixed(2)}, ratio ${((Number(t) - e) / q).toFixed(5)} to ${((Number(t) + e) / q).toFixed(5)}`);
  }

  h('Channel Capacity hypotheses (17 results): Discharge fields that match, results that match with Max Discharge left out');
  const ccRow = (name: string, geo: Geo) => {
    let dq = 0;
    for (const g of circles('channel_capacity')) { const v = vals('channel_capacity', g.inputs); if (show('channel_capacity', v, cc(v, geo, QMAX_RULE)).discharge === g.printed.discharge) dq++; }
    row(`${name}: Discharge ${dq} of ${N('channel_capacity')}, results ${count('channel_capacity', (v) => cc(v, geo, QMAX_RULE), ['max_discharge'])} of ${N('channel_capacity')}`);
  };
  ccRow('H0 as built (θ − sin θ)', GEO_BUILT);
  const g31 = byId('cc-circ-000031'), v31 = vals('channel_capacity', g31.inputs);
  const c1 = [1, 2, 3, 0b10010, 0b110010, 0b111111, 0b011010, 0b001000].map((m) => (cc(v31, thetaGeo(PI_Q, m), QMAX_RULE).discharge as number).toFixed(2));
  row(`C1 stores (8 masks over r, x, √, ATN, θ, sin θ): cc-circ-000031 gives ${[...new Set(c1)].join(', ')}`);
  for (const m of [1, 2, 3, 0b10010, 0b110010, 0b111111, 0b011010, 0b001000]) ccRow(`  C1 mask ${m.toString(2).padStart(6, '0')}`, thetaGeo(PI_Q, m));
  ccRow('C2 sector minus triangle, π = 3.1416', GEO_C2);
  ccRow('C3 sector minus triangle, true π', GEO_C3);
  row(`cc-circ-000031 discharge: C2 ${(cc(v31, GEO_C2, QMAX_RULE).discharge as number).toFixed(2)}, C3 ${(cc(v31, GEO_C3, QMAX_RULE).discharge as number).toFixed(2)}, printed ${g31.printed.discharge!.trim()}`);
  { const D = diam(v31), r = D / 2; row(`π error 3.1416 − π = ${(PI_Q - Math.PI).toExponential(2)}; in α it is half that; r²·Δα at r = ${r.toFixed(1)}: ${(r * r * (PI_Q - Math.PI) / 2).toFixed(4)} sq ft`); }

  h('Max Discharge (C2 geometry)');
  const g27 = byId('cc-circ-000027'), v27 = vals('channel_capacity', g27.inputs), D27 = diam(v27), k27 = kOf(v27, v27.slope!);
  let best = 0, by = 0; for (let y = f(0.01); y < D27; y = f(y + 0.01)) { const m = manning(GEO_C2, D27, y, k27); if (m > best) { best = m; by = y; } }
  row(`2215.5 in pipe: .938·D ${atShare(0.938)(GEO_C2, D27, k27).toFixed(2)} (as-built geometry ${atShare(0.938)(GEO_BUILT, D27, k27).toFixed(2)}), .9382·D ${atShare(0.9382)(GEO_C2, D27, k27).toFixed(2)}, scan 0.01 ft ${best.toFixed(2)} at ${(by / D27).toFixed(5)}·D; printed ${g27.printed.max_discharge!.trim()}`);
  { const w = GEO_C2(D27, 0.938 * D27); row(`  .938·D with nothing stored: ${(k27 * w.A * Math.pow(w.A / w.P, EXP_B)).toFixed(2)}`); }
  const qmaxRows: [string, QmaxRule][] = [['M1 .938·D', atShare(0.938)], ['M2 .9382·D', atShare(0.9382)], ['M3 .94·D', atShare(0.94)], ['M4 scan 0.01 ft', scanFt(0.01)], ['M5 scan 0.001·D', scanShare(0.001)], ['check: scan 0.005 ft', scanFt(0.005)], ['check: scan 0.02 ft', scanFt(0.02)], ['check: scan 0.05 ft', scanFt(0.05)]];
  for (const [name, rule] of qmaxRows) {
    const ccnd = count('channel_capacity', (v) => cc(v, GEO_C2, rule)) + count('normal_depth', (v) => nd(v, GEO_C2, rule)?.out ?? null);
    const all = ccnd + count('critical_depth', (v) => cd(v, GEO_C2, rule)?.out ?? null);
    row(`${name}: CC and ND ${ccnd} of ${N('channel_capacity') + N('normal_depth')}, all circle results ${all} of ${N('channel_capacity') + N('normal_depth') + N('critical_depth')}`);
  }

  h('Q-026: Normal Depth (0.1 ft from 0.1 ft, R^.6667, C2 geometry, Max Discharge M4)');
  for (const g of circles('normal_depth')) {
    const v = vals('normal_depth', g.inputs), r = nd(v, GEO_C2, QMAX_RULE)!;
    row(`${g.id}: stops on ${r.found.branch ? 'the branch after a short chord' : r.found.onStep ? 'a step' : 'the first chord'} at ${r.found.y.toFixed(5)}`);
  }
  { const g = byId('nd-circ-000010'), v = vals('normal_depth', g.inputs), t = nd(v, GEO_C2, QMAX_RULE)!.found.trials; const c = t[t.findIndex(([, x]) => x > v.discharge!) + 1]!; row(`nd-circ-000010 first chord ${c[0].toFixed(4)} at ${pct(c[1], v.discharge!)}`); }
  const ndRows: [string, After, number][] = [['N1 resume 0.1 ft', 'resume', 0.005], ['N2 chord on the narrowed bracket', 'narrow', 0.005], ['N3 resume with 0.01 ft steps', 'restep10', 0.005], ['N4 secant through the two latest trials', 'secant', 0.005], ['N5 bisect after a short chord', 'bisect', 0.005]];
  for (const [name, after, tol] of ndRows) {
    const g = byId('nd-circ-000010'), v = vals('normal_depth', g.inputs), r = nd(v, GEO_C2, QMAX_RULE, { step: 0.1, tol, after })!;
    const p = show('normal_depth', v, r.out);
    row(`${name}: nd-circ-000010 depth ${r.found.y.toFixed(5)} (${pct(r.found.fy, v.discharge!)}, Velocity ${p.velocity!.trim()}); ND ${count('normal_depth', (vv) => nd(vv, GEO_C2, QMAX_RULE, { step: 0.1, tol, after })?.out ?? null)} of ${N('normal_depth')}; with a 1% stop ${count('normal_depth', (vv) => nd(vv, GEO_C2, QMAX_RULE, { step: 0.1, tol: 0.01, after })?.out ?? null)}`);
  }

  h('Q-027 measurement 1 and 2: Critical Depth, every printed field from one depth y, Depth printed y − h (C2, Max Discharge M4)');
  const cds = circles('critical_depth');
  const feasible = (g: Golden, hh: number, velocity: 'q/A' | 'celerity'): [number, number] | null => {
    const v = vals('critical_depth', g.inputs), p = Number(g.printed.depth);
    let a = NaN, b = NaN;
    for (let i = 0; i <= 6000; i++) {
      const y = p + hh - 0.006 + (0.012 * i) / 6000;
      if (!misses(g, show('critical_depth', v, cdFields(v, GEO_C2, QMAX_RULE, f(y), hh, velocity))).length) { if (isNaN(a)) a = y; b = y; }
    }
    return isNaN(a) ? null : [a, b];
  };
  for (const velocity of ['celerity', 'q/A'] as const) {
    const none = cds.filter((g) => !feasible(g, 0.01, velocity)).map((g) => g.id);
    row(`Velocity ${velocity}, h = 0.01: ${cds.length - none.length} of ${cds.length} have a y that prints every field${none.length ? `; none for ${none.join(', ')}` : ''}`);
  }
  for (const hh of [0.007, 0.008, 0.0089, 0.009, 0.0095, 0.01, 0.0101, 0.0105]) {
    const none = cds.filter((g) => !feasible(g, hh, 'q/A')).map((g) => g.id);
    row(`h = ${hh}: ${none.length ? `no y for ${none.join(', ')}` : 'every case has a y'}`);
  }
  h('Q-027 measurement 3: F(y)/q − 1 over the y that print every field (h = 0.01, Velocity q/A)');
  for (const g of cds) {
    const v = vals('critical_depth', g.inputs), r = feasible(g, 0.01, 'q/A')!, F = qc(GEO_C2, diam(v));
    row(`${g.id}: y ${r[0].toFixed(4)} to ${r[1].toFixed(4)}, F/q − 1 ${pct(F(f(r[0])), v.discharge!)} to ${pct(F(f(r[1])), v.discharge!)}`);
  }

  h('Q-027 hypotheses (15 Critical Depth results; C2, Velocity q/A, Max Discharge M4)');
  row(`H0 as built: ${count('critical_depth', (_v, g) => solve({ mode: 'critical_depth', shape: 'circle', inputs: g.inputs }).printed as Out, [], false, true)}`);
  for (const tol of [0.005, 0.01, 0.003, 0.002]) {
    row(`H1 ND search on F(y + 0.01), Depth y, stop ${tol * 100}%: ${count('critical_depth', (v) => {
      const D = diam(v), F = qc(GEO_C2, D), s = search((y) => F(f(y + 0.01)), v.discharge!, D, 0.1, tol, 'resume');
      return s ? { ...cdFields(v, GEO_C2, QMAX_RULE, f(s.y + 0.01), 0.01) } : null;
    })}`);
  }
  const newton = (v: Vals, start: number, fromForward: boolean): Out | null => {
    const D = diam(v), q = v.discharge!, F = qc(GEO_C2, D); let y = f(start);
    for (let i = 0; i < 200; i++) {
      const f1 = f(F(y)), y2 = f(y + 0.01), f2 = f(F(y2));
      if (Math.abs(f2 - q) <= 0.005 * q) return cdFields(v, GEO_C2, QMAX_RULE, y2, 0.01);
      y = f(y + ((q - (fromForward ? f2 : f1)) * 0.01) / (f2 - f1));
      if (!(y > 0 && y < D)) return null;
    }
    return null;
  };
  for (const [sn, s] of [['D/2', 0.5], ['D/4', 0.25], ['0.1 ft', 0], ['.938·D', 0.938], ['.99·D', 0.99]] as [string, number][]) {
    for (const fwd of [true, false]) row(`H2 Newton h = 0.01, start ${sn}, step from F(${fwd ? 'y + h' : 'y'}): ${count('critical_depth', (v) => newton(v, s ? s * diam(v) : 0.1, fwd))}`);
  }
  row(`H3 bisection on [0, D], 0.5%, Depth 0.01 below: ${count('critical_depth', (v) => {
    const D = diam(v), q = v.discharge!, F = qc(GEO_C2, D); let lo = 0, hi = D;
    for (let i = 0; i < 60; i++) { const y = f((lo + hi) / 2), x = f(F(y)); if (Math.abs(x - q) <= 0.005 * q) return cdFields(v, GEO_C2, QMAX_RULE, y, 0.01); if (x < q) lo = y; else hi = y; }
    return null;
  })}`);
  row(`H4 ND search on the geometry depth, 0.1 ft, Depth 0.01 below: ${count('critical_depth', (v) => cd(v, GEO_C2, QMAX_RULE, { ...CD_RULE, step: 0.1 })?.out ?? null)}`);
  row(`H5 the same with 0.2 ft: ${count('critical_depth', (v) => cd(v, GEO_C2, QMAX_RULE)?.out ?? null, [], true)}`);
  row(`check: H5 with Velocity √(gA/T): ${count('critical_depth', (v) => { const r = cd(v, GEO_C2, QMAX_RULE); return r ? cdFields(v, GEO_C2, QMAX_RULE, r.found.y, CD_RULE.offset, 'celerity') : null; }, [], true)}`);

  h('How H5\'s step was found: grids whose trial or first chord lands on a y that prints every field (h = 0.01)');
  const ranges = new Map(cds.map((g) => [g.id, feasible(g, 0.01, 'q/A')!]));
  for (const step of [1, 0.5, 0.25, 0.2, 0.1, 0.05, 0.02]) {
    for (const place of ['geometry depth', 'Depth variable'] as const) {
      const sh = place === 'geometry depth' ? 0 : 0.01;
      const hit = cds.filter((g) => {
        const v = vals('critical_depth', g.inputs), D = diam(v), q = v.discharge!, F = qc(GEO_C2, D), [a, b] = ranges.get(g.id)!;
        const inR = (t: number) => t + sh >= a - 1e-9 && t + sh <= b + 1e-9;
        let lo = 0, flo = 0, y = f(step), fy = f(F(f(y + sh)));
        let any = inR(y);
        while (fy < q) { lo = y; flo = fy; y = f(y + step); fy = f(F(f(y + sh))); any = any || inR(y); }
        return any || inR(f(lo + ((q - flo) * (y - lo)) / (fy - flo)));
      }).length;
      row(`step ${step} ft on the ${place}: ${hit} of ${cds.length}`);
    }
  }

  h('Sensitivity of H5 (checks, not candidates)');
  for (const step of [0.25, 0.5, 1]) row(`step ${step}: ${count('critical_depth', (v) => cd(v, GEO_C2, QMAX_RULE, { ...CD_RULE, step })?.out ?? null)}`);
  for (const tol of [0.0033, 0.0037, 0.004, 0.0076, 0.0094, 0.0095, 0.01]) row(`stop ${(tol * 100).toFixed(2)}%: ${count('critical_depth', (v) => cd(v, GEO_C2, QMAX_RULE, { ...CD_RULE, tol })?.out ?? null, [], true)}`);
  for (const offset of [0.0088, 0.0089, 0.0095, 0.01, 0.0101, 0.0102]) row(`offset ${offset}: ${count('critical_depth', (v) => cd(v, GEO_C2, QMAX_RULE, { ...CD_RULE, offset })?.out ?? null)}`);
  for (const after of ['narrow', 'restep10'] as After[]) row(`after-chord ${after}: ${count('critical_depth', (v) => cd(v, GEO_C2, QMAX_RULE, { ...CD_RULE, after })?.out ?? null)}`);
  for (const g of cds) { const v = vals('critical_depth', g.inputs), r = cd(v, GEO_C2, QMAX_RULE)!; row(`${g.id}: stops at ${r.found.y.toFixed(5)} (${pct(r.found.fy, v.discharge!)}) on ${r.found.branch ? 'the branch' : r.found.onStep ? 'a step' : 'the first chord'}`); }

  h('Boundary and haunting');
  { const g = byId('cd-circ-000010'), v = vals('critical_depth', g.inputs), r = cd(v, GEO_C2, QMAX_RULE)!;
    row(`cd-circ-000010 chord ${r.found.y.toFixed(5)}; Depth with 0.01: ${show('critical_depth', v, r.out).depth!.trim()}, with 0.0101: ${show('critical_depth', v, cdFields(v, GEO_C2, QMAX_RULE, r.found.y, 0.0101)).depth!.trim()}`); }
  { const g = byId('cd-circ-000019'), v = vals('critical_depth', g.inputs), D = diam(v), r = cd(v, GEO_C2, QMAX_RULE)!;
    const ex = (y: number) => { const w = { r: D / 2 }; const x = (w.r - y) / w.r, a = Math.acos(x), half = Math.sqrt(y * (D - y)), A = w.r * w.r * a - (w.r - y) * half; return A * Math.sqrt((G * A) / (2 * half)); };
    let lo = 1e-9, hi = D; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (ex(m) < v.discharge!) lo = m; else hi = m; }
    row(`cd-circ-000019: search depth ${r.found.y.toFixed(4)}, Depth prints ${show('critical_depth', v, r.out).depth!.trim()}, exact critical depth (true π, double precision) ${lo.toFixed(4)}`); }

  h('All rules together (C2, M4, ND N1, CD H5)');
  const tot = count('channel_capacity', (v) => cc(v, GEO_C2, QMAX_RULE), [], true) + count('normal_depth', (v) => nd(v, GEO_C2, QMAX_RULE)?.out ?? null, [], true) + count('critical_depth', (v) => cd(v, GEO_C2, QMAX_RULE)?.out ?? null, [], true);
  row(`${tot} of ${N('channel_capacity') + N('normal_depth') + N('critical_depth')} circle results`);
}

// ---- A-005 -------------------------------------------------------------------------------
const FIELDS: Record<Mode, string[]> = {
  channel_capacity: ['in_diameter', 'in_n', 'discharge', 'in_depth', 'in_slope', 'area', 'wet_perimeter', 'velocity', 'hyd_radius', 'top_width', 'froude', 'max_discharge', 'flow_type'],
  normal_depth: ['in_diameter', 'in_n', 'in_discharge', 'depth', 'in_slope', 'area', 'wet_perimeter', 'velocity', 'hyd_radius', 'top_width', 'froude', 'max_discharge', 'flow_type'],
  critical_depth: ['in_diameter', 'in_n', 'in_discharge', 'depth', 'in_slope', 'critical_slope', 'area', 'wet_perimeter', 'velocity', 'hyd_radius', 'top_width', 'froude', 'max_discharge', 'flow_type'],
};
const line = (mode: Mode, p: Record<string, string>) => FIELDS[mode].map((k) => `\`${p[k]!.trim()}\``).join(' | ');
const inputText = (i: Record<string, string>) => `Diameter ${i.diameter}, n ${i.n}, ${i.depth !== undefined ? `Depth ${i.depth}` : `Discharge ${i.discharge}`}, Slope ${i.slope}`;
let seed = 20261125;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = (lo: number, hi: number, dec: number) => (lo + rnd() * (hi - lo)).toFixed(dec);

const SCAN = scanFt(0.01);
/** When a 0.01 ft scan prints a different Max Discharge from .9382·D, say so. */
const scanNote = (mode: Mode, v: Vals, a: Out, b: Out) => { const x = show(mode, v, a).max_discharge, y = show(mode, v, b).max_discharge; return x === y ? '' : `; with a 0.01 ft scan, Max Discharge \`${y!.trim()}\``; };
function a005() {
  QMAX_RULE = atShare(0.9382);
  console.log(`Fields, in order: ND ${FIELDS.normal_depth.join(', ')}; CD ${FIELDS.critical_depth.join(', ')}; CC ${FIELDS.channel_capacity.join(', ')}.`);
  h('(a) the three Q-026 pipes, Normal Depth');
  for (const inputs of [{ diameter: '72', n: '.025', discharge: '2', slope: '.0231' }, { diameter: '38', n: '.029', discharge: '3', slope: '.0418' }, { diameter: '53', n: '.017', discharge: '2', slope: '.0476' }]) {
    const v = vals('normal_depth', inputs);
    row(`${inputText(inputs)}`);
    for (const [name, after] of [['N1', 'resume'], ['N2', 'narrow'], ['N3', 'restep10'], ['N4', 'secant']] as [string, After][]) {
      const r = nd(v, GEO_C2, QMAX_RULE, { ...ND_RULE, after })!, s = nd(v, GEO_C2, SCAN, { ...ND_RULE, after })!;
      row(`  ${name} (search depth ${r.found.y.toFixed(5)}): ${line('normal_depth', show('normal_depth', v, r.out))}${scanNote('normal_depth', v, r.out, s.out)}`);
    }
  }

  h('(b) Critical Depth where the 0.1 ft and 0.2 ft grids stop on different trials');
  let found = 0;
  for (let i = 0; i < 20000 && found < 3; i++) {
    const inputs = { diameter: pick(8, 180, 1), n: pick(0.008, 0.033, 4), discharge: '0', slope: pick(0.0001, 0.05, 4) };
    const D = Number(inputs.diameter) / 12, cap = qc(GEO_C2, D)(0.9 * D);
    inputs.discharge = String(Math.max(1, Math.round(1 + rnd() * Math.min(cap, 999998))));
    const v = vals('critical_depth', inputs), a = cd(v, GEO_C2, QMAX_RULE), b = cd(v, GEO_C2, QMAX_RULE, { ...CD_RULE, step: 0.1 });
    if (!a || !b) continue;
    const pa = show('critical_depth', v, a.out), pb = show('critical_depth', v, b.out);
    if (pa.depth === pb.depth || pa.area === pb.area) continue;
    found++;
    row(`${inputText(inputs)}`);
    row(`  0.2 ft (H5, the rule as it stands; search depth ${a.found.y.toFixed(5)}): ${line('critical_depth', pa)}${scanNote('critical_depth', v, a.out, cd(v, GEO_C2, SCAN)!.out)}`);
    row(`  0.1 ft (H4; search depth ${b.found.y.toFixed(5)}): ${line('critical_depth', pb)}${scanNote('critical_depth', v, b.out, cd(v, GEO_C2, SCAN, { ...CD_RULE, step: 0.1 })!.out)}`);
  }

  h('(c) eight Critical Depth circles, practical ranges, oracle/generator.py seed 20261125');
  const py = process.env.PYTHON ?? [join(ROOT, '.venv', 'Scripts', 'python.exe'), join(ROOT, '.venv', 'bin', 'python')].find(existsSync) ?? 'python';
  const code = 'import json,glob,os\nfrom oracle import generator, profile\np=profile.load()\nids=[os.path.basename(x)[:-5] for x in glob.glob("oracle/goldens/cases/*.json")]\n' +
    'print(json.dumps(generator.generate(p,20261125,8,modes=["critical_depth"],shapes=["circle"],existing_ids=ids,range_set="practical")))';
  const drawn = JSON.parse(execFileSync(py, ['-c', code], { cwd: ROOT, encoding: 'utf-8' })) as { id: string; inputs: Record<string, string> }[];
  for (const c of drawn) {
    const v = vals('critical_depth', c.inputs), r = cd(v, GEO_C2, QMAX_RULE);
    row(`${c.id} ${inputText(c.inputs)}: ${r ? line('critical_depth', show('critical_depth', v, r.out)) + ` (search depth ${r.found.y.toFixed(5)})` + scanNote('critical_depth', v, r.out, cd(v, GEO_C2, SCAN)!.out) : 'no result: the search passes the diameter'}`);
  }

  h('(d) a pipe inside the ranges where a fine scan and .9382·D print different Max Discharge');
  let shown = 0, tried = 0;
  for (let i = 0; i < 200000 && shown < 3; i++) {
    const inputs = { diameter: pick(8, 180, 1), n: pick(0.008, 0.033, 4), depth: '0', slope: pick(0.0001, 9.9999, 4) };
    inputs.depth = (Number(inputs.diameter) / 24).toFixed(2);
    const v = vals('channel_capacity', inputs), D = diam(v), k = kOf(v, v.slope!);
    const m2 = atShare(0.9382)(GEO_C2, D, k), s1 = scanFt(0.01)(GEO_C2, D, k);
    tried++;
    const p2 = show('channel_capacity', v, { max_discharge: m2 } as Out).max_discharge, p1 = show('channel_capacity', v, { max_discharge: s1 } as Out).max_discharge;
    if (p1 === p2) continue;
    const s05 = scanFt(0.005)(GEO_C2, D, k), s2 = scanFt(0.02)(GEO_C2, D, k);
    const q = (x: number) => show('channel_capacity', v, { max_discharge: x } as Out).max_discharge!.trim();
    shown++;
    row(`${inputText(inputs)} (Channel Capacity): .9382·D ${m2.toFixed(3)} prints ${q(m2)}; scan 0.01 ft ${s1.toFixed(3)} prints ${q(s1)}; scan 0.005 ft ${q(s05)}; scan 0.02 ft ${q(s2)}`);
    row(`  all fields with .9382·D: ${line('channel_capacity', show('channel_capacity', v, cc(v, GEO_C2, atShare(0.9382))))}`);
    row(`  all fields with scan 0.01 ft: ${line('channel_capacity', show('channel_capacity', v, cc(v, GEO_C2, scanFt(0.01))))}`);
  }
  row(`pipes tried: ${tried}`);
}

// ---- A-006: grade the goldens against A-005 as committed --------------------------------
/** The commit that holds A-005 as written before the runs. */
const A005_COMMIT = 'd9e1a3a';
interface Pred { part: string; mode: Mode; inputs: Record<string, string>; rows: { rule: string; cells: string[] }[] }
function a005Predictions(): Pred[] {
  const text = execFileSync('git', ['show', `${A005_COMMIT}:results/attempts.md`], { cwd: ROOT, encoding: 'utf-8' });
  const start = text.indexOf('## A-005');
  const rest = text.slice(start + 1);
  const end = rest.search(/\n## /);
  const sec = end < 0 ? rest : rest.slice(0, end);
  const modeOf: Record<string, Mode> = { a: 'normal_depth', b: 'critical_depth', c: 'critical_depth', d: 'channel_capacity' };
  const out: Pred[] = [];
  const typed = (s: string) => {
    const m = /Diameter ([\d.]+), n ([\d.]+), (Discharge|Depth) ([\d.]+), Slope ([\d.]+)/.exec(s);
    if (!m) throw new Error(`cannot read inputs: ${s}`);
    return { diameter: m[1]!, n: m[2]!, [m[3]!.toLowerCase()]: m[4]!, slope: m[5]! } as Record<string, string>;
  };
  const cellsOf = (l: string) => l.split('|').slice(1, -1).map((c) => c.trim());
  for (const part of ['a', 'b', 'c', 'd']) {
    const i = sec.indexOf(`### (${part})`);
    const j = sec.slice(i + 4).search(/\n### \(/);
    const body = j < 0 ? sec.slice(i) : sec.slice(i, i + 4 + j);
    const lines = body.split('\n');
    if (part === 'c') {
      const inputs = new Map<string, Record<string, string>>();
      for (const l of lines) { const m = /^- (cd-circ-\d+): (.*)$/.exec(l); if (m) inputs.set(m[1]!, typed(m[2]!)); }
      for (const l of lines) {
        const m = /^\| (cd-circ-\d+) \(/.exec(l);
        if (m) { const c = cellsOf(l); out.push({ part, mode: modeOf[part]!, inputs: inputs.get(m[1]!)!, rows: [{ rule: 'H5', cells: c.slice(1) }] }); }
      }
      continue;
    }
    let cur: Pred | null = null;
    for (const l of lines) {
      if (l.startsWith('**Diameter')) { cur = { part, mode: modeOf[part]!, inputs: typed(l), rows: [] }; out.push(cur); continue; }
      if (cur && l.startsWith('| ') && !l.startsWith('| Rule') && !l.startsWith('|---')) { const c = cellsOf(l); cur.rows.push({ rule: c[0]!, cells: c.slice(1) }); }
    }
  }
  return out;
}
/** The row each part's stated rule predicts: N1, the 0.2 ft grid (H5), H5, .9382·D. */
const STATED: Record<string, (rule: string) => boolean> = {
  a: (r) => r.startsWith('N1 '), b: (r) => r.startsWith('0.2 ft'), c: () => true, d: (r) => r === '.9382·D',
};
function gradeA005() {
  const preds = a005Predictions();
  console.log(`A-005 read from ${A005_COMMIT}: ${preds.length} cases, ${preds.reduce((s, p) => s + p.rows.length, 0)} predicted rows.`);
  let stated = 0;
  for (const p of preds) {
    const g = ALL.find((x) => x.mode === p.mode && x.shape === 'circle' && Object.keys(p.inputs).length === Object.keys(x.inputs).length && Object.entries(p.inputs).every(([k, v]) => x.inputs[k] === v));
    if (!g) { row(`(${p.part}) ${JSON.stringify(p.inputs)}: no golden recorded`); continue; }
    const fields = FIELDS[p.mode];
    const res = p.rows.map((r) => {
      const d = fields.map((k, i) => (g.printed[k]!.trim() === r.cells[i] ? '' : `${k} predicted ${r.cells[i]}, printed ${g.printed[k]!.trim()}`)).filter(Boolean);
      return { rule: r.rule, d };
    });
    const st = res.find((r) => STATED[p.part]!(r.rule))!;
    if (!st.d.length) stated++;
    row(`(${p.part}) ${g.id} ${inputText(p.inputs)}: rows matching every field: ${res.filter((r) => !r.d.length).map((r) => r.rule).join(', ') || 'none'}`);
    for (const r of res) if (r.d.length) row(`      ${r.rule}: ${r.d.join('; ')}`);
  }
  console.log(`With the rules as A-005 stated them (N1, the 0.2 ft grid, H5, .9382·D): ${stated} of ${preds.length} print exactly as predicted.`);

  h('nd-circ-000020: the depths at which each printed field (Depth aside) comes out as QUICK-2 printed it');
  const g20 = byId('nd-circ-000020'), v20 = vals('normal_depth', g20.inputs), D20 = diam(v20), k20 = kOf(v20, v20.slope!);
  const at = (v: Vals, y: number) => { const D = diam(v), w = GEO_C2(D, y), vel = f(v.discharge! / w.A); return { area: w.A, wet_perimeter: w.P, velocity: vel, hyd_radius: f(w.A / w.P), top_width: w.T, froude: f(vel / Math.sqrt((G * w.A) / w.T)) } as Out; };
  const span = (fn: (y: number) => boolean, lo: number, hi: number) => { let a = NaN, b = NaN; for (let i = 0; i <= 20000; i++) { const y = lo + ((hi - lo) * i) / 20000; if (fn(y)) { if (isNaN(a)) a = y; b = y; } } return isNaN(a) ? 'none' : `${a.toFixed(5)} to ${b.toFixed(5)}`; };
  const okField = (k: string) => (y: number) => show('normal_depth', v20, { ...at(v20, f(y)), depth: y, max_discharge: 0, flow_type: '' })[k] === g20.printed[k];
  for (const k of ['area', 'wet_perimeter', 'velocity', 'hyd_radius', 'top_width', 'froude']) row(`${k} \`${g20.printed[k]!.trim()}\`: y ${span(okField(k), 0.23, 0.27)}`);
  const all = (y: number) => ['area', 'wet_perimeter', 'velocity', 'hyd_radius', 'top_width', 'froude'].every((k) => okField(k)(y));
  row(`every field: y ${span(all, 0.23, 0.27)}`);
  const Q = (y: number) => manning(GEO_C2, D20, f(y), k20);
  row(`discharge there relative to q: at 0.2490 ${pct(Q(0.249), v20.discharge!)}, at 0.2517 ${pct(Q(0.2517), v20.discharge!)}`);
  for (const [name, after] of [['N1', 'resume'], ['N2', 'narrow'], ['N3', 'restep10'], ['N4', 'secant']] as [string, After][]) {
    const r = nd(v20, GEO_C2, QMAX_RULE, { ...ND_RULE, after })!;
    row(`${name} trials after the first bracket: ${r.found.trials.filter(([y]) => y > 0.2 + 1e-6).map(([y, x]) => `${y.toFixed(5)} (${pct(x, v20.discharge!)})`).join(', ')}`);
  }
  h('The rules the design adopts (C2, M2 .9382·D, N2, H5) on every circle result golden');
  const m2 = atShare(0.9382);
  const adopted = count('channel_capacity', (v) => cc(v, GEO_C2, m2), [], true)
    + count('normal_depth', (v) => nd(v, GEO_C2, m2, { ...ND_RULE, after: 'narrow' })?.out ?? null, [], true)
    + count('critical_depth', (v) => cd(v, GEO_C2, m2)?.out ?? null, [], true);
  row(`${adopted} of ${N('channel_capacity') + N('normal_depth') + N('critical_depth')} circle results`);
  h('Fields at the printed (rounded) Depth, an idea checked against the other branch case');
  for (const id of ['nd-circ-000020', 'nd-circ-000010']) {
    const g = byId(id), v = vals('normal_depth', g.inputs), y = Number(g.printed.depth);
    const p = show('normal_depth', v, { ...at(v, f(y)), depth: f(y), max_discharge: 0, flow_type: '' });
    row(`${id} at ${y}: Velocity ${p.velocity!.trim()} (printed ${g.printed.velocity!.trim()}), Froude ${p.froude!.trim()} (printed ${g.printed.froude!.trim()}), Top Width ${p.top_width!.trim()} (printed ${g.printed.top_width!.trim()})`);
  }
}

// ---- A-008: cd-circ-000033's Critical Slope ---------------------------------------------
/** Critical Slope rules, each given the case and the rebuild's search depth y. */
type ScRule = (v: Vals, y: number, fy: number) => number;
const scAt = (geo: Geo, exp: number, vel: 'q/A' | 'F/A' = 'q/A', stores = false): ScRule => (v, y, fy) => {
  const D = diam(v), w = geo(D, y), R = f(w.A / w.P), q = vel === 'q/A' ? v.discharge! : fy;
  if (!stores) return f((((q / w.A) * v.n!) / (K * Math.pow(R, exp))) ** 2);
  const V = f(q / w.A), Rp = f(Math.pow(R, exp)), x = f((V * v.n!) / f(K * Rp));
  return f(x * x);
};
function criticalSlopeA008() {
  const quick = new Set<string>(JSON.parse(readFileSync(join(ROOT, 'oracle', 'quickset.json'), 'utf-8')).cases ?? []);
  const gs = circles('critical_depth');
  const run = (g: Golden) => solve({ mode: 'critical_depth', shape: 'circle', inputs: g.inputs });
  h('Is cd-circ-000033 on a rounding boundary, as cc-circ-000035 is?');
  const r33 = run(byId('cd-circ-000033')), sc = r33.raw!.critical_slope!;
  row(`cd-circ-000033 Critical Slope: rebuild ${sc.toFixed(7)}, prints ${r33.printed.critical_slope!.trim()}; boundary 0.00895 is ${(0.00895 - sc).toExponential(2)} away, ${((0.00895 / sc - 1) * 100).toFixed(3)}% of the value`);
  const r35 = solve({ mode: 'channel_capacity', shape: 'circle', inputs: byId('cc-circ-000035').inputs }), m = r35.raw!.max_discharge!;
  row(`cc-circ-000035 Max Discharge: rebuild ${m.toFixed(3)}, prints ${r35.printed.max_discharge!.trim()}; boundary 101165.5 is ${(m - 101165.5).toFixed(3)} away, ${(((m - 101165.5) / m) * 100).toExponential(2)}% of the value`);
  row(`single precision resolves about ${(2 ** -24 * 100).toExponential(1)}% of a value`);

  h('The factor by which each golden lets QUICK-2\'s Critical Slope differ from the rebuild\'s');
  let lo = 0, hi = Infinity, loId = '', hiId = '';
  for (const g of gs) {
    const raw = run(g).raw!.critical_slope!, p = Number(g.printed.critical_slope);
    const a = (p - 0.00005) / raw, b = (p + 0.00005) / raw;
    if (a > lo) { lo = a; loId = g.id; }
    if (b < hi) { hi = b; hiId = g.id; }
  }
  row(`${gs.length} circle Critical Depth results: at least ${lo.toFixed(5)} (${loId}), at most ${hi.toFixed(5)} (${hiId}); ${lo < hi ? 'a constant factor fits' : 'no constant factor fits all'}`);
  for (const g of gs) {
    const raw = run(g).raw!.critical_slope!, p = Number(g.printed.critical_slope), b = (p + 0.00005) / raw;
    if (b < 1.001) row(`  ${g.id} (D ${g.inputs.diameter} in, R ${run(g).raw!.hyd_radius!.toFixed(3)}): at most ${b.toFixed(5)}`);
  }

  h('Hypotheses: Critical Slope only; Max Discharge follows it; every other field is the rebuild\'s');
  const rules: [string, ScRule][] = [
    ['as built: ((q/A)·n/(1.486·R^.667))², A and R at y', scAt(GEO_C2, EXP_A)],
    ['H1: R^.6667, the exponent of the circle\'s discharge', scAt(GEO_C2, EXP_B)],
    ['H2: every intermediate stored (V, R^.667, the quotient)', scAt(GEO_C2, EXP_A, 'q/A', true)],
    ['H3: A and R at the printed Depth, y − 0.01', (v, y, fy) => scAt(GEO_C2, EXP_A)(v, f(y - 0.01), fy)],
    ['H4: the search\'s velocity F(y)/A = √(g·A/T) in place of q/A', scAt(GEO_C2, EXP_A, 'F/A')],
    ['H5: A and R from the θ geometry the rebuild had before C2', scAt(GEO_BUILT, EXP_A)],
  ];
  for (const [name, rule] of rules) {
    let ok = 0, all = 0, okQ = 0, nQ = 0; const lost: string[] = [];
    let hit33 = '';
    for (const g of gs) {
      const r = run(g), v = vals('critical_depth', g.inputs), y = r.raw!.search_depth!, fy = r.raw!.search_discharge!;
      const s = rule(v, y, fy), qm = maxDischarge(diam(v), v.n!, s);
      const p = show('critical_depth', v, { ...(r.raw as Out), depth: r.raw!.depth!, critical_slope: s, max_discharge: qm, flow_type: 'CRITICAL' });
      const scOk = p.critical_slope === g.printed.critical_slope, every = !misses(g, p).length;
      if (scOk) ok++; if (every) all++;
      if (quick.has(g.id)) { nQ++; if (every) okQ++; }
      if (g.id === 'cd-circ-000033') hit33 = `${p.critical_slope!.trim()} (${s.toFixed(7)})`;
      else if (!every && !misses(g, r.printed as Record<string, string>).length) lost.push(g.id);
    }
    row(`${name}: Critical Slope ${ok} of ${gs.length}, every field ${all} of ${gs.length} (quick set ${okQ} of ${nQ}); cd-circ-000033 prints ${hit33}${lost.length ? `; breaks ${lost.length} that matched: ${lost.join(', ')}` : ''}`);
  }
  row('format rule: no rounding of 0.0089380 to four decimals gives 0.0090 but rounding up, and rounding up prints cd-circ-000001\'s 0.0054245 as 0.0055 (QUICK-2: 0.0054)');

  h('Measurement: the depths at which every field of cd-circ-000033 prints as QUICK-2 printed it');
  const g = byId('cd-circ-000033'), v = vals('critical_depth', g.inputs), D = diam(v), F = qc(GEO_C2, D), q = v.discharge!;
  const at = (y: number) => show('critical_depth', v, { ...cdFields(v, GEO_C2, atShare(0.9382), y, 0.01) });
  let a = NaN, b = NaN;
  for (let i = 0; i <= 20000; i++) { const y = f(0.73 + (0.02 * i) / 20000); if (!misses(g, at(y)).length) { if (isNaN(a)) a = y; b = y; } }
  row(`all fields at one depth y, Depth printed y − 0.01: y ${a.toFixed(5)} to ${b.toFixed(5)}; A·√(gA/T) there ${pct(F(a), q)} to ${pct(F(b), q)} of q`);
  const y33 = r33.raw!.search_depth!;
  row(`the rebuild's trials: 0.6 ft ${f(F(0.6)).toFixed(4)} cfs, 0.8 ft ${f(F(f(0.8))).toFixed(4)} cfs (${(0.8 / D).toFixed(3)}·D), chord ${y33.toFixed(5)} at ${pct(r33.raw!.search_discharge!, q)}`);
  let sLo = 0.73, sHi = y33;
  for (let k = 0; k < 60; k++) { const mm = (sLo + sHi) / 2; if (F(mm) < 0.995 * q) sLo = mm; else sHi = mm; }
  const c = Math.max(a, sHi);
  row(`within the 0.5% stop as well: y ${c.toFixed(5)} to ${b.toFixed(5)}, ${(y33 - b).toFixed(5)} to ${(y33 - c).toFixed(5)} ft below the rebuild's chord`);
}

// ---- A-009: one rule for cd-circ-000033 and the Q-022 boundary --------------------------
/** The four circle Critical Depth runs that printed "DEPTH is Greater than the DIAMETER": the
 * Q-022 run and A-008's P1, P2 and P4 (ledger Q-022 and decision 75). None stores a golden. */
const REJECTED_RUNS: { run: string; inputs: Record<string, string> }[] = [
  { run: '20261122-214714-6aaf2d', inputs: { diameter: '9.1', n: '.0216', discharge: '2', slope: '1.9915' } },
  { run: '20261124-225953-c32ec8', inputs: { diameter: '10.1', n: '.013', discharge: '3', slope: '.005' } },
  { run: '20261124-230038-48c33a', inputs: { diameter: '10.1', n: '.013', discharge: '4', slope: '.005' } },
  { run: '20261124-230140-e185ee', inputs: { diameter: '11.9', n: '.013', discharge: '4', slope: '.005' } },
];
/** What Critical Depth does after a chord that is still short. The rest of H5 is unchanged. */
const A009_RULES: [string, After][] = [
  ['the rebuild: the chord repeats on the narrowed bracket (N2)', 'narrow'],
  ['K1: stepping resumes from the chord with the same 0.2 ft step (N1)', 'resume'],
  ['K2: stepping resumes from the chord with 0.02 ft steps (N3)', 'restep10'],
  ['K3: secant through the two latest trials (N4)', 'secant'],
  ['K4: bisect the bracket (N5)', 'bisect'],
];
/** A-009's cases for the Exhumer, chosen by `a009` below from the grid it prints. */
const A009_CASES: { id: string; inputs: Record<string, string> }[] = [
  { id: 'Q1', inputs: { diameter: '8', n: '.013', discharge: '1', slope: '.005' } },
  { id: 'Q2', inputs: { diameter: '22.7', n: '.013', discharge: '23', slope: '.005' } },
  { id: 'Q3', inputs: { diameter: '37', n: '.013', discharge: '77', slope: '.005' } },
  { id: 'Q4', inputs: { diameter: '51', n: '.013', discharge: '4', slope: '.005' } },
];

function a009() {
  const m2 = atShare(0.9382);
  const cdBy = (after: After) => (v: Vals) => cd(v, GEO_C2, m2, { ...CD_RULE, after });
  h('Check: the narrow rule here prints what the rebuild (solve) prints, on every circle Critical Depth golden and rejection');
  let same = 0;
  const all = [...circles('critical_depth').map((g) => g.inputs), ...REJECTED_RUNS.map((r) => r.inputs)];
  for (const inputs of all) {
    const r = solve({ mode: 'critical_depth', shape: 'circle', inputs }), x = cdBy('narrow')(vals('critical_depth', inputs));
    const p = x ? show('critical_depth', vals('critical_depth', inputs), x.out) : null;
    if ((r.outcome === 'rejected' && !x) || (r.outcome === 'result' && p && FIELDS.critical_depth.every((k) => p[k] === r.printed[k]))) same++;
  }
  row(`${same} of ${all.length}`);

  h('Scores: 27 circle Critical Depth results (every field) and the 4 rejections (outcome)');
  for (const [name, after] of A009_RULES) {
    const run = cdBy(after);
    let ok = 0, rej = 0; const miss: string[] = [], branch: string[] = [];
    for (const g of circles('critical_depth')) {
      const v = vals('critical_depth', g.inputs), r = run(v);
      if (r?.found.branch) branch.push(g.id);
      const d = r ? misses(g, show('critical_depth', v, r.out)) : ['rejected'];
      if (!d.length) ok++; else miss.push(`${g.id} (${d.join('; ')})`);
    }
    const rmiss: string[] = [];
    for (const x of REJECTED_RUNS) { const r = run(vals('critical_depth', x.inputs)); if (!r) rej++; else rmiss.push(`run ${x.run} gives a result at ${r.found.y.toFixed(5)}`); }
    row(`${name}: results ${ok} of ${circles('critical_depth').length}, rejections ${rej} of ${REJECTED_RUNS.length}, together ${ok + rej} of ${circles('critical_depth').length + REJECTED_RUNS.length}`);
    row(`    reach the short-chord branch: ${branch.join(', ') || 'none'}`);
    for (const m of [...miss, ...rmiss]) row(`    miss: ${m}`);
  }

  h('cd-circ-000033 and run 20261124-225953-c32ec8, trial by trial, under the rebuild and K1');
  for (const inputs of [byId('cd-circ-000033').inputs, REJECTED_RUNS[1]!.inputs]) {
    const v = vals('critical_depth', inputs), q = v.discharge!, D = diam(v);
    for (const after of ['narrow', 'resume'] as After[]) {
      const trials: [number, number][] = [];
      const r = search((y) => { const x = qc(GEO_C2, D)(y); trials.push([y, x]); return x; }, q, D, 0.2, 0.005, after);
      const t = (r?.trials ?? trials).map(([y, x]) => `${y.toFixed(5)} (${pct(x, q)})`).join(', ');
      row(`${inputText(inputs)} [D ${D.toFixed(5)} ft], ${after}: ${t}${r ? `; stops at ${r.y.toFixed(5)}` : `; next trial past the diameter: rejected`}`);
    }
  }

  h('Generated practical circles (seed 20261126, 2000, as A-007): how many each rule rejects');
  const py = process.env.PYTHON ?? [join(ROOT, '.venv', 'Scripts', 'python.exe'), join(ROOT, '.venv', 'bin', 'python')].find(existsSync) ?? 'python';
  const code = 'import json\nfrom oracle import generator, profile\np=profile.load()\n' +
    'print(json.dumps(generator.generate(p,20261126,2000,modes=["critical_depth"],shapes=["circle"],existing_ids=[],range_set="practical")))';
  const drawn = JSON.parse(execFileSync(py, ['-c', code], { cwd: ROOT, encoding: 'utf-8', maxBuffer: 1 << 26 })) as { inputs: Record<string, string> }[];
  // Outcomes come from the rebuild's own search (app/src/solver/search.ts), which tells a trial
  // past the diameter from a search that never finishes; fields come from cd() above.
  const outcomeOf = (v: Vals, after: 'narrow' | 'resume') => {
    const r = appSearch(circleCriticalDischarge(diameterFeet(v.diameter!)), v.discharge!, { bottom: 0, first: CIRCLE_CD_STEP, step: CIRCLE_CD_STEP, ceiling: diameterFeet(v.diameter!), tol: CIRCLE_TOL, afterShortChord: after });
    return r.ok ? 'result' : r.reason === 'past_ceiling' ? 'rejected' : r.reason;
  };
  let disagree = 0;
  for (const [name, after] of [[A009_RULES[0]![0], 'narrow'], [A009_RULES[1]![0], 'resume']] as [string, 'narrow' | 'resume'][]) {
    const n: Record<string, number> = {}; const ds: number[] = []; let br = 0, diff = 0;
    for (const c of drawn) {
      const v = vals('critical_depth', c.inputs), o = outcomeOf(v, after), r = cdBy(after)(v);
      n[o] = (n[o] ?? 0) + 1;
      if (o === 'rejected') ds.push(v.diameter!);
      if ((o === 'result') !== !!r) disagree++;
      if (r?.found.branch) br++;
      if (after === 'resume') {
        const o2 = outcomeOf(v, 'narrow'), n2 = cdBy('narrow')(v);
        if (o2 !== o || (n2 && r && FIELDS.critical_depth.some((k) => show('critical_depth', v, n2.out)[k] !== show('critical_depth', v, r.out)[k]))) diff++;
      }
    }
    row(`${name}: ${Object.entries(n).map(([k, x]) => `${k} ${x}`).join(', ')}; rejected diameters ${Math.min(...ds).toFixed(1)} to ${Math.max(...ds).toFixed(1)} in; ${br} results reach the short-chord branch${after === 'resume' ? `; ${diff} of ${drawn.length} differ from the rebuild in outcome or a printed field` : ''}`);
  }
  row(`cases where the outcome by search.ts and by this script's search disagree: ${disagree}`);
  for (const c of drawn) {
    const v = vals('critical_depth', c.inputs);
    if (outcomeOf(v, 'narrow') === 'never_finishes') row(`never finishes under both rules: ${inputText(c.inputs)} (D ${diameterFeet(v.diameter!)} ft; the trial at D has top width 0): K1 ${outcomeOf(v, 'resume')}`);
  }

  h('Grid: n .013, slope .005; pipes where K1 and the rebuild print differently');
  const rejects: { d: number; s: string }[] = [], fields: { d: number; k: number; s: string }[] = [];
  const diamGrid: number[] = [];
  for (let d = 80; d <= 360; d++) diamGrid.push(d / 10);
  for (let d = 37; d <= 180; d++) diamGrid.push(d);
  for (const d of diamGrid) {
    const D = f(d / 12), cap = qc(GEO_C2, D)(0.9 * D);
    const qs = d <= 36 ? Array.from({ length: Math.floor(cap) }, (_, i) => i + 1) : Array.from({ length: 40 }, (_, i) => Math.max(1, Math.round((cap * (i + 1)) / 41)));
    for (const qv of qs) {
      const inputs = { diameter: String(d), n: '.013', discharge: String(qv), slope: '.005' };
      const v = vals('critical_depth', inputs), oa = outcomeOf(v, 'narrow'), ob = outcomeOf(v, 'resume');
      if (oa !== 'result' && ob !== 'result') continue;
      const a = cdBy('narrow')(v), b = cdBy('resume')(v);
      if (oa === 'result' && ob === 'rejected') { rejects.push({ d, s: `${d} in, q ${qv}: rebuild ${a!.found.y.toFixed(5)}, K1 rejected` }); continue; }
      if (oa !== 'result' || ob !== 'result') { row(`other: ${d} in, q ${qv}: rebuild ${oa}, K1 ${ob}`); continue; }
      const pa = show('critical_depth', v, a!.out), pb = show('critical_depth', v, b!.out);
      const dk = FIELDS.critical_depth.filter((k) => pa[k] !== pb[k]);
      if (dk.length) fields.push({ d, k: dk.length, s: `${d} in, q ${qv}: rebuild ${a!.found.y.toFixed(5)}, K1 ${b!.found.y.toFixed(5)} (${(b!.found.y / D).toFixed(3)}·D); differ on ${dk.join(', ')}` });
    }
  }
  row(`K1 rejects where the rebuild gives a result: ${rejects.length} grid cases, ${Math.min(...rejects.map((x) => x.d))} to ${Math.max(...rejects.map((x) => x.d))} in; the largest pipes:`);
  for (const x of rejects.slice(-8)) row(`    ${x.s}`);
  row(`both give a result and print differently: ${fields.length} grid cases, ${Math.min(...fields.map((x) => x.d))} to ${Math.max(...fields.map((x) => x.d))} in; ${fields.filter((x) => x.d >= 37).length} of them 37 in or larger. Three or more fields differ in:`);
  for (const x of fields.filter((x) => x.k >= 3)) row(`    ${x.s}`);
  row('37 in or larger:');
  for (const x of fields.filter((x) => x.d >= 37).slice(0, 20)) row(`    ${x.s}`);

  if (A009_CASES.length) {
    h('A-009 predictions: every printed field under each rule');
    for (const c of A009_CASES) {
      const v = vals('critical_depth', c.inputs);
      const D = diam(v), F = qc(GEO_C2, D);
      let lo = 0.01, hi = 0.999;
      for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (F(m * D) < v.discharge!) lo = m; else hi = m; }
      const fs = (lo + hi) / 2;
      const sf = fs >= 0.847 ? 'rejected for every f in [0.750, 0.847)' : fs < 0.75 ? 'a result for every f in [0.750, 0.847)' : `a result for f ≥ ${fs.toFixed(3)}, rejected below`;
      row(`${c.id} ${inputText(c.inputs)} [D ${D.toFixed(5)} ft; A·√(gA/T) reaches q at ${fs.toFixed(3)}·D; S(f): ${sf}]`);
      for (const [name, after] of A009_RULES) {
        const r = cdBy(after)(v);
        row(`  ${name.split(':')[0]}: ${r ? `result (search depth ${r.found.y.toFixed(5)}) ${line('critical_depth', show('critical_depth', v, r.out))}` : 'rejected'}`);
      }
    }
  }
}

// ---- A-010: grade the A-009 runs against A-009 as committed --------------------------------
/** The commit that holds A-009 as written before the runs. */
const A009_COMMIT = '80c87fd';
/** The ledger decision that lists the A-009 runs and goldens (the Exhumer's, 2026-11-25). */
const A009_DECISION = 80;
/** The Skeptic's exploratory runs on cd-circ-000033's pipe at n .13 and n .3 (decision 80). */
const SKEPTIC_RUNS = ['20261125-100502-2c83a6', '20261125-100602-583c5a'];
const HEADER_KEYS: Record<string, string> = {
  Diameter: 'in_diameter', n: 'in_n', Discharge: 'in_discharge', Depth: 'depth', Slope: 'in_slope',
  'Critical Slope': 'critical_slope', Area: 'area', 'Wet Per': 'wet_perimeter', Velocity: 'velocity',
  'Hyd R': 'hyd_radius', 'Top Width': 'top_width', 'Froude #': 'froude', 'Max Discharge': 'max_discharge',
  'Flow Type': 'flow_type',
};
interface A009Pred { id: string; inputs: Record<string, string>; outcome: Record<string, string>; fields: Record<string, Record<string, string>> }
function a009AsCommitted(): A009Pred[] {
  const text = execFileSync('git', ['show', `${A009_COMMIT}:results/attempts.md`], { cwd: ROOT, encoding: 'utf-8' });
  const start = text.indexOf('## A-009');
  if (start < 0) throw new Error(`no A-009 section at ${A009_COMMIT}`);
  const rest = text.slice(start + 1), end = rest.search(/\n## /);
  const sec = end < 0 ? rest : rest.slice(0, end);
  const common = /n ([\d.]+) and slope ([\d.]+) in all four/.exec(sec);
  if (!common) throw new Error(`A-009 at ${A009_COMMIT}: no common n and slope`);
  const cells = (l: string) => l.split('|').slice(1, -1).map((c) => c.trim().replace(/\*\*/g, ''));
  const preds = new Map<string, A009Pred>();
  let header: string[] = [];
  for (const l of sec.split('\n')) {
    if (!l.startsWith('| ')) continue;
    const c = cells(l);
    if (c[0] === 'Case') { header = c; continue; }
    if (!/^Q\d$/.test(c[0]!)) continue;
    if (header[3] === 'Rebuild (N2)') {
      preds.set(c[0]!, { id: c[0]!, inputs: { diameter: c[1]!, n: common[1]!, discharge: c[2]!, slope: common[2]! }, outcome: { Rebuild: c[3]!, K1: c[4]!, 'S(f)': c[5]! }, fields: {} });
    } else if (header[1] === 'Rule') {
      const rec: Record<string, string> = {};
      header.slice(2).forEach((hd, i) => { const k = HEADER_KEYS[hd]; if (!k) throw new Error(`unknown column ${hd}`); rec[k] = c[i + 2]!; });
      preds.get(c[0]!)!.fields[c[1]!] = rec;
    }
  }
  if (preds.size !== 4) throw new Error(`A-009 at ${A009_COMMIT}: read ${preds.size} cases`);
  return [...preds.values()];
}
const sameInputs = (a: Record<string, string>, b: Record<string, string>) =>
  Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([k, v]) => b[k] === v);
interface RunFolder { id: string; run: { mode: string; shape: string; inputs: Record<string, string>; outcome: string; screen_id: string; printed: Record<string, string> }; screen: string[] }
const runFolder = (id: string): RunFolder | null => {
  const dir = join(ROOT, 'oracle', 'out', 'runs', id);
  if (!existsSync(join(dir, 'run.json'))) return null;
  return { id, run: JSON.parse(readFileSync(join(dir, 'run.json'), 'utf-8')), screen: readFileSync(join(dir, 'final.txt'), 'utf-8').split(/\r?\n/) };
};
/** What QUICK-2 did for these inputs: a golden that decision 80 lists, else a run folder it lists. */
function observeA009(inputs: Record<string, string>): { outcome: 'result' | 'rejected' | 'other'; source: string; printed?: Record<string, string>; screen?: string[] } {
  const ledger = JSON.parse(readFileSync(join(ROOT, 'results', 'ledger.json'), 'utf-8'));
  const d = ledger.decisions.find((x: { n: number }) => x.n === A009_DECISION);
  if (!d) throw new Error(`ledger decision ${A009_DECISION} not found`);
  const listed = new Set<string>(d.evidence);
  const g = ALL.find((x) => listed.has(x.id) && x.mode === 'critical_depth' && x.shape === 'circle' && sameInputs(x.inputs, inputs));
  if (g) return { outcome: g.outcome === 'result' ? 'result' : 'other', source: g.id, printed: g.printed };
  for (const id of listed) {
    const r = runFolder(id);
    if (!r || r.run.mode !== 'critical_depth' || r.run.shape !== 'circle' || !sameInputs(r.run.inputs, inputs)) continue;
    const said = r.screen.some((l) => l.includes(DEPTH_ABOVE_DIAMETER));
    return { outcome: r.run.outcome === 'timeout' && r.run.screen_id === 'cd_form' && said ? 'rejected' : 'other', source: `run ${id}`, screen: r.screen };
  }
  throw new Error(`no golden and no run folder for ${JSON.stringify(inputs)}; ledger decision ${A009_DECISION} lists the runs (oracle/out is not committed, so only a machine that holds the run folders can grade Q1 and Q2)`);
}
function gradeA009() {
  const preds = a009AsCommitted(), rules = ['Rebuild', 'K1', 'S(f)'];
  console.log(`A-009 read from ${A009_COMMIT}: ${preds.length} cases, predicted fields for ${preds.map((p) => `${p.id} (${Object.keys(p.fields).join(', ')})`).join(', ')}.`);
  const score: Record<string, number> = { Rebuild: 0, K1: 0, 'S(f)': 0 };
  for (const p of preds) {
    const o = observeA009(p.inputs);
    row(`${p.id} ${inputText(p.inputs)}: QUICK-2 ${o.outcome} (${o.source})`);
    if (o.outcome === 'rejected' && o.screen) {
      const at = o.screen.findIndex((l) => l.includes(DEPTH_ABOVE_DIAMETER));
      const depth = /Depth \(ft\)\s+(\S+)/.exec(o.screen.find((l) => l.includes('Depth (ft)')) ?? '')?.[1] ?? '';
      const outputs = o.screen.filter((l) => /Area \(sq ft\)|Velocity \(ft\/s\)|Top Width \(ft\)|Max Discharge\(cfs\)/.test(l));
      const sl = o.screen.find((l) => l.includes('Critical Slope')) ?? '';
      const blank = !/\d/.test(sl.slice(sl.indexOf('Critical Slope'))) && outputs.every((l) => !/\d/.test(l.replace(/\(sq ft\)|\(ft\/s\)|\(ft\)|\(cfs\)/g, '')));
      row(`    screen: message on 0-based row ${at}; Depth field \`${depth}\`; Critical Slope and output fields ${blank ? 'all blank' : 'NOT blank'}`);
    }
    for (const rule of rules) {
      const said = p.outcome[rule]!, predicted = said.startsWith('result') ? 'result' : said.startsWith('rejected') ? 'rejected' : '?';
      let verdict = predicted === o.outcome ? 'right' : 'wrong', note = '';
      const fr = p.fields[rule];
      if (verdict === 'right' && o.outcome === 'result' && fr && o.printed) {
        const diff = Object.entries(fr).filter(([k, x]) => o.printed![k]!.trim() !== x).map(([k, x]) => `${k} predicted \`${x}\`, printed \`${o.printed![k]!.trim()}\``);
        note = `; fields ${Object.keys(fr).length - diff.length} of ${Object.keys(fr).length} as predicted${diff.length ? ': ' + diff.join('; ') : ''}`;
        if (diff.length) verdict = 'wrong';
      } else if (verdict === 'right' && o.outcome === 'result' && !fr) note = '; outcome only (no fields predicted)';
      if (verdict === 'right') score[rule]!++;
      row(`    ${rule} predicted "${said}": ${verdict}${note}`);
    }
  }
  console.log(`\nEvery case, outcome and every predicted field: ${rules.map((r) => `${r} ${score[r]} of ${preds.length}`).join(', ')}.`);

  const m2 = atShare(0.9382), g33 = byId('cd-circ-000033');
  h('Check found after the runs, not part of A-009: K1\'s depth for cd-circ-000033 at the n of the Skeptic\'s runs');
  const k1 = cd(vals('critical_depth', g33.inputs), GEO_C2, m2, { ...CD_RULE, after: 'resume' })!;
  row(`K1's search depth for cd-circ-000033: ${k1.found.y.toFixed(6)}`);
  for (const id of SKEPTIC_RUNS) {
    const r = runFolder(id);
    if (!r) { row(`run ${id}: no run folder on this machine (oracle/out is not committed)`); continue; }
    const v = vals('critical_depth', r.run.inputs), sc = cdFields(v, GEO_C2, m2, k1.found.y, CD_RULE.offset);
    const p = show('critical_depth', v, sc), miss = FIELDS.critical_depth.filter((k) => p[k] !== r.run.printed[k]);
    const nb = cd(v, GEO_C2, m2, { ...CD_RULE, after: 'narrow' })!, pb = show('critical_depth', v, nb.out);
    row(`run ${id} (${inputText(r.run.inputs)}): QUICK-2 printed Critical Slope \`${r.run.printed.critical_slope!.trim()}\`; at K1's depth \`${p.critical_slope!.trim()}\` (${(sc.critical_slope as number).toFixed(6)}), every field ${miss.length ? 'except ' + miss.join(', ') : 'as printed'}; the rebuild \`${pb.critical_slope!.trim()}\` at ${nb.found.y.toFixed(5)}`);
  }

  h('Ledger critical_slope triage: the depth at which Critical Slope prints 0.8955 at n .13, by exponent');
  const v33 = vals('critical_depth', g33.inputs), D = diam(v33), F = qc(GEO_C2, D), q = v33.discharge!;
  const chord = solve({ mode: 'critical_depth', shape: 'circle', inputs: g33.inputs }).raw!.search_depth!;
  const span = (ok: (y: number) => boolean) => {
    let a = NaN, b = NaN;
    for (let i = 0; i <= 40000; i++) { const y = f(0.73 + (0.02 * i) / 40000); if (ok(y)) { if (isNaN(a)) a = y; b = y; } }
    return [a, b] as const;
  };
  const [bLo, bHi] = span((y) => !misses(g33, show('critical_depth', v33, cdFields(v33, GEO_C2, m2, y, 0.01))).length && F(y) >= 0.995 * q);
  row(`A-008's band (every field of cd-circ-000033 at one depth, within the 0.5% stop): y ${bLo.toFixed(5)} to ${bHi.toFixed(5)}, ${(chord - bHi).toFixed(5)} to ${(chord - bLo).toFixed(5)} ft below the rebuild's chord at ${chord.toFixed(5)}`);
  const v13 = vals('critical_depth', { ...g33.inputs, n: '.13' });
  for (const exp of [EXP_A, EXP_B]) {
    const [a, b] = span((y) => show('critical_depth', v13, { ...cdFields(v13, GEO_C2, m2, y, 0.01), critical_slope: scAt(GEO_C2, exp)(v13, y, 0) }).critical_slope!.trim() === '0.8955');
    const mid = (a + b) / 2, below = chord - mid;
    row(`R^${exp}: prints 0.8955 for y ${a.toFixed(5)} to ${b.toFixed(5)} (mid ${mid.toFixed(5)}), ${below.toFixed(5)} ft below the chord; ${below >= chord - bHi && below <= chord - bLo ? 'inside' : 'outside'} the band`);
  }
}

// ---- A-011: trials that land on the diameter, and predictions for standard pipe sizes -------
/** Diameters listed in the source the profile cites for the circle's practical range (HEC-RAS
 * Hydraulic Reference Manual 6.5, Table 6-2, AISI 1980): 8 to 180 in. */
const TABLE_6_2_DIAMETERS = [8, 10, 12, 18, 24, 36, 48, 54, 60, 66, 72, 78, 120, 180];
/** A-011's cases for the Exhumer: standard sizes, n .013, slope .005. */
const A011_CASES: { id: string; inputs: Record<string, string> }[] = [
  { id: 'S1', inputs: { diameter: '12', n: '.013', discharge: '3', slope: '.005' } },
  { id: 'S2', inputs: { diameter: '12', n: '.013', discharge: '4', slope: '.005' } },
  { id: 'S3', inputs: { diameter: '24', n: '.013', discharge: '27', slope: '.005' } },
  { id: 'S4', inputs: { diameter: '36', n: '.013', discharge: '84', slope: '.005' } },
  { id: 'S5', inputs: { diameter: '48', n: '.013', discharge: '188', slope: '.005' } },
];
/** Cases added by the amendment of 2026-11-25, chosen by the person running the task to separate
 * K1 from N2 (S6 to S10) and the two ways of storing the diameter (S11). */
const A011_AMENDMENT_CASES: { id: string; inputs: Record<string, string> }[] = [
  { id: 'S6', inputs: { diameter: '15', n: '.013', discharge: '5', slope: '.005' } },
  { id: 'S7', inputs: { diameter: '15', n: '.013', discharge: '7', slope: '.005' } },
  { id: 'S8', inputs: { diameter: '18', n: '.013', discharge: '12', slope: '.005' } },
  { id: 'S9', inputs: { diameter: '30', n: '.013', discharge: '55', slope: '.005' } },
  { id: 'S10', inputs: { diameter: '60', n: '.013', discharge: '360', slope: '.005' } },
  { id: 'S11', inputs: { diameter: '14.4', n: '.013', discharge: '7', slope: '.005' } },
];
/** How the diameter in feet could be formed from the typed text. The rebuild stores VAL's value
 * first (parse.ts) and then the quotient (geometry/circle.ts diameterFeet). */
const DIAMETER_STORES: { name: string; D: (text: string) => number }[] = [
  { name: 'the rebuild: store(store(VAL)/12)', D: (text) => f(f(val(text)) / 12) },
  { name: 'store(VAL/12)', D: (text) => f(val(text) / 12) },
];
/** How a trial depth could be formed. `next(prev, k, base)` is the k-th trial after `base` (0 at
 * the start, or the short chord stepping resumes from). `keep` stores a depth (chords too). */
interface TrialModel { name: string; next: (prev: number, k: number, base: number) => number; keep: (y: number) => number; cmp?: (prev: number, k: number, base: number) => number }
const TRIAL_MODELS: TrialModel[] = [
  // search.ts: store(y + CIRCLE_CD_STEP), the step a double 0.2.
  { name: 'the rebuild: y + 0.2, stored', next: (p, k, b) => (k === 1 && b === 0 ? f(CIRCLE_CD_STEP) : f(p + CIRCLE_CD_STEP)), keep: f },
  // QuickBASIC: the literal .2 is a single (0.200000003), and the sum is rounded to single.
  { name: 'y + .2 with .2 a single, stored', next: (p, k, b) => (k === 1 && b === 0 ? f(0.2) : f(p + f(0.2))), keep: f },
  // A counter: the k-th trial is base + k·.2, so errors do not accumulate.
  { name: 'base + k·.2, stored', next: (_p, k, b) => f(b + f(k * f(0.2))), keep: f },
  // The depth held in double precision (a # variable) and never stored as a single.
  { name: 'y + .2 in double precision', next: (p, k, b) => (k === 1 && b === 0 ? 0.2 : p + 0.2), keep: (y) => y },
  // y + .2 stored as a single, but the test against the diameter made on the unrounded sum, as
  // the 8087 holds it before the store (for example IF Y + .2 > D).
  { name: 'y + .2 tested before it is stored', next: (p, k, b) => (k === 1 && b === 0 ? f(0.2) : f(p + f(0.2))), keep: f, cmp: (p, k, b) => (k === 1 && b === 0 ? f(0.2) : p + f(0.2)) },
];
type ModelOutcome = { outcome: 'result' | 'rejected' | 'on_diameter' | 'no_end'; y?: number };
/** H5 with K1, trials formed by `m`. A trial equal to D stops as `on_diameter`, past D as `rejected`. */
function k1Model(F: (y: number) => number, q: number, D: number, m: TrialModel): ModelOutcome {
  const close = (x: number) => Math.abs(x - q) <= CIRCLE_TOL * q;
  let lo = 0, flo = 0, base = 0, k = 1, y = m.next(0, 1, 0), t = m.cmp ? m.cmp(0, 1, 0) : y;
  for (let guard = 0; guard < 100000; guard++) {
    if (t === D) return { outcome: 'on_diameter' };
    if (t > D) return { outcome: 'rejected' };
    const fy = f(F(y));
    if (close(fy)) return { outcome: 'result', y };
    if (fy < q) { lo = y; flo = fy; k++; t = m.cmp ? m.cmp(y, k, base) : m.next(y, k, base); y = m.next(y, k, base); continue; }
    let hi = y, fhi = fy, resumed = false;
    for (let c = 0; c < 1000 && !resumed; c++) {
      const yc = m.keep(lo + ((q - flo) * (hi - lo)) / (fhi - flo)), fc = f(F(yc));
      if (close(fc)) return { outcome: 'result', y: yc };
      if (fc > q) { hi = yc; fhi = fc; continue; }
      lo = yc; flo = fc; base = yc; k = 1; t = m.cmp ? m.cmp(yc, 1, yc) : m.next(yc, 1, yc); y = m.next(yc, 1, yc); resumed = true;
    }
    if (!resumed) return { outcome: 'no_end' };
  }
  return { outcome: 'no_end' };
}
/** Stepped trials from 0.2 ft under `m`, as tested against D, up to the first at or past D. */
function steppedTrials(D: number, m: TrialModel): number[] {
  const out: number[] = []; let y = 0;
  for (let k = 1; k < 100000; k++) { const t = m.cmp ? m.cmp(y, k, 0) : m.next(y, k, 0); y = m.next(y, k, 0); out.push(t); if (t >= D) break; }
  return out;
}
const appOutcome = (v: Vals, after: 'narrow' | 'resume') => {
  const D = diameterFeet(v.diameter!);
  const r = appSearch(circleCriticalDischarge(D), v.discharge!, { bottom: 0, first: CIRCLE_CD_STEP, step: CIRCLE_CD_STEP, ceiling: D, tol: CIRCLE_TOL, afterShortChord: after });
  return { r, outcome: r.ok ? 'result' : r.reason === 'past_ceiling' ? 'rejected' : r.reason };
};
const signed = (x: number) => (x === 0 ? '0' : `${x > 0 ? '+' : '−'}${Math.abs(x).toExponential(2)}`);

function a011() {
  const m2 = atShare(0.9382), rebuildModel = TRIAL_MODELS[0]!;
  const dv = (text: string) => vals('critical_depth', { diameter: text, n: '.013', discharge: '1', slope: '.005' }).diameter!;
  const grid = Array.from({ length: 1721 }, (_, i) => ((80 + i) / 10).toFixed(1));

  h('Check: the rebuild model here gives the outcome search.ts gives with K1 (on_diameter = never_finishes), n .013, slope .005');
  let same = 0, total = 0;
  for (let t = 80; t <= 1800; t += 7) {
    const text = (t / 10).toFixed(1), D = diameterFeet(dv(text)), F = circleCriticalDischarge(D), cap = F(f(0.95 * D));
    for (const qv of [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765].filter((x) => x < cap)) {
      const v = vals('critical_depth', { diameter: text, n: '.013', discharge: String(qv), slope: '.005' });
      const a = appOutcome(v, 'resume').outcome, b = k1Model(F, qv, D, rebuildModel);
      const bo = b.outcome === 'on_diameter' ? 'never_finishes' : b.outcome;
      total++; if (a === bo) same++; else row(`differs: ${text} in, q ${qv}: search.ts ${a}, model ${b.outcome}`);
    }
  }
  row(`${same} of ${total}`);
  { let ok = 0; for (const text of grid) if (DIAMETER_STORES[0]!.D(text) === diameterFeet(dv(text))) ok++;
    row(`the rebuild's diameter store here equals diameterFeet(parse) on ${ok} of ${grid.length} grid diameters`); }

  // Corrected by the amendment of 2026-11-25: A-011 compared store(d/12) with store(store(d)/12)
  // for a d that parse.ts had already stored, so the two were the same value.
  h('Does the diameter in feet depend on how it is formed? From the typed text: store(VAL/12) against the rebuild\'s store(store(VAL)/12), 8 to 180 in by 0.1 in');
  const dDiff = grid.filter((text) => DIAMETER_STORES[0]!.D(text) !== DIAMETER_STORES[1]!.D(text));
  row(`${dDiff.length} of ${grid.length} diameters differ; the first 20: ${dDiff.slice(0, 20).join(', ')}`);

  h('Do the rebuild\'s stepped trials differ from y + .2 with .2 a single? Every trial from 0.2 ft to 15.2 ft');
  { let a = 0, b = 0, n = 0, first = ''; for (let k = 1; k <= 76; k++) { a = TRIAL_MODELS[0]!.next(a, k, 0); b = TRIAL_MODELS[1]!.next(b, k, 0); n++; if (a !== b && !first) first = `trial ${k}: ${a} against ${b}`; }
    row(first ? `they differ from ${first}` : `identical on all ${n} trials`); }

  h('Table 6-2 diameters: the stepped trial nearest the crown under each trial model (the rebuild\'s diameter store)');
  for (const d of TABLE_6_2_DIAMETERS) {
    const D = diameterFeet(dv(String(d)));
    const parts = TRIAL_MODELS.map((m) => {
      const t = steppedTrials(D, m), last = t[t.length - 1]!, prev = t[t.length - 2] ?? 0;
      const near = D - prev < 1e-4 ? `trial ${t.length - 1} at ${prev.toPrecision(9)}, ${signed(prev - D)} ft, just below; next ${signed(last - D)}`
        : last === D ? `trial ${t.length} on the diameter` : `trial ${t.length} ${signed(last - D)} ft past; last inside ${(D - prev).toFixed(5)} ft below`;
      return `${m.name}: ${near}`;
    });
    const same = DIAMETER_STORES[0]!.D(String(d)) === DIAMETER_STORES[1]!.D(String(d));
    row(`${d} in (D ${D.toPrecision(9)} ft; store(VAL/12) ${same ? 'gives the same D' : `gives ${DIAMETER_STORES[1]!.D(String(d)).toPrecision(9)}`})`);
    for (const p of parts) row(`    ${p}`);
  }

  h('8 to 180 in by 0.1 in: diameters where a stepped trial lands exactly on the diameter, by diameter store and trial model');
  for (const ds of DIAMETER_STORES) for (const m of TRIAL_MODELS) {
    const on = grid.filter((text) => { const D = ds.D(text), tr = steppedTrials(D, m); return tr[tr.length - 1] === D; });
    row(`${ds.name}; ${m.name}: ${on.length} diameters: ${on.join(', ')}`);
  }

  h('Diameters that are a multiple of 0.2 ft (2.4 in) and where the counter base + k·.2 does not land on D');
  for (const ds of DIAMETER_STORES) {
    const mult = grid.filter((text) => Math.round(Number(text) * 10) % 24 === 0);
    const off = mult.filter((text) => { const D = ds.D(text), tr = steppedTrials(D, TRIAL_MODELS[2]!); return tr[tr.length - 1] !== D; });
    row(`${ds.name}: ${mult.length - off.length} of ${mult.length} multiples land on D; not: ${off.join(', ')}`);
  }

  h('The rebuild\'s trials, by diameter store: where the stepped search reaches the diameter, and above what discharge (F at the last trial inside, divided by 0.995)');
  for (const ds of DIAMETER_STORES) {
    row(ds.name);
    for (const text of grid) {
      const D = ds.D(text), tr = steppedTrials(D, rebuildModel);
      if (tr[tr.length - 1] !== D) continue;
      const prev = tr[tr.length - 2]!, F = circleCriticalDischarge(D), fp = f(F(prev));
      row(`    ${text} in: D ${D.toPrecision(9)} ft, trial ${tr.length} on it; last trial inside ${prev.toPrecision(9)} ft (A·√(gA/T) ${fp.toFixed(4)} cfs); reaches D for q above ${(fp / (1 - CIRCLE_TOL)).toFixed(4)} cfs; critical discharge at 0.9·D ${F(f(0.9 * D)).toFixed(3)} cfs, ${prev < 0.9 * D ? 'so the generator can draw it' : 'so the generator cannot draw it'}`);
    }
  }

  const report = (c: { id: string; inputs: Record<string, string> }) => {
    const v = vals('critical_depth', c.inputs), D = diameterFeet(v.diameter!), q = v.discharge!, F = circleCriticalDischarge(D);
    let lo = 0.01, hi = 0.999999; for (let k = 0; k < 80; k++) { const mm = (lo + hi) / 2; if (F(mm * D) < q) lo = mm; else hi = mm; }
    const D2 = DIAMETER_STORES[1]!.D(c.inputs.diameter!);
    row(`${c.id} ${inputText(c.inputs)} [D ${D.toPrecision(9)} ft; store(VAL/12) ${D2 === D ? 'gives the same D' : `gives ${D2.toPrecision(9)} ft`}; A·√(gA/T) reaches q at ${((lo + hi) / 2).toFixed(4)}·D]`);
    const head: string[] = [], tail: string[] = []; let nTrials = 0, lastY = 0;
    const rec = appSearch((y) => {
      const x = F(y), s = `${y.toPrecision(9)} (${pct(f(x), q)})`; nTrials++; lastY = y;
      if (head.length < 30) head.push(s); else { tail.push(s); if (tail.length > 6) tail.shift(); }
      return x;
    }, q, { bottom: 0, first: CIRCLE_CD_STEP, step: CIRCLE_CD_STEP, ceiling: D, tol: CIRCLE_TOL, afterShortChord: 'resume' });
    const shown = nTrials > head.length + tail.length ? [...head, `… ${nTrials - head.length - tail.length} more …`, ...tail] : [...head, ...tail];
    row(`    K1 trials (search.ts, ${nTrials}): ${shown.join(', ')}; ${rec.ok ? `stops at ${rec.y.toFixed(5)}` : rec.reason === 'past_ceiling' ? `the next trial, ${f(lastY + CIRCLE_CD_STEP).toPrecision(9)}, is ${signed(f(lastY + CIRCLE_CD_STEP) - D)} ft past the diameter: rejected` : rec.reason}`);
    const now = solve({ mode: 'critical_depth', shape: 'circle', inputs: c.inputs });
    const n2 = appOutcome(v, 'narrow');
    row(`    N2, the rebuild now (solve): ${now.outcome}${now.flags.length ? ` [${now.flags.map((x) => x.code).join(', ')}]` : ''}${n2.r.ok ? ` (search depth ${n2.r.y.toFixed(5)}) ${line('critical_depth', now.printed)}` : ''}`);
    const k1 = cd(v, GEO_C2, m2, { ...CD_RULE, after: 'resume' });
    const k1p = rec.ok && k1 ? show('critical_depth', v, k1.out) : null;
    if (rec.ok && k1 && Math.abs(k1.found.y - rec.y) > 1e-9) row(`    WARNING: cd() stops at ${k1.found.y} where search.ts stops at ${rec.y}`);
    row(`    K1 (search.ts): ${k1p ? `result (search depth ${rec.y.toFixed(5)}) ${line('critical_depth', k1p)}` : appOutcome(v, 'resume').outcome}`);
    if (k1p && n2.r.ok) {
      const dk = FIELDS.critical_depth.filter((k) => now.printed[k] !== k1p[k]);
      row(`    N2 against K1: ${dk.length ? 'differ on ' + dk.map((k) => `${k} \`${now.printed[k]!.trim()}\`/\`${k1p[k]!.trim()}\``).join(', ') : 'the same fields'}`);
    }
    const modelLine = (o: ModelOutcome, Dft: number) => {
      if (o.outcome !== 'result' || o.y === undefined) return o.outcome;
      const p = show('critical_depth', v, cdFields(v, GEO_C2, m2, o.y, CD_RULE.offset, 'q/A', Dft));
      const dk = k1p ? FIELDS.critical_depth.filter((k) => p[k] !== k1p[k]) : [];
      return `result at ${o.y.toFixed(5)} ${line('critical_depth', p)}${k1p ? (dk.length ? `; differs from K1 on ${dk.join(', ')}` : '; the same fields as K1') : ''}`;
    };
    for (const m of TRIAL_MODELS) row(`    ${m.name}: ${modelLine(k1Model(F, q, D, m), D)}`);
    row(`    K1 with the rebuild's trials and D = store(VAL/12): ${modelLine(k1Model(circleCriticalDischarge(D2), q, D2, rebuildModel), D2)}`);
  };
  h('A-011 predictions (S1 to S5, as committed in A-011): n .013, slope .005');
  for (const c of A011_CASES) report(c);
  h('Amendment of 2026-11-25: S6 to S11, n .013, slope .005');
  for (const c of A011_AMENDMENT_CASES) report(c);
}

// ---- A-012: grade S1 to S11 against A-011 and its amendment as committed ----------------------
/** The commits that hold A-011 and its amendment as written before the runs. */
const A011_COMMIT = 'b4950f7', A011_AMENDMENT_COMMIT = '3d9bf3a';
/** The ledger decisions that list the S runs and goldens (the Exhumer's, 2026-11-25). */
const A011_DECISIONS = [87, 88];
/** The models graded, in the amendment's column order. */
const A012_MODELS = ['N2', 'K1', 'y + .2 single', 'Counter', 'Double depth', 'Tested before the store', 'K1, D = store(VAL/12)'] as const;
type A012Model = (typeof A012_MODELS)[number];
type PredOutcome = 'result' | 'rejected' | 'on_diameter' | 'never_finishes';
interface A011Pred { id: string; inputs: Record<string, string>; said: Partial<Record<A012Model, string>>; derived: Partial<Record<A012Model, string>>; fields: Partial<Record<A012Model, Record<string, string>>> }
const committedSection = (commit: string, title: string) => {
  const text = execFileSync('git', ['show', `${commit}:results/attempts.md`], { cwd: ROOT, encoding: 'utf-8' });
  const start = text.indexOf(`\n${title}`);
  if (start < 0) throw new Error(`no "${title}" at ${commit}`);
  const rest = text.slice(start + 1), end = rest.slice(3).search(/\n## /);
  return end < 0 ? rest : rest.slice(0, end + 3);
};
const tableCells = (l: string) => l.split('|').slice(1, -1).map((c) => c.trim().replace(/\*\*/g, ''));
const predOutcome = (cell: string): PredOutcome => {
  if (/^result/.test(cell)) return 'result';
  if (/^rejected/.test(cell)) return 'rejected';
  if (/^on the diameter/.test(cell)) return 'on_diameter';
  if (/^never finishes/.test(cell)) return 'never_finishes';
  throw new Error(`unread prediction "${cell}"`);
};
function a011AsCommitted(): A011Pred[] {
  const preds = new Map<string, A011Pred>();
  const fieldRow = (header: string[], c: string[], from: number) => {
    const rec: Record<string, string> = {};
    header.slice(from).forEach((hd, i) => { const k = HEADER_KEYS[hd]; if (!k) throw new Error(`unknown column ${hd}`); rec[k] = c[i + from]!; });
    return rec;
  };
  // A-011 (S1 to S5).
  const a = committedSection(A011_COMMIT, '## A-011: trials');
  const common = /n ([\d.]+) and slope ([\d.]+) in all five/.exec(a);
  if (!common) throw new Error(`A-011 at ${A011_COMMIT}: no common n and slope`);
  // A-011 gives no column for these two models on S1 to S5; its text and the amendment's say they
  // predict what K1 predicts there. The sentences are checked, and the predictions marked derived.
  const singleSame = /the single literal\s+alone changes nothing on stepped trials/.test(a);
  const n2Same = /N2 prints the\s+same fields, so S1 does not separate K1 from N2/.test(a);
  const am = committedSection(A011_AMENDMENT_COMMIT, '## A-011, amendment of 2026-11-25');
  const storeSame = /S1 to S5 are unaffected: 12, 24, 36 and 48 in give the same D both ways, and every outcome is\s+the same/.test(am);
  if (!singleSame || !n2Same || !storeSame) throw new Error('a sentence the derived predictions rest on is missing');
  let header: string[] = [];
  for (const l of a.split('\n')) {
    if (!l.startsWith('| ')) continue;
    const c = tableCells(l);
    if (c[0] === 'Case') { header = c; continue; }
    if (!/^S\d+$/.test(c[0]!)) continue;
    if (header[4] === 'Rebuild now (N2)') {
      const cols: Record<string, A012Model> = { 'Rebuild now (N2)': 'N2', "K1, the rebuild's trials": 'K1', 'Counter `base + k·.2`': 'Counter', 'Double depth': 'Double depth', 'Tested before the store': 'Tested before the store' };
      const said: Partial<Record<A012Model, string>> = {};
      header.forEach((hd, i) => { const m = cols[hd]; if (m) said[m] = c[i]!; });
      if (Object.keys(said).length !== 5) throw new Error(`A-011 at ${A011_COMMIT}: read ${Object.keys(said).length} model columns`);
      preds.set(c[0]!, { id: c[0]!, inputs: { diameter: c[1]!, n: common[1]!, discharge: c[2]!, slope: common[2]! }, said,
        derived: { 'y + .2 single': said.K1!, 'K1, D = store(VAL/12)': said.K1! }, fields: {} });
    } else if (header[1] === 'Diameter' && header[4] === 'Depth') {
      const p = preds.get(c[0]!)!, rec = fieldRow(header, c, 1);
      // The row is K1's; "same fields" in a model's cell, and the sentence for N2, give it to them.
      for (const m of A012_MODELS) if (m === 'K1' || m === 'N2' || /same fields/.test(p.said[m] ?? '') || p.derived[m]) p.fields[m] = rec;
    }
  }
  // The amendment (S6 to S11).
  const common2 = /n ([\d.]+) and slope ([\d.]+) in all six/.exec(am);
  if (!common2) throw new Error(`amendment at ${A011_AMENDMENT_COMMIT}: no common n and slope`);
  header = [];
  for (const l of am.split('\n')) {
    if (!l.startsWith('| ')) continue;
    const c = tableCells(l);
    if (c[0] === 'Case') { header = c; continue; }
    if (!/^S\d+$/.test(c[0]!)) continue;
    if (header[4] === 'N2 (today)') {
      const cols: Record<string, A012Model> = { 'N2 (today)': 'N2', K1: 'K1', 'y + .2, .2 single': 'y + .2 single', Counter: 'Counter', 'Double depth': 'Double depth', 'Tested before the store': 'Tested before the store', 'K1, D = store(VAL/12)': 'K1, D = store(VAL/12)' };
      const said: Partial<Record<A012Model, string>> = {};
      header.forEach((hd, i) => { const m = cols[hd]; if (m) said[m] = c[i]!; });
      if (Object.keys(said).length !== 7) throw new Error(`amendment at ${A011_AMENDMENT_COMMIT}: read ${Object.keys(said).length} model columns`);
      preds.set(c[0]!, { id: c[0]!, inputs: { diameter: c[1]!, n: common2[1]!, discharge: c[2]!, slope: common2[2]! }, said, derived: {}, fields: {} });
    } else if (header[1] === 'Rule') {
      const p = preds.get(c[0]!)!, rec = fieldRow(header, c, 2);
      if (c[1] === 'N2') p.fields.N2 = rec;
      else if (c[1] === 'K1, and every trial model') { for (const m of A012_MODELS) if (m !== 'N2' && /K1's fields|^result \(/.test(p.said[m]!)) p.fields[m] = rec; }
      else throw new Error(`unknown rule row ${c[1]}`);
    }
  }
  if (preds.size !== 11) throw new Error(`read ${preds.size} of the 11 S cases`);
  return [...preds.values()].sort((x, y) => Number(x.id.slice(1)) - Number(y.id.slice(1)));
}
type Seen = { outcome: 'result' | 'rejected' | 'shape_menu' | 'other'; source: string; golden: boolean; printed?: Record<string, string>; screen?: string[]; resends?: number };
/** The final screen of a run folder read as an observation. */
function seenInRun(r: RunFolder): Seen {
  const said = r.screen.some((l) => l.includes(DEPTH_ABOVE_DIAMETER));
  const t = (r.run as unknown as { transcript?: { resend: boolean }[]; resends?: number });
  const resends = (t.transcript ?? []).filter((x) => x.resend).length + (t.resends ?? 0);
  const outcome = said && ['cd_circ_rejected', 'cd_form'].includes(r.run.screen_id) ? 'rejected'
    : !said && r.run.screen_id === 'shape_menu' ? 'shape_menu' : 'other';
  return { outcome, source: `run ${r.id}`, golden: false, screen: r.screen, resends };
}
/** What QUICK-2 did for these inputs: a golden one of `decisions` lists, else a run folder it lists. */
function observeListed(inputs: Record<string, string>, decisions: number[]): Seen {
  const ledger = JSON.parse(readFileSync(join(ROOT, 'results', 'ledger.json'), 'utf-8'));
  const listed = new Set<string>();
  for (const n of decisions) {
    const d = ledger.decisions.find((x: { n: number }) => x.n === n);
    if (!d) throw new Error(`ledger decision ${n} not found`);
    for (const e of d.evidence) listed.add(e);
  }
  const g = ALL.find((x) => listed.has(x.id) && x.mode === 'critical_depth' && x.shape === 'circle' && sameInputs(x.inputs, inputs));
  if (g) return { outcome: g.outcome === 'result' ? 'result' : g.outcome === 'rejected' ? 'rejected' : 'other', source: g.id, golden: true, printed: g.printed };
  for (const id of listed) {
    const r = runFolder(id);
    if (!r || r.run.mode !== 'critical_depth' || r.run.shape !== 'circle' || !sameInputs(r.run.inputs, inputs)) continue;
    return seenInRun(r);
  }
  throw new Error(`no golden and no run folder for ${JSON.stringify(inputs)}; ledger decisions ${decisions.join(' and ')} list the runs (oracle/out is not committed, so only a machine that holds the run folders can grade them)`);
}
/** The rejection screen as A-008 and A-010 describe it: message row, Depth field, blank outputs. */
function rejectionScreen(screen: string[]): string {
  const at = screen.findIndex((l) => l.includes(DEPTH_ABOVE_DIAMETER));
  const depth = /Depth \(ft\)\s+(\S+)/.exec(screen.find((l) => l.includes('Depth (ft)')) ?? '')?.[1] ?? '';
  const outputs = screen.filter((l) => /Area \(sq ft\)|Velocity \(ft\/s\)|Top Width \(ft\)|Max Discharge\(cfs\)/.test(l));
  const sl = screen.find((l) => l.includes('Critical Slope')) ?? '';
  const blank = !/\d/.test(sl.slice(sl.indexOf('Critical Slope'))) && outputs.every((l) => !/\d/.test(l.replace(/\(sq ft\)|\(ft\/s\)|\(ft\)|\(cfs\)/g, '')));
  return `message on 0-based row ${at}; Depth field \`${depth}\`; Critical Slope and output fields ${blank ? 'all blank' : 'NOT blank'}`;
}
function gradeA011() {
  const preds = a011AsCommitted();
  console.log(`A-011 read from ${A011_COMMIT} (S1 to S5) and its amendment from ${A011_AMENDMENT_COMMIT} (S6 to S11): ${preds.length} cases.`);
  console.log(`Derived, not in a column: on S1 to S5, "y + .2 single" and "K1, D = store(VAL/12)" predict K1's column (A-011: "the single literal alone changes nothing on stepped trials"; amendment: "S1 to S5 are unaffected"), and N2's S1 fields are K1's row (A-011: "N2 prints the same fields").`);
  const score = Object.fromEntries(A012_MODELS.map((m) => [m, 0])) as Record<A012Model, number>;
  const notGolden: string[] = [];
  const seen = new Map<string, Seen>();
  for (const p of preds) {
    const o = observeListed(p.inputs, A011_DECISIONS);
    seen.set(p.id, o);
    if (!o.golden) notGolden.push(`${p.id} (${o.source})`);
    row(`${p.id} ${inputText(p.inputs)}: QUICK-2 ${o.outcome} (${o.golden ? `golden ${o.source}` : `${o.source}, final screen, not a golden yet`})`);
    if (o.outcome === 'rejected' && o.screen) row(`    screen: ${rejectionScreen(o.screen)}`);
    for (const m of A012_MODELS) {
      const said = p.said[m] ?? p.derived[m]!, predicted = predOutcome(said);
      const tag = p.said[m] ? '' : ' [derived]';
      let verdict = predicted === o.outcome ? 'right' : 'wrong', note = '';
      const fr = p.fields[m];
      if (verdict === 'right' && o.outcome === 'result') {
        if (!fr || !o.printed) throw new Error(`${p.id} ${m}: a result with no predicted fields`);
        const diff = Object.entries(fr).filter(([k, x]) => o.printed![k]!.trim() !== x).map(([k, x]) => `${k} predicted \`${x}\`, printed \`${o.printed![k]!.trim()}\``);
        note = `; fields ${Object.keys(fr).length - diff.length} of ${Object.keys(fr).length} as predicted${diff.length ? ': ' + diff.join('; ') : ''}`;
        if (diff.length) verdict = 'wrong';
      }
      if (predicted === 'on_diameter' && o.outcome !== 'shape_menu') note += '; A-011 read "on the diameter" as the 9.6 in run\'s ending, the shape menu with no message';
      if (verdict === 'right') score[m]++;
      row(`    ${m}${tag} predicted "${said}": ${verdict}${note}`);
    }
  }
  console.log(`\nAll eleven, outcome and every predicted field: ${A012_MODELS.map((m) => `${m} ${score[m]} of ${preds.length}`).join(', ')}.`);
  console.log(`Not goldens yet (run folder final screens, under oracle/out, not committed): ${notGolden.join(', ')}.`);

  h('K1 against the rebuild today (solve) on S6 to S10');
  let k1 = 0, n2 = 0;
  for (const p of preds.filter((x) => ['S6', 'S7', 'S8', 'S9', 'S10'].includes(x.id))) {
    const o = seen.get(p.id)!, now = solve({ mode: 'critical_depth', shape: 'circle', inputs: p.inputs });
    const nowOut = now.outcome === 'result' ? 'result' : now.outcome;
    const said = predOutcome(p.said.N2!);
    const nowFields = now.outcome === 'result' ? FIELDS.critical_depth.filter((k) => p.fields.N2?.[k] !== undefined && now.printed[k]!.trim() !== p.fields.N2![k]) : [];
    row(`${p.id}: QUICK-2 ${o.outcome}; solve() today ${nowOut}${said === nowOut && !nowFields.length ? ', as the amendment\'s N2 column says' : `, NOT as the amendment's N2 column (${p.said.N2})`}`);
    let k1Right = predOutcome(p.said.K1!) === o.outcome, n2Right = nowOut === o.outcome;
    if (o.outcome === 'result' && o.printed) {
      const k1d = FIELDS.critical_depth.filter((k) => p.fields.K1![k] !== o.printed![k]!.trim());
      const n2d = now.outcome === 'result' ? FIELDS.critical_depth.filter((k) => now.printed[k] !== o.printed![k]) : FIELDS.critical_depth;
      row(`    K1: ${k1d.length ? 'differs on ' + k1d.join(', ') : 'every field as printed'}; today's rebuild: ${n2d.length ? `differs on ${n2d.map((k) => `${k} \`${now.printed[k]?.trim()}\` against \`${o.printed![k]!.trim()}\``).join(', ')}` : 'every field as printed'}`);
      k1Right &&= !k1d.length; n2Right &&= !n2d.length;
    }
    if (k1Right) k1++; if (n2Right) n2++;
    row(`    K1 ${k1Right ? 'right' : 'wrong'}, today's rebuild ${n2Right ? 'right' : 'wrong'}`);
  }
  row(`K1 ${k1} of 5, today's rebuild ${n2} of 5`);

  h('S2 and the trial on the diameter (circle-short-chord 1.4, 2.6, 2.7)');
  const s2 = preds.find((x) => x.id === 'S2')!, v2 = vals('critical_depth', s2.inputs), D2 = diameterFeet(v2.diameter!);
  const now2 = solve({ mode: 'critical_depth', shape: 'circle', inputs: s2.inputs });
  const tr = steppedTrials(D2, TRIAL_MODELS[0]!);
  row(`S2: D ${D2.toPrecision(9)} ft; the rebuild's stepped trials ${tr.map((t) => t.toPrecision(9)).join(', ')}; the last ${tr[tr.length - 1] === D2 ? 'equals' : 'does not equal'} D`);
  row(`solve() today: ${now2.outcome}${now2.flags.length ? ` [${now2.flags.map((x) => x.code).join(', ')}]` : ''}; QUICK-2: ${seen.get('S2')!.outcome} (${seen.get('S2')!.source})`);
  const q029 = runFolder('20261125-100815-dff8b0');
  if (q029) { const o = seenInRun(q029); row(`9.6 in run ${q029.id} (Q-029, exploratory): ${o.outcome}, ${o.resends} resent keys in its transcript; inputs ${inputText(q029.run.inputs)}`); }
  else row('9.6 in run 20261125-100815-dff8b0: no run folder on this machine');
}

// ---- A-013: what separates the 9.6 in run from S2 -------------------------------------------
/** How a trial depth is formed. `next(prev, k, base)` is the k-th trial after `base` (0 at the
 * start, or the short chord stepping resumes from); `pre` the same sum before it is stored;
 * `keep` what a chord is held as; `geo` what the geometry is given. */
interface Former { id: string; name: string; next: (p: number, k: number, b: number) => number; pre: (p: number, k: number, b: number) => number; keep: (y: number) => number; geo: (y: number) => number; stored: boolean }
const S02 = f(0.2);
const FORMERS: Former[] = [
  { id: 'T1', name: 'store(y + 0.2), 0.2 a double (the rebuild)', next: (p) => f(p + CIRCLE_CD_STEP), pre: (p) => p + CIRCLE_CD_STEP, keep: f, geo: (y) => y, stored: true },
  { id: 'T2', name: 'store(y + .2), .2 a single', next: (p) => f(p + S02), pre: (p) => p + S02, keep: f, geo: (y) => y, stored: true },
  { id: 'T3', name: 'store(base + k·.2), a counter', next: (_p, k, b) => f(b + f(k * S02)), pre: (_p, k, b) => b + k * S02, keep: f, geo: (y) => y, stored: true },
  { id: 'T4', name: 'y + .2 in double, the geometry given the double', next: (p) => p + 0.2, pre: (p) => p + 0.2, keep: (y) => y, geo: (y) => y, stored: false },
  { id: 'T5', name: 'y + .2 in double, the geometry given store(y)', next: (p) => p + 0.2, pre: (p) => p + 0.2, keep: (y) => y, geo: f, stored: false },
  { id: 'T6', name: 'base + k·.2 in double, the geometry given the double', next: (_p, k, b) => b + k * 0.2, pre: (_p, k, b) => b + k * 0.2, keep: (y) => y, geo: (y) => y, stored: false },
  { id: 'T7', name: 'base + k·.2 in double, the geometry given store(y)', next: (_p, k, b) => b + k * 0.2, pre: (_p, k, b) => b + k * 0.2, keep: (y) => y, geo: f, stored: false },
];
/** How the diameter in feet is held. VAL's value is a double; the rebuild stores it first. */
interface Dstore { id: string; name: string; D: (text: string) => number }
const DSTORES: Dstore[] = [
  { id: 'D1', name: 'store(store(VAL)/12) (the rebuild)', D: (t) => f(f(val(t)) / 12) },
  { id: 'D2', name: 'store(VAL/12)', D: (t) => f(val(t) / 12) },
  { id: 'D3', name: 'VAL/12 in double', D: (t) => val(t) / 12 },
  { id: 'D4', name: 'store(VAL)/12 in double', D: (t) => f(val(t)) / 12 },
];
/** How a trial is tested against the diameter. `past(t, pre, D, text)` true means rejected. */
interface Dtest { id: string; name: string; past: (t: number, pre: number, D: number, text: string) => boolean; storedOnly?: boolean }
const DTESTS: Dtest[] = [
  { id: 'X1', name: 'trial > D (the rebuild)', past: (t, _p, D) => t > D },
  { id: 'X2', name: 'trial >= D', past: (t, _p, D) => t >= D },
  { id: 'X3', name: 'the sum before the store > D', past: (_t, p, D) => p > D, storedOnly: true },
  { id: 'X4', name: 'the sum before the store >= D', past: (_t, p, D) => p >= D, storedOnly: true },
  { id: 'X5', name: 'in inches: trial·12 > store(VAL)', past: (t, _p, _D, s) => t * 12 > f(val(s)) },
  { id: 'X6', name: 'in inches: trial·12 >= store(VAL)', past: (t, _p, _D, s) => t * 12 >= f(val(s)) },
];
type A013Outcome = { outcome: 'result' | 'rejected' | 'menu' | 'no_end'; y?: number; at?: number; from?: number; k?: number };
/** K1 with the trial, diameter and test of one combination. A trial the test passes is rejected
 * with the message. Otherwise the geometry is given the trial; if that depth is at or past the
 * diameter the geometry has, T = 0 divides by zero or √ of a negative is taken, a QuickBASIC
 * error, read as the shape menu with no message (quick2-solver design, Negative values and
 * abandoned calculations, an inference). */
function a013Search(text: string, q: number, t: Former, ds: Dstore, x: Dtest, bracket?: { lo: number; flo: number; hi: number; fhi: number }, scale = 1): A013Outcome {
  const D = ds.D(text), F = circleCriticalDischarge(D);
  const close = (v: number) => Math.abs(v - q) <= CIRCLE_TOL * q;
  const ev = (y: number): number | null => { const yg = t.geo(y); return yg >= D ? null : f(F(yg) * scale); };
  let lo = 0, flo = 0, base = 0, k = 1, prev = 0;
  for (let guard = 0; guard < 20000; guard++) {
    let hi: number, fhi: number;
    if (bracket) { ({ lo, flo, hi, fhi } = bracket); bracket = undefined; }
    else {
      const y = t.next(prev, k, base), pre = t.pre(prev, k, base);
      if (x.past(y, pre, D, text)) return { outcome: 'rejected', at: y, from: base, k };
      const fy = ev(y);
      if (fy === null) return { outcome: 'menu', at: y, from: base, k };
      if (close(fy)) return { outcome: 'result', y: t.geo(y) };
      if (fy < q) { lo = y; flo = fy; prev = y; k++; continue; }
      hi = y; fhi = fy;
    }
    let resumed = false;
    for (let c = 0; c < 1000 && !resumed; c++) {
      const yc = t.keep(lo + ((q - flo) * (hi - lo)) / (fhi - flo)), fc = ev(yc);
      if (fc === null) return { outcome: 'menu', at: yc };
      if (close(fc)) return { outcome: 'result', y: t.geo(yc) };
      if (fc > q) { hi = yc; fhi = fc; continue; }
      lo = yc; flo = fc; base = yc; prev = yc; k = 1; resumed = true;
    }
    if (!resumed) return { outcome: 'no_end' };
  }
  return { outcome: 'no_end' };
}
/** The stepped trials from 0.2 ft of one combination in one pipe, which do not depend on q: each
 * trial and its A·√(gA/T), up to the first the test rejects or the geometry cannot take. */
interface Stepped { ys: number[]; Fs: number[]; stop: A013Outcome; ptr: number }
function stepped(text: string, t: Former, ds: Dstore, x: Dtest): Stepped {
  const D = ds.D(text), F = circleCriticalDischarge(D), ys: number[] = [], Fs: number[] = [];
  let prev = 0, stop: A013Outcome = { outcome: 'no_end' };
  for (let k = 1; k < 20000; k++) {
    const y = t.next(prev, k, 0), pre = t.pre(prev, k, 0);
    if (x.past(y, pre, D, text)) { stop = { outcome: 'rejected', at: y }; break; }
    const yg = t.geo(y);
    if (yg >= D) { stop = { outcome: 'menu', at: y }; break; }
    ys.push(y); Fs.push(f(F(yg))); prev = y;
  }
  return { ys, Fs, stop, ptr: 0 };
}
/** a013Search for discharges taken in increasing order: the stepped part is looked up. */
function a013Fast(s: Stepped, text: string, q: number, t: Former, ds: Dstore, x: Dtest): A013Outcome {
  while (s.ptr < s.ys.length && s.Fs[s.ptr]! < q * (1 - CIRCLE_TOL)) s.ptr++;
  const i = s.ptr;
  if (i >= s.ys.length) return s.stop;
  const fy = s.Fs[i]!;
  if (Math.abs(fy - q) <= CIRCLE_TOL * q) return { outcome: 'result', y: t.geo(s.ys[i]!) };
  return a013Search(text, q, t, ds, x, { lo: i ? s.ys[i - 1]! : 0, flo: i ? s.Fs[i - 1]! : 0, hi: s.ys[i]!, fhi: fy });
}
interface A013Obs { name: string; inputs: Record<string, string>; seen: 'result' | 'rejected' | 'shape_menu'; source: string; golden?: Golden }
const Q029_RUN = '20261125-100815-dff8b0';
const SIX_REJECTIONS: { name: string; run: string; inputs: Record<string, string> }[] = [
  ...REJECTED_RUNS.map((r, i) => ({ name: ['Q-022 run', 'P1', 'P2', 'P4'][i]!, ...r })),
  { name: 'Q1', run: '20261125-100706-f61649', inputs: A009_CASES[0]!.inputs },
  { name: 'Q2', run: '20261125-100748-9dd937', inputs: A009_CASES[1]!.inputs },
];
function a013Observations(): A013Obs[] {
  const out: A013Obs[] = circles('critical_depth').map((g) => ({ name: g.id, inputs: g.inputs, seen: 'result' as const, source: `golden ${g.id}`, golden: g }));
  const fromRun = (name: string, id: string, inputs: Record<string, string>) => {
    const r = runFolder(id);
    if (!r) throw new Error(`run folder ${id} (${name}) is not on this machine; oracle/out is not committed`);
    if (!sameInputs(r.run.inputs, inputs)) throw new Error(`run ${id} has other inputs than ${name}`);
    const s = seenInRun(r);
    if (s.outcome !== 'rejected' && s.outcome !== 'shape_menu') throw new Error(`run ${id} (${name}) reads as ${s.outcome}`);
    out.push({ name, inputs, seen: s.outcome, source: `run ${id}` });
  };
  for (const r of SIX_REJECTIONS) fromRun(r.name, r.run, r.inputs);
  for (const c of [...A011_CASES, ...A011_AMENDMENT_CASES]) {
    const o = observeListed(c.inputs, A011_DECISIONS);
    if (o.golden) { if (!out.some((x) => x.golden?.id === o.source)) throw new Error(`${c.id}'s golden ${o.source} is not a circle Critical Depth result`); continue; }
    fromRun(c.id, o.source.replace(/^run /, ''), c.inputs);
  }
  fromRun('9.6 in run (Q-029)', Q029_RUN, { diameter: '9.6', n: '.013', discharge: '2', slope: '.005' });
  return out;
}
/** Does a combination give what QUICK-2 gave? Results are compared on every printed field. */
function a013Fits(o: A013Obs, t: Former, ds: Dstore, x: Dtest, m2: QmaxRule): { ok: boolean; got: string } {
  const v = vals('critical_depth', o.inputs), r = a013Search(o.inputs.diameter!, v.discharge!, t, ds, x);
  if (r.outcome === 'result') {
    if (o.seen !== 'result') return { ok: false, got: `result at ${r.y!.toFixed(5)}` };
    const p = show('critical_depth', v, cdFields(v, GEO_C2, m2, r.y!, CD_RULE.offset, 'q/A', ds.D(o.inputs.diameter!)));
    const d = misses(o.golden!, p);
    return { ok: !d.length, got: d.length ? `result, misses ${d.join('; ')}` : 'result, every field' };
  }
  const seen = r.outcome === 'menu' ? 'shape_menu' : r.outcome;
  return { ok: seen === o.seen, got: `${r.outcome}${r.at !== undefined ? ` at trial ${r.at.toPrecision(10)}` : ''}` };
}
const combos = () => FORMERS.flatMap((t) => DSTORES.flatMap((ds) => DTESTS.filter((x) => t.stored || !x.storedOnly).map((x) => ({ t, ds, x, id: `${t.id}·${ds.id}·${x.id}` }))));
/** Predictions for cases nobody has run, n .013 and slope .005 unless shown. */

function a013() {
  const m2 = atShare(0.9382), obs = a013Observations(), all = combos();
  h(`Observations: ${obs.length}`);
  const by = (s: string) => obs.filter((o) => o.seen === s).length;
  row(`${by('result')} circle Critical Depth result goldens, ${by('rejected')} runs that printed the message (the six rejections and S2 to S5, S7 to S11), ${by('shape_menu')} run that ended on the shape menu (${Q029_RUN})`);
  const q = runFolder(Q029_RUN)!, qs = seenInRun(q);
  row(`${Q029_RUN}: ${q.run.outcome} on ${q.run.screen_id}, ${qs.resends} resent keys, transcript ${(q.run as unknown as { transcript: { keys: string }[] }).transcript.map((s) => s.keys).join(' ')}`);

  h('Check: T1·D1·X1 is the rebuild\'s K1 (search.ts with afterShortChord resume) on every observation, a trial on D read as menu');
  { let same = 0; for (const o of obs) {
      const v = vals('critical_depth', o.inputs), a = appOutcome(v, 'resume'), b = a013Search(o.inputs.diameter!, v.discharge!, FORMERS[0]!, DSTORES[0]!, DTESTS[0]!);
      const ao = a.outcome === 'never_finishes' ? 'menu' : a.outcome;
      if (ao === b.outcome && (b.outcome !== 'result' || Math.abs(a.r.y - b.y!) < 1e-12)) same++; else row(`differs: ${o.name}: search.ts ${a.outcome}, here ${b.outcome}`);
    } row(`${same} of ${obs.length}`); }

  h('The two pipes, trial by trial near the crown, per combination part');
  for (const text of ['9.6', '12']) {
    for (const ds of DSTORES) {
      const D = ds.D(text);
      const parts = FORMERS.map((t) => { let p = 0; const tr: number[] = []; for (let k = 1; k < 60; k++) { const y = t.next(p, k, 0); tr.push(y); p = y; if (y >= D - 1e-6) break; }
        const y = tr[tr.length - 1]!, pre = t.pre(tr[tr.length - 2] ?? 0, tr.length, 0);
        return `${t.id} ${y.toPrecision(10)} (${signed(y - D)}; before the store ${signed(pre - D)}; given to the geometry ${signed(t.geo(y) - D)})`; });
      row(`${text} in, ${ds.id} D = ${D.toPrecision(12)}: ${parts.join('; ')}`);
    }
  }

  h(`Every combination (${all.length}): trial ${FORMERS.length} ways, diameter ${DSTORES.length}, test ${DTESTS.length} (the two before-the-store tests only for stored trials)`);
  for (const t of FORMERS) row(`${t.id}: ${t.name}`);
  for (const ds of DSTORES) row(`${ds.id}: ${ds.name}`);
  for (const x of DTESTS) row(`${x.id}: ${x.name}`);
  const fits: typeof all = [];
  const keyObs = ['9.6 in run (Q-029)', 'S2'];
  for (const c of all) {
    const res = obs.map((o) => ({ o, ...a013Fits(o, c.t, c.ds, c.x, m2) }));
    const bad = res.filter((r) => !r.ok);
    const kr = keyObs.map((n) => { const r = res.find((x) => x.o.name === n)!; return `${n === 'S2' ? 'S2' : '9.6 in'} ${r.ok ? 'fits' : 'NOT'} (${r.got})`; });
    row(`${c.id}: ${obs.length - bad.length} of ${obs.length}; ${kr.join(', ')}${bad.length ? `; misses ${bad.slice(0, 6).map((r) => `${r.o.name} (${r.got})`).join(', ')}${bad.length > 6 ? `, and ${bad.length - 6} more` : ''}` : ''}`);
    if (!bad.length) fits.push(c);
  }
  h(`Combinations that fit all ${obs.length}: ${fits.length}`);
  for (const c of fits) row(`${c.id}: ${c.t.name}; ${c.ds.name}; ${c.x.name}`);

  if (!fits.length) return;
  // `a013 predictions` skips the check and the grid scan below, which take about 45 min.
  if (process.argv[3] === 'predictions') { a013Predict(fits, m2); return; }
  h('Check: the grid\'s lookup of stepped trials gives what the full search gives, every survivor, every 20th grid diameter, every discharge to the critical discharge at 0.99·D');
  { let same = 0, n = 0;
    for (let i = 0; i < 1721; i += 20) {
      const text = ((80 + i) / 10).toFixed(1), D0 = DSTORES[0]!.D(text), top = Math.floor(circleCriticalDischarge(D0)(f(0.99 * D0)));
      const st = fits.map((c) => stepped(text, c.t, c.ds, c.x));
      for (let qv = 1; qv <= top; qv++) fits.forEach((c, j) => {
        const a = a013Search(text, qv, c.t, c.ds, c.x), b = a013Fast(st[j]!, text, qv, c.t, c.ds, c.x); n++;
        if (a.outcome === b.outcome && a.y === b.y) same++; else if (n - same <= 5) row(`differs: ${c.id} ${text} in q ${qv}: ${a.outcome} ${a.y} against ${b.outcome} ${b.y}`);
      });
    }
    row(`${same} of ${n}`); }

  // Critical Depth's search uses only D and q, so n and slope do not change an outcome; they
  // change only Critical Slope and Max Discharge, which follow from the same search depth.
  h('Where the survivors part: 8 to 180 in by 0.1 in, every whole discharge from 1 to the critical discharge at 0.99·D, n .013, slope .005. "Practical" is the generator\'s range: q at most the critical discharge at 0.9·D. Printed fields are compared in the practical range; above it, outcomes only');
  const grid = Array.from({ length: 1721 }, (_, i) => ((80 + i) / 10).toFixed(1));
  let steps: Stepped[] = [], v1: Vals = {}, Ds: number[] = [];
  const sigOf = (text: string, qv: number, fields: boolean): string[] => {
    const v = { ...v1, discharge: qv };
    const rs = fits.map((c, i) => ({ c, r: a013Fast(steps[i]!, text, qv, c.t, c.ds, c.x), D: Ds[i]! }));
    if (!fields) { const o = rs.map(({ r }) => r.outcome); return new Set(o).size < 2 ? [] : o; }
    const keys = rs.map(({ r, D }) => (r.outcome === 'result' ? `${r.y}|${D}` : r.outcome));
    if (new Set(keys).size < 2) return [];
    const cache = new Map<string, string>();
    return rs.map(({ r, D }, i) => {
      if (r.outcome !== 'result') return r.outcome;
      if (!cache.has(keys[i]!)) cache.set(keys[i]!, `result ${line('critical_depth', show('critical_depth', v, cdFields(v, GEO_C2, m2, r.y!, CD_RULE.offset, 'q/A', D)))}`);
      return cache.get(keys[i]!)!;
    });
  };
  interface Split { text: string; q: number; practical: boolean; sig: string[] }
  const splits: Split[] = [];
  for (const text of grid) {
    const D0 = DSTORES[0]!.D(text), F0 = circleCriticalDischarge(D0), cap = F0(f(0.9 * D0)), top = Math.floor(F0(f(0.99 * D0)));
    steps = fits.map((c) => stepped(text, c.t, c.ds, c.x));
    v1 = vals('critical_depth', { diameter: text, n: '.013', discharge: '1', slope: '.005' }); Ds = fits.map((c) => c.ds.D(text));
    if (Number(text) % 10 === 0) process.stderr.write(`${text} in\n`);
    for (let qv = 1; qv <= top; qv++) {
      const sig = sigOf(text, qv, qv <= cap);
      if (sig.length && new Set(sig).size > 1) splits.push({ text, q: qv, practical: qv <= cap, sig });
    }
  }
  const pattern = (sig: string[]) => { const m = new Map<string, string>(); return sig.map((s) => { if (!m.has(s)) m.set(s, String.fromCharCode(65 + m.size)); return m.get(s)!; }).join(''); };
  const groups = new Map<string, Split[]>();
  for (const s of splits) { const k = pattern(s.sig); if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(s); }
  const byOutcome = (s: Split) => new Set(s.sig.map((x) => x.split(' ')[0])).size > 1;
  const ex = (l: Split[]) => { const p = l.filter((s) => s.practical); return (p.length ? p : l).slice(0, 3).map((s) => `${s.text} in q ${s.q}${s.practical ? ' (practical)' : ''}`).join(', '); };
  const oc = splits.filter(byOutcome), fo = splits.filter((s) => !byOutcome(s));
  row(`survivors in order: ${fits.map((c) => c.id).join(', ')}`);
  row(`${splits.length} grid cases separate at least two survivors, in ${groups.size} patterns (a pattern gives each survivor a letter, the same letter for the same printed answer). ${oc.length} differ in outcome (${oc.filter((s) => s.practical).length} practical); ${fo.length} only in printed fields (${fo.filter((s) => s.practical).length} practical; fields are compared only in the practical range)`);
  for (const [k, list] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
    const o = list.filter(byOutcome), fl = list.filter((s) => !byOutcome(s));
    row(`${k}: ${list.length} cases; in outcome ${o.length} (${o.filter((s) => s.practical).length} practical)${o.length ? `, e.g. ${ex(o)}` : ''}; in fields only ${fl.length}${fl.length ? `, e.g. ${ex(fl)}` : ''}`);
  }
  // Greedy, three passes: practical cases that differ in outcome, any case that differs in
  // outcome, then cases that differ only in printed fields.
  const pairs = (sig: string[]) => { const out: string[] = []; for (let i = 0; i < sig.length; i++) for (let j = i + 1; j < sig.length; j++) if (sig[i] !== sig[j]) out.push(`${i},${j}`); return out; };
  const done = new Set<string>(), chosen: Split[] = [];
  for (const pass of [(s: Split) => s.practical && byOutcome(s), byOutcome, (_s: Split) => true]) {
    const pool = splits.filter(pass);
    for (;;) {
      let best: Split | null = null, gain = 0;
      for (const s of pool) { const g = pairs(s.sig).filter((p) => !done.has(p)).length; if (g > gain) { gain = g; best = s; } }
      if (!best) break;
      chosen.push(best); for (const p of pairs(best.sig)) done.add(p);
    }
  }
  row(`greedy choice: ${chosen.map((s) => `${s.text} in q ${s.q}${s.practical ? ' (practical)' : ''}${byOutcome(s) ? '' : ' (fields only)'}`).join(', ')}`);
  const never = (l: Split[]) => { const out: string[] = []; for (let i = 0; i < fits.length; i++) for (let j = i + 1; j < fits.length; j++) if (!l.some((s) => s.sig[i] !== s.sig[j])) out.push(`${fits[i]!.id} and ${fits[j]!.id}`); return out; };
  const nAll = never(splits), nOut = never(oc);
  row(`pairs no grid case separates: ${nAll.length ? nAll.join('; ') : 'none'}`);
  row(`pairs no grid case separates in outcome: ${nOut.length ? nOut.join('; ') : 'none'}`);
  a013Predict(fits, m2);
}

/** The grid scan's greedy choice in `a013` (every case differs in outcome; the first two are the
 * only practical grid cases that do). `a013Predict` prints each survivor's answer for them. */
const A013_POOL: [string, number][] = [['19.2', 15], ['21.6', 20], ['160.4', 5238], ['55.2', 276], ['88.3', 1013]];
function a013Predict(fits: { t: Former; ds: Dstore; x: Dtest; id: string }[], m2: QmaxRule) {
  h('Predictions for cases not yet run, chosen from the grid scan\'s examples (n .013, slope .005)');
  interface Cand { text: string; q: number; practical: boolean; outcomeOnly: boolean; sig: string[]; lines: string[] }
  const cands: Cand[] = A013_POOL.map(([text, q]) => {
    const v = vals('critical_depth', { diameter: text, n: '.013', discharge: String(q), slope: '.005' });
    const D0 = DSTORES[0]!.D(text), cap = circleCriticalDischarge(D0)(f(0.9 * D0));
    const lines: string[] = [], sig: string[] = [];
    for (const k of fits) {
      const r = a013Search(text, q, k.t, k.ds, k.x);
      const pr = r.outcome === 'result' ? show('critical_depth', v, cdFields(v, GEO_C2, m2, r.y!, CD_RULE.offset, 'q/A', k.ds.D(text))) : null;
      sig.push(pr ? `result ${line('critical_depth', pr)}` : r.outcome);
      lines.push(`${k.id}: ${r.outcome === 'menu' ? 'shape menu, no message' : r.outcome === 'rejected' ? 'rejected with the message' : r.outcome}${r.at !== undefined ? ` (at trial ${r.at.toPrecision(10)})` : ''}${pr ? ` (search depth ${r.y!.toFixed(5)}) ${line('critical_depth', pr)}` : ''}`);
    }
    const outcomeOnly = new Set(sig.map((s) => s.split(' ')[0])).size > 1;
    return { text, q, practical: q <= cap, outcomeOnly, sig, lines };
  });
  const pat = (sig: string[]) => { const m = new Map<string, string>(); return sig.map((s) => { if (!m.has(s)) m.set(s, String.fromCharCode(65 + m.size)); return m.get(s)!; }).join(''); };
  row(`the pool, each case's pattern (survivors in the order above): ${cands.map((c) => `${c.text} in q ${c.q} ${pat(c.sig)}${c.practical ? ' (practical)' : ''}`).join(', ')}`);
  const pairs = (sig: string[]) => { const out: string[] = []; for (let i = 0; i < sig.length; i++) for (let j = i + 1; j < sig.length; j++) if (sig[i] !== sig[j]) out.push(`${i},${j}`); return out; };
  // Greedy, in three passes: practical cases that differ in outcome, then any case that differs
  // in outcome, then cases that differ only in printed fields.
  const done = new Set<string>(), chosen: Cand[] = [];
  const leftNow = () => { const out: string[] = []; for (let i = 0; i < fits.length; i++) for (let j = i + 1; j < fits.length; j++) if (!done.has(`${i},${j}`)) out.push(`${fits[i]!.id} and ${fits[j]!.id}`); return out; };
  let afterOutcomes: string[] = [];
  for (const [n, pass] of [(c: Cand) => c.practical && c.outcomeOnly, (c: Cand) => c.outcomeOnly, (_c: Cand) => true].entries()) {
    if (n === 2) afterOutcomes = leftNow();
    for (;;) {
      let best: Cand | null = null, gain = 0;
      for (const c of cands.filter(pass)) { const g = pairs(c.sig).filter((p) => !done.has(p)).length; if (g > gain) { gain = g; best = c; } }
      if (!best) break;
      chosen.push(best); for (const p of pairs(best.sig)) done.add(p);
    }
  }
  chosen.forEach((c, i) => {
    const D0 = DSTORES[0]!.D(c.text), cap = circleCriticalDischarge(D0)(f(0.9 * D0));
    row(`R${i + 1}: Diameter ${c.text}, n .013, Discharge ${c.q}, Slope .005. Critical discharge at 0.9·D ${cap.toFixed(3)} cfs, so ${c.practical ? 'inside' : 'outside'} the generator's practical range; the survivors differ in ${c.outcomeOnly ? 'outcome' : 'printed fields only'}`);
    for (const l of c.lines) row(`    ${l}`);
  });
  const left: string[] = [];
  for (let i = 0; i < fits.length; i++) for (let j = i + 1; j < fits.length; j++) if (!done.has(`${i},${j}`)) left.push(`${fits[i]!.id} and ${fits[j]!.id}`);
  row(`pairs the chosen cases that differ in outcome leave together: ${afterOutcomes.length ? afterOutcomes.join('; ') : 'none'}`);
  row(`pairs of survivors R1 to R${chosen.length} leave together: ${left.length ? left.join('; ') : 'none'}`);
}
// ---- A-013 amendment: T8 to T10, the 1 ± 1e-4 check, cases from R6 ---------------------------
/** The single literal .2 summed in double, as `Y# = Y# + .2` does in QuickBASIC. */
const A013_ADDED_FORMERS: Former[] = [
  { id: 'T8', name: 'y + .2 in double with .2 a single, the geometry given the double, chords kept in double', next: (p) => p + S02, pre: (p) => p + S02, keep: (y) => y, geo: (y) => y, stored: false },
  { id: 'T9', name: 'y + .2 in double with .2 a single, the geometry given store(y), chords kept in double', next: (p) => p + S02, pre: (p) => p + S02, keep: (y) => y, geo: f, stored: false },
  { id: 'T10', name: 'y + .2 in double with .2 a single, the geometry given the double, chords stored', next: (p) => p + S02, pre: (p) => p + S02, keep: f, geo: (y) => y, stored: false },
];
const A013_ADDED_TESTS = ['X1', 'X2', 'X5', 'X6'];
/** A-013's five cases, then the four suggested for the amendment (multiples of 2.4 in). */
const A013_AMENDMENT_POOL: { name: string; text: string; q: number; old: boolean }[] = [
  { name: 'R1', text: '19.2', q: 15, old: true }, { name: 'R2', text: '21.6', q: 20, old: true },
  { name: 'R3', text: '160.4', q: 5238, old: true }, { name: 'R4', text: '55.2', q: 276, old: true },
  { name: 'R5', text: '88.3', q: 1013, old: true },
  { name: '98.4 in', text: '98.4', q: 1369, old: false }, { name: '129.6 in', text: '129.6', q: 2924, old: false },
  { name: '26.4 in', text: '26.4', q: 36, old: false }, { name: '57.6 in', text: '57.6', q: 312, old: false },
];
const A013_EPS = [1e-6, 1e-4];
type Combo = { t: Former; ds: Dstore; x: Dtest; id: string };
function a013Amendment() {
  const m2 = atShare(0.9382), obs = a013Observations();
  const fitAll = (c: Combo) => obs.map((o) => ({ o, ...a013Fits(o, c.t, c.ds, c.x, m2) })).filter((r) => !r.ok);
  const old = combos().filter((c) => !fitAll(c).length);
  h(`A-013's survivors, recomputed on the same ${obs.length} observations: ${old.length}`);
  row(old.map((c) => c.id).join(', '));

  const tests = DTESTS.filter((x) => A013_ADDED_TESTS.includes(x.id));
  const added: Combo[] = A013_ADDED_FORMERS.flatMap((t) => DSTORES.flatMap((ds) => tests.map((x) => ({ t, ds, x, id: `${t.id}·${ds.id}·${x.id}` }))));
  h(`T8 to T10 with D1 to D4 and ${A013_ADDED_TESTS.join(', ')}: ${added.length} combinations`);
  for (const t of A013_ADDED_FORMERS) row(`${t.id}: ${t.name}`);
  const addedFits: Combo[] = [];
  for (const c of added) {
    const bad = fitAll(c);
    row(`${c.id}: ${obs.length - bad.length} of ${obs.length}${bad.length ? `; misses ${bad.map((r) => `${r.o.name} (${r.got})`).join(', ')}` : ''}`);
    if (!bad.length) addedFits.push(c);
  }
  const fits = [...old, ...addedFits];
  h(`Survivors: ${fits.length} (${old.length} from A-013, ${addedFits.length} added)`);
  row(addedFits.map((c) => c.id).join(', '));

  // One survivor's printed answer for a case, A·√(gA/T) multiplied by `scale`.
  const answer = (c: Combo, text: string, q: number, scale = 1) => {
    const r = a013Search(text, q, c.t, c.ds, c.x, undefined, scale);
    if (r.outcome === 'menu') return { r, a: 'shape menu' };
    if (r.outcome === 'rejected') return { r, a: 'message' };
    if (r.outcome !== 'result') return { r, a: r.outcome };
    const v = vals('critical_depth', { diameter: text, n: '.013', discharge: String(q), slope: '.005' });
    return { r, a: `result ${line('critical_depth', show('critical_depth', v, cdFields(v, GEO_C2, m2, r.y!, CD_RULE.offset, 'q/A', c.ds.D(text))))}` };
  };
  const decided = (r: A013Outcome, D: number) => r.at === undefined ? '' : r.from === undefined ? `the chord ${r.at.toPrecision(10)}` : r.from === 0 ? `stepped trial ${r.k} from 0, ${r.at.toPrecision(10)}` : `chord ${r.from.toPrecision(10)} + ${r.k}·0.2 = ${r.at.toPrecision(10)} (D ${D.toPrecision(10)})`;

  h('Every case at 1, 1 ± 1e-6 and 1 ± 1e-4 times A·√(gA/T): survivors whose printed answer changes');
  interface Row { name: string; text: string; q: number; old: boolean; practical: boolean; cap: number; ans: string[]; stable: boolean; changes: Record<string, string[]> }
  const rows: Row[] = A013_AMENDMENT_POOL.map((p) => {
    const D0 = DSTORES[0]!.D(p.text), cap = circleCriticalDischarge(D0)(f(0.9 * D0));
    const base = fits.map((c) => answer(c, p.text, p.q));
    const changes: Record<string, string[]> = {}, outcomes: Record<string, string[]> = {};
    for (const e of A013_EPS) for (const s of [1 + e, 1 - e]) {
      const got = fits.map((c) => answer(c, p.text, p.q, s)), key = `${s > 1 ? '+' : '−'}${e}`;
      changes[key] = fits.filter((_c, i) => got[i]!.a !== base[i]!.a).map((c) => c.id);
      outcomes[key] = fits.filter((_c, i) => got[i]!.r.outcome !== base[i]!.r.outcome).map((c) => c.id);
    }
    const any = (e: number) => new Set([...changes[`+${e}`]!, ...changes[`−${e}`]!]);
    const oldIds = new Set(old.map((c) => c.id));
    row(`${p.name}: Diameter ${p.text}, Discharge ${p.q}; critical discharge at 0.9·D ${cap.toFixed(3)}, ${p.q <= cap ? 'practical' : 'not practical'}`);
    for (const e of A013_EPS) {
      const ch = any(e);
      const oc = new Set([...outcomes[`+${e}`]!, ...outcomes[`−${e}`]!]);
      row(`    1 ± ${e}, outcome only: ${oc.size} of ${fits.length} change (${[...oc].filter((id) => oldIds.has(id)).length} of A-013's ${old.length}); +${e}: ${outcomes[`+${e}`]!.length}, −${e}: ${outcomes[`−${e}`]!.length}`);
      row(`    1 ± ${e}: ${ch.size} of ${fits.length} change in printed answer (${[...ch].filter((id) => oldIds.has(id)).length} of A-013's ${old.length}); +${e}: ${changes[`+${e}`]!.length}, −${e}: ${changes[`−${e}`]!.length}${ch.size ? `; ${[...ch].join(', ')}` : ''}`);
    }
    const fromChord = base.filter(({ r }) => r.from !== 0 && r.at !== undefined).length;
    row(`    deciding trial: ${fromChord} of ${fits.length} come after a chord; ${base.filter(({ r }) => r.from === 0).length} are stepped from 0`);
    fits.forEach((c, i) => row(`      ${c.id}: ${base[i]!.a}${base[i]!.r.at !== undefined ? `, at ${decided(base[i]!.r, c.ds.D(p.text))}` : ` (search depth ${base[i]!.r.y?.toFixed(5)})`}`));
    return { ...p, practical: p.q <= cap, cap, ans: base.map((b) => b.a), stable: !any(1e-4).size && !any(1e-6).size, changes };
  });

  // Kept: stable at 1 ± 1e-4 (and 1e-6), and separating at least two survivors.
  const kept = rows.filter((r) => r.stable && new Set(r.ans).size > 1);
  const withdrawn = rows.filter((r) => r.old && !kept.includes(r));
  const dropped = rows.filter((r) => !r.old && !kept.includes(r));
  let next = 6;
  const label = (r: Row) => (r.old ? r.name : `R${next++}`);
  const labels = new Map(kept.map((r) => [r, label(r)]));
  h('Cases');
  row(`withdrawn: ${withdrawn.map((r) => `${r.name} (${r.stable ? 'separates no survivors' : 'not stable at 1 ± 1e-4'})`).join(', ') || 'none'}`);
  row(`suggested and not kept: ${dropped.map((r) => `${r.name} (${r.stable ? 'separates no survivors' : 'not stable at 1 ± 1e-4'})`).join(', ') || 'none'}`);
  for (const r of kept) row(`${labels.get(r)}: Diameter ${r.text}, n .013, Discharge ${r.q}, Slope .005; critical discharge at 0.9·D ${r.cap.toFixed(3)}, ${r.practical ? 'practical' : 'outside the practical range'}; 1 ± 1e-4 changes no survivor's answer`);
  // Each kept case alone: which pairs only it separates.
  const sepBy = (r: Row, i: number, j: number) => r.ans[i] !== r.ans[j];
  for (const r of kept) {
    let only = 0;
    for (let i = 0; i < fits.length; i++) for (let j = i + 1; j < fits.length; j++) if (sepBy(r, i, j) && !kept.some((o) => o !== r && sepBy(o, i, j))) only++;
    row(`${labels.get(r)} alone separates ${only} pairs no other kept case separates`);
  }

  h('Survivor groups: survivors with the same answer on every kept case');
  const short = (a: string) => (a.startsWith('result') ? 'result' : a);
  const groups = new Map<string, number[]>();
  fits.forEach((_c, i) => { const k = kept.map((r) => r.ans[i]).join('\u0000'); if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(i); });
  row(`${groups.size} groups`);
  console.log(`\n| Group | Survivors | ${kept.map((r) => labels.get(r)).join(' | ')} |`);
  console.log(`|---|---|${kept.map(() => '---|').join('')}`);
  [...groups.values()].forEach((ix, g) => console.log(`| G${g + 1} | ${ix.map((i) => fits[i]!.id).join(', ')} | ${kept.map((r) => short(r.ans[ix[0]!]!)).join(' | ')} |`));
  const results = new Set(kept.flatMap((r) => r.ans.filter((a) => a.startsWith('result')).map((a) => `${labels.get(r)}: ${a}`)));
  row(`results among the predictions: ${results.size ? [...results].join('; ') : 'none'}`);
  const together = [...groups.values()].filter((ix) => ix.length > 1);
  row(`groups no kept case separates: ${together.length ? together.map((ix) => ix.map((i) => fits[i]!.id).join(' and ')).join('; ') : 'none'}`);
  h('What each answer would mean: the groups each kept case puts in each answer');
  for (const r of kept) {
    const by = new Map<string, number[]>();
    [...groups.values()].forEach((ix, g) => { const a = short(r.ans[ix[0]!]!); if (!by.has(a)) by.set(a, []); by.get(a)!.push(g + 1); });
    row(`${labels.get(r)}: ${[...by].map(([a, gs]) => `${a}: ${gs.map((g) => `G${g}`).join(', ')}`).join('; ')}`);
  }
}
// ---- A-014: A-013 graded, G3's held-out cases, the diameter as VAL/12 in double ---------------
const A013_COMMIT = '69338b5', A013_AMENDMENT_COMMIT = '6ecfb3c';
/** Ledger decisions that list the goldens: the six rejections, S2 to S5 and S7 to S11, A-013's seven. */
const A014_DECISIONS = { six: 94, s: 95, r: 97 } as const;
const OBS_MENU = 'obs-cdmenu-000001';
const G3_IDS = ['T1·D3·X6', 'T2·D3·X6'];
/** A-014's held-out cases for G3, n .013 and slope .005. Their predictions are in A-014's text. */
const A014_HELD_OUT: { name: string; text: string; q: number }[] = [
  { name: 'H1', text: '4.8', q: 1 }, { name: 'H2', text: '2.4', q: 1 }, { name: 'H3', text: '7.2', q: 1 },
];
const all184 = (): Combo[] => {
  const tests = DTESTS.filter((x) => A013_ADDED_TESTS.includes(x.id));
  return [...combos(), ...A013_ADDED_FORMERS.flatMap((t) => DSTORES.flatMap((ds) => tests.map((x) => ({ t, ds, x, id: `${t.id}·${ds.id}·${x.id}` }))))];
};
const answerOf = (c: Combo, text: string, q: number, scale = 1) => {
  const r = a013Search(text, q, c.t, c.ds, c.x, undefined, scale);
  return { r, a: r.outcome === 'menu' ? 'shape menu' : r.outcome === 'rejected' ? 'message' : r.outcome };
};
type CommittedCase = { name: string; diameter: string; discharge: string };
/** A-013's and the amendment's case tables and the amendment's group table, read from git. */
function a013AsCommitted() {
  const a = committedSection(A013_COMMIT, '## A-013: what separates');
  const am = committedSection(A013_AMENDMENT_COMMIT, '## A-013 amendment');
  const nsA = /n ([\d.]+) and slope ([\d.]+) in all five/.exec(a), nsAm = /n ([\d.]+)\s+and slope ([\d.]+) in all seven/.exec(am);
  if (!nsA || !nsAm || nsA[1] !== nsAm[1] || nsA[2] !== nsAm[2]) throw new Error('n and slope not read from A-013 and its amendment');
  const cases = (text: string) => {
    const out = new Map<string, CommittedCase>(); let header: string[] = [];
    for (const l of text.split('\n')) {
      if (!l.startsWith('| ')) continue;
      const c = tableCells(l);
      if (c[0] === 'Case' || c[0] === 'Group' || c[0] === 'Survivor' || c[0] === 'Diameter') { header = c; continue; }
      if (header[0] === 'Case' && header[1] === 'Diameter' && /^R\d+$/.test(c[0]!)) out.set(c[0]!, { name: c[0]!, diameter: c[1]!, discharge: c[2]! });
    }
    return out;
  };
  const table = (text: string, first: string) => {
    const out: { label: string; survivors: string[]; cells: Record<string, string> }[] = []; let header: string[] = [];
    for (const l of text.split('\n')) {
      if (!l.startsWith('| ')) continue;
      const c = tableCells(l);
      if (/^-+$/.test(c[0]!)) continue;
      if (['Case', 'Group', 'Survivor', 'Diameter', 'Combination', 'Trial'].includes(c[0]!)) { header = c; continue; }
      if (header[0] !== first) continue;
      const off = first === 'Group' ? 1 : 0, cells: Record<string, string> = {};
      header.slice(off + 1).forEach((hd, i) => { cells[hd] = c[off + 1 + i]!; });
      out.push({ label: c[0]!, survivors: c[off]!.split(', '), cells });
    }
    return out;
  };
  return { n: nsAm[1]!, slope: nsAm[2]!, aCases: cases(a), amCases: cases(am), aTable: table(a, 'Survivor'), groups: table(am, 'Group') };
}
/** The last screen captured for a golden. */
function lastCapture(id: string): string[] {
  const dir = join(ROOT, 'oracle', 'goldens', 'captures', id);
  const last = readdirSync(dir).filter((n) => /^screen-\d+\.txt$/.test(n)).sort().pop();
  if (!last) throw new Error(`no captured screen for ${id}`);
  return readFileSync(join(dir, last), 'utf-8').split(/\r?\n/);
}
/** Every circle Critical Depth golden as an observation: results, rejections with the message, and
 * obs-cdmenu-000001. Rejections held at a prompt (an input of 0) are not search outcomes. */
function a014Observations(): { obs: A013Obs[]; held: string[] } {
  const obs: A013Obs[] = [], held: string[] = [];
  const raw = (id: string) => JSON.parse(readFileSync(join(CASES, `${id}.json`), 'utf-8'));
  for (const g of ALL.filter((x) => x.shape === 'circle' && x.mode === 'critical_depth' && x.id.startsWith('cd-circ-'))) {
    if (g.outcome === 'result') { obs.push({ name: g.id, inputs: g.inputs, seen: 'result', source: `golden ${g.id}`, golden: g }); continue; }
    const r = raw(g.id);
    if (g.outcome === 'rejected' && r.held_prompt === null && String(r.message).includes(DEPTH_ABOVE_DIAMETER)) obs.push({ name: g.id, inputs: g.inputs, seen: 'rejected', source: `golden ${g.id}` });
    else held.push(`${g.id} (${g.outcome}, held at ${r.held_prompt})`);
  }
  const m = raw(OBS_MENU);
  if (m.outcome !== 'observed' || m.expected_screen !== 'shape_menu') throw new Error(`${OBS_MENU} is not an observed shape_menu ending`);
  const typed = (m.transcript as { expect: string; keys: string }[]).filter((s) => s.expect === 'cd_form').map((s) => s.keys.replace(/\{Enter\}$/, ''));
  if (typed.length !== 5 || typed[4] !== '') throw new Error(`${OBS_MENU}: ${typed.length} cd_form steps`);
  const inputs = { diameter: typed[0]!, n: typed[1]!, discharge: typed[2]!, slope: typed[3]! };
  if (lastCapture(OBS_MENU).some((l) => l.includes(DEPTH_ABOVE_DIAMETER))) throw new Error(`${OBS_MENU}'s last screen has the message`);
  obs.push({ name: OBS_MENU, inputs, seen: 'shape_menu', source: `golden ${OBS_MENU}` });
  return { obs, held };
}
function gradeA013() {
  const m2 = atShare(0.9382), all = all184(), byIdC = new Map(all.map((c) => [c.id, c]));
  const A = a013AsCommitted();
  h(`A-013 read from ${A013_COMMIT} and its amendment from ${A013_AMENDMENT_COMMIT}`);
  const names = [...A.amCases.keys()];
  row(`the amendment's cases: ${names.join(', ')}; n ${A.n}, slope ${A.slope}; withdrawn and not in its table: ${[...A.aCases.keys()].filter((k) => !A.amCases.has(k)).join(', ')}`);
  for (const k of names) { const x = A.aCases.get(k), y = A.amCases.get(k)!; if (x && (x.diameter !== y.diameter || x.discharge !== y.discharge)) throw new Error(`${k} differs between A-013 and the amendment`); }
  row(`R1, R2 and R4 have the same inputs in A-013's table and the amendment's`);
  // A-013's own cells on R1, R2 and R4 for its 16 survivors: the amendment says they stay.
  let agree = 0, cells = 0;
  for (const r of A.aTable) for (const s of r.survivors) {
    const g = A.groups.find((x) => x.survivors.includes(s));
    if (!g) throw new Error(`${s} is in A-013's table and in no group of the amendment`);
    for (const k of ['R1', 'R2', 'R4']) { cells++; if (r.cells[k] === g.cells[k]) agree++; else row(`differs: ${s} ${k} A-013 "${r.cells[k]}", amendment "${g.cells[k]}"`); }
  }
  row(`A-013's cells on R1, R2 and R4 agree with the amendment's on ${agree} of ${cells} (${A.aTable.reduce((n, r) => n + r.survivors.length, 0)} survivors)`);
  // The model gives the committed table.
  { let same = 0, n = 0;
    for (const g of A.groups) for (const s of g.survivors) for (const k of names) {
      const c = byIdC.get(s); if (!c) throw new Error(`unknown survivor ${s}`);
      const cs = A.amCases.get(k)!; n++;
      if (answerOf(c, cs.diameter, Number(cs.discharge)).a === g.cells[k]) same++; else row(`differs: ${s} ${k}: table "${g.cells[k]}", model "${answerOf(c, cs.diameter, Number(cs.discharge)).a}"`);
    }
    row(`the model, rerun now, gives the committed cell on ${same} of ${n} (survivor, case) pairs`); }

  h(`What QUICK-2 did: the goldens ledger decision ${A014_DECISIONS.r} lists`);
  const seen: Record<string, string> = {};
  for (const k of names) {
    const cs = A.amCases.get(k)!, inputs = { diameter: cs.diameter, n: A.n, discharge: cs.discharge, slope: A.slope };
    const o = observeListed(inputs, [A014_DECISIONS.r]);
    if (!o.golden) throw new Error(`${k} has no golden`);
    const scr = lastCapture(o.source);
    seen[k] = o.outcome === 'rejected' && scr.some((l) => l.includes(DEPTH_ABOVE_DIAMETER)) ? 'message' : o.outcome === 'result' ? 'result' : o.outcome;
    row(`${k} ${inputText(inputs)}: ${o.source}, ${o.outcome}; last screen: ${rejectionScreen(scr)}`);
  }

  h('The 14 groups graded');
  console.log(`\n| Group | Survivors | ${names.join(' | ')} | Right |`);
  console.log(`|---|---|${names.map(() => '---|').join('')}---|`);
  console.log(`| QUICK-2 | | ${names.map((k) => seen[k]).join(' | ')} | |`);
  for (const g of A.groups) {
    const right = names.filter((k) => g.cells[k] === seen[k]).length;
    console.log(`| ${g.label} | ${g.survivors.join(', ')} | ${names.map((k) => (g.cells[k] === seen[k] ? g.cells[k] : `**${g.cells[k]}**`)).join(' | ')} | ${right} of ${names.length} |`);
  }
  const perfect = A.groups.filter((g) => names.every((k) => g.cells[k] === seen[k]));
  row(`groups right on all ${names.length}: ${perfect.map((g) => `${g.label} (${g.survivors.join(', ')})`).join('; ') || 'none'}`);

  h('S2 to S5, S7 to S11 and the six rejections: the run folders A-012 graded against the goldens now recorded');
  const cmp = (name: string, run: Seen, gold: Seen) => {
    const rs = run.screen ? rejectionScreen(run.screen) : '', gs = rejectionScreen(lastCapture(gold.source));
    row(`${name}: ${run.source} ${run.outcome}; ${gold.source} ${gold.outcome}; ${run.outcome === gold.outcome && rs === gs ? 'same outcome and same rejection screen' : `DIFFERENT (${rs} | ${gs})`}`);
    return run.outcome === gold.outcome && rs === gs;
  };
  let sSame = 0, sN = 0;
  for (const c of [...A011_CASES, ...A011_AMENDMENT_CASES]) {
    const run = observeListed(c.inputs, A011_DECISIONS); if (run.golden) continue;
    sN++; if (cmp(c.id, run, observeListed(c.inputs, [A014_DECISIONS.s]))) sSame++;
  }
  row(`S cases: ${sSame} of ${sN} the same`);
  let rSame = 0;
  for (const r of SIX_REJECTIONS) {
    const rf = runFolder(r.run); if (!rf) throw new Error(`run folder ${r.run} not on this machine`);
    if (cmp(r.name, seenInRun(rf), observeListed(r.inputs, [A014_DECISIONS.six]))) rSame++;
  }
  row(`six rejections: ${rSame} of ${SIX_REJECTIONS.length} the same`);
  { const rf = runFolder(Q029_RUN)!, a = rf.screen.map((l) => l.trimEnd()), b = lastCapture(OBS_MENU).map((l) => l.trimEnd());
    const n = Math.max(a.length, b.length), diff = Array.from({ length: n }, (_, i) => i).filter((i) => (a[i] ?? '') !== (b[i] ?? ''));
    row(`9.6 in run ${Q029_RUN} (${seenInRun(rf).outcome}) against ${OBS_MENU}'s last screen: ${diff.length ? `${diff.length} rows differ (${diff.join(', ')})` : 'every row the same'}`); }

  const { obs, held } = a014Observations();
  h(`All ${all.length} combinations (A-013's ${combos().length} and the amendment's ${all.length - combos().length}) on every circle Critical Depth golden: ${obs.length} observations`);
  const by = (s: string) => obs.filter((o) => o.seen === s).length;
  row(`${by('result')} results, ${by('rejected')} rejections with the message, ${by('shape_menu')} shape-menu ending (${OBS_MENU}); not used, held at a prompt: ${held.join(', ')}`);
  const scores = all.map((c) => ({ c, bad: obs.map((o) => ({ o, ...a013Fits(o, c.t, c.ds, c.x, m2) })).filter((r) => !r.ok) }));
  const hist = new Map<number, number>(); for (const s of scores) hist.set(obs.length - s.bad.length, (hist.get(obs.length - s.bad.length) ?? 0) + 1);
  row(`scores: ${[...hist].sort((a, b) => b[0] - a[0]).map(([k, n]) => `${n} fit ${k}`).join(', ')}`);
  const fit = scores.filter((s) => !s.bad.length).map((s) => s.c.id);
  row(`fit all ${obs.length}: ${fit.join(', ') || 'none'}`);
  const old39 = new Set(A.groups.flatMap((g) => g.survivors));
  for (const s of scores.filter((x) => old39.has(x.c.id) && x.bad.length)) row(`  ${s.c.id}: misses ${s.bad.map((r) => `${r.o.name} (${r.got})`).join(', ')}`);
  const newOnly = scores.filter((s) => !s.bad.length && !old39.has(s.c.id));
  row(`fit all ${obs.length} and not among the amendment's 39: ${newOnly.map((s) => s.c.id).join(', ') || 'none'}`);

  h(`Held-out cases for ${G3_IDS.join(' and ')} (n .013, slope .005): every answer at 1 and at 1 ± 1e-6 and 1 ± 1e-4 times A·√(gA/T)`);
  const g3 = G3_IDS.map((id) => byIdC.get(id)!);
  for (const ho of A014_HELD_OUT) {
    const inputs = { diameter: ho.text, n: '.013', discharge: String(ho.q), slope: '.005' };
    const before = ALL.filter((g) => g.mode === 'critical_depth' && g.shape === 'circle' && sameInputs(g.inputs, inputs)).map((g) => g.id);
    row(`${ho.name} ${inputText(inputs)}: ${before.length ? `ALREADY RECORDED as ${before.join(', ')}` : 'no golden has these inputs'}`);
    for (const c of g3) {
      const base = answerOf(c, ho.text, ho.q), D = c.ds.D(ho.text);
      const moved = A013_EPS.flatMap((e) => [1 + e, 1 - e]).filter((s) => answerOf(c, ho.text, ho.q, s).a !== base.a);
      const at = base.r.at, st = stepped(ho.text, c.t, c.ds, c.x), lastF = st.Fs[st.Fs.length - 1];
      row(`    ${c.id}: stepped trials inside ${st.ys.map((y) => y.toPrecision(10)).join(', ') || 'none'}; the search reaches the deciding trial for q above ${lastF === undefined ? '0 (no trial inside)' : `${(lastF / (1 - CIRCLE_TOL)).toFixed(4)} cfs`}`);
      row(`    ${c.id}: ${base.a}; deciding trial ${at?.toPrecision(10)} (${base.r.from === 0 ? `stepped trial ${base.r.k} from 0` : 'after a chord'}), trial·12 ${at !== undefined ? (at * 12).toPrecision(10) : '-'} against store(VAL) ${f(val(ho.text)).toPrecision(10)}, D ${D.toPrecision(12)}; changed by 1 ± 1e-6 or 1e-4: ${moved.length ? moved.join(', ') : 'none'}`);
    }
  }
  h(`Stepped trials only, ${G3_IDS.join(' and ')}: the diameters typed to 0.01 in whose stepped trials end on the shape menu (a trial the test passes at or past D)`);
  for (const c of g3) {
    const menu = (lo: number, hi: number) => { const out: string[] = []; for (let i = lo; i <= hi; i++) { const t = (i / 100).toFixed(2); if (stepped(t, c.t, c.ds, c.x).stop.outcome === 'menu') out.push(t); } return out; };
    const inRange = menu(800, 18000), below = menu(1, 799);
    row(`${c.id}: 8.00 to 180.00 in (17201 diameters): ${inRange.join(', ') || 'none'}; 0.01 to 7.99 in: ${below.join(', ') || 'none'}`);
  }
}
/** The rebuild's solve() with only diameterFeet changed to return VAL/12 in double, loaded as a
 * second copy of app/src through a module hook. No file under app/ is changed. */
async function solveWithD3(): Promise<{ solveD3: typeof solve; calls: () => number }> {
  const { registerHooks } = await import('node:module');
  const tag = '?a014-d3', old = 'return store(diameterInches / INCHES_PER_FOOT);';
  registerHooks({
    resolve(spec, ctx, next) {
      const r = next(spec, ctx);
      return ctx.parentURL?.endsWith(tag) && r.url.startsWith('file:') && r.url.includes('/app/src/') && !r.url.includes('?') ? { ...r, url: r.url + tag } : r;
    },
    load(url, ctx, next) {
      const r = next(url, ctx);
      if (!url.endsWith(`/app/src/solver/geometry/circle.ts${tag}`)) return r;
      const src = String(r.source);
      if (!src.includes(old)) throw new Error('diameterFeet no longer reads as A-014 expects');
      return { ...r, source: src.replace(old, 'const g = globalThis as any; g.__A014_D3_CALLS = (g.__A014_D3_CALLS ?? 0) + 1; return g.__A014_D3_FEET ?? store(diameterInches / INCHES_PER_FOOT);') };
    },
  });
  const mod = await import(new URL(`../app/src/solver/index.ts${tag}`, import.meta.url).href);
  return { solveD3: mod.solve, calls: () => (globalThis as { __A014_D3_CALLS?: number }).__A014_D3_CALLS ?? 0 };
}
async function a014Diameter() {
  const { solveD3, calls } = await solveWithD3();
  const G = globalThis as { __A014_D3_FEET?: number };
  const m2 = atShare(0.9382);
  h('D1 against D3 on every circle golden: the rebuild (solve) with diameterFeet = store(store(VAL)/12), and with VAL/12 in double');
  const modes: Mode[] = ['critical_depth', 'channel_capacity', 'normal_depth'];
  // Check: the second copy without the override prints what solve() prints.
  { let same = 0, n = 0; G.__A014_D3_FEET = undefined;
    for (const g of ALL.filter((x) => x.shape === 'circle' && modes.includes(x.mode) && x.outcome !== 'observed')) {
      const a = solve({ mode: g.mode, shape: 'circle', inputs: g.inputs }), b = solveD3({ mode: g.mode, shape: 'circle', inputs: g.inputs }); n++;
      if (a.outcome === b.outcome && JSON.stringify(a.printed) === JSON.stringify(b.printed)) same++;
    }
    row(`check: the hooked copy with no override prints what solve() prints on ${same} of ${n}; diameterFeet called ${calls()} times in it`); }
  for (const mode of modes) {
    const gs = ALL.filter((x) => x.shape === 'circle' && x.mode === mode && x.outcome !== 'observed');
    let outD1 = 0, outD3 = 0, outDiff = 0, fields = 0, missD1 = 0, missD3 = 0, diff = 0, allD1 = 0, allD3 = 0;
    const lines: string[] = [];
    for (const g of gs) {
      const inp = { mode: g.mode, shape: 'circle' as const, inputs: g.inputs };
      G.__A014_D3_FEET = undefined; const a = solve(inp);
      G.__A014_D3_FEET = val(g.inputs.diameter!) / 12; const b = solveD3(inp); G.__A014_D3_FEET = undefined;
      if (a.outcome === g.outcome) outD1++; if (b.outcome === g.outcome) outD3++; if (a.outcome !== b.outcome) { outDiff++; lines.push(`${g.id}: outcome D1 ${a.outcome}, D3 ${b.outcome}, QUICK-2 ${g.outcome}`); }
      if (g.outcome !== 'result') continue;
      let m1 = 0, m3 = 0;
      for (const k of Object.keys(g.printed)) {
        fields++;
        const p1 = a.printed[k] ?? '', p3 = b.printed[k] ?? '';
        if (p1 !== g.printed[k]) { missD1++; m1++; } if (p3 !== g.printed[k]) { missD3++; m3++; }
        if (p1 !== p3) { diff++; lines.push(`${g.id} ${k}: D1 \`${p1.trim()}\`, D3 \`${p3.trim()}\`, QUICK-2 \`${g.printed[k]!.trim()}\``); }
      }
      if (a.outcome === 'result' && !m1) allD1++; if (b.outcome === 'result' && !m3) allD3++;
    }
    const nr = gs.filter((g) => g.outcome === 'result').length;
    row(`${mode}: ${gs.length} goldens (${nr} results). Outcome as QUICK-2: D1 ${outD1}, D3 ${outD3}; outcome differs between D1 and D3 on ${outDiff}. Result fields ${fields}: missed by D1 ${missD1}, by D3 ${missD3}; printed differently by D1 and D3 ${diff}. Results right on every field: D1 ${allD1} of ${nr}, D3 ${allD3} of ${nr}`);
    for (const l of lines) row(`    ${l}`);
  }
  h('D1 against D3 for Critical Depth in the K1 model with the X6 test (T1·D1·X6 against T1·D3·X6), every circle Critical Depth golden');
  const { obs } = a014Observations();
  const c1 = all184().find((c) => c.id === 'T1·D1·X6')!, c3 = all184().find((c) => c.id === 'T1·D3·X6')!;
  let fields = 0, d = 0, ok1 = 0, ok3 = 0;
  const lines: string[] = [];
  for (const o of obs) {
    const r1 = a013Fits(o, c1.t, c1.ds, c1.x, m2), r3 = a013Fits(o, c3.t, c3.ds, c3.x, m2);
    if (r1.ok) ok1++; if (r3.ok) ok3++;
    if (o.seen !== 'result') { if (r1.got.split(' ')[0] !== r3.got.split(' ')[0]) lines.push(`${o.name}: D1 ${r1.got}, D3 ${r3.got}`); continue; }
    const v = vals('critical_depth', o.inputs);
    const y1 = a013Search(o.inputs.diameter!, v.discharge!, c1.t, c1.ds, c1.x), y3 = a013Search(o.inputs.diameter!, v.discharge!, c3.t, c3.ds, c3.x);
    if (y1.outcome !== 'result' || y3.outcome !== 'result') { lines.push(`${o.name}: D1 ${y1.outcome}, D3 ${y3.outcome}`); continue; }
    const p1 = show('critical_depth', v, cdFields(v, GEO_C2, m2, y1.y!, CD_RULE.offset, 'q/A', c1.ds.D(o.inputs.diameter!)));
    const p3 = show('critical_depth', v, cdFields(v, GEO_C2, m2, y3.y!, CD_RULE.offset, 'q/A', c3.ds.D(o.inputs.diameter!)));
    for (const k of Object.keys(o.golden!.printed)) { fields++; if (p1[k] !== p3[k]) { d++; lines.push(`${o.name} ${k}: D1 \`${p1[k]?.trim()}\`, D3 \`${p3[k]?.trim()}\`, QUICK-2 \`${o.golden!.printed[k]!.trim()}\``); } }
  }
  row(`${obs.length} observations: T1·D1·X6 fits ${ok1}, T1·D3·X6 fits ${ok3}; result fields ${fields}, printed differently by D1 and D3 ${d}`);
  for (const l of lines) row(`    ${l}`);
}
// ---- A-015: A-014's held-out cases graded, every combination rescored, T1·D1·X2 ---------------
const A014_COMMIT = 'f066861';
/** Ledger decision that lists the goldens of H1 to H3. */
const A015_DECISION = 100;
/** The rule A-015 proposes: the rebuild's trial and diameter store, trial >= D. */
const A015_RULE = 'T1·D1·X2';
/** A-014's held-out cases and G3's predictions, read from git. */
function a014AsCommitted() {
  const a = committedSection(A014_COMMIT, '## A-014: A-013 and its amendment graded');
  const p = a.slice(a.indexOf('### Predictions for G3'));
  if (!p.startsWith('### Predictions for G3')) throw new Error(`no "Predictions for G3" at ${A014_COMMIT}`);
  const common = /n ([\d.]+),\s+slope ([\d.]+) and (\d+) cfs in all three/.exec(p);
  const same = /(T\d·D\d·X\d) and (T\d·D\d·X\d) give the same answer on all three/.exec(p);
  if (!common || !same) throw new Error(`A-014 at ${A014_COMMIT}: common inputs or G3's survivors not read`);
  const cases: { name: string; diameter: string; discharge: string; predicts: string }[] = [];
  let header: string[] = [];
  for (const l of p.split('\n')) {
    if (!l.startsWith('| ')) continue;
    const c = tableCells(l);
    if (c[0] === 'Case') { header = c; continue; }
    if (header[3] !== 'G3 predicts' || !/^H\d$/.test(c[0]!)) continue;
    const cell = c[3]!, predicts = /^shape menu/.test(cell) ? 'shape menu' : cell === 'message' ? 'message' : '';
    if (!predicts) throw new Error(`unread prediction "${cell}"`);
    cases.push({ name: c[0]!, diameter: c[1]!, discharge: c[2]!, predicts });
  }
  if (cases.length !== 3) throw new Error(`read ${cases.length} of A-014's three held-out cases`);
  return { n: common[1]!, slope: common[2]!, q: common[3]!, g3: [same[1]!, same[2]!], cases };
}
/** What QUICK-2 printed for one case: a golden the listed decisions name, or a behaviour case. */
function seenListed(inputs: Record<string, string>, decision: number): { a: string; source: string; screen: string } {
  const o = observeListed(inputs, [decision]);
  if (!o.golden) throw new Error(`no golden for ${JSON.stringify(inputs)}`);
  const scr = lastCapture(o.source), msg = scr.some((l) => l.includes(DEPTH_ABOVE_DIAMETER));
  return { a: o.outcome === 'rejected' && msg ? 'message' : o.outcome === 'result' ? 'result' : o.outcome, source: o.source, screen: rejectionScreen(scr) };
}
function gradeA014() {
  const m2 = atShare(0.9382), all = all184(), byIdC = new Map(all.map((c) => [c.id, c]));
  const H = a014AsCommitted();
  h(`A-014 read from ${A014_COMMIT}: G3 is ${H.g3.join(' and ')}; n ${H.n}, slope ${H.slope}, ${H.q} cfs in all three`);
  if (H.g3.join() !== G3_IDS.join()) throw new Error('G3 differs from the script');
  for (const c of H.cases) row(`${c.name}: Diameter ${c.diameter}, Discharge ${c.discharge}; G3 predicts ${c.predicts}`);
  const inputsOf = (d: string, q: string) => ({ diameter: d, n: H.n, discharge: q, slope: H.slope });
  { let same = 0, n = 0;
    for (const id of H.g3) for (const c of H.cases) { n++; const a = answerOf(byIdC.get(id)!, c.diameter, Number(c.discharge)).a; if (a === c.predicts) same++; else row(`differs: ${id} ${c.name}: committed "${c.predicts}", model "${a}"`); }
    row(`the model, rerun now, gives the committed answer on ${same} of ${n} (survivor, case) pairs`); }

  h(`What QUICK-2 did: the goldens ledger decision ${A015_DECISION} lists`);
  const seenH: Record<string, string> = {};
  for (const c of H.cases) {
    const s = seenListed(inputsOf(c.diameter, c.discharge), A015_DECISION);
    seenH[c.name] = s.a;
    row(`${c.name} ${inputText(inputsOf(c.diameter, c.discharge))}: ${s.source}, ${s.a}; last screen: ${s.screen}`);
  }
  console.log(`\n| Case | Diameter | G3 predicts | QUICK-2 | Golden | Right |`);
  console.log('|---|---|---|---|---|---|');
  let right = 0;
  for (const c of H.cases) {
    const ok = c.predicts === seenH[c.name]; if (ok) right++;
    console.log(`| ${c.name} | ${c.diameter} | ${ok ? c.predicts : `**${c.predicts}**`} | ${seenH[c.name]} | ${seenListed(inputsOf(c.diameter, c.discharge), A015_DECISION).source} | ${ok ? 'yes' : 'no'} |`);
  }
  row(`G3 right on ${right} of ${H.cases.length}`);

  const { obs, held } = a014Observations();
  h(`All ${all.length} combinations on every circle Critical Depth outcome: ${obs.length} observations`);
  const by = (s: string) => obs.filter((o) => o.seen === s).length;
  row(`${by('result')} results, ${by('rejected')} rejections with the message, ${by('shape_menu')} shape-menu ending (${OBS_MENU}); not used, held at a prompt: ${held.join(', ')}`);
  const scores = all.map((c) => ({ c, bad: obs.map((o) => ({ o, ...a013Fits(o, c.t, c.ds, c.x, m2) })).filter((r) => !r.ok) }));
  const hist = new Map<number, number>(); for (const s of scores) hist.set(obs.length - s.bad.length, (hist.get(obs.length - s.bad.length) ?? 0) + 1);
  row(`scores: ${[...hist].sort((a, b) => b[0] - a[0]).map(([k, n]) => `${n} fit ${k}`).join(', ')}`);
  row(`fit all ${obs.length}: ${scores.filter((s) => !s.bad.length).map((s) => s.c.id).join(', ') || 'none'}`);
  const onlyMenu = scores.filter((s) => s.bad.length === 1 && s.bad[0]!.o.name === OBS_MENU);
  row(`miss only ${OBS_MENU}: ${onlyMenu.length}`);
  const fam = new Map<string, string[]>(); for (const s of onlyMenu) { const t = s.c.t.id; if (!fam.has(t)) fam.set(t, []); fam.get(t)!.push(s.c.id); }
  for (const [t, ids] of fam) row(`    ${t}: ${ids.length}: ${ids.join(', ')}`);
  row(`    what they give on ${OBS_MENU}: ${[...new Set(onlyMenu.map((s) => s.bad[0]!.got.replace(/ at trial .*/, '')))].join(', ')}`);
  const nearH = scores.filter((s) => s.bad.length && s.bad.every((r) => r.o.name === 'cd-circ-000061' || r.o.name === 'cd-circ-000062'));
  row(`miss only cd-circ-000061 and/or -000062 (H1, H2): ${nearH.map((s) => `${s.c.id} (${s.bad.map((r) => r.o.name).join(', ')})`).join(', ') || 'none'}`);
  const best = Math.max(...scores.map((s) => obs.length - s.bad.length));
  if (best < obs.length) row(`the best fit is ${best} of ${obs.length}, by ${scores.filter((s) => obs.length - s.bad.length === best).length} combinations`);

  h(`${A015_RULE} on ten cases that ran after A-013 dropped it, and that it was brought back after seeing: the amendment's R1, R2, R4, R6 to R9 and A-014's H1 to H3`);
  const rule = byIdC.get(A015_RULE)!;
  const A = a013AsCommitted();
  const ten = [...[...A.amCases.values()].map((c) => ({ name: c.name, d: c.diameter, q: c.discharge, dec: A014_DECISIONS.r })),
    ...H.cases.map((c) => ({ name: c.name, d: c.diameter, q: c.discharge, dec: A015_DECISION }))];
  if (ten.length !== 10) throw new Error(`${ten.length} cases, not ten`);
  console.log(`\n| Case | Diameter | Discharge | ${A015_RULE} | Deciding trial | QUICK-2 | Golden | Right |`);
  console.log('|---|---|---|---|---|---|---|---|');
  let ok10 = 0;
  for (const c of ten) {
    const s = seenListed(inputsOf(c.d, c.q), c.dec), r = answerOf(rule, c.d, Number(c.q)), ok = r.a === s.a; if (ok) ok10++;
    const at = r.r.at === undefined ? '-' : `${r.r.from === 0 ? `stepped trial ${r.r.k}` : 'after a chord'}, ${r.r.at.toPrecision(10)} (D ${rule.ds.D(c.d).toPrecision(10)})`;
    console.log(`| ${c.name} | ${c.d} | ${c.q} | ${r.a} | ${at} | ${s.a} | ${s.source} | ${ok ? 'yes' : '**no**'} |`);
  }
  row(`${A015_RULE} right on ${ok10} of ${ten.length}`);
  { const s = scores.find((x) => x.c.id === A015_RULE)!;
    row(`${A015_RULE} on all ${obs.length} observations: ${obs.length - s.bad.length} of ${obs.length}${s.bad.length ? `; misses ${s.bad.map((r) => `${r.o.name} (${r.got})`).join(', ')}` : ''}`); }
  { const s = scores.find((x) => x.c.id === 'T1·D1·X1')!;
    row(`for comparison, T1·D1·X1 (the rebuild's test, with K1) on all ${obs.length}: ${obs.length - s.bad.length}; misses ${s.bad.map((r) => `${r.o.name} (${r.got})`).join(', ')}`); }
  { const a = answerOf(rule, '9.6', 2);
    row(`9.6 in, 2 cfs under ${A015_RULE}: ${a.a} at stepped trial ${a.r.k}, ${a.r.at?.toPrecision(10)}, against D ${rule.ds.D('9.6').toPrecision(10)}; QUICK-2: shape menu (${OBS_MENU})`); }
  { const outs = new Set(obs.map((o) => { const v = vals('critical_depth', o.inputs); return a013Search(o.inputs.diameter!, v.discharge!, rule.t, rule.ds, rule.x).outcome; }));
    row(`${A015_RULE}'s outcomes over the ${obs.length} observations: ${[...outs].join(', ')}`); }
  h(`9.6, 4.8 and 2.4 in: a stepped trial lands on D under ${A015_RULE}'s trial and store; what QUICK-2 printed`);
  for (const [d, q, seen] of [['9.6', 2, `shape menu (${OBS_MENU})`], ['4.8', 1, 'message (cd-circ-000061)'], ['2.4', 1, 'message (cd-circ-000062)']] as const) {
    const st = stepped(d, rule.t, rule.ds, DTESTS[0]!), lastF = st.Fs[st.Fs.length - 1];
    row(`${d} in: D ${rule.ds.D(d).toPrecision(10)}; stepped trials inside ${st.ys.map((y) => y.toPrecision(10)).join(', ') || 'none'}; the trial on D is reached for q above ${lastF === undefined ? '0' : (lastF / (1 - CIRCLE_TOL)).toFixed(4)} cfs; typed ${q} cfs; QUICK-2: ${seen}`);
  }
}
// ---- circle-short-chord 2.7: the floor of A·√(g·A/T) ----------------------------------------
/** The least A·√(g·A/T) over 0 < y < D, and the depth where it is, by a log scan of y from
 * 1e-14·D/2 to D/2 and a linear scan around the least. `stored`: the rebuild's stored geometry
 * (π = 3.1416, A and T stored); otherwise the same formulas in double, nothing stored. */
function cdFloor(D: number, stored = true): { q: number; y: number } {
  const F = stored ? (y: number) => f(circleCriticalDischarge(D)(y))
    : (y: number) => { const w = wetCircle(D, y); return w.area * Math.sqrt((G * w.area) / w.topWidth); };
  let q = Infinity, y = 0;
  const N = 20000;
  for (let i = 0; i <= N; i++) { const t = (D / 2) * Math.pow(10, -14 + (14 * i) / N), v = F(stored ? f(t) : t); if (v < q) { q = v; y = t; } }
  const lo = y / 1.01, hi = y * 1.01;
  for (let i = 0; i <= N; i++) { const t = lo + ((hi - lo) * i) / N, v = F(stored ? f(t) : t); if (v < q) { q = v; y = t; } }
  return { q, y };
}
const T1D1X2 = () => all184().find((c) => c.id === 'T1·D1·X2')!;
/** What solve() returns today for circle Critical Depth, n .013, slope .005. */
function solveToday(d: string, q: string) {
  const r = solve({ mode: 'critical_depth', shape: 'circle', inputs: { diameter: d, n: '.013', discharge: q, slope: '.005' } });
  return { r, text: `${r.outcome}${r.flags.length ? ` [${r.flags.map((x) => x.code).join(', ')}]` : ''}${r.message ? ` "${r.message}"` : ''}${r.raw.search_depth !== undefined ? ` at ${r.raw.search_depth.toFixed(5)}` : ''}` };
}
function floorReport() {
  const rule = T1D1X2();
  h('The least A·√(g·A/T) in the pipe (circle-short-chord 2.7): π = 3.1416, so A does not go to 0 as y does, and T does');
  for (const d of ['12', '96', '7254', '9999']) {
    const D = f(f(val(d)) / 12), s = cdFloor(D), u = cdFloor(D, false);
    row(`${d} in, D ${D.toPrecision(10)} ft: least ${s.q.toPrecision(4)} cfs at y ${s.y.toPrecision(3)} ft (y/D ${(s.y / D).toPrecision(3)}); unstored ${u.q.toPrecision(4)} cfs at ${u.y.toPrecision(3)} ft; least/D^2.5 ${(s.q / D ** 2.5).toPrecision(4)}`);
  }
  row('with the true π the area goes to 0 with y, and A·√(g·A/T) goes to 0 with it: no floor');
  h('Discharges under or near the floor: the rebuild today, and T1·D1·X2 with K1 (A-015\'s model)');
  for (const [d, q] of [['12', '1E-7'], ['7254', '.5'], ['9999', '1'], ['7254', '.3'], ['9999', '.5']] as const) {
    const D = f(f(val(d)) / 12), fl = cdFloor(D).q, m = answerOf(rule, d, f(val(q)));
    row(`${d} in at ${q} cfs (q/least ${(val(q) / fl).toPrecision(4)}): today ${solveToday(d, q).text}; T1·D1·X2 ${m.a}${m.r.at !== undefined ? ` at ${m.r.at.toPrecision(10)}` : ''}`);
  }
  for (const [d, q] of [['12', 1e-7], ['9999', 1]] as const) { // where the chords go: the bracket [0, first trial past q]
    const D = f(f(val(d)) / 12), F = circleCriticalDischarge(D);
    let lo = 0, flo = 0, hi = f(0.2), fhi = f(F(hi)), n = 0, zeroAt = -1;
    const seen: string[] = [`trial ${hi.toPrecision(10)} ${fhi.toPrecision(4)}`];
    for (; n < 1000; n++) {
      const yc = f(lo + ((q - flo) * (hi - lo)) / (fhi - flo)), fc = f(F(yc));
      if (n < 4 || (yc === 0 && zeroAt < 0)) seen.push(`chord ${n + 1} ${yc.toPrecision(4)} ${fc.toPrecision(4)}`);
      if (yc === 0 && zeroAt < 0) zeroAt = n + 1;
      if (Math.abs(fc - q) <= CIRCLE_TOL * q) break;
      if (fc > q) { hi = yc; fhi = fc; } else { lo = yc; flo = fc; }
    }
    row(`${d} in at ${q} cfs, the chords on [0, first trial] (y, A·√(g·A/T)): ${seen.join('; ')}; ${zeroAt > 0 ? `chord ${zeroAt} is 0, where T = 0` : 'no chord reaches 0'}; ${n >= 1000 ? 'none within 0.5% in 1000' : `chord ${n + 1} within 0.5%`}`);
  }
  { const D = f(f(val('12')) / 12), fl = cdFloor(D).q;
    const ks = [1.001, 1.01, 1.1, 1.58, 2, 5, 10, 100, 1000, 1e4, 1e5, 1e6];
    row(`12 in, q = least × k: ${ks.map((k) => { const q = fl * k, a = answerOf(rule, '12', q).a; return `${k}: ${a}`; }).join('; ')}`);
    let lo = 1, hi = 1e6; // the smallest k that finishes, assuming the outcome changes once
    if (answerOf(rule, '12', fl * hi).a === 'result') { for (let i = 0; i < 60; i++) { const mid = Math.sqrt(lo * hi); if (answerOf(rule, '12', fl * mid).a === 'result') hi = mid; else lo = mid; } row(`12 in: T1·D1·X2 gives a result from about q = least × ${hi.toPrecision(3)} (${(fl * hi).toPrecision(3)} cfs), bisected on the ratio`); }
  }
  h('Every input of circle-short-chord 1.4 under T1·D1·X2, and today');
  const reach = (d: string) => { const st = stepped(d, rule.t, rule.ds, DTESTS[0]!), last = st.Fs[st.Fs.length - 1] ?? 0; return String(Math.ceil(last / (1 - CIRCLE_TOL)) + 1); };
  for (const [d, q, src] of [['12', '4', 'cd-circ-000045'], ['55.2', '276', 'cd-circ-000056'], ['57.6', '312', 'cd-circ-000060'], ['4.8', '1', 'cd-circ-000061'], ['2.4', '1', 'cd-circ-000062'], ['9.6', '2', OBS_MENU], ['50.4', reach('50.4'), 'no golden'], ['52.8', reach('52.8'), 'no golden']] as const) {
    const m = answerOf(rule, d, f(val(q)));
    row(`${d} in at ${q} cfs (${src}): today ${solveToday(d, q).text}; T1·D1·X2 ${m.a}${m.r.at !== undefined ? ` at ${m.r.at.toPrecision(10)}` : ''}`);
  }
  h('Circle Critical Depth goldens against the floor: the least q/least');
  const cds = ALL.filter((g) => g.shape === 'circle' && g.mode === 'critical_depth' && g.inputs.discharge !== undefined && val(g.inputs.diameter!) > 0 && val(g.inputs.discharge!) > 0);
  const ratios = cds.map((g) => ({ id: g.id, d: g.inputs.diameter!, q: g.inputs.discharge!, k: val(g.inputs.discharge!) / cdFloor(f(f(val(g.inputs.diameter!)) / 12)).q })).sort((a, b) => a.k - b.k);
  row(`${cds.length} goldens with a positive diameter and discharge; the three nearest: ${ratios.slice(0, 3).map((r) => `${r.id} (${r.d} in, ${r.q} cfs) ${r.k.toPrecision(3)}`).join('; ')}`);
}
// ---- A-016: predictions for K1 with T1·D1·X2 before any case runs -----------------------------
/** The search of app/src/solver/search.ts, written out with the short-chord rule (K1 resumes
 * stepping from the chord, N2 takes the chord again on the narrowed bracket) and the test against
 * the diameter (trial > D or trial >= D) as options. Trial and D as the rebuild stores them. */
interface A016Model { id: string; after: 'K1' | 'N2'; ge: boolean }
const A016_MODELS: A016Model[] = [
  { id: 'K1, trial >= D (2.4, T1·D1·X2)', after: 'K1', ge: true },
  { id: 'K1, trial > D', after: 'K1', ge: false },
  { id: 'N2, trial > D (the rebuild today)', after: 'N2', ge: false },
  { id: 'N2, trial >= D', after: 'N2', ge: true },
];
type A016Out = { outcome: 'result' | 'rejected' | 'no_end'; y?: number; at?: number; trace: { kind: 'trial' | 'chord'; y: number; F: number }[]; trials: number };
function a016Search(text: string, q: number, m: A016Model, scale = 1): A016Out {
  const D = f(f(val(text)) / 12), F = circleCriticalDischarge(D), ev = (y: number) => f(F(y) * scale);
  const close = (v: number) => Math.abs(v - q) <= CIRCLE_TOL * q, trace: A016Out['trace'] = [];
  const log = (kind: 'trial' | 'chord', y: number, v: number) => { if (trace.length < 40) trace.push({ kind, y, F: v }); };
  let lo = 0, flo = 0, y = f(CIRCLE_CD_STEP), trials = 0, fy: number;
  for (;;) {
    for (;;) {
      if (m.ge ? y >= D : y > D) return { outcome: 'rejected', at: y, trace, trials };
      fy = ev(y); trials++; log('trial', y, fy);
      if (close(fy)) return { outcome: 'result', y, trace, trials };
      if (fy > q) break;
      if (trials > 1e6) return { outcome: 'no_end', trace, trials };
      lo = y; flo = fy; y = f(y + CIRCLE_CD_STEP);
    }
    let hi = y, fhi = fy;
    for (;;) {
      if (!(fhi > flo) || trials > 1e6) return { outcome: 'no_end', trace, trials };
      y = f(lo + ((q - flo) * (hi - lo)) / (fhi - flo)); fy = ev(y); trials++; log('chord', y, fy);
      if (close(fy)) return { outcome: 'result', y, trace, trials };
      if (fy < q) { if (m.after === 'N2') { lo = y; flo = fy; continue; } break; }
      hi = y; fhi = fy;
    }
    lo = y; flo = fy; y = f(y + CIRCLE_CD_STEP);
  }
}
const A016_CASES: { name: string; d: string; q: string }[] = [
  { name: 'U1', d: '8', q: '1.6' }, { name: 'U2', d: '8', q: '1.71' }, { name: 'U3', d: '8', q: '1.8' },
  { name: 'U4', d: '15', q: '10.5' }, { name: 'U5', d: '15', q: '10.8' }, { name: 'U6', d: '15', q: '11' },
  { name: 'V1', d: '9.6', q: '1.5' }, { name: 'V2', d: '9.6', q: '1.8' }, { name: 'V3', d: '9.6', q: '3' }, { name: 'V4', d: '9.6', q: '10' },
  { name: 'W1', d: '9999', q: '.5' }, { name: 'W2', d: '7254', q: '.3' },
];
const A016_FIELDS = ['in_diameter', 'in_n', 'in_discharge', 'in_slope', 'depth', 'critical_slope', 'area', 'wet_perimeter', 'velocity', 'hyd_radius', 'top_width', 'froude', 'max_discharge', 'flow_type'];
const A016_COMPUTED = A016_FIELDS.filter((k) => !k.startsWith('in_') && k !== 'flow_type');
const a016Word = (o: { outcome: string }) => (o.outcome === 'rejected' ? 'message' : o.outcome === 'no_end' ? 'never finishes' : o.outcome);
function a016() {
  const m2 = atShare(0.9382), all = all184(), rule = T1D1X2(), K1X2 = A016_MODELS[0]!;
  const n = '.013', slope = '.005', inputsOf = (d: string, q: string) => ({ diameter: d, n, discharge: q, slope });
  h('The 56 combinations that miss only obs-cdmenu-000001 (A-015), rescored now');
  const { obs } = a014Observations();
  const fifty6 = all.filter((c) => { const bad = obs.filter((o) => !a013Fits(o, c.t, c.ds, c.x, m2).ok); return bad.length === 1 && bad[0]!.name === OBS_MENU; });
  row(`${fifty6.length} of ${all.length}; ${rule.id} among them: ${fifty6.some((c) => c.id === rule.id) ? 'yes' : 'no'}`);

  h('Checks: the written-out search against solve() and against A-015\'s model, on every A-016 case');
  for (const c of A016_CASES) {
    const today = solveToday(c.d, c.q).r, n2 = a016Search(c.d, f(val(c.q)), A016_MODELS[2]!), k1 = a016Search(c.d, f(val(c.q)), K1X2), a = answerOf(rule, c.d, f(val(c.q)));
    const todayWord = today.outcome === 'rejected' ? 'message' : today.outcome === 'error' ? 'never finishes' : 'result';
    const okToday = todayWord === a016Word(n2) && (today.outcome !== 'result' || today.raw.search_depth === n2.y);
    const okRule = a.a === (k1.outcome === 'rejected' ? 'message' : k1.outcome) && (k1.outcome !== 'result' || a.r.y === k1.y);
    row(`${c.name}: N2, trial > D against solve() ${okToday ? 'same' : `DIFFERENT (${todayWord} ${today.raw.search_depth}, ${a016Word(n2)} ${n2.y})`}; K1, trial >= D against ${rule.id} ${okRule ? 'same' : `DIFFERENT (${a.a} ${a.r.y}, ${k1.outcome} ${k1.y})`}`);
  }

  h('Goldens with these inputs, or these diameters');
  for (const d of [...new Set(A016_CASES.map((c) => c.d))]) {
    const same = ALL.filter((g) => g.shape === 'circle' && g.inputs.diameter !== undefined && val(g.inputs.diameter) === val(d));
    const sameCase = A016_CASES.filter((c) => c.d === d).flatMap((c) => same.filter((g) => g.mode === 'critical_depth' && g.inputs.discharge !== undefined && val(g.inputs.discharge) === val(c.q)).map((g) => `${c.name} = ${g.id}`));
    row(`${d} in: ${same.length ? same.map((g) => `${g.id} (${g.mode}, ${g.inputs.discharge ?? g.inputs.depth})`).join(', ') : 'no circle golden'}; same diameter and discharge in Critical Depth: ${sameCase.join(', ') || 'none'}`);
  }

  h('Each pipe: D, the stepped trials and A·√(g·A/T) at each, and the discharges each trial stops on (within 0.5%)');
  for (const d of [...new Set(A016_CASES.map((c) => c.d))]) {
    const D = f(f(val(d)) / 12), F = circleCriticalDischarge(D), ys: number[] = [];
    for (let y = f(CIRCLE_CD_STEP); y < D && ys.length < 6; y = f(y + CIRCLE_CD_STEP)) ys.push(y);
    const big = ys.length === 6;
    row(`${d} in: D ${D.toPrecision(10)}; ${big ? 'first trials' : 'trials inside'} ${ys.map((y) => { const v = f(F(y)); return `${y.toPrecision(10)}: ${v.toPrecision(6)} (stops for q ${(v / (1 + CIRCLE_TOL)).toPrecision(6)} to ${(v / (1 - CIRCLE_TOL)).toPrecision(6)})`; }).join('; ')}`);
    if (!big) { const next = f(ys[ys.length - 1]! + CIRCLE_CD_STEP); row(`    next stepped trial ${next.toPrecision(10)}, ${next === D ? 'equal to D' : next > D ? `past D by ${(next - D).toPrecision(3)}` : 'inside'}`); }
  }

  h('A-016: each case under every model, the trace under 2.4, the printed fields, and the 1 ± ε check');
  const table: string[] = [];
  for (const c of A016_CASES) {
    const v = vals('critical_depth', inputsOf(c.d, c.q)), q = v.discharge!, D = f(f(val(c.d)) / 12);
    const outs = A016_MODELS.map((m) => ({ m, o: a016Search(c.d, q, m) })), k1 = outs[0]!.o;
    row(`${c.name}: ${c.d} in at ${c.q} cfs`);
    row(`    ${outs.map(({ m, o }) => `${m.id}: ${a016Word(o)}${o.y !== undefined ? ` at ${o.y.toPrecision(7)}` : o.at !== undefined ? ` at trial ${o.at.toPrecision(10)}` : ''}`).join('; ')}`);
    row(`    trace under 2.4: ${k1.trace.slice(0, 8).map((t) => `${t.kind} ${t.y.toPrecision(7)} ${t.F.toPrecision(6)} (${pct(t.F, q)})`).join(', ')}${k1.trace.length > 8 ? ` ... ${k1.trials} evaluations` : ''}${k1.at !== undefined ? `; then trial ${k1.at.toPrecision(10)} against D ${D.toPrecision(10)} (${k1.at === D ? 'equal' : `${(k1.at - D).toPrecision(3)} ft`})` : ''}`);
    const today = solveToday(c.d, c.q);
    row(`    solve() today: ${today.text}`);
    for (const eps of [1e-6, 1e-4]) {
      const ch = [1 + eps, 1 - eps].map((s) => a016Word(a016Search(c.d, q, K1X2, s)));
      row(`    at 1 ± ${eps}: ${ch.join(', ')}${ch.every((x) => x === a016Word(k1)) ? ' (no change)' : ' (CHANGES)'}`);
    }
    const g56 = new Map<string, number>(); for (const cc of fifty6) { const a = answerOf(cc, c.d, q).a; g56.set(a, (g56.get(a) ?? 0) + 1); }
    const g184 = new Map<string, number>(); for (const cc of all) { const a = answerOf(cc, c.d, q).a; g184.set(a, (g184.get(a) ?? 0) + 1); }
    row(`    the 56: ${[...g56].map(([a, k]) => `${k} ${a}`).join(', ')}; all 184: ${[...g184].map(([a, k]) => `${k} ${a}`).join(', ')}`);
    let cells = A016_FIELDS.map(() => '');
    if (k1.outcome === 'result') {
      const raw = cdFields(v, GEO_C2, m2, k1.y!, CD_RULE.offset, 'q/A', D), p = show('critical_depth', v, raw);
      cells = A016_FIELDS.map((k) => (p[k] ?? '').trim());
      row(`    raw under 2.4: ${A016_COMPUTED.map((k) => `${k} ${Number(raw[k]).toPrecision(6)}`).join(', ')}`);
      { // the printed field nearest a rounding boundary: distance from the nearest half step, as a share of the value
        const edge = A016_COMPUTED.map((k) => {
          const x = Number(raw[k]), dec = ((p[k] ?? '').trim().split('.')[1] ?? '').length, u = 10 ** -dec;
          const half = (Math.floor(x / u) + 0.5) * u, near = Math.abs(x - half) < Math.abs(x - (half - u)) ? half : half - u;
          return { k, x, near, rel: Math.abs(x - near) / Math.abs(x) };
        }).sort((a, b) => a.rel - b.rel);
        row(`    nearest rounding boundaries: ${edge.slice(0, 2).map((e) => `${e.k} ${e.x.toPrecision(6)} against ${e.near.toPrecision(6)} (${(e.rel * 100).toPrecision(2)}%)`).join('; ')}`);
      }
      for (const s of [1 + 1e-4, 1 - 1e-4]) {
        const o = a016Search(c.d, q, K1X2, s);
        const ps = o.outcome === 'result' ? show('critical_depth', v, cdFields(v, GEO_C2, m2, o.y!, CD_RULE.offset, 'q/A', D)) : {};
        const diff = A016_FIELDS.filter((k) => (ps[k] ?? '').trim() !== (p[k] ?? '').trim());
        row(`    printed at ×${s}: ${diff.length ? `differs on ${diff.map((k) => `${k} ${(ps[k] ?? '').trim()}`).join(', ')}` : 'the same on every field'}`);
      }
      const tp = today.r.outcome === 'result' ? today.r.printed : null;
      row(`    printed under 2.4: ${A016_FIELDS.map((k, i) => `${k} ${cells[i]}`).join(', ')}`);
      if (tp) row(`    printed today: ${A016_FIELDS.map((k) => `${k} ${(tp[k] ?? '').trim()}`).join(', ')}`);
    } else if (today.r.outcome === 'result') row(`    printed today: ${A016_FIELDS.map((k) => `${k} ${(today.r.printed[k] ?? '').trim()}`).join(', ')}`);
    table.push(`| ${c.name} | ${c.d} | ${c.q} | ${a016Word(k1)} | ${cells.join(' | ')} |`);
  }
  console.log(`\n| Case | Diameter | Discharge | Predicted | ${A016_FIELDS.join(' | ')} |`);
  console.log(`|${'---|'.repeat(4 + A016_FIELDS.length)}`);
  for (const l of table) console.log(l);
}
// ---- H-009: the exact critical depth where QUICK-2 printed the message -------------------------
/** The root of A·√(g·A/T) = q with the true π, in double, nothing stored, g = 32.2 (QUICK-2's):
 * A = r²(θ − sin θ)/2, θ = 2·acos((r − y)/r), T = 2·√(y·(D − y)), D = VAL/12. Bisection on (0, D). */
function exactCritical(d: string, q: number): number {
  const D = val(d) / 12, r = D / 2, F = (y: number) => { const th = 2 * Math.acos((r - y) / r), A = (r * r * (th - Math.sin(th))) / 2, T = 2 * Math.sqrt(y * (D - y)); return A * Math.sqrt((G * A) / T); };
  let lo = 0, hi = D;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (F(mid) < q) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
function h009() {
  h('H-009: the exact critical depth, true π, double, g = 32.2, and its distance below the crown');
  const cases: { name: string; d: string; q: string; src: string }[] = [
    ...['cd-circ-000043', 'cd-circ-000049', 'cd-circ-000050'].map((id) => { const g = byId(id); return { name: id, d: g.inputs.diameter!, q: g.inputs.discharge!, src: `${g.outcome}${lastCapture(id).some((l) => l.includes(DEPTH_ABOVE_DIAMETER)) ? ', the message' : ''}` }; }),
    { name: 'A-016 U1', d: '8', q: '1.6', src: 'not run' }, { name: 'A-016 U2', d: '8', q: '1.71', src: 'not run' },
  ];
  for (const c of cases) {
    const g = c.name.startsWith('cd-') ? byId(c.name) : null;
    if (g && (g.mode !== 'critical_depth' || g.shape !== 'circle')) throw new Error(`${c.name} is not circle Critical Depth`);
    const D = val(c.d) / 12, y = exactCritical(c.d, val(c.q));
    row(`${c.name}: ${c.d} in, ${c.q} cfs${g ? `, n ${g.inputs.n}, slope ${g.inputs.slope}` : ''} (${c.src}): critical depth ${y.toFixed(4)} ft, ${(y / D).toFixed(3)}·D, ${(D - y).toFixed(4)} ft (${((D - y) * 12).toFixed(2)} in) below the crown`);
  }
}
/** Every circle Critical Depth golden, graded as the comparator grades it (outcome, then every
 * printed field of a result), under solve() today and under 2.4 with K1 (A-016's written-out
 * search, fields from cdFields). Goldens the form holds are not searched and do not change. */
function designChanges() {
  const m2 = atShare(0.9382), K1X2 = A016_MODELS[0]!;
  h('circle-short-chord design: every circle Critical Depth golden, today and under 2.4 with K1');
  const gs = ALL.filter((g) => g.shape === 'circle' && g.mode === 'critical_depth' && !g.id.startsWith('obs-')); // behaviour cases are never graded
  const rows: { id: string; today: string; after: string }[] = [];
  const held: string[] = [];
  for (const g of gs) {
    const r = solve({ mode: 'critical_depth', shape: 'circle', inputs: g.inputs });
    if (r.held) { held.push(g.id); continue; }
    const v = vals('critical_depth', g.inputs), o = a016Search(g.inputs.diameter!, v.discharge!, K1X2);
    const grade = (outcome: string, p: Record<string, string> | null) => {
      if (outcome !== g.outcome) return `miss (${outcome})`;
      if (outcome !== 'result') return 'match';
      const d = misses(g, p!); return d.length ? `miss (${d.join('; ')})` : 'match';
    };
    const today = grade(r.outcome, r.printed);
    const after = grade(o.outcome === 'no_end' ? 'error' : o.outcome, o.outcome === 'result' ? show('critical_depth', v, cdFields(v, GEO_C2, m2, o.y!, CD_RULE.offset, 'q/A', f(f(val(g.inputs.diameter!)) / 12))) : null);
    rows.push({ id: g.id, today, after });
  }
  const n = (s: string, w: 'today' | 'after') => rows.filter((x) => x[w].startsWith(s)).length;
  row(`${gs.length} goldens: ${held.length} held at a prompt, not searched (${held.join(', ')}); of the other ${rows.length}, today ${n('match', 'today')} match, after ${n('match', 'after')}`);
  const fixed = rows.filter((x) => x.today !== 'match' && x.after === 'match'), broken = rows.filter((x) => x.today === 'match' && x.after !== 'match'), still = rows.filter((x) => x.today !== 'match' && x.after !== 'match');
  row(`start to match: ${fixed.length}`);
  for (const x of fixed) row(`    ${x.id}: today ${x.today}`);
  row(`stop matching: ${broken.length}${broken.map((x) => `; ${x.id} ${x.after}`).join('')}`);
  row(`miss before and after: ${still.length}${still.map((x) => `; ${x.id} ${x.after}`).join('')}`);

  h('Generated circles under 2.4 with K1: Diameter 8 to 180 in by 0.1 in, q log-uniform from 0.01 cfs to A·√(g·A/T) at 0.99·D');
  let seed = 20261125 >>> 0;
  const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  const count = new Map<string, number>(), at: string[] = []; let geoMax = 0;
  for (let i = 0; i < 20000; i++) {
    const d = (80 + Math.floor(rnd() * 1721)) / 10, D = f(f(d) / 12), top = f(circleCriticalDischarge(D)(f(0.99 * D)));
    const q = f(0.01 * Math.pow(top / 0.01, rnd()));
    const o = a016Search(String(d), q, K1X2);
    for (const y of a016SearchDepths(String(d), q)) geoMax = Math.max(geoMax, y / D); // every depth the geometry is given
    const w = a016Word(o); count.set(w, (count.get(w) ?? 0) + 1);
    if (o.outcome === 'no_end' && at.length < 5) at.push(`${d} in at ${q.toPrecision(4)} cfs`);
  }
  row(`20000 drawn: ${[...count].map(([k, n]) => `${n} ${k}`).join(', ')}${at.length ? `; never finish: ${at.join(', ')}` : ''}`);
  row(`the largest depth the geometry was given, as a share of D: ${geoMax.toPrecision(10)}${geoMax < 1 ? ' (below D)' : ' (NOT below D)'}`);
}
/** Every depth a016Search gives the geometry, under K1 and trial >= D. */
function a016SearchDepths(text: string, q: number): number[] {
  const D = f(f(val(text)) / 12), F = circleCriticalDischarge(D), ys: number[] = [];
  const close = (v: number) => Math.abs(v - q) <= CIRCLE_TOL * q, ev = (y: number) => { ys.push(y); return f(F(y)); };
  let lo = 0, flo = 0, y = f(CIRCLE_CD_STEP), fy: number, n = 0;
  for (;;) {
    for (;;) { if (y >= D) return ys; fy = ev(y); if (close(fy) || ++n > 1e6) return ys; if (fy > q) break; lo = y; flo = fy; y = f(y + CIRCLE_CD_STEP); }
    let hi = y, fhi = fy;
    for (;;) { if (!(fhi > flo) || ++n > 1e6) return ys; y = f(lo + ((q - flo) * (hi - lo)) / (fhi - flo)); fy = ev(y); if (close(fy)) return ys; if (fy < q) break; hi = y; fhi = fy; }
    lo = y; flo = fy; y = f(y + CIRCLE_CD_STEP);
  }
}
// ---- A-016 graded: QUICK-2's twelve answers against A-016 as committed ------------------------
const A016_COMMIT = '414cad4';
/** The ledger decision that lists A-016's runs, goldens and behaviour cases (the Exhumer's, 2026-11-26). */
const A016_DECISION = 102;
type Word = 'result' | 'message' | 'shape menu' | 'never finishes';
const rawCase = (id: string) => JSON.parse(readFileSync(join(CASES, `${id}.json`), 'utf-8'));
/** A-016's case table and its table of printed fields, read from git. */
function a016AsCommitted() {
  const a = committedSection(A016_COMMIT, '## A-016: predictions');
  const common = /Twelve cases, n ([\d.]+) and\s+slope ([\d.]+)\./.exec(a);
  if (!common) throw new Error(`A-016 at ${A016_COMMIT}: no common n and slope`);
  const cases: { name: string; d: string; q: string; predicts: Word }[] = [];
  const fields: Record<string, Record<string, string>> = {};
  let header: string[] = [];
  for (const l of a.split('\n')) {
    if (!l.startsWith('| ')) continue;
    const c = tableCells(l);
    if (c[0] === 'Case') { header = c; continue; }
    if (!/^[UVW]\d$/.test(c[0]!)) continue;
    if (header[3] === 'Predicted') {
      const p = c[3]!, w = (['result', 'message', 'never finishes'] as Word[]).find((x) => x === p);
      if (!w) throw new Error(`unread prediction "${p}"`);
      cases.push({ name: c[0]!, d: c[1]!, q: c[2]!, predicts: w });
    } else if (header[1] === 'Diameter' && header[4] === 'Depth') {
      const rec: Record<string, string> = {};
      header.slice(1).forEach((hd, i) => { const k = HEADER_KEYS[hd]; if (!k) throw new Error(`unknown column ${hd}`); rec[k] = c[i + 1]!; });
      fields[c[0]!] = rec;
    }
  }
  if (cases.length !== 12) throw new Error(`read ${cases.length} of A-016's twelve cases`);
  return { n: common[1]!, slope: common[2]!, cases, fields };
}
/** The typed Diameter, n, Discharge and Slope of a behaviour case, from its transcript. */
function typedInputs(raw: { transcript: { expect: string; keys: string }[] }): Record<string, string> | null {
  const typed = raw.transcript.filter((s) => s.expect === 'cd_form').map((s) => s.keys.replace(/\{Enter\}$/, ''));
  return typed.length === 5 && typed[4] === '' ? { diameter: typed[0]!, n: typed[1]!, discharge: typed[2]!, slope: typed[3]! } : null;
}
/** Every behaviour case that ended on the shape menu after the circle Critical Depth form. */
function menuCases(): { id: string; inputs: Record<string, string> }[] {
  return ALL.filter((g) => g.id.startsWith('obs-cdmenu-')).map((g) => {
    const r = rawCase(g.id), inputs = typedInputs(r);
    if (!inputs || r.outcome !== 'observed' || r.expected_screen !== 'shape_menu') throw new Error(`${g.id} is not an observed shape_menu ending of the cd form`);
    if (lastCapture(g.id).some((l) => l.includes(DEPTH_ABOVE_DIAMETER))) throw new Error(`${g.id}'s last screen has the message`);
    return { id: g.id, inputs };
  });
}
/** Every record one ledger decision lists for these inputs: goldens, behaviour cases and run folders. */
function seenEvery(inputs: Record<string, string>, decision: number): { word: Word | 'other'; source: string; screen: string }[] {
  const ledger = JSON.parse(readFileSync(join(ROOT, 'results', 'ledger.json'), 'utf-8'));
  const d = ledger.decisions.find((x: { n: number }) => x.n === decision);
  if (!d) throw new Error(`ledger decision ${decision} not found`);
  const listed = new Set<string>(d.evidence), out: { word: Word | 'other'; source: string; screen: string }[] = [];
  const said = (s: string[]) => s.some((l) => l.includes(DEPTH_ABOVE_DIAMETER));
  for (const g of ALL.filter((x) => listed.has(x.id) && x.mode === 'critical_depth' && x.shape === 'circle' && sameInputs(x.inputs, inputs))) {
    const s = lastCapture(g.id);
    out.push({ word: g.outcome === 'result' ? 'result' : g.outcome === 'rejected' && said(s) ? 'message' : 'other', source: `golden ${g.id}`, screen: g.outcome === 'result' ? 'result screen' : rejectionScreen(s) });
  }
  for (const m of menuCases().filter((x) => listed.has(x.id) && sameInputs(x.inputs, inputs))) out.push({ word: 'shape menu', source: `behaviour case ${m.id}`, screen: 'shape menu, no message' });
  for (const id of listed) {
    const r = runFolder(id);
    if (!r || r.run.mode !== 'critical_depth' || r.run.shape !== 'circle' || !sameInputs(r.run.inputs, inputs)) continue;
    const s = seenInRun(r);
    out.push({ word: r.run.outcome === 'result' ? 'result' : s.outcome === 'rejected' ? 'message' : s.outcome === 'shape_menu' ? 'shape menu' : 'other', source: `run ${id}`, screen: `${r.run.outcome} on ${r.run.screen_id}` });
  }
  return out;
}
/** Every circle Critical Depth outcome there is: the goldens and obs-cdmenu-000001 as in A-014,
 * the other shape-menu behaviour cases, and the runs decision 102 lists that no stored case has. */
function a016Observations(): A013Obs[] {
  const { obs } = a014Observations();
  for (const m of menuCases()) if (m.id !== OBS_MENU) obs.push({ name: m.id, inputs: m.inputs, seen: 'shape_menu', source: `golden ${m.id}` });
  const ledger = JSON.parse(readFileSync(join(ROOT, 'results', 'ledger.json'), 'utf-8'));
  for (const id of ledger.decisions.find((x: { n: number }) => x.n === A016_DECISION).evidence as string[]) {
    const r = runFolder(id); if (!r) continue;
    if (obs.some((o) => sameInputs(o.inputs, r.run.inputs))) continue;
    const s = seenInRun(r);
    if (s.outcome !== 'shape_menu' && s.outcome !== 'rejected') throw new Error(`run ${id} reads as ${s.outcome}`);
    obs.push({ name: `run ${id}`, inputs: r.run.inputs, seen: s.outcome, source: `run ${id}` });
  }
  return obs;
}
function gradeA016() {
  const m2 = atShare(0.9382), all = all184(), K1X2 = A016_MODELS[0]!, rule = T1D1X2();
  const A = a016AsCommitted();
  const inputsOf = (d: string, q: string) => ({ diameter: d, n: A.n, discharge: q, slope: A.slope });
  h(`A-016 read from ${A016_COMMIT}: ${A.cases.length} cases, n ${A.n}, slope ${A.slope}; printed fields for ${Object.keys(A.fields).join(', ')}`);
  { let same = 0, fs = 0, fsame = 0;
    for (const c of A.cases) {
      const v = vals('critical_depth', inputsOf(c.d, c.q)), o = a016Search(c.d, v.discharge!, K1X2);
      if (a016Word(o) === c.predicts) same++; else row(`differs: ${c.name}: committed ${c.predicts}, model ${a016Word(o)}`);
      if (o.outcome !== 'result' || !A.fields[c.name]) continue;
      const p = show('critical_depth', v, cdFields(v, GEO_C2, m2, o.y!, CD_RULE.offset, 'q/A', f(f(val(c.d)) / 12)));
      for (const k of Object.keys(A.fields[c.name]!)) { fs++; if ((p[k] ?? '').trim() === A.fields[c.name]![k]) fsame++; else row(`differs: ${c.name} ${k}: committed ${A.fields[c.name]![k]}, model ${(p[k] ?? '').trim()}`); }
    }
    row(`the model, rerun now, gives the committed outcome on ${same} of ${A.cases.length} and the committed field on ${fsame} of ${fs}`); }

  h(`What QUICK-2 did: every golden, behaviour case and run folder ledger decision ${A016_DECISION} lists for each case's inputs`);
  const seen: Record<string, { word: Word | 'other' | 'DIFFERENT'; sources: string[]; golden?: Golden }> = {};
  for (const c of A.cases) {
    const s = seenEvery(inputsOf(c.d, c.q), A016_DECISION);
    if (!s.length) throw new Error(`${c.name}: decision ${A016_DECISION} lists nothing with these inputs`);
    const words = [...new Set(s.map((x) => x.word))];
    const gid = s.find((x) => x.source.startsWith('golden '))?.source.slice(7);
    seen[c.name] = { word: words.length === 1 ? words[0]! : 'DIFFERENT', sources: s.map((x) => x.source.replace(/^(golden|behaviour case) /, '')), golden: gid ? byId(gid) : undefined };
    row(`${c.name} ${inputText(inputsOf(c.d, c.q))}: ${s.map((x) => `${x.source}: ${x.word} (${x.screen})`).join('; ')}`);
  }
  const graded = A.cases.map((c) => ({ c, ok: c.predicts === seen[c.name]!.word }));
  console.log(`\n| Case | Diameter | Discharge | A-016 predicts | QUICK-2 | Seen in | Right |`);
  console.log('|---|---|---|---|---|---|---|');
  for (const { c, ok } of [...graded.filter((x) => !x.ok), ...graded.filter((x) => x.ok)])
    console.log(`| ${c.name} | ${c.d} | ${c.q} | ${ok ? c.predicts : `**${c.predicts}**`} | ${seen[c.name]!.word} | ${seen[c.name]!.sources.join(', ')} | ${ok ? 'yes' : 'no'} |`);
  row(`right on ${graded.filter((x) => x.ok).length} of ${A.cases.length}; missed: ${graded.filter((x) => !x.ok).map((x) => x.c.name).join(', ') || 'none'}`);

  h('The three results: A-016\'s printed fields against the goldens, every field the comparator compares');
  for (const c of A.cases.filter((x) => A.fields[x.name])) {
    const g = seen[c.name]!.golden; if (!g || g.outcome !== 'result') { row(`${c.name}: no result golden`); continue; }
    const d = Object.keys(g.printed).filter((k) => g.printed[k]!.trim() !== A.fields[c.name]![k]);
    row(`${c.name} (${g.id}): ${Object.keys(g.printed).length - d.length} of ${Object.keys(g.printed).length} fields the same${d.length ? `; differ: ${d.map((k) => `${k} QUICK-2 ${g.printed[k]!.trim()}, A-016 ${A.fields[c.name]![k]}`).join(', ')}` : ''}; Discharge typed ${c.q}, shown \`${g.printed.in_discharge!.trim()}\`; Critical Slope \`${g.printed.critical_slope!.trim()}\``);
  }

  h('The 9.6 in pipe: the stepped trials under the rebuild\'s trial and diameter store, and what each discharge does before trial 4 is tested');
  { const D = f(f(val('9.6')) / 12), F = circleCriticalDischarge(D), ys: number[] = [];
    for (let y = f(CIRCLE_CD_STEP); ys.length < 4; y = f(y + CIRCLE_CD_STEP)) ys.push(y);
    row(`D ${D.toPrecision(10)}; trials ${ys.map((y, i) => `${i + 1}: ${y.toPrecision(10)}${y === D ? ' (equals D)' : y > D ? ' (past D)' : `, A·√(g·A/T) ${f(F(y)).toPrecision(5)}`}`).join('; ')}`);
    const paths: Record<string, string> = {};
    for (const q of ['1.5', '1.8', '2', '3', '10']) {
      const qq = f(val(q)), steps: string[] = [];
      for (const y of ys) {
        if (y >= D) { steps.push(`trial ${y.toPrecision(10)} reached, equal to D`); break; }
        const fy = f(F(y)), rel = Math.abs(fy - qq) <= CIRCLE_TOL * qq ? 'within 0.5%' : fy < qq ? 'short' : 'over';
        steps.push(`${y.toPrecision(3)} ${rel}`); if (rel !== 'short') break;
      }
      paths[q] = steps.join(', ');
      const seenQ = q === '2' ? `QUICK-2 shape menu (${OBS_MENU})` : `QUICK-2 ${seen[A.cases.find((c) => c.d === '9.6' && c.q === q)!.name]!.word}`;
      row(`${q} cfs (trial 3 is short of q by more than 0.5% for q above ${(f(F(ys[2]!)) / (1 - CIRCLE_TOL)).toFixed(4)} cfs): ${paths[q]}; ${seenQ}`);
    }
    row(`1.8, 2, 3 and 10 cfs take the same trials with the same comparisons before trial 4: ${['2', '3', '10'].every((q) => paths[q] === paths['1.8']) ? 'yes' : 'NO'}`); }

  const obs = a016Observations();
  h(`All ${all.length} combinations of A-013 and its amendment on every circle Critical Depth outcome: ${obs.length} observations`);
  const by = (s: string) => obs.filter((o) => o.seen === s);
  row(`${by('result').length} results, ${by('rejected').length} rejections with the message, ${by('shape_menu').length} shape-menu endings (${by('shape_menu').map((o) => o.name).join(', ')})`);
  const scores = all.map((c) => ({ c, bad: obs.map((o) => ({ o, ...a013Fits(o, c.t, c.ds, c.x, m2) })).filter((r) => !r.ok) }));
  const hist = new Map<number, number>(); for (const s of scores) hist.set(obs.length - s.bad.length, (hist.get(obs.length - s.bad.length) ?? 0) + 1);
  row(`scores: ${[...hist].sort((a, b) => b[0] - a[0]).map(([k, n]) => `${n} fit ${k}`).join(', ')}`);
  row(`fit all ${obs.length}: ${scores.filter((s) => !s.bad.length).map((s) => s.c.id).join(', ') || 'none'}`);
  const best = Math.max(...scores.map((s) => obs.length - s.bad.length)), top = scores.filter((s) => obs.length - s.bad.length === best);
  const missSets = new Map<string, string[]>(); for (const s of top) { const k = s.bad.map((r) => `${r.o.name} (${r.got.replace(/ at trial .*/, '')})`).join(', '); if (!missSets.has(k)) missSets.set(k, []); missSets.get(k)!.push(s.c.id); }
  row(`the best fit, ${best} of ${obs.length}, by ${top.length}; what they miss:`);
  for (const [k, ids] of missSets) row(`    ${ids.length} miss ${k}${ids.includes(rule.id) ? ` (${rule.id} among them)` : ''}`);
  const menuObs = by('shape_menu');
  row(`the shape-menu endings under the ${all.length}: ${menuObs.map((o) => { const v = vals('critical_depth', o.inputs), m = new Map<string, number>(); for (const c of all) { const a = answerOf(c, o.inputs.diameter!, v.discharge!).a; m.set(a, (m.get(a) ?? 0) + 1); } return `${o.name} (${o.inputs.diameter} in, ${o.inputs.discharge} cfs) ${[...m].map(([a, n]) => `${n} ${a}`).join(', ')}`; }).join('; ')}`);
  { const pair = menuObs.filter((o) => o.inputs.diameter === '9.6'), msg = obs.filter((o) => o.seen === 'rejected' && o.inputs.diameter === '9.6');
    const both = all.filter((c) => [...pair, ...msg].every((o) => a013Fits(o, c.t, c.ds, c.x, m2).ok));
    row(`combinations that give the shape menu at 9.6 in for ${pair.map((o) => o.inputs.discharge).join(' and ')} cfs and the message for ${msg.map((o) => o.inputs.discharge).join(' and ')} cfs: ${both.length}`); }

  h(`K1 with trial ≥ D (2.4, ${rule.id}) on the results and the rejections`);
  { const s = scores.find((x) => x.c.id === rule.id)!, rr = obs.filter((o) => o.seen !== 'shape_menu');
    const badRR = s.bad.filter((r) => r.o.seen !== 'shape_menu');
    row(`${rr.length} results and rejections with the message: ${rr.length - badRR.length} fit${badRR.length ? `; misses ${badRR.map((r) => `${r.o.name} (${r.got})`).join(', ')}` : ''}; the ${obs.length - rr.length} shape-menu endings: ${s.bad.filter((r) => r.o.seen === 'shape_menu').map((r) => `${r.o.name} ${r.got.replace(/ at trial .*/, '')}`).join(', ')}`);
    const nine = A.cases.filter((c) => seen[c.name]!.word === 'result' || seen[c.name]!.word === 'message');
    row(`A-016's cases that ended on a result or the message: ${nine.map((c) => c.name).join(', ')} (${nine.length}); ${rule.id} predicted ${nine.filter((c) => c.predicts === seen[c.name]!.word).length} of them before they ran`); }

  h('W1 and W2 under the floor: where the model\'s chords on [0, first trial] go (y, A·√(g·A/T))');
  for (const c of A.cases.filter((x) => x.predicts === 'never finishes')) {
    const D = f(f(val(c.d)) / 12), F = circleCriticalDischarge(D), q = f(val(c.q)), fl = cdFloor(D).q;
    let lo = 0, flo = 0, hi = f(CIRCLE_CD_STEP), fhi = f(F(hi)), zeroAt = -1, n = 0;
    const shown: string[] = [`trial ${hi.toPrecision(3)} ${fhi.toPrecision(4)}`];
    for (; n < 1000 && zeroAt < 0; n++) {
      const yc = f(lo + ((q - flo) * (hi - lo)) / (fhi - flo)), fc = f(F(yc));
      if (n < 3) shown.push(`chord ${n + 1} ${yc.toPrecision(4)} ${fc.toPrecision(4)}`);
      if (yc === 0) { zeroAt = n + 1; break; }
      if (Math.abs(fc - q) <= CIRCLE_TOL * q) break;
      if (fc > q) { hi = yc; fhi = fc; } else { lo = yc; flo = fc; }
    }
    row(`${c.name} (${c.d} in, ${c.q} cfs, ${(q / fl).toPrecision(3)} of the floor ${fl.toPrecision(4)} cfs): ${shown.join('; ')}; ${zeroAt > 0 ? `chord ${zeroAt} is 0, where T = 0` : 'no chord reaches 0 in 1000'}; QUICK-2: ${seen[c.name]!.word}`);
  }
}
// ---- What A-016's misses say: pipes with a trial on D, tests made on q -----------------------
/** Typed diameters 0.1 to 180.0 in by 0.1 whose stored D (store(store(VAL)/12)) equals a stepped
 * trial (store(y + 0.2) from 0.2) exactly: the trial's number, the last trial inside and the least
 * discharge that steps past it to D (more than 0.5% above its A·√(g·A/T)). */
type OnD = { d: string; D: number; k: number; last: number; Flast: number; Fprev: number; reach: number };
function onDiameterPipes(): OnD[] {
  const out: OnD[] = [];
  for (let i = 1; i <= 1800; i++) {
    const d = String(i / 10), D = f(f(val(d)) / 12);
    let y = f(CIRCLE_CD_STEP), k = 1, last = 0, prev = 0;
    while (y < D) { prev = last; last = y; y = f(y + CIRCLE_CD_STEP); k++; }
    if (y !== D) continue;
    const F = circleCriticalDischarge(D), Flast = last ? f(F(last)) : 0, Fprev = prev ? f(F(prev)) : 0;
    out.push({ d, D, k, last, Flast, Fprev, reach: Flast / (1 - CIRCLE_TOL) });
  }
  return out;
}
/** Printed by grade-a016 (what the misses say) and used by a017: every pipe whose stored diameter is
 * a stepped trial, the observations that step to that trial, the tests on q written here, and the
 * bounds on c for a number c·D^2.5 met at the trial on D. */
function onDiameterReport(print: boolean) {
  const tol = CIRCLE_TOL, pipes = onDiameterPipes(), obs = a016Observations();
  const h = print ? (s: string) => console.log(`\n## ${s}`) : (_s: string) => {}, row = print ? (s: string) => console.log(`  ${s}`) : (_s: string) => {};
  h(`Pipes typed 0.1 to 180.0 in by 0.1 whose stored diameter equals a stepped trial exactly: ${pipes.length}`);
  for (const p of pipes) {
    const here = obs.filter((o) => val(o.inputs.diameter!) === val(p.d));
    const reached = here.filter((o) => val(o.inputs.discharge!) > p.reach);
    row(`${p.d} in: D ${p.D.toPrecision(10)} is trial ${p.k}; last trial inside ${p.last ? `${p.last.toPrecision(10)}, A·√(g·A/T) ${p.Flast.toPrecision(5)}` : 'none'}; q above ${p.reach.toPrecision(5)} cfs steps to D; observations on this pipe that reach D: ${reached.map((o) => `${o.name} ${o.inputs.discharge} cfs ${o.seen === 'shape_menu' ? 'shape menu' : o.seen === 'rejected' ? 'message' : o.seen}`).join(', ') || 'none'}`);
  }

  // Every observation whose discharge steps to a trial on D: what a test made before that trial would see.
  const onD = obs.flatMap((o) => { const p = pipes.find((x) => val(x.d) === val(o.inputs.diameter!)), q = f(val(o.inputs.discharge!)); return p && q > p.reach ? [{ o, p, q }] : []; });
  h(`Observations whose discharge steps to a trial on D: ${onD.length}`);
  for (const { o, p, q } of onD) {
    const look = p.last ? p.Flast + ((p.D - p.last) * (p.Flast - p.Fprev)) / CIRCLE_CD_STEP : NaN;
    const word = o.seen === 'shape_menu' ? 'shape menu' : o.seen === 'rejected' ? 'message' : o.seen;
    row(`${o.name} (${o.inputs.diameter} in, n ${o.inputs.n}, ${o.inputs.discharge} cfs): ${word}; q over the last trial's A·√(g·A/T) ${p.last ? (q / p.Flast).toPrecision(5) : 'no trial inside'}; straight line through the last two trials at D ${Number.isNaN(look) ? 'none' : `${look.toPrecision(5)} cfs (q ${q < look ? 'below' : 'above'} it)`}; q/D^2.5 ${(q / p.D ** 2.5).toPrecision(5)}`);
  }

  h('Tests made on q before the trial on D, as forms written here, against the observations');
  { // Manning's formula with the typed n and slope: the full pipe and 0.9382·D (Max Discharge's depth).
    const over = obs.filter((o) => o.seen === 'result').map((o) => { const v = vals('critical_depth', o.inputs), D = f(f(val(o.inputs.diameter!)) / 12); return { o, q: v.discharge!, cap: manning(GEO_C2, D, f(0.9382 * D), kOf(v, v.slope!)) }; }).filter((x) => x.q > x.cap);
    const v96 = vals('critical_depth', { diameter: '9.6', n: '.013', discharge: '2', slope: '.005' }), D96 = f(0.8);
    row(`Manning's formula, typed n and slope, at 0.9382·D: 9.6 in, n .013, slope .005 gives ${manning(GEO_C2, D96, f(0.9382 * D96), kOf(v96, v96.slope!)).toPrecision(4)} cfs (full pipe ${manning(GEO_C2, D96, f(0.999999 * D96), kOf(v96, v96.slope!)).toPrecision(4)}), under obs-cdmenu-000002's 1.8 cfs; result goldens with q above it: ${over.length} (${over.slice(0, 4).map((x) => `${x.o.name} ${x.q} over ${x.cap.toPrecision(4)}`).join(', ')}${over.length > 4 ? ', ...' : ''})`);
    // A·√(g·A/T) at a fixed share s of D: the 9.6 in messages need F(s·D) < q, every result F(s·D) ≥ its q.
    const shareOf = (D: number, q: number) => { const F = circleCriticalDischarge(D); let lo = 0, hi = 1; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (f(F(f(m * D))) < q) lo = m; else hi = m; } return lo; };
    const need = obs.filter((o) => o.seen === 'result').map((o) => ({ o, s: shareOf(f(f(val(o.inputs.diameter!)) / 12), f(val(o.inputs.discharge!)) * (1 - tol)) })).sort((a, b) => b.s - a.s)[0]!;
    row(`A·√(g·A/T) at a fixed share of D: 3 cfs at 9.6 in (cd-circ-000071, the message) needs a share under ${shareOf(D96, 3).toFixed(4)}; ${need.o.name} (${need.o.inputs.diameter} in, ${need.o.inputs.discharge} cfs, a result) needs one of at least ${need.s.toFixed(4)}`); }

  // The crown number scaled as D^2.5: menu above, message below, a result within 0.5%.
  let cLo = 0, cHi = Infinity, loBy = '', hiBy = '';
  for (const { o, p, q } of onD) {
    const s = p.D ** 2.5;
    if (o.seen === 'shape_menu' && (q * (1 + tol)) / s > cLo) { cLo = (q * (1 + tol)) / s; loBy = o.name; }
    if (o.seen === 'rejected' && (q * (1 - tol)) / s < cHi) { cHi = (q * (1 - tol)) / s; hiBy = o.name; }
  }
  h('A number at the trial on D that scales as D^2.5, c·D^2.5: q more than 0.5% under it the shape menu, more than 0.5% over it the message');
  row(`c above ${cLo.toPrecision(5)} (${loBy}) and below ${cHi.toPrecision(5)} (${hiBy}); at 9.6 in the change is then between ${(cLo * f(0.8) ** 2.5).toPrecision(5)} and ${(cHi * f(0.8) ** 2.5).toPrecision(5)} cfs`);
  return { pipes, cLo, cHi };
}
const which = process.argv[2];
if (which === 'grade-a016') { gradeA016(); onDiameterReport(true); }
else if (which === 'floor') floorReport();
else if (which === 'a016') a016();
else if (which === 'design') { designChanges(); h009(); }
else if (which === 'a004') a004();
else if (which === 'a009') a009();
else if (which === 'a005') a005();
else if (which === 'grade-a005') gradeA005();
else if (which === 'critical-slope') criticalSlopeA008();
else if (which === 'grade-a009') gradeA009();
else if (which === 'a011') a011();
else if (which === 'grade-a011') gradeA011();
else if (which === 'a013') a013();
else if (which === 'a013-amendment') a013Amendment();
else if (which === 'grade-a013') { gradeA013(); await a014Diameter(); }
else if (which === 'grade-a014') gradeA014();
else { console.error('usage: node scripts/circle_outputs.mts a004|a005|grade-a005|critical-slope|a009|grade-a009|a011|grade-a011|a013|a013-amendment|grade-a013|grade-a014|floor|a016|design|grade-a016'); process.exit(2); }
