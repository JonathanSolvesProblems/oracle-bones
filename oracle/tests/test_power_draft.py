"""resurrection-power task 5.1: draft_target boots a named executable from an archive and writes a
draft profile with the archive's sha256, whether it started, the first screen as read and what
failed (Requirements 2.1, 2.3). Offline: recorded screens and a runner that fails."""

import hashlib
import io
import json
import zipfile
from pathlib import Path

import pytest

from oracle import draft, paths
from oracle.errors import OracleError
from oracle.tests.test_power_workspace import no_workspace  # noqa: F401  (fixture)

CAPTURE = Path(__file__).parent / "captures" / "quick2" / "run300-00.txt"


@pytest.fixture
def ws(no_workspace, tmp_path):  # noqa: F811
    root = tmp_path / "ws"
    root.mkdir()
    paths.use_workspace(root)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("HELLO.EXE", b"not a real program")
        z.writestr("DATA/README.TXT", "x")
    archive = root / "hello.zip"
    archive.write_bytes(buf.getvalue())
    return root, archive


class FakeSession:
    """Shows rows, or raises from wait, as a recorded boot did."""

    def __init__(self, rows=None, wait_error=None):
        self.rows, self.wait_error = rows, wait_error
        self.transcript = []
        self.closed = False

    def __call__(self, profile, **kw):
        self.profile = profile
        self.last = {"rows": [""] * 25}
        return self

    def wait(self, screen_ids=None, timeout_s=None):
        if self.wait_error:
            raise self.wait_error
        self.last = {"rows": self.rows}
        return {"rows": self.rows}

    def close(self):
        self.closed = True


def written(root, name="hello"):
    return json.loads((root / "oracle" / "targets" / ("%s.json" % name)).read_text(encoding="utf-8"))


def test_a_program_that_shows_a_screen(ws):
    root, archive = ws
    rows = CAPTURE.read_text(encoding="utf-8").splitlines()
    fake = FakeSession(rows=rows)
    out = draft.draft_target(str(archive), "hello.exe", session_factory=fake)
    d = written(root)
    assert out["draft"] == d and out["path"] == "oracle/targets/hello.json"
    assert d["status"] == "draft" and d["started"] is True and d["failures"] == []
    assert d["first_screen"] == rows
    assert d["archive"]["sha256"] == hashlib.sha256(archive.read_bytes()).hexdigest()
    assert fake.profile["entry"]["program"].upper().endswith("/HELLO.EXE") and fake.closed
    assert (root / d["capture"]).read_text(encoding="utf-8").splitlines() == rows


def test_a_runner_that_fails_to_start(ws):
    root, archive = ws

    def broken(profile, **kw):
        raise OracleError("emulator_failed", "the container ended: emu2: unsupported INT 10h AH=4F")

    draft.draft_target(str(archive), "HELLO.EXE", session_factory=broken)
    d = written(root)
    assert d["started"] is False and d["first_screen"] is None
    assert d["failures"] == [{"stage": "start", "category": "emulator_failed",
                              "message": "the container ended: emu2: unsupported INT 10h AH=4F"}]


def test_a_program_that_exits_with_an_error_did_not_start(ws):
    root, archive = ws
    rows = ["emu2: error, unimplemented interrupt"] + [""] * 24
    err = OracleError("emulator_failed", "the program exited with code 1", {"screen": {"rows": rows}})
    draft.draft_target(str(archive), "HELLO.EXE", session_factory=FakeSession(wait_error=err))
    d = written(root)
    assert d["started"] is False and d["first_screen"] == rows
    assert d["failures"][0]["message"] == "the program exited with code 1"


def test_a_blank_screen_is_not_a_start(ws):
    root, archive = ws
    draft.draft_target(str(archive), "HELLO.EXE", session_factory=FakeSession(rows=[" " * 80] * 25))
    d = written(root)
    assert d["started"] is False
    assert d["failures"] == [{"stage": "first_screen", "category": "no_screen",
                              "message": "no text was read from the screen"}]


def test_bad_arguments_and_a_real_profile_are_refused(ws):
    root, archive = ws
    with pytest.raises(OracleError):
        draft.draft_target(str(root / "missing.zip"), "HELLO.EXE", session_factory=FakeSession(rows=["x"]))
    with pytest.raises(OracleError):
        draft.draft_target(str(archive), "NOPE.EXE", session_factory=FakeSession(rows=["x"]))
    real = root / "oracle" / "targets" / "hello.json"
    real.parent.mkdir(parents=True)
    real.write_text('{"name": "hello", "version": "1"}', encoding="utf-8")
    with pytest.raises(OracleError):
        draft.draft_target(str(archive), "HELLO.EXE", session_factory=FakeSession(rows=["x"]))
    assert real.read_text(encoding="utf-8") == '{"name": "hello", "version": "1"}'
