"""init_workspace: copy the method's files into the user's workspace (resurrection-power 7.1, 7.2).

The templates are powers/oracle-bones/workspace/, generated from this repository by scripts/build_power.py.
A file that exists with other content is left as it is and listed. oracle/power.json records
the plugin root, so the copied hook scripts can find the harness (7.4).
"""

import json
from pathlib import Path

from . import paths
from .errors import OracleError

# In an installed power the templates sit beside oracle/; in this repository, in the package.
TEMPLATES = paths.CODE / "workspace" if paths.INSTALLED else paths.PACKAGE / "workspace"
GITIGNORE_LINE = "oracle/vendor/"  # the downloads folder: programs are never committed
# What a new user met after init in the clean install of 2026-11-26 (Requirement 10.1). Said in
# the reply, so the agent passes it on; nothing here claims more than that install showed.
NEXT = (
    "The four hooks are now in .kiro/hooks/. If Kiro's Agent Hooks panel shows them as disabled, close this "
    "window and open the folder again: a window that opened in Restricted Mode keeps them off until then, and "
    "the guard on oracle/goldens/ does not run while they are off.",
    "The oracle does not remember this folder. In each new window, call set_workspace again before any other tool.",
    "The grading hooks grade nothing until you have a rebuild. When you do, name its command in "
    "oracle/rebuild.json, for example {\"command\": [\"node\", \"my-rebuild.js\"]}.",
)


def init(root=None):
    root = Path(root or paths.ROOT)
    if not TEMPLATES.is_dir():
        raise OracleError("setup_required", "no workspace templates at %s; run scripts/build_power.py" % TEMPLATES)
    copied, unchanged, kept = [], [], []
    for src in sorted(p for p in TEMPLATES.rglob("*") if p.is_file() and "__pycache__" not in p.parts):
        rel = src.relative_to(TEMPLATES).as_posix()
        dest = root / rel
        data = src.read_bytes()
        if not dest.exists():
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
            copied.append(rel)
        elif dest.is_file() and dest.read_bytes() == data:
            unchanged.append(rel)
        else:
            kept.append(rel)
    gi = root / ".gitignore"
    text = gi.read_text(encoding="utf-8") if gi.is_file() else ""
    if GITIGNORE_LINE in text.splitlines():
        gitignore = "present"
    else:
        sep = "" if text == "" or text.endswith("\n") else "\n"
        with open(gi, "a", encoding="utf-8", newline="\n") as f:
            f.write(sep + GITIGNORE_LINE + "\n")
        gitignore = "added"
    power = root / "oracle" / "power.json"
    power.parent.mkdir(parents=True, exist_ok=True)
    power.write_text(json.dumps({"plugin_root": str(TEMPLATES.parent.resolve())}, indent=2) + "\n", encoding="utf-8")
    return {"workspace": str(root), "copied": copied, "unchanged": unchanged, "kept": kept, "gitignore": gitignore,
            "next": list(NEXT)}
