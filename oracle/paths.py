"""Repository paths. Everything is relative to the repository root, found from this file."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ORACLE = ROOT / "oracle"
VENDOR = ORACLE / "vendor"
OUT = ORACLE / "out"
GOLDENS = ORACLE / "goldens"
TARGETS = ORACLE / "targets"
HARNESS_CONFIG = ORACLE / "harness.json"
LEDGER = ROOT / "results" / "ledger.json"
RUNS = OUT / "runs"
DEFAULT_PROFILE = TARGETS / "quick2.json"
