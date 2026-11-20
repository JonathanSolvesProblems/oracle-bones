"""Containers and temporary drives.

Each case or interactive session gets a fresh temporary directory outside the repository,
filled with the profile's drive layout and a copy of the unpacked program. It is the only
host path mounted into the container, and it is deleted when the case or session ends.
"""

import hashlib
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from . import config, paths
from .errors import OracleError

LABEL_SERVER = "oracle-bones.server"
LABEL_SESSION = "oracle-bones.session"
CONTAINER_USER = "10001:10001"


def docker(*args, check=True, timeout=120, **kw):
    try:
        r = subprocess.run(["docker", *args], capture_output=True, text=True, timeout=timeout, **kw)
    except FileNotFoundError:
        raise OracleError("docker_unavailable", "Docker is not installed or not on PATH.")
    except subprocess.TimeoutExpired:
        raise OracleError("docker_unavailable", "Docker did not answer within %ds." % timeout)
    if check and r.returncode != 0:
        if "Cannot connect to the Docker daemon" in r.stderr or "docker daemon is not running" in r.stderr \
                or "error during connect" in r.stderr:
            raise OracleError("docker_unavailable", "Docker is not running. Start Docker Desktop and try again.")
        raise OracleError("emulator_failed", "docker %s failed: %s" % (args[0], r.stderr.strip()[-500:]))
    return r


def docker_available():
    try:
        docker("info", "--format", "{{.ServerVersion}}", timeout=30)
        return True
    except OracleError:
        return False


def ensure_image(cfg=None, log=print):
    cfg = cfg or config.load()
    tag = config.image_tag(cfg)
    if docker("image", "inspect", tag, check=False).returncode == 0:
        return tag
    log("building %s (emu2 %s)" % (tag, cfg["emu2"]["commit"]))
    docker("build", "-f", str(paths.ORACLE / "Dockerfile"),
           "--build-arg", "EMU2_REPO=" + cfg["emu2"]["repo"],
           "--build-arg", "EMU2_COMMIT=" + cfg["emu2"]["commit"],
           "-t", tag, str(paths.ORACLE), timeout=1800)
    return tag


def launch(cfg, drive, server_id, session_id):
    """Start a container whose stdin and stdout speak the runner's JSON-lines protocol."""
    try:
        return subprocess.Popen(["docker", *run_args(cfg, drive, server_id, session_id)],
                                stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                text=True, encoding="utf-8", bufsize=1)
    except FileNotFoundError:
        raise OracleError("docker_unavailable", "Docker is not installed or not on PATH.")


def run_args(cfg, drive, server_id, session_id, name=None):
    """The full `docker run` argument list. Property 11 checks this function."""
    c = cfg["container"]
    args = ["run", "--rm", "-i",
            "--network", "none",
            "--user", CONTAINER_USER,
            "--cap-drop", "ALL",
            "--security-opt", "no-new-privileges",
            "--read-only", "--tmpfs", "/tmp:rw,size=16m",
            "--cpus", c["cpus"], "--memory", c["memory"], "--memory-swap", c["memory"],
            "--pids-limit", str(c["pids"]),
            "--label", "%s=%s" % (LABEL_SERVER, server_id),
            "--label", "%s=%s" % (LABEL_SESSION, session_id),
            "-v", "%s:/drive" % Path(drive).resolve()]
    if name:
        args += ["--name", name]
    args.append(config.image_tag(cfg))
    return args


# ---- temporary drives ------------------------------------------------------------------

def _inside_repo(p):
    p = Path(p).resolve()
    root = paths.ROOT.resolve()
    return p == root or root in p.parents


def make_drive(profile, unpacked, omit_dirs=()):
    """Create a fresh drive outside the repository. Returns its path."""
    base = Path(tempfile.mkdtemp(prefix="oracle-drive-"))
    if _inside_repo(base):
        shutil.rmtree(base)
        raise OracleError("internal", "the temp directory is inside the repository: %s" % base)
    omit = {d.upper() for d in omit_dirs}
    for d in profile["drive"]["dirs"]:
        if d.upper() not in omit:
            (base / d).mkdir(parents=True, exist_ok=True)
    prog = base / profile["drive"]["program_dir"]
    prog.mkdir(parents=True, exist_ok=True)
    for src in Path(unpacked).rglob("*"):
        if src.is_file():
            dest = prog / src.relative_to(unpacked)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(src, dest)
    # The container user is not the host user; let it write anywhere in the drive.
    for p in [base, *base.rglob("*")]:
        try:
            os.chmod(p, 0o777 if p.is_dir() else 0o666)
        except OSError:
            pass
    return base


def snapshot(drive):
    """sha256 of every file in the drive, keyed by its path relative to the drive."""
    out = {}
    for p in Path(drive).rglob("*"):
        if p.is_file():
            out[p.relative_to(drive).as_posix()] = hashlib.sha256(p.read_bytes()).hexdigest()
    return out


def changed_files(drive, before):
    """Files created or changed since `before`, as [{path, sha256}] sorted by path."""
    after = snapshot(drive)
    return [{"path": k, "sha256": v} for k, v in sorted(after.items()) if before.get(k) != v]


def copy_files(drive, files, dest):
    dest = Path(dest)
    for f in files:
        target = dest / f["path"]
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(Path(drive) / f["path"], target)


def remove_drive(drive):
    shutil.rmtree(drive, ignore_errors=True)
