import hashlib
import io
import subprocess
import zipfile

import pytest

from oracle import fetch, paths, profile
from oracle.errors import OracleError


def make_zip(members):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        for name, data in members.items():
            z.writestr(name, data)
    return buf.getvalue()


@pytest.fixture
def fake(tmp_path, monkeypatch):
    monkeypatch.setattr(paths, "VENDOR", tmp_path / "vendor")
    data = make_zip({"QT.EXE": b"qt", "QUICK2.EXE": b"q2"})
    prof = profile.load()
    prof["archive"] = dict(prof["archive"], sha256=None, bytes=None)
    arc = fetch.archive_path(prof)
    arc.parent.mkdir(parents=True)
    arc.write_bytes(data)
    return prof, hashlib.sha256(data).hexdigest()


def test_no_pinned_hash_prints_and_stops(fake):
    prof, digest = fake
    out = []
    assert fetch.setup(prof, out.append) == 1
    assert any(digest in line for line in out)
    assert not fetch.unpacked_dir(prof).exists()


def test_mismatch_reports_both_and_leaves_unpacked(fake):
    prof, digest = fake
    prof["archive"]["sha256"] = digest
    assert fetch.setup(prof, lambda s: None) == 0
    marker = fetch.unpacked_dir(prof) / "QT.EXE"
    before = marker.read_bytes()
    prof["archive"]["sha256"] = "0" * 64
    out = []
    assert fetch.setup(prof, out.append) == 1
    text = "\n".join(out)
    assert "0" * 64 in text and digest in text
    assert marker.read_bytes() == before


def test_hash_checked_on_every_run_without_download(fake, monkeypatch):
    prof, digest = fake
    prof["archive"]["sha256"] = digest
    monkeypatch.setattr(fetch, "download", lambda *a, **k: pytest.fail("must not download"))
    assert fetch.setup(prof, lambda s: None) == 0
    fetch.archive_path(prof).write_bytes(make_zip({"QT.EXE": b"other", "QUICK2.EXE": b"x"}))
    assert fetch.setup(prof, lambda s: None) == 1


def test_session_start_requires_matching_stamp(fake):
    prof, digest = fake
    with pytest.raises(OracleError) as e:
        fetch.require_verified(prof)
    assert e.value.category == "setup_required"
    prof["archive"]["sha256"] = digest
    fetch.setup(prof, lambda s: None)
    assert fetch.require_verified(prof).exists()
    prof["archive"]["sha256"] = "f" * 64
    with pytest.raises(OracleError) as e:
        fetch.require_verified(prof)
    assert e.value.category == "setup_required"


def test_missing_member_refused(fake):
    prof, _ = fake
    data = make_zip({"QT.EXE": b"qt"})
    fetch.archive_path(prof).write_bytes(data)
    prof["archive"]["sha256"] = hashlib.sha256(data).hexdigest()
    with pytest.raises(OracleError):
        fetch.setup(prof, lambda s: None)


def test_zip_slip_refused(fake):
    prof, _ = fake
    data = make_zip({"QT.EXE": b"qt", "QUICK2.EXE": b"q", "../evil.txt": b"x"})
    fetch.archive_path(prof).write_bytes(data)
    prof["archive"]["sha256"] = hashlib.sha256(data).hexdigest()
    with pytest.raises(OracleError):
        fetch.setup(prof, lambda s: None)


def _git(*args):
    return subprocess.run(["git", *args], cwd=paths.ROOT, capture_output=True, text=True)


def test_vendor_and_out_are_ignored():
    for p in ("oracle/vendor/x.zip", "oracle/out/x.json"):
        assert _git("check-ignore", "-q", p).returncode == 0, p


def test_no_program_file_inside_repository_outside_vendor():
    """Requirement 1.6: no file from the unpacked program lives anywhere git could commit it.

    The scan covers tracked files and untracked files that .gitignore does not exclude
    (git ls-files -co --exclude-standard). Ignored paths (oracle/vendor, oracle/out,
    node_modules, .venv) cannot be committed without -f, and a force-added file is tracked,
    so it is listed too.
    """
    unpacked = paths.VENDOR / "quick2" / "unpacked"
    if not unpacked.exists():
        pytest.skip("setup has not run")
    digests = {fetch.sha256_file(p) for p in unpacked.rglob("*") if p.is_file()}
    names = {p.name.upper() for p in unpacked.rglob("*") if p.is_file()}
    # -z gives raw UTF-8 paths; decode them as UTF-8, not the locale's code page.
    listed = subprocess.run(["git", "ls-files", "-z", "-co", "--exclude-standard"], cwd=paths.ROOT,
                            capture_output=True, encoding="utf-8")
    assert listed.returncode == 0, listed.stderr
    found = []
    for rel in sorted(set(filter(None, listed.stdout.split("\0")))):
        p = paths.ROOT / rel
        if not p.is_file():  # tracked but deleted in the working tree
            continue
        if p.name.upper() in names and p.suffix.upper() in (".EXE", ".COM", ".BAT"):
            found.append(rel)
        elif p.stat().st_size < 5_000_000 and fetch.sha256_file(p) in digests:
            found.append(rel)
    assert not found, found
    # Tracked files only: nothing under vendor is tracked either.
    assert _git("ls-files", "oracle/vendor").stdout.strip() == ""
