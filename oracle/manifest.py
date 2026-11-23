"""oracle/goldens/MANIFEST.json: the sha256 of every file the runner stored under goldens/.

Only the recorder calls update(), inside its write lock, after every store and replace. check()
walks the directory and lists every file missing from the manifest, every entry without a
file, and every hash that differs.
"""

import hashlib
import json
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

NAME = "MANIFEST.json"


def path(root):
    return Path(root) / NAME


def load(root):
    p = path(root)
    if not p.exists():
        return {}
    return json.loads(p.read_text(encoding="utf-8"))["files"]


def _write(root, files):
    p = path(root)
    p.parent.mkdir(parents=True, exist_ok=True)
    body = {"note": "sha256 of every file under oracle/goldens/, kept by the recorder. Do not edit.",
            "files": dict(sorted(files.items()))}
    tmp = p.with_name(NAME + ".tmp")
    tmp.write_bytes((json.dumps(body, indent=2) + "\n").encode("utf-8"))
    os.replace(tmp, p)


def update(root, changes):
    """Apply {relative path: sha256, or None for a removed file} to the manifest."""
    files = load(root)
    for rel, digest in changes.items():
        if digest is None:
            files.pop(rel, None)
        else:
            files[rel] = digest
    _write(root, files)
    return files


HASH_THREADS = 32


def _digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def on_disk(root):
    """sha256 of every file under root except the manifest. Every file is read and hashed on
    every call. The reads run in a thread pool: the first open of each file after it is written
    waits on the on-access virus scan (about 5 ms a file on the development laptop), and with
    some 2,000 files a serial walk spent 10 to 20 s waiting."""
    root = Path(root)
    if not root.exists():
        return {}
    files = [p for p in root.rglob("*") if p.is_file() and p != path(root)]
    with ThreadPoolExecutor(max_workers=HASH_THREADS) as pool:
        digests = list(pool.map(_digest, files))
    return {p.relative_to(root).as_posix(): d for p, d in zip(files, digests)}


def check(root):
    """Problems with the goldens under root, as readable lines. Empty when everything matches."""
    listed = load(root)
    found = on_disk(root)
    problems = []
    for rel in sorted(set(found) - set(listed)):
        problems.append("not in the manifest: %s" % rel)
    for rel in sorted(set(listed) - set(found)):
        problems.append("missing: %s" % rel)
    for rel in sorted(set(found) & set(listed)):
        if found[rel] != listed[rel]:
            problems.append("hash differs: %s (manifest %s, file %s)" % (rel, listed[rel], found[rel]))
    return problems
