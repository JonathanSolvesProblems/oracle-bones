"""Task 3.4: the sandbox, checked from inside a live container."""

import json
import uuid

from oracle import config, fetch, sandbox

CHECK = (
    "{ "
    "echo UID=$(id -u); "
    "echo IFACES=$(tail -n +3 /proc/net/dev | cut -d: -f1 | tr -d ' ' | tr '\\n' ','); "
    "echo DATE=$(date '+%Y-%m-%d'); "
    "echo MOUNTS=$(awk '{print $5}' /proc/self/mountinfo | tr '\\n' ','); "
    "touch /drive/w && echo DRIVE_WRITABLE=yes; "
    "(touch /etc/x 2>/dev/null && echo ROOT_WRITABLE=yes) || echo ROOT_WRITABLE=no; "
    "} > /drive/check.txt; echo CHECK_DONE; sleep 30"
)

DOCKER_MANAGED = {"/", "/proc", "/dev", "/dev/pts", "/dev/mqueue", "/dev/shm", "/sys", "/sys/fs/cgroup",
                  "/tmp", "/etc/hosts", "/etc/hostname", "/etc/resolv.conf", "/dev/console"}


def run_check(prof, argv, frozen_time):
    cfg = config.load()
    drive = sandbox.make_drive(prof, fetch.require_verified(prof))
    proc = sandbox.launch(cfg, drive, sandbox.process_server_id(), str(uuid.uuid4()))
    try:
        def call(req):
            proc.stdin.write(json.dumps(req) + "\n")
            proc.stdin.flush()
            return json.loads(proc.stdout.readline())
        call({"op": "start", "program": "", "argv": argv, "env": {}, "rows": 25, "cols": 80,
              "pty_rows": 27, "frozen_time": frozen_time})
        call({"op": "wait", "any": ["CHECK_DONE"], "settle_ms": 100, "timeout_s": 20})
        call({"op": "kill"})
        text = (drive / "check.txt").read_text()
        return dict(line.split("=", 1) for line in text.splitlines() if "=" in line)
    finally:
        proc.kill()
        sandbox.remove_drive(drive)


def test_sandbox_from_inside(live):
    got = run_check(live, ["sh", "-c", CHECK], live["frozen_time"])
    assert got["UID"] != "0"
    assert [i for i in got["IFACES"].split(",") if i] == ["lo"]
    mounts = {m for m in got["MOUNTS"].split(",") if m}
    extra = {m for m in mounts - DOCKER_MANAGED if not m.startswith(("/proc/", "/sys/"))}
    assert extra == {"/drive"}, extra
    assert got["DRIVE_WRITABLE"] == "yes"
    assert got["ROOT_WRITABLE"] == "no"
    assert got["DATE"] == live["frozen_time"].split()[0]
