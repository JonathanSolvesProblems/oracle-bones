"""A server that kept old oracle code in memory must not drive the program.

Kiro starts the oracle MCP server once and keeps it running. Python holds the code it imported,
so after an edit under oracle/ the server goes on running the old code while it reads today's
profile and goldens from disk. On 2026-11-24 a server started on 2026-11-22 at 10:17 missed
commit cddf1e9 and refused every run with profile_invalid. A change the profile check does not
notice would let such a server record goldens with old code, so the tools that start or drive
the program call check() first and refuse with stale_server.
"""

import hashlib
import time

from . import paths
from .errors import OracleError

# Not code the server runs: tests, run reports, downloaded binaries, recorded answers.
SKIP = ("tests", "out", "vendor", "goldens")


def code_hashes(root=None):
    """sha256 of every .py file under oracle/, keyed by its path relative to root."""
    root = paths.CODE_ORACLE if root is None else root
    out = {}
    for p in sorted(root.rglob("*.py")):
        rel = p.relative_to(root)
        if rel.parts[0] in SKIP or "__pycache__" in rel.parts:
            continue
        out[rel.as_posix()] = hashlib.sha256(p.read_bytes()).hexdigest()
    return out


def changed(loaded, current):
    """Paths added, removed or edited since loaded."""
    return sorted(k for k in set(loaded) | set(current) if loaded.get(k) != current.get(k))


# Taken when the server imports the harness, which is when it loads the code it will run.
LOADED = code_hashes()
LOADED_AT = time.strftime("%Y-%m-%dT%H:%M:%S")


def check(loaded=None, root=None, loaded_at=None):
    """Raise stale_server if the oracle code on disk differs from the code this process loaded."""
    loaded = LOADED if loaded is None else loaded
    diff = changed(loaded, code_hashes(root))
    if diff:
        raise OracleError(
            "stale_server",
            "The oracle code on disk changed after this server loaded it (%d file(s), for example %s). "
            "Restart the oracle MCP server, then try again. Nothing was run."
            % (len(diff), diff[0]),
            {"changed": diff[:50], "loaded_at": loaded_at or LOADED_AT})
