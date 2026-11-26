"""Report coverage from results/ledger.json alone (oracle-harness Requirement 13.5).

Usage: python scripts/ledger_status.py [--json]
Prints open questions, unexercised fields, untried keys, unobserved profile facts, untriaged
mismatches, and the counts of unanswered runs, unknown screens and nondeterministic cases. It
reads nothing but the ledger and starts no container, so coverage is never claimed from memory.
Exit code 0, or 1 when the ledger cannot be read.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# In a workspace made by the power's init_workspace, oracle/power.json names the plugin root,
# which holds the harness; in this repository the harness is here.
_POWER = ROOT / "oracle" / "power.json"
sys.dont_write_bytecode = _POWER.is_file()  # write nothing under the plugin root
sys.path.insert(0, json.loads(_POWER.read_text(encoding="utf-8"))["plugin_root"] if _POWER.is_file() else str(ROOT))

from oracle import paths  # noqa: E402

if paths.ROOT is None:
    paths.use_workspace(ROOT)

from oracle import ledger  # noqa: E402
from oracle.errors import OracleError  # noqa: E402


def report():
    led = ledger.read()
    cov = ledger.coverage(led)
    cov["open_questions"] = [{"id": q["id"], "question": q["question"]}
                             for q in led.get("open_questions", []) if q.get("status") == "open"]
    cov["stopped"] = led.get("stopped")
    return cov


def text(cov):
    lines = ["Ledger status (results/ledger.json)"]
    lines.append("Open questions: %d" % len(cov["open_questions"]))
    for q in cov["open_questions"]:
        lines.append("  %s  %s" % (q["id"], q["question"][:110]))
    lines.append("Unexercised fields: %d%s" % (len(cov["unexercised_fields"]),
                                                ("  " + ", ".join(cov["unexercised_fields"])) if cov["unexercised_fields"] else ""))
    lines.append("Screens with untried keys: %d" % len(cov["untried_keys"]))
    for sid, keys in sorted(cov["untried_keys"].items()):
        lines.append("  %s: %s" % (sid, " ".join(keys)))
    lines.append("Unobserved profile facts: %d" % len(cov["unobserved_profile_facts"]))
    for f in cov["unobserved_profile_facts"]:
        lines.append("  %s" % f["profile_path"])
    lines.append("Untriaged mismatches: %d%s" % (len(cov["untriaged_mismatches"]),
                                                  ("  " + ", ".join(cov["untriaged_mismatches"])) if cov["untriaged_mismatches"] else ""))
    lines.append("Unanswered runs: %d   unknown screens: %d   nondeterministic cases: %d"
                 % (cov["unanswered_runs"], cov["unknown_screens"], cov["nondeterministic_cases"]))
    if cov["stopped"]:
        lines.append("Stopped: %s" % (cov["stopped"].get("why") if isinstance(cov["stopped"], dict) else cov["stopped"]))
    return "\n".join(lines)


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    try:
        cov = report()
    except (OracleError, OSError, ValueError) as e:
        print("cannot read the ledger: %s" % e, file=sys.stderr)
        return 1
    print(json.dumps(cov, indent=2) if "--json" in argv else text(cov))
    return 0


if __name__ == "__main__":
    sys.exit(main())
