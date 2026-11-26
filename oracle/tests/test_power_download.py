"""resurrection-power task 4.3: a program that is not in the workspace is downloaded into it from
the profile's address; a download whose sha256 differs from the pin is deleted, both hashes
are given, and nothing boots (Requirements 9.1, 9.2)."""

import functools
import hashlib
import http.server
import io
import threading
import zipfile

import pytest

from oracle import fetch, paths, tools
from oracle.errors import OracleError
from oracle.tests.test_power_workspace import no_workspace  # noqa: F401  (fixture)


def tiny_zip():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("TINY/README.TXT", "not a program\r\n")
    return buf.getvalue()


@pytest.fixture
def server(tmp_path, monkeypatch):
    served = tmp_path / "served"
    served.mkdir()
    data = tiny_zip()
    (served / "tiny.zip").write_bytes(data)
    handler = functools.partial(type("Quiet", (http.server.SimpleHTTPRequestHandler,),
                                     {"log_message": lambda *a: None}), directory=str(served))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    for k in ("HTTP_PROXY", "http_proxy", "HTTPS_PROXY", "https_proxy"):
        monkeypatch.delenv(k, raising=False)
    monkeypatch.setenv("NO_PROXY", "127.0.0.1")
    yield "http://127.0.0.1:%d/tiny.zip" % httpd.server_address[1], hashlib.sha256(data).hexdigest()
    httpd.shutdown()


@pytest.fixture
def workspace(no_workspace, tmp_path):  # noqa: F811
    ws = tmp_path / "ws"
    ws.mkdir()
    paths.use_workspace(ws)
    return ws


def profile(url, sha):
    return {"name": "tiny", "_path": "oracle/targets/tiny.json",
            "archive": {"url": url, "file": "tiny.zip", "sha256": sha, "must_contain": ["README.TXT"]}}


def test_the_program_is_downloaded_into_the_workspace(server, workspace):
    url, sha = server
    out = fetch.ensure(profile(url, sha), log=lambda *a: None)
    assert out == workspace / "oracle" / "vendor" / "tiny" / "unpacked"
    assert (out / "TINY" / "README.TXT").is_file()
    assert fetch.sha256_file(workspace / "oracle" / "vendor" / "tiny" / "tiny.zip") == sha
    assert fetch.ensure(profile(url, sha), log=lambda *a: 1 / 0) == out  # verified: no second download


def test_a_download_with_another_hash_is_deleted(server, workspace):
    url, sha = server
    pinned = "0" * 64
    with pytest.raises(OracleError) as e:
        fetch.ensure(profile(url, pinned), log=lambda *a: None)
    assert e.value.category == "hash_mismatch"
    assert pinned in e.value.message and sha in e.value.message
    vendor = workspace / "oracle" / "vendor" / "tiny"
    assert not (vendor / "tiny.zip").exists() and not (vendor / "unpacked").exists()


def test_an_installed_power_fetches_before_it_boots(monkeypatch, workspace):
    seen = []
    monkeypatch.setattr(paths, "INSTALLED", True)
    monkeypatch.setattr(fetch, "ensure", lambda prof, log=None: seen.append(prof["name"]))
    monkeypatch.setattr(tools.reread, "check", lambda prof, store: None)
    o = tools.Oracle.__new__(tools.Oracle)
    o._profile = lambda name=None: {"name": "tiny", "_sha256": "x"}
    o.recorder = type("R", (), {"store": None})()
    o._running_profile()
    assert seen == ["tiny"]
