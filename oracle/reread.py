"""Re-read stored goldens under a profile (exhume-loop Requirement 4.3).

When the profile changes, every stored golden's captured final screen is read again with the
same functions the case runner uses. A profile that reads any golden differently would change
what that golden means, so the tools refuse to run the program until it reads them all as
stored. Starts no container and writes nothing.
"""

import re

from . import screen as screen_mod
from .errors import OracleError
from .profile import screen_by_id
from .recorder import Store

_SCREEN = re.compile(r"^screen-(\d+)\.txt$")


def final_rows(store, cid):
    """The rows of a golden's last captured screen, or None when it has none."""
    d = store.captures_dir / cid
    shots = sorted((int(m.group(1)), p) for p in d.glob("screen-*.txt") if (m := _SCREEN.match(p.name))) \
        if d.exists() else []
    if not shots:
        return None
    text = shots[-1][1].read_text(encoding="utf-8")
    return text[:-1].split("\n") if text.endswith("\n") else text.split("\n")


def read_as(profile, golden, rows):
    """What this profile makes of a golden's final screen, in the golden's own terms."""
    sid = screen_mod.identify(profile, rows)[0]
    if golden["outcome"] == "observed":
        return {"screen_id": sid}
    if sid is None:
        return {"outcome": "unknown_screen", "printed": {}, "message": None}
    sdef = screen_by_id(profile, sid)
    kind = sdef["kind"]
    outcome = kind if kind in ("result", "rejected", "error") else "unknown_screen"
    printed = screen_mod.fields(sdef, rows) if outcome != "unknown_screen" else {}
    message = screen_mod.message(sdef, rows) if kind in ("rejected", "error") else None
    return {"outcome": outcome, "printed": printed, "message": message}


def differences(profile, store=None):
    """[{case_id, what, stored, reread}] for every golden this profile reads differently."""
    store = store or Store()
    out = []
    for g in store.all():
        rows = final_rows(store, g["id"])
        if rows is None:
            out.append({"case_id": g["id"], "what": "capture", "stored": "a final screen", "reread": None})
            continue
        got = read_as(profile, g, rows)
        if g["outcome"] == "observed":
            if got["screen_id"] != g["expected_screen"]:
                out.append({"case_id": g["id"], "what": "screen_id", "stored": g["expected_screen"],
                            "reread": got["screen_id"]})
            continue
        for what in ("outcome", "printed", "message"):
            if got[what] != g.get(what):
                out.append({"case_id": g["id"], "what": what, "stored": g.get(what), "reread": got[what]})
    return out


def check(profile, store=None):
    """Raise profile_invalid when the profile reads any stored golden differently."""
    diffs = differences(profile, store)
    if diffs:
        raise OracleError("profile_invalid",
                          "the profile reads %d stored golden(s) differently; change it back, or have a "
                          "person raise its version and rerecord them" % len({d["case_id"] for d in diffs}),
                          {"differences": diffs[:50], "profile_sha256": profile["_sha256"]})
