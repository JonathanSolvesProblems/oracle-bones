"""Reading a screen against the profile: which screen it is, its fields, and its prompt.

Works on the rows the runner returns, so it can be tested on saved captures without Docker.
"""

import hashlib
import re


def text_of(rows):
    return "\n".join(rows)


def hash_rows(rows):
    return hashlib.sha256(text_of(rows).encode("utf-8")).hexdigest()


def identify(profile, rows):
    """Return (screen id or None, [all matching ids]). The first match in profile order wins."""
    text = text_of(rows)
    matches = [s["id"] for s in profile["screens"]
               if s["marker"] is not None and re.search(s["marker"], text, re.M)]
    return (matches[0] if matches else None), matches


def fields(screen_def, rows):
    """Each mapped field's text exactly as printed, padding included."""
    out = {}
    for f in screen_def.get("fields", []):
        row = rows[f["row"]] if f["row"] < len(rows) else ""
        out[f["name"]] = row[f["col"]:f["col"] + f["width"]].ljust(f["width"])
    return out


def message(screen_def, rows):
    m = screen_def.get("message")
    if not m:
        return None
    row = rows[m["row"]] if m["row"] < len(rows) else ""
    return row[m["col"]:m["col"] + m["width"]]


def quiet_for(screen_def, snap):
    """How long the screen has been quiet by its own rule. A screen the profile marks
    keeps_output goes on receiving output while its text stays the same, so it is quiet from
    the last change of its text; every other screen from the last output (runner/settle.py)."""
    if screen_def is not None and screen_def.get("keeps_output") and "text_quiet_ms" in snap:
        return snap["text_quiet_ms"]
    return snap.get("quiet_ms", 0)


def prompt(screen_def, rows, quiet_ms, settle_ms):
    """The prompt the program waits on, or None. Needs a settled screen and a matching pattern."""
    if screen_def is None or quiet_ms < settle_ms:
        return None
    text = text_of(rows)
    for p in screen_def.get("prompts", []):
        m = re.search(p["pattern"], text, re.M)
        if m:
            line_start = text.rfind("\n", 0, m.start()) + 1
            line_end = text.find("\n", m.end())
            line = text[line_start:line_end if line_end >= 0 else None]
            return {"id": p["id"], "text": line.strip()}
    return None


def describe(profile, snap):
    """The structured screen the tools return."""
    from .profile import screen_by_id
    rows = snap["rows"]
    sid, matches = identify(profile, rows)
    sdef = screen_by_id(profile, sid) if sid else None
    return {
        "rows": rows,
        "hash": snap["hash"],
        "cursor": snap["cursor"],
        "screen_id": sid,
        "unknown": sid is None,
        "overlap": matches if len(matches) > 1 else [],
        "prompt": prompt(sdef, rows, quiet_for(sdef, snap), profile["limits"]["settle_ms"]),
        "fields": fields(sdef, rows) if sdef else {},
        "kind": sdef["kind"] if sdef else None,
        "exited": snap.get("exited"),
    }
