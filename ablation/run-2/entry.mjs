// QUICK-2 v1.0 work-alike: open-channel hydraulics, JSON lines in / JSON lines out.
// No dependencies. Run: node entry.mjs
import { createInterface } from "node:readline";

const G = 32.2;      // gravitational acceleration, ft/s^2
const KM = 1.486;    // Manning constant, English units

class Reject extends Error {}

// ---------- input parsing ----------
// A typed value: optional sign, digits with optional decimal point, optional E/D exponent.
const NUM_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eEdD][+-]?\d+)?$/;

function parseTyped(raw, name) {
  if (raw === undefined || raw === null) throw new Reject(`Missing value for ${name}`);
  const s = String(raw).trim();
  if (s === "" || !NUM_RE.test(s)) throw new Reject(`Invalid value for ${name}`);
  const v = Number(s.replace(/[dD]/, "e"));
  if (!Number.isFinite(v)) throw new Reject(`Invalid value for ${name}`);
  return { v, s: s.replace(/[dD]/, "e") };
}

// ---------- formatting ----------
// Decimal rounding, half away from zero, done on a decimal string so typed ties round up.
function roundDecimalString(str, d) {
  let s = str.trim();
  let neg = false;
  if (s[0] === "-" || s[0] === "+") { neg = s[0] === "-"; s = s.slice(1); }
  let exp = 0;
  const ei = s.search(/[eE]/);
  if (ei >= 0) { exp = parseInt(s.slice(ei + 1), 10); s = s.slice(0, ei); }
  const dot = s.indexOf(".");
  let digits = s;
  if (dot >= 0) { digits = s.slice(0, dot) + s.slice(dot + 1); exp -= s.length - dot - 1; }
  let M = BigInt(digits === "" ? "0" : digits);
  // value = M * 10^exp ; want integer Q = round(value * 10^d)
  const shift = -d - exp;
  let Q;
  if (shift <= 0) Q = M * 10n ** BigInt(-shift);
  else {
    const p = 10n ** BigInt(shift);
    Q = M / p;
    const r = M % p;
    if (2n * r >= p) Q += 1n;
  }
  let qs = Q.toString();
  if (d > 0) {
    qs = qs.padStart(d + 1, "0");
    qs = qs.slice(0, qs.length - d) + "." + qs.slice(qs.length - d);
  }
  if (neg && Q !== 0n) qs = "-" + qs;
  return qs;
}

function fmt(x, d) {
  if (!Number.isFinite(x)) return "";
  return roundDecimalString(x.toPrecision(10), d);
}
function fmtIn(inp, d) { return roundDecimalString(inp.s, d); }

// ---------- solvers ----------
function bisect(f, lo, hi, iters = 200) {
  let flo = f(lo);
  for (let i = 0; i < iters; i++) {
    const mid = 0.5 * (lo + hi);
    const fm = f(mid);
    if (fm === 0) return mid;
    if ((fm < 0) === (flo < 0)) { lo = mid; flo = fm; } else hi = mid;
    if (hi - lo <= 1e-13 * Math.max(1, Math.abs(hi))) break;
  }
  return 0.5 * (lo + hi);
}

// Find upper bound where increasing f becomes >= 0.
function expandUpper(f, start) {
  let hi = start;
  for (let i = 0; i < 200 && f(hi) < 0; i++) hi *= 2;
  return hi;
}

// ---------- regular sections ----------
function trapGeom(z1, z2, b) {
  const k1 = Math.sqrt(1 + z1 * z1), k2 = Math.sqrt(1 + z2 * z2);
  return (y) => ({
    A: b * y + 0.5 * (z1 + z2) * y * y,
    P: b + y * (k1 + k2),
    T: b + (z1 + z2) * y,
  });
}

function circGeom(D) {
  return (y) => {
    if (y >= D) return { A: Math.PI * D * D / 4, P: Math.PI * D, T: 0 };
    const th = 2 * Math.acos(1 - 2 * y / D);
    return { A: D * D / 8 * (th - Math.sin(th)), P: D * th / 2, T: D * Math.sin(th / 2) };
  };
}

function manningQ(g, n, S) { return g.P > 0 ? KM / n * g.A * Math.pow(g.A / g.P, 2 / 3) * Math.sqrt(S) : 0; }

function flowTypeFromFroude(F) {
  if (Math.abs(F - 1) < 1e-9) return "CRITICAL";
  return F < 1 ? "SUBCRITICAL" : "SUPERCRITICAL";
}

function circleMax(geom, D, n, S) {
  // maximum of Manning discharge over depth (near y/D = 0.938)
  let a = 0.5 * D, b = D;
  const gr = (Math.sqrt(5) - 1) / 2;
  const q = (y) => manningQ(geom(y), n, S);
  let c = b - gr * (b - a), d = a + gr * (b - a);
  for (let i = 0; i < 200; i++) {
    if (q(c) > q(d)) b = d; else a = c;
    c = b - gr * (b - a); d = a + gr * (b - a);
  }
  const y = 0.5 * (a + b);
  return { y, Q: q(y) };
}

function solveRegular(mode, shape, inp) {
  const get = (k) => parseTyped(inp[k], k);
  const out = {};
  let geom, D = null, z1 = 0, z2 = 0, b = 0;
  const n = get("n"), S = get("slope");

  if (shape === "circle") {
    const dia = get("diameter");
    if (dia.v <= 0) throw new Reject("Diameter must be greater than zero");
    D = dia.v / 12;
    geom = circGeom(D);
    out.in_diameter = fmtIn(dia, 1);
  } else {
    let zl = { v: 0, s: "0" }, zr = { v: 0, s: "0" }, bw = { v: 0, s: "0" };
    if (shape === "v_ditch" || shape === "trapezoid") { zl = get("left_slope"); zr = get("right_slope"); }
    if (shape === "rectangle" || shape === "trapezoid") bw = get("bottom_width");
    if (zl.v < 0 || zr.v < 0) throw new Reject("Side slopes cannot be negative");
    if (bw.v < 0) throw new Reject("Bottom width cannot be negative");
    if (shape === "rectangle" && bw.v <= 0) throw new Reject("Bottom width must be greater than zero");
    if (shape === "v_ditch" && zl.v + zr.v <= 0) throw new Reject("Side slopes must be greater than zero");
    if (shape === "trapezoid" && bw.v <= 0 && zl.v + zr.v <= 0) throw new Reject("Invalid channel geometry");
    z1 = zl.v; z2 = zr.v; b = bw.v;
    geom = trapGeom(z1, z2, b);
    out.in_left_slope = fmtIn(zl, 1);
    out.in_right_slope = fmtIn(zr, 1);
    out.in_bottom_width = fmtIn(bw, 1);
  }
  if (n.v <= 0) throw new Reject("Manning's n must be greater than zero");
  if (S.v <= 0) throw new Reject("Slope must be greater than zero");
  out.in_n = fmtIn(n, 4);
  out.in_slope = fmtIn(S, 4);

  let y, Q, cmax = null;
  if (shape === "circle") cmax = circleMax(geom, D, n.v, S.v);

  if (mode === "channel_capacity") {
    const dep = get("depth");
    if (dep.v <= 0) throw new Reject("Depth must be greater than zero");
    if (D !== null && dep.v >= D) throw new Reject("Depth must be less than the pipe diameter");
    out.in_depth = fmtIn(dep, 2);
    y = dep.v;
    Q = manningQ(geom(y), n.v, S.v);
  } else {
    const q = get("discharge");
    if (q.v <= 0) throw new Reject("Discharge must be greater than zero");
    out.in_discharge = fmtIn(q, 0);
    Q = q.v;
    if (mode === "critical_depth") {
      const f = (yy) => { const g = geom(yy); if (g.A <= 0) return -Q * Q / G; return g.T > 0 ? g.A ** 3 / g.T - Q * Q / G : Infinity; };
      if (D !== null) y = bisect(f, 0, D);
      else y = bisect(f, 0, expandUpper(f, 1));
    } else {
      const f = (yy) => manningQ(geom(yy), n.v, S.v) - Q;
      if (D !== null) {
        if (Q > cmax.Q) throw new Reject("Discharge exceeds the maximum capacity of the pipe");
        y = bisect(f, 0, cmax.y);
      } else y = bisect(f, 0, expandUpper(f, 1));
    }
  }

  const g = geom(y);
  const V = Q / g.A;
  const R = g.A / g.P;
  const F = V / Math.sqrt(G * g.A / g.T);

  if (mode === "channel_capacity") out.discharge = fmt(Q, shape === "circle" ? 1 : 0);
  else out.depth = fmt(y, 2);
  if (mode === "critical_depth") {
    const Sc = Math.pow(Q * n.v / (KM * g.A * Math.pow(R, 2 / 3)), 2);
    out.critical_slope = fmt(Sc, 4);
    out.flow_type = Math.abs(S.v - Sc) <= 1e-12 * Sc ? "CRITICAL" : S.v < Sc ? "SUBCRITICAL" : "SUPERCRITICAL";
  } else out.flow_type = flowTypeFromFroude(F);
  out.area = fmt(g.A, 1);
  out.wet_perimeter = fmt(g.P, 1);
  out.velocity = fmt(V, 1);
  out.hyd_radius = fmt(R, 1);
  out.top_width = fmt(g.T, 1);
  out.froude = fmt(F, 1);
  if (cmax) out.max_discharge = fmt(cmax.Q, 0);
  return { printed: out, message: null };
}

// ---------- irregular section ----------
function solveIrregular(inp) {
  const pts = [];
  for (let i = 1; i <= 40; i++) {
    const k = String(i).padStart(2, "0");
    const sRaw = inp["sta_" + k], eRaw = inp["elev_" + k];
    const blank = (r) => r === undefined || r === null || String(r).trim() === "";
    if (blank(sRaw) && blank(eRaw)) break;
    const x = parseTyped(sRaw, "sta_" + k), z = parseTyped(eRaw, "elev_" + k);
    pts.push({ x: x.v, z: z.v });
  }
  if (pts.length < 2) throw new Reject("At least two ground points are required");
  for (let i = 1; i < pts.length; i++)
    if (pts[i].x < pts[i - 1].x) throw new Reject("Stations must increase across the section");
  if (pts[pts.length - 1].x <= pts[0].x) throw new Reject("Invalid cross section");

  const bl = parseTyped(inp.bank_left, "bank_left"), br = parseTyped(inp.bank_right, "bank_right");
  const nl = parseTyped(inp.n_left, "n_left"), nc = parseTyped(inp.n_channel, "n_channel"), nr = parseTyped(inp.n_right, "n_right");
  const q = parseTyped(inp.discharge, "discharge"), S = parseTyped(inp.slope, "slope");
  if (nl.v <= 0 || nc.v <= 0 || nr.v <= 0) throw new Reject("Manning's n must be greater than zero");
  if (q.v <= 0) throw new Reject("Discharge must be greater than zero");
  if (S.v <= 0) throw new Reject("Slope must be greater than zero");
  const x0 = pts[0].x, xN = pts[pts.length - 1].x;
  if (bl.v > br.v) throw new Reject("Left bank station must not exceed right bank station");
  if (bl.v < x0 || br.v > xN) throw new Reject("Bank stations must lie within the cross section");

  // Insert bank stations as ground points (interpolated) so segments split cleanly.
  const P = pts.map((p) => ({ ...p }));
  const insertAt = (xs) => {
    for (let i = 0; i < P.length; i++) if (P[i].x === xs) return;
    for (let i = 0; i < P.length - 1; i++) {
      if (P[i].x < xs && xs < P[i + 1].x) {
        const t = (xs - P[i].x) / (P[i + 1].x - P[i].x);
        P.splice(i + 1, 0, { x: xs, z: P[i].z + t * (P[i + 1].z - P[i].z) });
        return;
      }
    }
  };
  insertAt(bl.v); insertAt(br.v);

  const segs = [];
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1];
    const xm = 0.5 * (a.x + b.x);
    // a vertical segment at a bank station belongs to the channel
    const sub = xm < bl.v ? 0 : xm > br.v ? 2 : 1;
    segs.push({ a, b, sub });
  }
  const ns = [nl.v, nc.v, nr.v];
  const zmin = Math.min(...P.map((p) => p.z));
  const firstSub = segs[0].sub, lastSub = segs[segs.length - 1].sub;

  const props = (ws) => {
    const A = [0, 0, 0], W = [0, 0, 0], T = [0, 0, 0];
    for (const { a, b, sub } of segs) {
      const d1 = ws - a.z, d2 = ws - b.z, dx = b.x - a.x;
      if (d1 <= 0 && d2 <= 0) continue;
      if (d1 >= 0 && d2 >= 0) {
        A[sub] += 0.5 * (d1 + d2) * dx;
        W[sub] += Math.hypot(dx, b.z - a.z);
        T[sub] += dx;
      } else {
        const dp = Math.max(d1, d2), dn = Math.min(d1, d2);
        const f = dp / (dp - dn);
        A[sub] += 0.5 * dp * f * dx;
        W[sub] += Math.hypot(f * dx, dp);
        T[sub] += f * dx;
      }
    }
    // vertical walls where the water surface rises above the section ends
    let walls = false;
    if (ws > P[0].z) { W[firstSub] += ws - P[0].z; walls = true; }
    if (ws > P[P.length - 1].z) { W[lastSub] += ws - P[P.length - 1].z; walls = true; }
    const K = [0, 1, 2].map((i) => (A[i] > 0 && W[i] > 0 ? KM / ns[i] * A[i] * Math.pow(A[i] / W[i], 2 / 3) : 0));
    return { A, W, T, K, walls };
  };
  const Qof = (ws) => { const p = props(ws); return (p.K[0] + p.K[1] + p.K[2]) * Math.sqrt(S.v); };
  const f = (ws) => Qof(ws) - q.v;
  let span = Math.max(1, Math.max(...P.map((p) => p.z)) - zmin);
  let hi = zmin + span;
  for (let i = 0; i < 200 && f(hi) < 0; i++) { span *= 2; hi = zmin + span; }
  const ws = bisect(f, zmin, hi);
  const p = props(ws);
  const At = p.A[0] + p.A[1] + p.A[2];
  const Wt = p.W[0] + p.W[1] + p.W[2];
  const Tt = p.T[0] + p.T[1] + p.T[2];
  const Kt = p.K[0] + p.K[1] + p.K[2];
  const Qch = Kt > 0 ? q.v * p.K[1] / Kt : 0;
  const Vch = p.A[1] > 0 ? Qch / p.A[1] : 0;
  const V = q.v / At;
  const F = V / Math.sqrt(G * At / Tt);

  const out = {
    in_bank_left: fmtIn(bl, 1),
    in_bank_right: fmtIn(br, 1),
    in_n_left: fmtIn(nl, 4),
    in_n_channel: fmtIn(nc, 4),
    in_n_right: fmtIn(nr, 4),
    in_irr_discharge: fmtIn(q, 0),
    in_irr_slope: fmtIn(S, 4),
    depth: fmt(ws - zmin, 1),
    ws_elev: fmt(ws, 2),
    area: fmt(At, 0),
    top_width: fmt(Tt, 0),
    wet_perimeter: fmt(Wt, 0),
    hyd_radius: fmt(At / Wt, 1),
    chan_velocity: fmt(Vch, 1),
    froude: fmt(F, 2),
    flow_type: flowTypeFromFroude(F),
  };
  return { printed: out, message: p.walls ? "Water surface exceeds the end of the cross section; vertical walls assumed" : null };
}

// ---------- dispatcher ----------
const SHAPES = ["v_ditch", "rectangle", "trapezoid", "circle"];
const MODES = ["critical_depth", "channel_capacity", "normal_depth"];

function handle(line) {
  let req;
  try { req = JSON.parse(line); } catch { return { id: null, outcome: "error", printed: {}, message: "Malformed request" }; }
  const id = req && req.id !== undefined ? req.id : null;
  try {
    const { mode, shape } = req;
    const inputs = req.inputs || {};
    let r;
    if (mode === "normal_depth" && shape === "irregular") r = solveIrregular(inputs);
    else if (MODES.includes(mode) && SHAPES.includes(shape)) r = solveRegular(mode, shape, inputs);
    else return { id, outcome: "error", printed: {}, message: "Unsupported mode or shape" };
    for (const v of Object.values(r.printed))
      if (v === "" || v === "NaN") return { id, outcome: "error", printed: {}, message: "Computation failed" };
    return { id, outcome: "result", printed: r.printed, message: r.message };
  } catch (e) {
    if (e instanceof Reject) return { id, outcome: "rejected", printed: {}, message: e.message };
    return { id, outcome: "error", printed: {}, message: String(e && e.message || e) };
  }
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", (line) => {
  if (line.trim() === "") return;
  process.stdout.write(JSON.stringify(handle(line)) + "\n");
});
