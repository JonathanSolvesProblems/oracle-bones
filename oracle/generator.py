"""Seeded case generator. The same seed, range set and GENERATOR_VERSION always give the same
cases.

Two range sets. `accepted` draws from what each prompt accepts and prints, mixed with each
field's listed boundary values. `practical` draws from a range's `practical` bounds, which cite
a published source (a judgement, not an observation), with no boundary values; a field with no
practical bounds keeps its accepted range. Values are formatted as typed strings. Case ids are assigned here, before any case runs, so parallel order
cannot change which inputs get which id.
"""

import math
import random
import re

from . import cases as cases_mod
from .errors import OracleError

GENERATOR_VERSION = "2"  # 2: practical circles fit their pipe; practical irregular sections
BOUNDARY_SHARE = 0.15  # roughly one input in seven is a boundary value (accepted set only)
RANGE_SETS = ("accepted", "practical")
FIT_TRIES = 50


def _fmt(value, decimals):
    if decimals == 0:
        return str(int(round(value)))
    text = ("%.*f" % (decimals, value)).rstrip("0").rstrip(".")
    if text.startswith("0."):
        text = text[1:]  # typed the way the manual's examples are: .035, not 0.035
    return text or "0"


def practical_bounds(rng, shape):
    """(min, max) of the practical range for this shape, or None when the range has none."""
    prac = rng.get("practical")
    if not prac:
        return None
    p = prac.get("shapes", {}).get(shape, prac)
    return p["min"], p["max"]


def _draw(rnd, rng, range_set="accepted", shape=None):
    if range_set == "practical":
        bounds = practical_bounds(rng, shape)
        if bounds:
            return _fmt(rnd.uniform(*bounds), rng["decimals"])
        return _fmt(rnd.uniform(rng["min"], rng["max"]), rng["decimals"])
    if rng.get("boundaries") and rnd.random() < BOUNDARY_SHARE:
        return rnd.choice(rng["boundaries"])
    return _fmt(rnd.uniform(rng["min"], rng["max"]), rng["decimals"])


def pairs(profile, modes=None, shapes=None):
    out = []
    for name in sorted(profile["flows"]):
        mode, _, shape = name.partition("/")
        if (not modes or mode in modes) and (not shapes or shape in shapes):
            out.append((mode, shape))
    if not out:
        raise OracleError("invalid_arguments", "no flow matches modes=%s shapes=%s" % (modes, shapes),
                          {"flows": sorted(profile["flows"])})
    return out


def missing_ranges(profile, mode, shape):
    """The pair's form inputs that have no range in the profile."""
    return [n for n in cases_mod.flow_inputs(profile, mode, shape) if n not in profile["ranges"]]


def section_flow(profile, mode, shape):
    """The pair's flow when the practical set draws it from recorded sections, else None."""
    flow = profile["flows"].get("%s/%s" % (mode, shape))
    return flow if flow and flow.get("sections") else None


def split_pairs(profile, modes=None, shapes=None, range_set="accepted"):
    """(pairs the generator can draw from, [{mode, shape, missing_ranges}] it cannot). A pair is
    drawn only when every one of its inputs has a range; ranges come from evidence. The
    practical set also draws pairs whose flow lists recorded `sections` to vary."""
    ready, uncovered = [], []
    for mode, shape in pairs(profile, modes, shapes):
        missing = missing_ranges(profile, mode, shape)
        if missing and not (range_set == "practical" and section_flow(profile, mode, shape)):
            uncovered.append({"mode": mode, "shape": shape, "missing_ranges": missing})
        else:
            ready.append((mode, shape))
    return ready, uncovered

def case_prefix(profile, mode, shape):
    return "%s-%s" % (profile["codes"]["modes"][mode], profile["codes"]["shapes"][shape])


def next_sequences(profile, existing_ids):
    """The next free sequence number for each id prefix, given the ids that already exist."""
    nxt = {}
    for cid in existing_ids:
        m = re.match(r"^(.*)-(\d{6})$", cid)
        if m:
            nxt[m.group(1)] = max(nxt.get(m.group(1), 1), int(m.group(2)) + 1)
    return nxt


def _full_pipe_cfs(diameter_in, n, slope):
    """Manning's discharge for a circular pipe flowing full, D typed in inches."""
    d = diameter_in / 12.0
    return 1.486 / n * (math.pi * d * d / 4) * (d / 4) ** (2.0 / 3) * math.sqrt(slope)


def _critical_cfs(diameter_in, depth_share):
    """Discharge that is critical at depth_share x D in a circular pipe, D typed in inches."""
    d = diameter_in / 12.0
    theta = 2 * math.acos(1 - 2 * depth_share)
    area = d * d / 8 * (theta - math.sin(theta))
    top = d * math.sin(theta / 2)
    return area * math.sqrt(32.2 * area / top)


def _fit_pipe(rnd, profile, flow, inputs):
    """Redraw depth or discharge so the case fits its pipe (flow `fit`). False when it cannot."""
    fit = flow.get("fit") or {}
    d = float(inputs["diameter"])
    if "depth_in_pipe" in fit and "depth" in inputs:
        rng = profile["ranges"]["depth"]
        top = fit["depth_in_pipe"]["max_share"] * d / 12.0
        if top < 2 * rng["min"]:
            return False
        inputs["depth"] = _fmt(rnd.uniform(rng["min"], top), rng["decimals"])
    if "discharge_in_pipe" in fit and "discharge" in inputs:
        rng = profile["ranges"]["discharge"]
        top = fit["discharge_in_pipe"]["max_share"] * _full_pipe_cfs(d, float(inputs["n"]), float(inputs["slope"]))
        if top < 2 * rng["min"]:
            return False
        inputs["discharge"] = _fmt(rnd.uniform(rng["min"], min(top, rng["max"])), rng["decimals"])
    if "critical_depth_in_pipe" in fit and "discharge" in inputs:
        rng = profile["ranges"]["discharge"]
        top = _critical_cfs(d, fit["critical_depth_in_pipe"]["max_share"])
        if top < 2 * rng["min"]:
            return False
        inputs["discharge"] = _fmt(rnd.uniform(rng["min"], min(top, rng["max"])), rng["decimals"])
    return True


def _draw_fields(rnd, profile, mode, shape, range_set):
    flow = profile["flows"]["%s/%s" % (mode, shape)]
    for _ in range(FIT_TRIES):
        inputs = {}
        for name in cases_mod.flow_inputs(profile, mode, shape):
            inputs[name] = _draw(rnd, profile["ranges"][name], range_set, shape)
        if range_set != "practical" or not flow.get("fit") or _fit_pipe(rnd, profile, flow, inputs):
            return inputs
    raise OracleError("invalid_arguments", "could not draw a %s/%s case that fits its pipe" % (mode, shape))


def _draw_section(rnd, profile, mode, shape):
    """A section varied from one the program has computed (flow `sections`): a subset of its
    points that keeps the lowest one, stations stretched and shifted, relief scaled and the
    datum moved, banks on two of the chosen ground stations typed exactly as the stations are,
    and n, discharge and slope near the recorded ones. What it keeps is solver Requirement 10:
    2 to 40 points, strictly increasing stations, elevations above 0, banks matching a ground
    station as typed."""
    flow = section_flow(profile, mode, shape)
    pts = flow.get("points") or {}
    seed = flow["sections"][rnd.randrange(len(flow["sections"]))]
    sta = [float(s) for s in seed["stations"]]
    elev = [float(e) for e in seed["elevations"]]
    n_all = len(sta)
    low = min(range(n_all), key=lambda i: elev[i])
    count = rnd.randint(pts.get("min", n_all), min(pts.get("max", n_all), n_all))
    picked = sorted(rnd.sample([i for i in range(n_all) if i != low], count - 1) + [low])
    stretch, shift = rnd.uniform(0.5, 2.0), rnd.uniform(-100.0, 100.0)
    relief, base = rnd.uniform(0.5, 1.5), rnd.uniform(1.0, elev[low] + 200.0)
    stations = [_fmt(shift + (sta[i] - sta[picked[0]]) * stretch, 2) for i in picked]
    elevations = [_fmt(max(base + (elev[i] - elev[low]) * relief, 1.0), 2) for i in picked]
    at = picked.index(low)
    left = rnd.randint(0, min(at, count - 2))
    right = rnd.randint(max(at, left + 1), count - 1)
    n = practical_bounds(profile["ranges"]["n"], shape) or (0.011, 0.5)
    inputs = {}
    for k in range(count):
        inputs["sta_%02d" % (k + 1)] = stations[k]
        inputs["elev_%02d" % (k + 1)] = elevations[k]
    inputs.update(bank_left=stations[left], bank_right=stations[right],
                  n_left=_fmt(rnd.uniform(*n), 3), n_channel=_fmt(rnd.uniform(*n), 3),
                  n_right=_fmt(rnd.uniform(*n), 3),
                  discharge=_fmt(max(1.0, float(rnd.choice(seed["discharges"])) * rnd.uniform(0.25, 2.5)), 0),
                  slope=_fmt(max(0.0001, float(rnd.choice(seed["slopes"])) * rnd.uniform(0.5, 2.0)), 4))
    wanted = [k for k in cases_mod.flow_inputs(profile, mode, shape)
              if cases_mod.point_number(flow, k) is None or k in inputs]
    if sorted(wanted) != sorted(inputs):
        raise OracleError("invalid_arguments", "%s/%s has inputs a section does not give" % (mode, shape),
                          {"expected": wanted, "drawn": sorted(inputs)})
    return {k: inputs[k] for k in wanted}


def generate(profile, seed, count, modes=None, shapes=None, existing_ids=(), range_set="accepted"):
    """Return `count` cases: [{id, mode, shape, inputs, seed, generator_version, range_set}], drawn
    only from pairs whose inputs all have ranges, or, in the practical set, whose flow lists
    sections to vary (see split_pairs for the others). The accepted set draws exactly what
    generator version 1 drew; version 2 changed only the practical set."""
    if count < 0:
        raise OracleError("invalid_arguments", "count must be zero or more")
    if range_set not in RANGE_SETS:
        raise OracleError("invalid_arguments", "ranges must be one of %s" % ", ".join(RANGE_SETS))
    rnd = random.Random("1/%s" % seed if range_set == "accepted" else "%s/%s/%s" % (GENERATOR_VERSION, seed, range_set))
    choices, uncovered = split_pairs(profile, modes, shapes, range_set)
    if not choices and count:
        raise OracleError("invalid_arguments", "no chosen mode and shape has a range for every input",
                          {"uncovered": uncovered})
    nxt = next_sequences(profile, existing_ids)
    out = []
    for _ in range(count):
        mode, shape = choices[rnd.randrange(len(choices))]
        if missing_ranges(profile, mode, shape):
            inputs = _draw_section(rnd, profile, mode, shape)
        else:
            inputs = _draw_fields(rnd, profile, mode, shape, range_set)
        prefix = case_prefix(profile, mode, shape)
        seq = nxt.get(prefix, 1)
        nxt[prefix] = seq + 1
        out.append({"id": "%s-%06d" % (prefix, seq), "mode": mode, "shape": shape, "inputs": inputs,
                    "seed": seed, "generator_version": GENERATOR_VERSION, "range_set": range_set})
    return out