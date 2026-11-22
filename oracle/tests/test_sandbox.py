"""Property 11 (sandbox arguments) and temporary drive handling. No Docker needed."""

import os
from pathlib import Path

from hypothesis import given, strategies as st

from oracle import config, paths, profile, sandbox

ids = st.text(alphabet="abcdef0123456789-", min_size=1, max_size=36)


@given(cpus=st.sampled_from(["0.5", "1.0", "2"]), mem=st.sampled_from(["128m", "256m", "1g"]),
       pids=st.integers(min_value=8, max_value=4096), server=ids, session=ids)
def test_run_args_always_sandboxed(cpus, mem, pids, server, session):
    cfg = config.load()
    cfg["container"] = {"cpus": cpus, "memory": mem, "pids": pids}
    drive = Path("/tmp/oracle-drive-x") if Path("/tmp").exists() else Path.home() / "oracle-drive-x"
    args = sandbox.run_args(cfg, drive, server, session)
    pairs = list(zip(args, args[1:]))
    assert ("--network", "none") in pairs
    user = args[args.index("--user") + 1]
    assert not user.startswith("0:") and user.split(":")[0] != "0"
    assert ("--cpus", cpus) in pairs and ("--memory", mem) in pairs and ("--pids-limit", str(pids)) in pairs
    assert args.count("-v") == 1 and args.count("--volume") == 0 and "--mount" not in args
    assert args[args.index("-v") + 1] == "%s:/drive" % drive.resolve()
    assert "--privileged" not in args and ("--cap-drop", "ALL") in pairs
    assert ("--label", "%s=%s" % (sandbox.LABEL_SERVER, server)) in pairs
    assert ("--label", "%s=%d" % (sandbox.LABEL_PID, os.getpid())) in pairs
    assert ("--label", "%s=%s" % (sandbox.LABEL_HOST, sandbox.host_id())) in pairs
    assert args[-1] == config.image_tag(cfg)


def fake_unpacked(tmp_path):
    u = tmp_path / "unpacked"
    u.mkdir()
    (u / "QT.EXE").write_bytes(b"qt")
    (u / "QUICK2.EXE").write_bytes(b"q2")
    return u


def test_drive_has_layout_and_program_outside_repo(tmp_path):
    prof = profile.load()
    drive = sandbox.make_drive(prof, fake_unpacked(tmp_path))
    try:
        assert paths.ROOT.resolve() not in drive.resolve().parents
        for d in prof["drive"]["dirs"]:
            assert (drive / d).is_dir()
        assert (drive / prof["drive"]["program_dir"] / "QT.EXE").read_bytes() == b"qt"
    finally:
        sandbox.remove_drive(drive)
    assert not drive.exists()


def test_omit_dirs(tmp_path):
    prof = profile.load()
    drive = sandbox.make_drive(prof, fake_unpacked(tmp_path), omit_dirs=["QUICK2/DATA"])
    try:
        assert not (drive / "QUICK2" / "DATA").exists()
        assert (drive / "QUICK2" / "QT.EXE").exists()
    finally:
        sandbox.remove_drive(drive)


def test_changed_files(tmp_path):
    prof = profile.load()
    drive = sandbox.make_drive(prof, fake_unpacked(tmp_path))
    try:
        before = sandbox.snapshot(drive)
        (drive / "QUICK2" / "HEC2.DAT").write_text("x")
        (drive / "QUICK2" / "DATA" / "A.XSC").write_text("y")
        (drive / "QUICK2" / "QT.EXE").write_bytes(b"changed")
        got = [f["path"] for f in sandbox.changed_files(drive, before)]
        assert got == ["QUICK2/DATA/A.XSC", "QUICK2/HEC2.DAT", "QUICK2/QT.EXE"]
        dest = tmp_path / "cap"
        sandbox.copy_files(drive, sandbox.changed_files(drive, before), dest)
        assert (dest / "QUICK2" / "HEC2.DAT").read_text() == "x"
    finally:
        sandbox.remove_drive(drive)
