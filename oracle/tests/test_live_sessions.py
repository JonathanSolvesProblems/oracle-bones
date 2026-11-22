"""Sessions: ids, the concurrency limit, idle sweep, and no leftovers (Property 12)."""

import json
import subprocess
import sys
import time
import uuid

import pytest

from oracle import config, fetch, paths, runs, sandbox
from oracle.errors import OracleError
from oracle.sessions import SessionManager


def containers(label, value):
    return sandbox.labelled_containers(label, value)


def test_session_limit_and_cleanup(live):
    cfg = config.load()
    cfg["max_sessions"] = 1
    m = SessionManager(cfg, start_sweeper=False)
    try:
        s = m.start(live)
        assert m.get(s.id) is s
        drive = s.drive
        with pytest.raises(OracleError) as e:
            m.start(live)
        assert e.value.category == "session_limit" and e.value.retryable
        assert containers(sandbox.LABEL_SESSION, s.id)
        m.end(s.id)
        assert not containers(sandbox.LABEL_SESSION, s.id)
        assert not drive.exists()
        with pytest.raises(OracleError) as e:
            m.get(s.id)
        assert e.value.category == "session_not_found"
        s2 = m.start(live)  # the slot came back
        m.end(s2.id)
    finally:
        m.shutdown_all()
    assert not containers(sandbox.LABEL_SERVER, m.server_id)


def test_idle_sweep(live):
    cfg = config.load()
    cfg["session_idle_limit_s"] = 1
    m = SessionManager(cfg, start_sweeper=False)
    try:
        s = m.start(live)
        assert m.sweep(now=time.monotonic() + 5) == [s.id]
        with pytest.raises(OracleError) as e:
            m.get(s.id)
        assert "idle" in e.value.message
        assert not containers(sandbox.LABEL_SESSION, s.id)
    finally:
        m.shutdown_all()


def test_orphans_of_dead_servers_removed_at_start(live):
    cfg = config.load()
    dead_server = str(uuid.uuid4())
    exited = subprocess.Popen([sys.executable, "-c", "pass"])
    exited.wait()  # a pid whose process has exited stands for the dead server
    drive = sandbox.make_drive(live, fetch.require_verified(live))
    proc = sandbox.launch(cfg, drive, dead_server, str(uuid.uuid4()), owner_pid=exited.pid)
    try:
        proc.stdin.write(json.dumps({"op": "start", "program": "", "argv": ["sleep", "120"], "env": {},
                                     "rows": 25, "cols": 80, "pty_rows": 27, "frozen_time": None}) + "\n")
        proc.stdin.flush()
        proc.stdout.readline()
        assert containers(sandbox.LABEL_SERVER, dead_server)
        m = SessionManager(cfg, start_sweeper=False)  # its owner pid has exited
        try:
            assert not containers(sandbox.LABEL_SERVER, dead_server)
        finally:
            m.shutdown_all()
    finally:
        proc.kill()
        sandbox.remove_drive(drive)


def test_live_server_in_another_checkout_kept(live):
    """A server in another worktree writes its pid file under that worktree's oracle/out/, which
    this one cannot see. Its containers carry its pid, which is running, so they stay."""
    cfg = config.load()
    other = str(uuid.uuid4())  # no pid file here
    drive = sandbox.make_drive(live, fetch.require_verified(live))
    proc = sandbox.launch(cfg, drive, other, str(uuid.uuid4()))  # owned by this running process
    try:
        proc.stdin.write(json.dumps({"op": "start", "program": "", "argv": ["sleep", "120"], "env": {},
                                     "rows": 25, "cols": 80, "pty_rows": 27, "frozen_time": None}) + "\n")
        proc.stdin.flush()
        proc.stdout.readline()
        m = SessionManager(cfg, start_sweeper=False)
        try:
            assert containers(sandbox.LABEL_SERVER, other)
        finally:
            m.shutdown_all()
    finally:
        proc.kill()
        sandbox.remove_containers([c for c, _ in containers(sandbox.LABEL_SERVER, other)])
        sandbox.remove_drive(drive)

def test_live_server_containers_kept(live):
    cfg = config.load()
    a = SessionManager(cfg, start_sweeper=False)
    try:
        s = a.start(live)
        b = SessionManager(cfg, start_sweeper=False)  # a is still running
        try:
            assert containers(sandbox.LABEL_SESSION, s.id)
        finally:
            b.shutdown_all()
        assert containers(sandbox.LABEL_SESSION, s.id)
    finally:
        a.shutdown_all()


def test_exploratory_run_is_logged_not_stored(live, tmp_path, monkeypatch):
    monkeypatch.setattr(paths, "LEDGER", tmp_path / "ledger.json")
    goldens_before = sorted(p.as_posix() for p in paths.REPO_GOLDENS.rglob("*")) if paths.REPO_GOLDENS.exists() else []
    c = next(c for c in live["controls"] if c["id"] == "nd-trap-000001")
    out = runs.explore(live, c["mode"], c["shape"], c["inputs"])
    assert out["outcome"] == "result" and out["printed"]["depth"].strip() == "3.27"
    d = paths.ROOT / out["capture_path"]
    assert (d / "run.json").exists() and (d / "final.txt").exists()
    goldens_after = sorted(p.as_posix() for p in paths.REPO_GOLDENS.rglob("*")) if paths.REPO_GOLDENS.exists() else []
    assert goldens_after == goldens_before
    led = json.loads((tmp_path / "ledger.json").read_text())
    assert led["screens"]["nd_trap_result"]["visits"] == 1
    assert "literal" in led["screens"]["nd_trap_form"]["keys_tried"]
