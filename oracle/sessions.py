"""Session ids, the concurrency limit, idle sweeping, and container cleanup.

One SessionManager per server process. It writes oracle/out/servers/<uuid>.pid so that a
later server can tell which labelled containers belong to a server that is no longer running.
"""

import atexit
import os
import threading
import time
import uuid

from . import config as config_mod
from . import paths, sandbox
from .errors import OracleError
from .session import Session

SWEEP_EVERY_S = 30


class SessionManager:
    def __init__(self, cfg=None, start_sweeper=True):
        self.cfg = cfg or config_mod.load()
        self.server_id = str(uuid.uuid4())
        self.slots = threading.BoundedSemaphore(self.cfg["max_sessions"])
        self.sessions = {}
        self.ended = {}  # session id -> why it ended, for clearer errors
        self.lock = threading.Lock()
        self.pid_dir = paths.OUT / "servers"
        self.pid_dir.mkdir(parents=True, exist_ok=True)
        (self.pid_dir / ("%s.pid" % self.server_id)).write_text(str(os.getpid()))
        self.removed_at_start = self.remove_orphans()
        atexit.register(self.shutdown_all)
        self._stop = threading.Event()
        if start_sweeper:
            threading.Thread(target=self._sweeper, daemon=True).start()

    # ---- orphans ------------------------------------------------------------------------

    def remove_orphans(self):
        """Remove containers labelled by a server that is no longer running."""
        try:
            found = sandbox.labelled_containers(sandbox.LABEL_SERVER)
        except OracleError:
            return []
        dead = []
        for cid, server in found:
            if server == self.server_id:
                continue
            pidfile = self.pid_dir / ("%s.pid" % server)
            alive = False
            if pidfile.exists():
                try:
                    alive = sandbox.pid_alive(int(pidfile.read_text().strip()))
                except ValueError:
                    alive = False
            if not alive:
                dead.append(cid)
                if pidfile.exists():
                    pidfile.unlink()
        sandbox.remove_containers(dead)
        return dead

    # ---- sessions -----------------------------------------------------------------------

    def acquire(self, block):
        if not self.slots.acquire(blocking=block):
            raise OracleError("session_limit", "all %d session slots are in use" % self.cfg["max_sessions"],
                              {"max_sessions": self.cfg["max_sessions"]})

    def release(self):
        self.slots.release()

    def start(self, profile, setup=None):
        self.acquire(block=False)
        try:
            s = Session(profile, self.cfg, server_id=self.server_id, setup=setup, case_limit=False)
        except Exception:
            self.release()
            raise
        with self.lock:
            self.sessions[s.id] = s
        return s

    def get(self, sid):
        with self.lock:
            s = self.sessions.get(sid)
        if s is None:
            why = self.ended.get(sid)
            raise OracleError("session_not_found",
                              "no session %s%s" % (sid, " (%s)" % why if why else ""), {"ended": why})
        return s

    def end(self, sid, why="shut down"):
        with self.lock:
            s = self.sessions.pop(sid, None)
            if s is not None:
                self.ended[sid] = why
        if s is None:
            return False
        try:
            s.close()
        finally:
            self.release()
        return True

    def end_all(self, why="shut down"):
        with self.lock:
            ids = list(self.sessions)
        return [sid for sid in ids if self.end(sid, why)]

    def sweep(self, now=None):
        now = time.monotonic() if now is None else now
        limit = self.cfg["session_idle_limit_s"]
        with self.lock:
            idle = [sid for sid, s in self.sessions.items() if now - s.last_used > limit]
        for sid in idle:
            self.end(sid, "timed out after %ss idle" % limit)
        return idle

    def _sweeper(self):
        while not self._stop.wait(SWEEP_EVERY_S):
            self.sweep()

    def shutdown_all(self):
        self._stop.set()
        self.end_all("server exited")
        try:
            sandbox.remove_containers([c for c, _ in sandbox.labelled_containers(sandbox.LABEL_SERVER, self.server_id)])
        except OracleError:
            pass
        pidfile = self.pid_dir / ("%s.pid" % self.server_id)
        if pidfile.exists():
            pidfile.unlink()
