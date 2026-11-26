"""Download, verify and unpack the program archive named in the target profile.

The hash is checked on every setup run. The profile's hash is pinned by a person, never by
this code: when the profile has no hash, setup prints the computed one and stops.
"""

import hashlib
import json
import os
import shutil
import tempfile
import time
import urllib.request
import zipfile
from pathlib import Path, PurePosixPath

from . import paths
from .errors import OracleError


def vendor_dir(profile):
    return paths.VENDOR / profile["name"]


def archive_path(profile):
    return vendor_dir(profile) / profile["archive"]["file"]


def unpacked_dir(profile):
    return vendor_dir(profile) / "unpacked"


def stamp_path(profile):
    return vendor_dir(profile) / "verified.json"


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 16), b""):
            h.update(block)
    return h.hexdigest()


def download(profile, log=print):
    dest = archive_path(profile)
    dest.parent.mkdir(parents=True, exist_ok=True)
    url = profile["archive"]["url"]
    log("downloading %s" % url)
    last = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "oracle-bones-setup"})
            with urllib.request.urlopen(req, timeout=120) as r:
                data = r.read()
            break
        except OSError as e:
            last = e
            log("download failed (%s), retrying" % e)
            time.sleep(2 * (attempt + 1))
    else:
        raise OracleError("setup_required", "could not download %s: %s" % (url, last))
    tmp = dest.with_suffix(dest.suffix + ".part")
    tmp.write_bytes(data)
    os.replace(tmp, dest)
    return dest


def zip_names(path):
    with zipfile.ZipFile(path) as z:
        return z.namelist()


def missing_members(profile, names):
    have = {PurePosixPath(n).name.upper() for n in names}
    return [m for m in profile["archive"].get("must_contain", []) if m.upper() not in have]


def _safe_extract(zf, target):
    target = Path(target).resolve()
    for info in zf.infolist():
        out = (target / info.filename).resolve()
        if target != out and target not in out.parents:
            raise OracleError("hash_mismatch", "archive member escapes the target: %s" % info.filename)
    zf.extractall(target)


def unpack(profile):
    archive = archive_path(profile)
    names = zip_names(archive)
    missing = missing_members(profile, names)
    if missing:
        raise OracleError("hash_mismatch", "archive lacks %s" % ", ".join(missing))
    vd = vendor_dir(profile)
    tmp = Path(tempfile.mkdtemp(prefix="unpack-", dir=vd))
    with zipfile.ZipFile(archive) as z:
        _safe_extract(z, tmp)
    final = unpacked_dir(profile)
    if final.exists():
        shutil.rmtree(final)
    os.replace(tmp, final)
    return final


def setup(profile, log=print):
    """Run setup. Returns 0 when verified and unpacked, 1 when it stopped."""
    archive = archive_path(profile)
    expected = profile["archive"]["sha256"]
    fresh = not archive.exists()
    if fresh:
        download(profile, log)
    actual = sha256_file(archive)
    size = archive.stat().st_size
    if profile["archive"].get("bytes") and size != profile["archive"]["bytes"]:
        log("note: archive is %d bytes; the profile states %d" % (size, profile["archive"]["bytes"]))
    if expected is None:
        names = zip_names(archive)
        missing = missing_members(profile, names)
        log("archive sha256: %s (%d bytes, %d members)" % (actual, size, len(names)))
        log("contains: %s" % ", ".join(sorted(names)))
        if missing:
            log("missing expected members: %s" % ", ".join(missing))
        log("No hash is pinned in %s. Review the archive, pin this hash by hand, and run setup again."
            % profile["_path"])
        return 1
    if actual != expected:
        log("HASH MISMATCH for %s" % archive)
        log("  expected (profile): %s" % expected)
        log("  actual   (archive): %s" % actual)
        if fresh:  # resurrection-power 9.2: a download that fails the pin is not kept
            archive.unlink()
            log("Deleted the download. Nothing was booted.")
        log("Stopped. The unpacked program was not changed.")
        return 1
    unpack(profile)
    stamp_path(profile).write_text(json.dumps({"sha256": actual, "archive": archive.name}), encoding="utf-8")
    log("verified %s (sha256 %s) and unpacked into %s" % (archive.name, actual, unpacked_dir(profile)))
    return 0


def ensure(profile, log=None):
    """An installed power's setup: when the program is not verified in the workspace, download it
    from the profile's address, check it and unpack it, as scripts/setup.py does. Raises with
    setup's own words when it stops."""
    try:
        return require_verified(profile)
    except OracleError:
        pass
    lines = []
    code = setup(profile, log=lambda s: (lines.append(s), log and log(s)))
    if code != 0:
        mismatch = any(s.startswith("HASH MISMATCH") for s in lines)
        raise OracleError("hash_mismatch" if mismatch else "setup_required", "\n".join(lines))
    return require_verified(profile)


def require_verified(profile):
    """Raise unless setup has verified the archive against the profile's current hash."""
    expected = profile["archive"]["sha256"]
    stamp = stamp_path(profile)
    if expected is None:
        raise OracleError("setup_required", "the profile has no pinned hash; run scripts/setup.py")
    if not stamp.exists() or not unpacked_dir(profile).exists():
        raise OracleError("setup_required", "setup has not run; run scripts/setup.py")
    got = json.loads(stamp.read_text(encoding="utf-8")).get("sha256")
    if got != expected:
        raise OracleError("setup_required",
                          "setup verified a different hash than the profile states; run scripts/setup.py",
                          {"verified": got, "profile": expected})
    return unpacked_dir(profile)
