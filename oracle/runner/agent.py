"""In-container runner. Owns one emulator process under a pseudo-terminal and a pyte screen.

Speaks JSON lines: one request per line on stdin, one reply per line on stdout.

  {"op": "start", "program": "/drive/QUICK2/QT.EXE", "env": {...}, "rows": 25, "cols": 80,
   "pty_rows": 27, "frozen_time": "1995-06-01 12:00:00" | null, "argv": [...] (optional, tests)}
  {"op": "screen"}
  {"op": "wait", "any": [regex, ...], "changed_from": hash | null, "settle_ms": 150,
   "timeout_s": 10}
  {"op": "send", "chunks": ["<hex>", ...]}
  {"op": "kill"}

Every reply carries the screen: rows (the first `rows` lines), sha256 of the rows joined with
"\\n", cursor, and whether the program has exited. This file must not import anything outside
the standard library and pyte, because it runs in the image.
"""

import fcntl
import hashlib
import json
import os
import pty
import re
import select
import signal
import struct
import sys
import termios
import threading
import time

import pyte

CHUNK_GAP_S = 0.05  # between key chunks, so a lone ESC is not read as the start of a sequence
POLL_S = 0.02


class Emulator:
    def __init__(self, req):
        self.rows = req["rows"]
        self.cols = req["cols"]
        self.pty_rows = req["pty_rows"]
        self.screen = pyte.Screen(self.cols, self.pty_rows)
        self.stream = pyte.ByteStream(self.screen)
        self.lock = threading.Lock()
        self.version = 0
        self.changed_at = time.monotonic()
        self.sent_at = 0.0
        self.exit_code = None
        env = {"PATH": "/usr/local/bin:/usr/bin:/bin", "HOME": "/tmp", "TERM": "xterm"}
        env.update(req.get("env", {}))
        if req.get("frozen_time"):
            env["LD_PRELOAD"] = _faketime_lib()
            # Start the clock at the fixed time on every run and let it run. A clock that
            # never moves stops emu2's BIOS tick, and QUICK-2 then hangs on its title screen.
            env["FAKETIME"] = "@" + req["frozen_time"]
            env["FAKETIME_DONT_FAKE_MONOTONIC"] = "1"
            env["FAKETIME_DONT_RESET"] = "1"
        argv = req.get("argv") or ["emu2", req["program"]]
        pid, fd = pty.fork()
        if pid == 0:
            try:
                os.chdir("/drive")
                os.execvpe(argv[0], argv, env)
            finally:
                os._exit(127)
        self.pid, self.fd = pid, fd
        fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", self.pty_rows, self.cols, 0, 0))
        os.kill(pid, signal.SIGWINCH)
        self.reader = threading.Thread(target=self._read, daemon=True)
        self.reader.start()

    def _read(self):
        while True:
            try:
                r, _, _ = select.select([self.fd], [], [], 0.2)
                if not r:
                    if self._reap():
                        return
                    continue
                data = os.read(self.fd, 65536)
            except OSError:
                data = b""
            if not data:
                self._reap(block=True)
                return
            with self.lock:
                self.stream.feed(data)
                self.version += 1
                self.changed_at = time.monotonic()

    def _reap(self, block=False):
        if self.exit_code is not None:
            return True
        try:
            pid, status = os.waitpid(self.pid, 0 if block else os.WNOHANG)
        except ChildProcessError:
            self.exit_code = -1
            return True
        if pid == 0:
            return False
        self.exit_code = os.waitstatus_to_exitcode(status)
        return True

    def snapshot(self):
        with self.lock:
            rows = [self.screen.display[i] for i in range(self.rows)]
            cursor = {"row": self.screen.cursor.y, "col": self.screen.cursor.x}
            extra = [self.screen.display[i] for i in range(self.rows, self.pty_rows)]
            quiet_ms = int((time.monotonic() - max(self.changed_at, self.sent_at)) * 1000)
            version = self.version
        text = "\n".join(rows)
        return {
            "rows": rows,
            "hash": hashlib.sha256(text.encode("utf-8")).hexdigest(),
            "cursor": cursor,
            "quiet_ms": quiet_ms,
            "version": version,
            "overflow_rows_used": any(r.strip() for r in extra),
            "exited": self.exit_code,
        }

    def wait(self, req):
        regexes = [re.compile(p, re.M) for p in req.get("any", [])]
        changed_from = req.get("changed_from")
        settle_ms = req.get("settle_ms", 0)
        deadline = time.monotonic() + req["timeout_s"]
        while True:
            snap = self.snapshot()
            text = "\n".join(snap["rows"])
            ok = True
            if regexes and not any(r.search(text) for r in regexes):
                ok = False
            if changed_from is not None and snap["hash"] == changed_from:
                ok = False
            if snap["quiet_ms"] < settle_ms:
                ok = False
            if ok:
                snap["matched"] = True
                return snap
            if snap["exited"] is not None and snap["quiet_ms"] >= settle_ms:
                snap["matched"] = False
                snap["reason"] = "exited"
                return snap
            if time.monotonic() >= deadline:
                snap["matched"] = False
                snap["reason"] = "timeout"
                return snap
            time.sleep(POLL_S)

    def send(self, chunks):
        for i, chunk in enumerate(chunks):
            if i:
                time.sleep(CHUNK_GAP_S)
            os.write(self.fd, bytes.fromhex(chunk))
        with self.lock:
            self.sent_at = time.monotonic()

    def kill(self):
        try:
            os.kill(self.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        self._reap(block=True)


def _faketime_lib():
    for p in ("/usr/lib/x86_64-linux-gnu/faketime/libfaketime.so.1",
              "/usr/lib/aarch64-linux-gnu/faketime/libfaketime.so.1",
              "/usr/lib/faketime/libfaketime.so.1"):
        if os.path.exists(p):
            return p
    raise RuntimeError("libfaketime not found")


def reply(obj):
    sys.stdout.write(json.dumps(obj) + "\n")
    sys.stdout.flush()


def main():
    emu = None
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            op = req.get("op")
            if op == "start":
                if emu is not None:
                    raise RuntimeError("already started")
                emu = Emulator(req)
                reply({"ok": True, "screen": emu.snapshot()})
            elif emu is None:
                raise RuntimeError("not started")
            elif op == "screen":
                reply({"ok": True, "screen": emu.snapshot()})
            elif op == "wait":
                reply({"ok": True, "screen": emu.wait(req)})
            elif op == "send":
                emu.send(req["chunks"])
                reply({"ok": True, "screen": emu.snapshot()})
            elif op == "kill":
                emu.kill()
                reply({"ok": True, "screen": emu.snapshot()})
                return
            else:
                raise RuntimeError("unknown op %r" % op)
        except Exception as e:  # reported to the host, which maps it to emulator_failed
            reply({"ok": False, "error": "%s: %s" % (type(e).__name__, e)})
    if emu is not None:
        emu.kill()


if __name__ == "__main__":
    main()
