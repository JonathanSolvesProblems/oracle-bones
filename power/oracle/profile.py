"""Target profile loader.

The profile holds every fact about one dead program. Program facts must say where they came
from: a `cite` list of case ids or capture paths, or an `unobserved` note naming the source.
"""

import hashlib
import json
import re

from . import paths
from .errors import OracleError
from .jsonschema_lite import validate

SCHEMA_PATH = paths.TARGETS / "profile.schema.json"


def _schema():
    return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


def fact_paths(profile):
    """Yield (path, object) for every program fact that needs provenance."""
    for key in ("drive", "entry", "screen", "keys"):
        yield key, profile[key]
    for screen in profile["screens"]:
        yield "screens[%s]" % screen["id"], screen
    for name, flow in profile["flows"].items():
        yield "flows[%s]" % name, flow
    for name, rng in profile["ranges"].items():
        yield "ranges[%s]" % name, rng


def provenance_errors(profile):
    errors = []
    for where, obj in fact_paths(profile):
        has_cite, has_unobs = "cite" in obj, "unobserved" in obj
        if has_cite == has_unobs:
            errors.append("%s: needs exactly one of 'cite' or 'unobserved'" % where)
    return errors


def unobserved(profile):
    """Every program fact still marked unobserved, for the ledger."""
    return [{"profile_path": where, "source": obj["unobserved"]}
            for where, obj in fact_paths(profile) if "unobserved" in obj]


def consistency_errors(profile):
    errors = []
    screen_ids = [s["id"] for s in profile["screens"]]
    if len(set(screen_ids)) != len(screen_ids):
        errors.append("screens: duplicate ids")
    known = set(screen_ids)
    for s in profile["screens"]:
        if s["marker"] is not None:
            try:
                re.compile(s["marker"], re.M)
            except re.error as e:
                errors.append("screens[%s].marker: %s" % (s["id"], e))
        for p in s.get("prompts", []):
            try:
                re.compile(p["pattern"], re.M)
            except re.error as e:
                errors.append("screens[%s].prompts[%s]: %s" % (s["id"], p["id"], e))
        for f in s.get("fields", []):
            if f["row"] >= profile["screen"]["rows"] or f["col"] + f["width"] > profile["screen"]["cols"]:
                errors.append("screens[%s].fields[%s]: outside the screen" % (s["id"], f["name"]))
    if profile["screen"]["pty_rows"] < profile["screen"]["rows"]:
        errors.append("screen.pty_rows: smaller than rows")

    def check_steps(where, steps):
        for i, st in enumerate(steps):
            for ref in [st.get("expect")] + list(st.get("end", [])):
                if ref is not None and ref not in known:
                    errors.append("%s.steps[%d]: unknown screen %r" % (where, i, ref))
            if st.get("prompt"):
                scr = next((s for s in profile["screens"] if s["id"] == st.get("expect")), None)
                if scr is None or st["prompt"] not in [p["id"] for p in scr.get("prompts", [])]:
                    errors.append("%s.steps[%d]: unknown prompt %r" % (where, i, st["prompt"]))
        if not steps or "end" not in steps[-1]:
            errors.append("%s: last step must be an 'end' step" % where)

    for name, flow in profile["flows"].items():
        mode, _, shape = name.partition("/")
        if mode not in profile["codes"]["modes"] or shape not in profile["codes"]["shapes"]:
            errors.append("flows[%s]: mode or shape has no code" % name)
        check_steps("flows[%s]" % name, flow["steps"])
    for c in profile["controls"]:
        if "steps" in c:
            check_steps("controls[%s]" % c["id"], c["steps"])
        elif "%s/%s" % (c["mode"], c["shape"]) not in profile["flows"]:
            errors.append("controls[%s]: no flow for %s/%s" % (c["id"], c["mode"], c["shape"]))
        is_obs = c["id"].startswith("obs-")
        if is_obs != (c["expect"]["outcome"] == "observed"):
            errors.append("controls[%s]: obs- ids and the observed outcome go together" % c["id"])
        if is_obs and "screen_id" not in c["expect"]:
            errors.append("controls[%s]: a behaviour case needs expect.screen_id" % c["id"])
    for name, rng in profile["ranges"].items():
        prac = rng.get("practical")
        if not prac:
            continue
        for where, p in [("practical", prac)] + [("practical.shapes[%s]" % s, v)
                                                 for s, v in prac.get("shapes", {}).items()]:
            if not rng["min"] <= p["min"] <= p["max"] <= rng["max"]:
                errors.append("ranges[%s].%s: must lie inside the accepted range" % (name, where))
        for s in prac.get("shapes", {}):
            if s not in profile["codes"]["shapes"]:
                errors.append("ranges[%s].practical.shapes[%s]: shape has no code" % (name, s))
    return errors


def load(path=None):
    path = path or paths.DEFAULT_PROFILE
    try:
        raw = open(path, "rb").read()
        profile = json.loads(raw.decode("utf-8"))
    except (OSError, ValueError) as e:
        raise OracleError("profile_invalid", "cannot read profile %s: %s" % (path, e))
    errors = validate(profile, _schema())
    if not errors:
        errors = provenance_errors(profile) + consistency_errors(profile)
    if errors:
        raise OracleError("profile_invalid", "profile %s is invalid" % path, {"errors": errors})
    profile["_path"] = str(path)
    profile["_sha256"] = hashlib.sha256(raw).hexdigest()
    return profile


def screen_by_id(profile, sid):
    for s in profile["screens"]:
        if s["id"] == sid:
            return s
    raise KeyError(sid)
