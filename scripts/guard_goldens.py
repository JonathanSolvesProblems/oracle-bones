"""Refuse any Kiro write under oracle/goldens/ (oracle-harness Requirement 10.1).

Run by the guard-goldens PreToolUse hook. Reads the hook's JSON from stdin, for example (seen
in oracle/out/hook-stdin.json on 2026-11-21):

  {"hook_event_name": "PreToolUse", "cwd": "c:\\...\\Kiro2026", "tool_name": "str_replace",
   "tool_input": {"path": "c:\\...\\Kiro2026\\oracle\\out\\hook-probe.txt", ...}}

Every string in tool_input whose key names a path or file (path, file_path, targetPath, paths
and so on) is resolved against cwd. If any of them lies under oracle/goldens/, the script
prints why on stderr and exits with code 2, which blocks the tool call. Text being written,
such as newStr, is never read as a path. A payload that cannot be read is refused too, because
the guard cannot tell what it would let through.
Exit codes: 0 allowed, 2 refused.
"""

import json
import os
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
GOLDENS = REPO / "oracle" / "goldens"

REFUSAL = ("Refused: %s is under oracle/goldens/. Goldens are recorded from the binary by the case "
           "runner, never typed. To replace one, a person runs python -m oracle.record --rerecord <case-id>.")


def _norm(p):
    return os.path.normcase(os.path.normpath(os.path.abspath(p)))


def _is_path_key(key):
    k = key.lower()
    return "path" in k or "file" in k


def paths_in(tool_input):
    """Every string under a path-like key, at any depth."""
    out = []

    def walk(obj, path_like):
        if isinstance(obj, dict):
            for k, v in obj.items():
                walk(v, path_like or _is_path_key(str(k)))
        elif isinstance(obj, list):
            for v in obj:
                walk(v, path_like)
        elif isinstance(obj, str) and path_like and obj.strip():
            out.append(obj)

    walk(tool_input, False)
    return out


def under_goldens(p, cwd):
    target = Path(p)
    if not target.is_absolute():
        target = Path(cwd) / target
    t, g = _norm(target), _norm(GOLDENS)
    return t == g or t.startswith(g + os.sep)


def decide(payload):
    """(exit code, message) for one hook payload."""
    if not isinstance(payload, dict):
        return 2, "Refused: the hook payload is not a JSON object, so the goldens guard cannot check it."
    cwd = payload.get("cwd") or str(REPO)
    tool_input = payload.get("tool_input")
    if tool_input is None:
        tool_input = payload.get("toolInput", {})
    for p in paths_in(tool_input):
        if under_goldens(p, cwd):
            return 2, REFUSAL % p
    return 0, ""


def main():
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw)
    except ValueError:
        print("Refused: the hook payload is not JSON, so the goldens guard cannot check it.", file=sys.stderr)
        return 2
    code, message = decide(payload)
    if message:
        print(message, file=sys.stderr)
    return code


if __name__ == "__main__":
    sys.exit(main())
