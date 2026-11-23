"""scripts/oracle_quick.py and scripts/ledger_status.py (task 10.2), run the way the hooks run
them: `python <script>` from the repository root."""
import json
import os
import subprocess
import sys

from oracle import compare, ledger, paths


def run(script, *args, env=None):
    e = dict(os.environ)
    e.update(env or {})
    return subprocess.run([sys.executable, str(paths.ROOT / "scripts" / script)] + list(args),
                          capture_output=True, text=True, cwd=str(paths.ROOT), env=e)


def test_oracle_quick_grades_the_configured_rebuild(tmp_path):
    # rebuild.command names the solver's node entry: the quick set is compared, never refused,
    # and the rebuild keeps the contract (exit 0 or 1, not 3 or 4).
    r = run("oracle_quick.py", env={"ORACLE_GOLDENS": str(paths.REPO_GOLDENS),
                                    "ORACLE_LEDGER": str(tmp_path / "ledger.json")})
    assert r.returncode in (0, 1), (r.stdout, r.stderr)
    assert "quick set:" in (r.stdout + r.stderr)
    assert "broke the contract" not in (r.stdout + r.stderr)


def test_oracle_quick_exits_4_when_the_golden_check_fails(tmp_path):
    import shutil
    root = tmp_path / "goldens"
    shutil.copytree(paths.REPO_GOLDENS, root)
    (root / "cases" / "typed-by-hand.json").write_text("{}")
    r = run("oracle_quick.py", env={"ORACLE_GOLDENS": str(root), "ORACLE_LEDGER": str(tmp_path / "ledger.json")})
    assert r.returncode == 4
    assert "golden check failed" in r.stderr and "typed-by-hand.json" in r.stderr


def test_ledger_status_reads_the_ledger_alone(tmp_path):
    led = ledger.empty()
    led["fields"] = {"depth": {"cases": 3}, "area": {"cases": 0}}
    led["open_questions"] = [{"id": "Q-001", "question": "why?", "status": "open"},
                             {"id": "Q-002", "question": "done", "status": "answered"}]
    led["mismatches"] = {"depth": {"count": 2, "status": "untriaged"}}
    p = tmp_path / "ledger.json"
    p.write_text(json.dumps(led), encoding="utf-8")
    r = run("ledger_status.py", "--json", env={"ORACLE_LEDGER": str(p)})
    assert r.returncode == 0, r.stderr
    cov = json.loads(r.stdout)
    assert cov["unexercised_fields"] == ["area"]
    assert [q["id"] for q in cov["open_questions"]] == ["Q-001"]
    assert cov["untriaged_mismatches"] == ["depth"]
    text = run("ledger_status.py", env={"ORACLE_LEDGER": str(p)})
    assert text.returncode == 0 and "Open questions: 1" in text.stdout


def test_hook_commands_name_existing_scripts():
    for f in (paths.ROOT / ".kiro" / "hooks").glob("*.json"):
        for h in json.loads(f.read_text(encoding="utf-8"))["hooks"]:
            cmd = h["action"].get("command", "")
            assert cmd.startswith("python scripts/"), (f.name, cmd)
            assert (paths.ROOT / cmd.split()[1]).exists(), (f.name, cmd)
    assert compare.QUICKSET.exists()
