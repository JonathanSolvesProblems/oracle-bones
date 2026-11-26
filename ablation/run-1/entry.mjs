// QUICK-2 v1.0 work-alike: critical depth, channel capacity and normal depth.
// Reads one JSON request per line on stdin, writes one JSON response per line on stdout.
import { createInterface } from "node:readline";

const G = 32.2;      // gravitational acceleration, ft/s^2
const KM = 1.486;    // Manning's constant, US customary units

class Reject extends Error {}

// ---------- input parsing ----------
const NUM_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eEdD][+-]?\d+)?$/;

function num(inputs, key, { allowBlank = false } = {}) {
  const raw = inputs[key];
  if (raw === undefined || raw === null) {
    if (allowBlank) return 0;
    throw new Reject(`Missing value for ${key}`);
  }
  const s = String(raw).trim();
  if (s === "") {
    if (allowBlank) return 0;
    throw new Reject(`Missing value for ${key}`);
  }
  if (!NUM_RE.test(s)) throw new Reject(`Invalid number for ${key}`);
  const v = Number(s.replace(/[dD]/, "e"));
  if (!Number.isFinite(v)) throw new Reject(`Invalid number for ${key}`);
  return v;
}

function positive(v, label) {
  if (!(v > 0)) throw new Reject(`${label} must be greater than zero`);
  return v;
}
function nonNegative(v, label) {
  if (!(v >= 0)) throw new Reject(`${label} cannot be negative`);
  return v;
}

// ---------- formatting ----------
function fmt(x, d) {
  if (!Number.isFinite(x)) return "";
  let s = x.toFixed(d);
  if (/^-0(\.0*)?$/.test(s)) s = s.slice(1);
  return s;
}

// ---------- regular sections ----------
function trapGeom(b, z1, z2) {
  const s1 = Math.sqrt(1 + z1 * z1), s2 = Math.sqrt(1 + z2 * z2);
  return (y) => ({
    A: (b + 0.5 * (z1 + z2) * y) * y,
    P: b + y * (s1 + s2),
    T: b + (z1 + z2) * y,
  });
}

function circGeom(D) {
  return (y) => {
    if (y <= 0) return { A: 0, P: 0, T: 0 };
    if (y >= D) return { A: Math.PI * D * D / 4, P: Math.PI * D, T: 0 };
    const th = 2 * Math.acos(1 - 2 * y / D);
    return {
      A: D * D / 8 * (th - Math.sin(th)),
      P: D * th / 2,
      T: D * Math.sin(th / 2),
    };
  };
}

function manningQ(g, n, S) {
  if (g.A <= 0 || g.P <= 0) return 0;
  const R = g.A / g.P;
  return KM / n * g.A * Math.pow(R, 2 / 3) * Math.sqrt(S);
}

// QUICK-2 "converging technique": halve the interval until the computed
// discharge is within 1 percent of the target, then stop at that trial value.
const TOL = 0.01;
const OPEN_HI = 100; // initial upper depth bound (ft) for open sections
function bisect(f, target, lo, hi) {
  let mid = 0.5 * (lo + hi);
  for (let i = 0; i < 500; i++) {
    mid = 0.5 * (lo + hi);
    const q = f(mid);
    if (Math.abs(q - target) <= TOL * target) return mid;
    if (q < target) lo = mid; else hi = mid;
    if (hi - lo <= 0) break;
  }
  return mid;
}

function upperBound(f, target, start) {
  let hi = start;
  for (let i = 0; i < 2000 && f(hi) < target; i++) hi *= 2;
  if (!(f(hi) >= target)) throw new Error("no solution bracket");
  return hi;
}

function circleMax(geom, D, n, S) {
  // maximum of Manning discharge occurs near y/D = 0.938; golden-section search
  const f = (y) => manningQ(geom(y), n, S);
  let a = 0.5 * D, b = D;
  const r = (Math.sqrt(5) - 1) / 2;
  let c = b - r * (b - a), d = a + r * (b - a);
  let fc = f(c), fd = f(d);
  for (let i = 0; i < 200; i++) {
    if (fc > fd) { b = d; d = c; fd = fc; c = b - r * (b - a); fc = f(c); }
    else { a = c; c = d; fc = fd; d = a + r * (b - a); fd = f(d); }
  }
  const y = 0.5 * (a + b);
  return { y, Q: f(y) };
}

// Supercritical when the velocity head is at least half the hydraulic depth.
function flowType(V, A, T) {
  if (!(T > 0)) return "SUBCRITICAL";
  return V * V / (2 * G) >= 0.5 * (A / T) ? "SUPERCRITICAL" : "SUBCRITICAL";
}

function regular(mode, shape, inp) {
  let geom, isCircle = shape === "circle", D = 0, b = 0, z1 = 0, z2 = 0, Din = 0;
  const out = {};
  if (isCircle) {
    Din = positive(num(inp, "diameter"), "Diameter");
    D = Din / 12;
    geom = circGeom(D);
    out.in_diameter = fmt(Din, 1);
  } else {
    if (shape === "v_ditch" || shape === "trapezoid") {
      z1 = nonNegative(num(inp, "left_slope"), "Left side slope");
      z2 = nonNegative(num(inp, "right_slope"), "Right side slope");
    }
    if (shape === "rectangle") b = positive(num(inp, "bottom_width"), "Bottom width");
    if (shape === "trapezoid") b = nonNegative(num(inp, "bottom_width"), "Bottom width");
    if (shape === "v_ditch" && !(z1 + z2 > 0)) throw new Reject("Side slopes cannot both be zero");
    if (shape === "trapezoid" && !(b > 0 || z1 + z2 > 0)) throw new Reject("Bottom width and side slopes cannot all be zero");
    geom = trapGeom(b, z1, z2);
    out.in_left_slope = fmt(z1, 1);
    out.in_right_slope = fmt(z2, 1);
    out.in_bottom_width = fmt(b, 1);
  }
  const n = positive(num(inp, "n"), "Manning's n");
  let Q = 0, y = 0;
  if (mode === "channel_capacity") {
    y = positive(num(inp, "depth"), "Depth");
    if (isCircle && y > D) throw new Reject("Depth exceeds pipe diameter");
  } else {
    Q = positive(num(inp, "discharge"), "Discharge");
  }
  const S = positive(num(inp, "slope"), "Slope");

  out.in_n = fmt(n, 4);
  out.in_slope = fmt(S, 4);
  if (mode === "channel_capacity") out.in_depth = fmt(y, 2);
  else out.in_discharge = fmt(Q, 0);

  let maxQ = null;
  if (isCircle) maxQ = circleMax(geom, D, n, S);

  let critSlope = null, V;
  if (mode === "critical_depth") {
    // critical discharge for a depth: Qc = A * sqrt(g A / T), increasing with depth
    const qc = (yy) => { const g = geom(yy); return g.T > 0 ? g.A * Math.sqrt(G * g.A / g.T) : Infinity; };
    const hi = isCircle ? D : upperBound(qc, Q, OPEN_HI);
    y = bisect(qc, Q, 0, hi);
    const g = geom(y);
    critSlope = Math.pow(Q * n / (KM * g.A * Math.pow(g.A / g.P, 2 / 3)), 2);
    V = Q / g.A;
  } else {
    if (mode === "normal_depth") {
      const f = (yy) => manningQ(geom(yy), n, S);
      if (isCircle && Q > maxQ.Q) throw new Reject("Discharge exceeds maximum capacity of pipe");
      const hi = isCircle ? D : upperBound(f, Q, OPEN_HI);
      y = bisect(f, Q, 0, hi);
    }
    const qy = manningQ(geom(y), n, S);
    if (mode === "channel_capacity") Q = qy;
    V = qy / geom(y).A;
  }

  const g = geom(y);
  const R = g.A / g.P;
  const fr = g.T > 0 ? V / Math.sqrt(G * g.A / g.T) : 0;
  const ftype = mode === "critical_depth" ? "CRITICAL" : flowType(V, g.A, g.T);

  if (mode === "channel_capacity") out.discharge = fmt(Q, isCircle ? 1 : 0);
  else out.depth = fmt(y, 2);
  if (mode === "critical_depth") out.critical_slope = fmt(critSlope, 4);
  out.area = fmt(g.A, 1);
  out.wet_perimeter = fmt(g.P, 1);
  out.velocity = fmt(V, 1);
  out.hyd_radius = fmt(R, 1);
  out.top_width = fmt(g.T, 1);
  out.froude = fmt(fr, 1);
  if (isCircle) out.max_discharge = fmt(maxQ.Q, 0);
  out.flow_type = ftype;
  return out;
}

// ---------- irregular section ----------
function irregular(inp) {
  const pts = [];
  for (let i = 1; i <= 40; i++) {
    const k = String(i).padStart(2, "0");
    const hasS = inp[`sta_${k}`] !== undefined && String(inp[`sta_${k}`]).trim() !== "";
    const hasE = inp[`elev_${k}`] !== undefined && String(inp[`elev_${k}`]).trim() !== "";
    if (!hasS && !hasE) continue;
    pts.push([num(inp, `sta_${k}`), num(inp, `elev_${k}`)]);
  }
  if (pts.length < 2) throw new Reject("At least two ground points are required");
  for (let i = 1; i < pts.length; i++)
    if (pts[i][0] < pts[i - 1][0]) throw new Reject("Stations must increase from left to right");
  if (!(pts[pts.length - 1][0] > pts[0][0])) throw new Reject("Cross section has no width");

  const bl = num(inp, "bank_left");
  const br = num(inp, "bank_right");
  const x0 = pts[0][0], xN = pts[pts.length - 1][0];
  if (bl < x0 || br > xN || bl > xN || br < x0) throw new Reject("Bank stations must lie within the cross section");
  if (!(br > bl)) throw new Reject("Right bank station must be greater than left bank station");
  const nl = positive(num(inp, "n_left"), "Left overbank n");
  const nc = positive(num(inp, "n_channel"), "Channel n");
  const nr = positive(num(inp, "n_right"), "Right overbank n");
  const Q = positive(num(inp, "discharge"), "Discharge");
  const S = positive(num(inp, "slope"), "Slope");

  // insert bank stations as points
  const interp = (x) => {
    for (let i = 1; i < pts.length; i++) {
      const [xa, za] = pts[i - 1], [xb, zb] = pts[i];
      if (x >= xa && x <= xb) {
        if (xb === xa) return za;
        return za + (zb - za) * (x - xa) / (xb - xa);
      }
    }
    return pts[pts.length - 1][1];
  };
  const P = pts.map((p) => p.slice());
  for (const xb of [bl, br]) {
    if (!P.some((p) => p[0] === xb)) {
      const z = interp(xb);
      let idx = P.findIndex((p) => p[0] > xb);
      P.splice(idx, 0, [xb, z]);
    }
  }

  const zmin = Math.min(...P.map((p) => p[1]));

  function hydraulics(W) {
    let Kl = 0, Kr = 0, Ac = 0, Pc = 0, A = 0, Pt = 0, T = 0;
    const leftHasOB = P[0][0] < bl, rightHasOB = P[P.length - 1][0] > br;
    // vertical extensions at section ends
    const wl = Math.max(0, W - P[0][1]), wr = Math.max(0, W - P[P.length - 1][1]);
    Pt += wl + wr;
    if (!leftHasOB) Pc += wl;
    if (!rightHasOB) Pc += wr;
    for (let i = 1; i < P.length; i++) {
      const [xa, za] = P[i - 1], [xb, zb] = P[i];
      const dx = xb - xa;
      const da = W - za, db = W - zb;
      let a = 0, p = 0, t = 0;
      if (da <= 0 && db <= 0) continue;
      if (da >= 0 && db >= 0) {
        a = 0.5 * (da + db) * dx; p = Math.hypot(dx, zb - za); t = dx;
      } else {
        const dp = Math.max(da, db), dn = Math.min(da, db);
        const xw = dx * dp / (dp - dn);
        a = 0.5 * dp * xw; p = Math.hypot(xw, dp); t = xw;
      }
      A += a; Pt += p; T += t;
      const mid = 0.5 * (xa + xb);
      if (mid < bl) { if (p > 0 && a > 0) Kl += KM / nl * a * Math.pow(a / p, 2 / 3); }
      else if (mid > br) { if (p > 0 && a > 0) Kr += KM / nr * a * Math.pow(a / p, 2 / 3); }
      else { Ac += a; Pc += p; }
    }
    const Kc = Ac > 0 && Pc > 0 ? KM / nc * Ac * Math.pow(Ac / Pc, 2 / 3) : 0;
    return { A, P: Pt, T, Kl, Kc, Kr, Ac, K: Kl + Kc + Kr };
  }

  const qOf = (W) => hydraulics(W).K * Math.sqrt(S);
  let span = Math.max(1, Math.max(...P.map((p) => p[1])) - zmin);
  while (qOf(zmin + span) < Q) { span *= 2; if (span > 1e9) throw new Error("no solution"); }
  const W = bisect(qOf, Q, zmin, zmin + span);
  const h = hydraulics(W);
  const rs = Math.sqrt(S);
  const Vc = h.Ac > 0 ? h.Kc * rs / h.Ac : 0;
  const V = h.K * rs / h.A;
  const fr = h.T > 0 ? V / Math.sqrt(G * h.A / h.T) : 0;

  return {
    in_bank_left: fmt(bl, 1),
    in_bank_right: fmt(br, 1),
    in_n_left: fmt(nl, 4),
    in_n_channel: fmt(nc, 4),
    in_n_right: fmt(nr, 4),
    in_irr_discharge: fmt(Q, 0),
    in_irr_slope: fmt(S, 4),
    depth: fmt(W - zmin, 1),
    ws_elev: fmt(W, 2),
    area: fmt(h.A, 0),
    top_width: fmt(h.T, 0),
    wet_perimeter: fmt(h.P, 0),
    hyd_radius: fmt(h.A / h.P, 1),
    chan_velocity: fmt(Vc, 1),
    froude: fmt(fr, 2),
    flow_type: flowType(V, h.A, h.T),
  };
}

// ---------- dispatch ----------
const MODES = new Set(["critical_depth", "channel_capacity", "normal_depth"]);
const SHAPES = new Set(["v_ditch", "rectangle", "trapezoid", "circle"]);

function handle(req) {
  const { mode, shape } = req;
  const inputs = req.inputs && typeof req.inputs === "object" ? req.inputs : {};
  if (!MODES.has(mode)) throw new Error(`unknown mode ${mode}`);
  if (shape === "irregular") {
    if (mode !== "normal_depth") throw new Error("irregular section supports normal depth only");
    return irregular(inputs);
  }
  if (!SHAPES.has(shape)) throw new Error(`unknown shape ${shape}`);
  return regular(mode, shape, inputs);
}

function respond(line) {
  let req;
  try { req = JSON.parse(line); } catch {
    return { id: null, outcome: "error", printed: {}, message: "Invalid request" };
  }
  const id = req && req.id !== undefined ? req.id : null;
  try {
    const printed = handle(req);
    return { id, outcome: "result", printed, message: null };
  } catch (e) {
    if (e instanceof Reject) return { id, outcome: "rejected", printed: {}, message: e.message };
    return { id, outcome: "error", printed: {}, message: String(e && e.message || e) };
  }
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", (line) => {
  if (line.trim() === "") return;
  process.stdout.write(JSON.stringify(respond(line)) + "\n");
});
