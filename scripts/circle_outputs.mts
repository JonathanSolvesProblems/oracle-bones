// Offline scoring for the circle-outputs bugfix spec: reproduces every table of
// results/attempts.md A-004 and prints the predictions of A-005.
//
//   node scripts/circle_outputs.mts a004       every A-004 number, section by section
//   node scripts/circle_outputs.mts a005       A-005's cases and predicted fields
//   node scripts/circle_outputs.mts grade-a005 A-006: the goldens against A-005 as committed
//   node scripts/circle_outputs.mts critical-slope  A-008: cd-circ-000033's Critical Slope
//   node scripts/circle_outputs.mts a009       A-009: the short-chord rule, its scores and predictions
//   node scripts/circle_outputs.mts grade-a009 A-010: QUICK-2's four answers against A-009 as committed
//
// `grade-a009` reads A-009 from git (80c87fd), each result from the stored golden, and each
// rejection from the run folder that ledger decision 80 names. Run folders are under oracle/out,
// which is not committed, so Q1 and Q2 can be graded only on a machine that holds them.
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
import { diameterFeet } from '../app/src/solver/geometry/circle.ts';
import { search as appSearch } from '../app/src/solver/search.ts';
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
function cdFields(v: Vals, geo: Geo, qmax: QmaxRule, y: number, offset: number, velocity: 'q/A' | 'celerity' = 'q/A'): Out {
  const D = diam(v), q = v.discharge!, n = v.n!, w = geo(D, y), R = f(w.A / w.P), cel = Math.sqrt((G * w.A) / w.T);
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

const which = process.argv[2];
if (which === 'a004') a004();
else if (which === 'a009') a009();
else if (which === 'a005') a005();
else if (which === 'grade-a005') gradeA005();
else if (which === 'critical-slope') criticalSlopeA008();
else if (which === 'grade-a009') gradeA009();
else { console.error('usage: node scripts/circle_outputs.mts a004|a005|grade-a005|critical-slope|a009|grade-a009'); process.exit(2); }
