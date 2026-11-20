"""Run one case by following the profile's steps, and report how it ended.

A run ends in one of: result, rejected, error, observed (the program answered), or timeout,
unknown_screen (the harness got no answer). Only the first group may ever be stored.
"""

from . import screen as screen_mod
from .errors import OracleError
from .profile import screen_by_id
from .session import Session

ANSWERED = ("result", "rejected", "error", "observed")


def steps_for(profile, mode, shape, control=None):
    if control and control.get("steps"):
        return control["steps"]
    flow = profile["flows"].get("%s/%s" % (mode, shape))
    if flow is None:
        raise OracleError("invalid_arguments", "the profile has no flow for %s/%s" % (mode, shape),
                          {"flows": sorted(profile["flows"])})
    return flow["steps"]


def flow_inputs(profile, mode, shape):
    return [s["input"] for s in steps_for(profile, mode, shape) if "input" in s]


def control_by_id(profile, cid):
    for c in profile["controls"]:
        if c["id"] == cid:
            return c
    raise OracleError("invalid_arguments", "no control case %s" % cid)


def _stop_screens(profile):
    """Screens that end a case wherever they appear."""
    return [s["id"] for s in profile["screens"] if s["kind"] in ("rejected", "error") and s["marker"]]


def run(profile, mode, shape, inputs, control=None, cfg=None, server_id="cli", capture_all=False):
    """Run a case in a fresh session. Returns a dict; never raises for timeouts."""
    setup = dict(control.get("setup", {})) if control else {}
    steps = steps_for(profile, mode, shape, control)
    observed = bool(control and control["expect"]["outcome"] == "observed")
    needed = [s["input"] for s in steps if "input" in s]
    missing = [n for n in needed if n not in inputs]
    extra = [k for k in inputs if k not in needed]
    if missing or extra:
        raise OracleError("invalid_arguments", "inputs do not match the form for %s/%s" % (mode, shape),
                          {"missing": missing, "unexpected": extra, "expected": needed})
    stops = _stop_screens(profile)
    screens = []
    out = {"mode": mode, "shape": shape, "inputs": dict(inputs), "printed": {}, "message": None,
           "screen_id": None, "files": []}

    def keep(desc):
        if capture_all and (not screens or screens[-1]["hash"] != desc["hash"]):
            screens.append({"hash": desc["hash"], "rows": desc["rows"]})

    with Session(profile, cfg, server_id=server_id, setup=setup) as s:
        try:
            for st in steps:
                if "end" in st:
                    desc = s.wait(st["end"] + stops, settle_ms=st.get("hold_ms"))
                    keep(desc)
                    out.update(_ending(profile, desc, observed))
                    break
                expect = st["expect"]
                if "prompt" in st:
                    desc = s.wait_prompt(expect, st["prompt"])
                else:
                    desc = s.wait([expect] + stops, settle_ms=0 if st.get("immediate") else None)
                keep(desc)
                if desc["screen_id"] in stops:
                    out.update(_ending(profile, desc, observed))
                    break
                keys = (inputs[st["input"]] + st.get("then", "")) if "input" in st else st["keys"]
                desc = s.send(keys, expect=expect)
                keep(desc)
        except OracleError as e:
            if e.category not in ("timeout", "input_ignored"):
                raise
            desc = e.detail.get("screen") or screen_mod.describe(profile, s.last)
            keep(desc)
            out["outcome"] = "unknown_screen" if desc.get("unknown") else "timeout"
            out["reason"] = e.message
            out["screen_id"] = desc.get("screen_id")
            out["final"] = desc["rows"]
        else:
            out["final"] = screen_mod.describe(profile, s.last)["rows"] if "final" not in out else out["final"]
        out["transcript"] = s.transcript
        out["resends"] = s.resends
        out["files"] = s.changed_files()
        out["drive_files"] = _copy_out(s, out["files"])
    out["screens"] = screens
    return out


def _copy_out(session, files):
    """Read the bytes of files the program wrote before the drive is deleted."""
    from pathlib import Path
    return {f["path"]: (Path(session.drive) / f["path"]).read_bytes() for f in files}


def _ending(profile, desc, observed):
    sid = desc["screen_id"]
    out = {"screen_id": sid, "final": desc["rows"]}
    if observed:
        out["outcome"] = "observed"
        return out
    sdef = screen_by_id(profile, sid)
    kind = sdef["kind"]
    if kind == "result":
        out["outcome"] = "result"
        out["printed"] = desc["fields"]
    elif kind in ("rejected", "error"):
        out["outcome"] = kind
        out["message"] = screen_mod.message(sdef, desc["rows"])
        out["printed"] = desc["fields"]
    else:
        out["outcome"] = "unknown_screen"
    return out


def check_control(profile, control, got):
    """Differences between a control case's expectation and a run. Empty when it passes."""
    exp = control["expect"]
    diffs = []
    if got.get("outcome") != exp["outcome"]:
        diffs.append({"what": "outcome", "expected": exp["outcome"], "got": got.get("outcome"),
                      "reason": got.get("reason")})
    if exp.get("screen_id") and got.get("screen_id") != exp["screen_id"]:
        diffs.append({"what": "screen_id", "expected": exp["screen_id"], "got": got.get("screen_id")})
    for name, want in exp.get("printed", {}).items():
        have = got.get("printed", {}).get(name)
        if have is None or have.strip() != want:
            diffs.append({"what": "printed." + name, "expected": want, "got": have})
    return diffs
