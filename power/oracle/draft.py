"""draft_target: boot a new program once and write what happened (resurrection-power 2.1, 2.3).

The draft goes to oracle/targets/<name>.json in the workspace, marked "draft". It holds the
archive's sha256, whether the program started, the first screen as read, and every failure as
the emulator or the runner reported it. It is not a profile: the screens, flows and fields
come later, from questioning the program. A draft says started only when a screen with text
was read and the emulator did not fail.
"""

import json
import re
import shutil
import time
import zipfile
from pathlib import Path, PurePosixPath

from . import fetch, paths, runs
from .errors import OracleError

# Boot settings for a program nobody has profiled yet: the screen and timing the QUICK-2
# profile uses, and a fixed clock so that two boots show the same screen.
BOOT = {
    "env": {"EMU2_DEFAULT_DRIVE": "C", "TERM": "xterm"},
    "screen": {"rows": 25, "cols": 80, "pty_rows": 27},
    "frozen_time": "1995-06-01 12:00:00",
    "limits": {"settle_ms": 150, "wait_timeout_s": 10, "case_time_limit_s": 60, "retry_limit": 3,
               "hold_confirm_ms": 2000, "stuck_confirm_ms": 20000},
}


def _name(exe):
    n = re.sub(r"[^a-z0-9_]", "_", PurePosixPath(exe.replace("\\", "/")).stem.lower())
    return n if re.match(r"^[a-z]", n) else "t_" + n


def _member(names, exe):
    want = exe.replace("\\", "/").upper()
    exact = [n for n in names if n.upper() == want]
    if exact:
        return exact[0]
    by_name = [n for n in names if PurePosixPath(n).name.upper() == PurePosixPath(want).name]
    if len(by_name) == 1:
        return by_name[0]
    raise OracleError("invalid_arguments", "the archive has %s %s" % ("several files named" if by_name else "no", exe),
                      {"members": sorted(names)[:200]})


def boot_profile(name, archive_file, sha, member):
    program_dir = name.upper()[:8]
    member_dir = str(PurePosixPath(member).parent)
    cwd = program_dir if member_dir in (".", "") else program_dir + "/" + member_dir
    return {
        "name": name, "archive": {"file": archive_file, "sha256": sha},
        "env": dict(BOOT["env"], EMU2_CWD=cwd),
        "drive": {"dirs": [program_dir], "program_dir": program_dir},
        "entry": {"program": program_dir + "/" + member},
        "screen": dict(BOOT["screen"]), "frozen_time": BOOT["frozen_time"], "limits": dict(BOOT["limits"]),
        "keys": {"list": []}, "screens": [],
    }


def _unpack(prof, archive):
    """Put the archive in the workspace's downloads folder, unpacked and stamped as verified."""
    vd = fetch.vendor_dir(prof)
    vd.mkdir(parents=True, exist_ok=True)
    dest = fetch.archive_path(prof)
    if dest.resolve() != archive.resolve():
        shutil.copyfile(archive, dest)
    prof = dict(prof, archive=dict(prof["archive"], must_contain=[]))
    fetch.unpack(prof)
    fetch.stamp_path(prof).write_text(json.dumps({"sha256": prof["archive"]["sha256"], "archive": dest.name}),
                                      encoding="utf-8")


def draft_target(archive, exe, session_factory=None, cfg=None):
    src = Path(archive)
    if not src.is_absolute():
        src = Path(paths.ROOT) / src
    if not src.is_file():
        raise OracleError("invalid_arguments", "no archive at %s" % src)
    try:
        names = [n for n in fetch.zip_names(src) if not n.endswith("/")]
    except zipfile.BadZipFile as e:
        raise OracleError("invalid_arguments", "%s is not a zip archive: %s" % (src, e))
    member = _member(names, exe)
    name = _name(member)
    target = paths.TARGETS / ("%s.json" % name)
    if target.exists():
        try:
            old = json.loads(target.read_text(encoding="utf-8"))
        except ValueError:
            old = {}
        if old.get("status") != "draft":
            raise OracleError("invalid_arguments", "%s exists and is not a draft; it was left as it is"
                              % runs.rel(target))
    sha = fetch.sha256_file(src)
    prof = boot_profile(name, src.name, sha, member)
    _unpack(prof, src)

    failures, rows, exited, transcript = [], None, None, []
    if session_factory is None:
        from .session import Session as session_factory
    s = None
    try:
        s = session_factory(prof, cfg=cfg, case_limit=False)
        rows = (s.last or {}).get("rows")
        try:
            desc = s.wait(None, timeout_s=prof["limits"]["wait_timeout_s"])
            rows = desc["rows"]
        except OracleError as e:
            rows = (e.detail.get("screen") or {}).get("rows") or (s.last or {}).get("rows") or rows
            m = re.match(r"the program exited with code (-?\d+)", e.message)
            exited = int(m.group(1)) if m else None
            if exited != 0:
                failures.append({"stage": "first_screen", "category": e.category, "message": e.message})
        transcript = list(getattr(s, "transcript", []))
    except OracleError as e:
        failures.append({"stage": "start", "category": e.category, "message": e.message})
    finally:
        if s is not None:
            s.close()

    has_text = bool(rows) and any(r.strip() for r in rows)
    if rows is not None and not has_text and not failures:
        failures.append({"stage": "first_screen", "category": "no_screen", "message": "no text was read from the screen"})
    started = has_text and not any(f["category"] == "emulator_failed" or f["stage"] == "start" for f in failures)
    capture = None
    if rows is not None:
        d = runs.write_run_log("draft-%s-%s" % (name, runs.new_run_id()), {"final": rows, "transcript": transcript},
                               {"kind": "draft", "program": prof["entry"]["program"]})
        capture = runs.rel(d) + "/final.txt"
    out = {
        "status": "draft", "name": name, "started": started,
        "archive": {"file": src.name, "sha256": sha}, "entry": prof["entry"],
        "first_screen": rows, "exited": exited, "failures": failures,
        "capture": capture, "drafted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "boot": {k: prof[k] for k in ("env", "drive", "screen", "frozen_time", "limits")},
    }
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    return {"path": runs.rel(target), "draft": out}
