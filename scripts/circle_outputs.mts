// Offline scoring for the circle-outputs bugfix spec: reproduces every table of
// results/attempts.md A-004 and prints the predictions of A-005.
//
//   node scripts/circle_outputs.mts a004       every A-004 number, section by section
//   node scripts/circle_outputs.mts a005       A-005's cases and predicted fields
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

const which = process.argv[2];
if (which === 'a004') a004();
else if (which === 'a005') a005();
else { console.error('usage: node scripts/circle_outputs.mts a004|a005'); process.exit(2); }
