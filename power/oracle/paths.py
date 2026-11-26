"""Paths. The code root is the folder that holds this package, found from this file: the
repository, or the plugin root of an installed power. The workspace root is where the user's
files go: profiles, downloaded programs, runs, goldens and the ledger (resurrection-power
Requirement 6.5). In this repository the two are the same folder, so nothing moves.

In an installed power (the code root holds plugin.json) the workspace is unknown until the
server learns it from MCP roots or set_workspace; until then ROOT and every user path are None.
"""

import os
from pathlib import Path

CODE = Path(__file__).resolve().parent.parent
CODE_ORACLE = CODE / "oracle"
HARNESS_CONFIG = CODE_ORACLE / "harness.json"
PROFILE_SCHEMA = CODE_ORACLE / "targets" / "profile.schema.json"
INSTALLED = (CODE / "plugin.json").is_file()

ROOT = ORACLE = VENDOR = OUT = REPO_GOLDENS = GOLDENS = TARGETS = LEDGER = RUNS = DEFAULT_PROFILE = None


def use_workspace(root):
    """Hang every user path from root."""
    global ROOT, ORACLE, VENDOR, OUT, REPO_GOLDENS, GOLDENS, TARGETS, LEDGER, RUNS, DEFAULT_PROFILE
    ROOT = Path(root)
    ORACLE = ROOT / "oracle"
    VENDOR = ORACLE / "vendor"
    OUT = ORACLE / "out"
    REPO_GOLDENS = ORACLE / "goldens"
    # ORACLE_GOLDENS lets tests record into a scratch directory instead of the committed goldens.
    GOLDENS = Path(os.environ["ORACLE_GOLDENS"]) if os.environ.get("ORACLE_GOLDENS") else REPO_GOLDENS
    TARGETS = ORACLE / "targets"
    # ORACLE_LEDGER lets tests use a scratch ledger instead of the committed one.
    LEDGER = Path(os.environ["ORACLE_LEDGER"]) if os.environ.get("ORACLE_LEDGER") else ROOT / "results" / "ledger.json"
    RUNS = OUT / "runs"
    DEFAULT_PROFILE = TARGETS / "quick2.json"


if not INSTALLED:
    use_workspace(CODE)
