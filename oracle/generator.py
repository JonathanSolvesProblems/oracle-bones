"""Seeded case generator. The same seed and GENERATOR_VERSION always give the same cases.

Values come from the profile's ranges, formatted as typed strings, mixed with each field's
listed boundary values. Case ids are assigned here, before any case runs, so parallel order
cannot change which inputs get which id.
"""

import random
import re

from . import cases as cases_mod
from .errors import OracleError

GENERATOR_VERSION = "1"
BOUNDARY_SHARE = 0.15  # roughly one input in seven is a boundary value


def _fmt(value, decimals):
    if decimals == 0:
        return str(int(round(value)))
    text = ("%.*f" % (decimals, value)).rstrip("0").rstrip(".")
    if text.startswith("0."):
        text = text[1:]  # typed the way the manual's examples are: .035, not 0.035
    return text or "0"


def _draw(rnd, rng):
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


def generate(profile, seed, count, modes=None, shapes=None, existing_ids=()):
    """Return `count` cases: [{id, mode, shape, inputs, seed, generator_version}]."""
    if count < 0:
        raise OracleError("invalid_arguments", "count must be zero or more")
    rnd = random.Random("%s/%s" % (GENERATOR_VERSION, seed))
    choices = pairs(profile, modes, shapes)
    nxt = next_sequences(profile, existing_ids)
    out = []
    for _ in range(count):
        mode, shape = choices[rnd.randrange(len(choices))]
        inputs = {}
        for name in cases_mod.flow_inputs(profile, mode, shape):
            rng = profile["ranges"].get(name)
            if rng is None:
                raise OracleError("profile_invalid", "no range for input %r" % name)
            inputs[name] = _draw(rnd, rng)
        prefix = case_prefix(profile, mode, shape)
        seq = nxt.get(prefix, 1)
        nxt[prefix] = seq + 1
        out.append({"id": "%s-%06d" % (prefix, seq), "mode": mode, "shape": shape, "inputs": inputs,
                    "seed": seed, "generator_version": GENERATOR_VERSION})
    return out
