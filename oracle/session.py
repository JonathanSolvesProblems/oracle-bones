"""One running container with one emulator, driven from the host.

Input is paced by the screen: every send waits for the screen or prompt the profile expects.
Resend happens only on screens the profile marks for it. Every step goes into a transcript
that carries no wall-clock time, so identical runs have identical transcripts.
"""

import json
import queue
import re
import threading
import time
import uuid

from . import config as config_mod
from . import fetch, sandbox, screen
from .errors import OracleError
from .profile import screen_by_id
from .runner import keys as keys_mod

ANSWER_GRACE_S = 15  # extra time for the runner to answer beyond the wait it was asked for


class Session:
    def __init__(self, profile, cfg=None, server_id=None, session_id=None, setup=None, argv=None,
                 extra_files=None, case_limit=True):
        self.profile = profile
        self.cfg = cfg or config_mod.load()
        self.id = session_id or str(uuid.uuid4())
        self.setup = setup or {}
        self.transcript = []
        self.resends = 0
        self.started = time.monotonic()
        self.last_used = self.started
        self.limits = profile["limits"]
        self.case_limit = case_limit  # interactive sessions are bounded by the idle limit instead
        self.proc = None
        self.drive = None
        self._lines = queue.Queue()
        keys_mod.check_profile_keys(profile)
        unpacked = fetch.require_verified(profile)
        sandbox.ensure_image(self.cfg)
        self.drive = sandbox.make_drive(profile, unpacked, self.setup.get("omit_dirs", ()))
        for name, data in (extra_files or {}).items():  # tests only: a stub target
            (self.drive / name).write_bytes(data)
        self.before = sandbox.snapshot(self.drive)
        try:
            self.proc = sandbox.launch(self.cfg, self.drive, server_id or sandbox.process_server_id(), self.id)
            threading.Thread(target=self._pump, daemon=True).start()
            env = dict(profile["env"])
            env["EMU2_DRIVE_C"] = "/drive"
            self.last = self._call({
                "op": "start", "program": "/drive/" + profile["entry"]["program"], "env": env,
                "rows": profile["screen"]["rows"], "cols": profile["screen"]["cols"],
                "pty_rows": profile["screen"]["pty_rows"], "frozen_time": profile["frozen_time"],
                "argv": argv}, 30)
        except Exception:
            self.close()
            raise

    # ---- protocol ---------------------------------------------------------------------

    def _pump(self):
        for line in self.proc.stdout:
            self._lines.put(line)
        self._lines.put(None)

    def _call(self, req, answer_within):
        if self.proc is None or self.proc.poll() is not None:
            raise OracleError("emulator_failed", "the session's container is not running")
        self.proc.stdin.write(json.dumps(req) + "\n")
        self.proc.stdin.flush()
        try:
            line = self._lines.get(timeout=answer_within + ANSWER_GRACE_S)
        except queue.Empty:
            self.close()
            raise OracleError("timeout", "the runner did not answer")
        if line is None:
            err = self.proc.stderr.read()[-500:] if self.proc.stderr else ""
            raise OracleError("emulator_failed", "the container ended: %s" % err.strip())
        rep = json.loads(line)
        if not rep.get("ok"):
            raise OracleError("emulator_failed", rep.get("error", "runner error"))
        self.last_used = time.monotonic()
        return rep["screen"]

    def remaining(self):
        if not self.case_limit:
            return float("inf")
        return self.limits["case_time_limit_s"] - (time.monotonic() - self.started)

    def _bounded(self, timeout_s):
        timeout_s = self.limits["wait_timeout_s"] if timeout_s is None else timeout_s
        timeout_s = min(timeout_s, self.limits["wait_timeout_s"])
        left = self.remaining()
        if left <= 0:
            self.close()
            raise OracleError("timeout", "the case exceeded its time limit of %ss" % self.limits["case_time_limit_s"])
        return min(timeout_s, left)

    # ---- screen -------------------------------------------------------------------------

    def snapshot(self):
        self.last = self._call({"op": "screen"}, 5)
        return self.last

    def read(self):
        return screen.describe(self.profile, self.snapshot())

    def wait(self, screen_ids=None, prompt_id=None, changed_from=None, settle_ms=None, timeout_s=None):
        """Wait until one of the screens (and the prompt, if given) shows on a settled screen.
        Raises timeout on expiry; the last screen is kept in self.last."""
        settle = self.limits["settle_ms"] if settle_ms is None else settle_ms
        patterns = []
        for sid in screen_ids or []:
            sdef = screen_by_id(self.profile, sid)
            if sdef["marker"] is None:
                raise OracleError("profile_invalid", "screen %r has no marker yet" % sid)
            patterns.append(sdef["marker"])
        t = self._bounded(timeout_s)
        snap = self._call({"op": "wait", "any": patterns, "changed_from": changed_from,
                           "settle_ms": settle, "timeout_s": t}, t)
        self.last = snap
        desc = screen.describe(self.profile, snap)
        if snap.get("matched") and screen_ids and desc["screen_id"] not in screen_ids:
            # The marker of an expected screen matched, but an earlier screen in profile order
            # claimed the text. Accept only when the expected screen is among the matches.
            if not set(screen_ids) & set(screen.identify(self.profile, snap["rows"])[1]):
                snap["matched"] = False
        if snap.get("matched") and prompt_id:
            sdef = screen_by_id(self.profile, screen_ids[0])
            p = screen.prompt(sdef, snap["rows"], snap["quiet_ms"], settle)
            if not p or p["id"] != prompt_id:
                pat = next(x["pattern"] for x in sdef.get("prompts", []) if x["id"] == prompt_id)
                if not re.search(pat, screen.text_of(snap["rows"]), re.M):
                    snap["matched"] = False
        if not snap.get("matched"):
            reason = snap.get("reason", "timeout")
            if reason == "exited":
                raise OracleError("emulator_failed", "the program exited with code %s" % snap.get("exited"),
                                  {"screen": desc})
            raise OracleError("timeout", "waited %.1fs for %s" % (t, screen_ids or "a change"),
                              {"screen": desc, "waited_for": screen_ids, "prompt": prompt_id})
        return desc

    def wait_prompt(self, screen_id, prompt_id, timeout_s=None):
        """Wait for a prompt; prompts on the same screen are distinguished by their pattern."""
        sdef = screen_by_id(self.profile, screen_id)
        pat = next(x["pattern"] for x in sdef.get("prompts", []) if x["id"] == prompt_id)
        t = self._bounded(timeout_s)
        snap = self._call({"op": "wait", "any": [sdef["marker"]] if sdef["marker"] else [], "changed_from": None,
                           "settle_ms": self.limits["settle_ms"], "timeout_s": t}, t)
        deadline = time.monotonic() + t
        while not re.search(pat, screen.text_of(snap["rows"]), re.M):
            left = deadline - time.monotonic()
            if left <= 0 or snap.get("exited") is not None:
                self.last = snap
                raise OracleError("timeout", "waited %.1fs for prompt %s" % (t, prompt_id),
                                  {"screen": screen.describe(self.profile, snap), "waited_for": [screen_id],
                                   "prompt": prompt_id})
            snap = self._call({"op": "wait", "any": [pat], "changed_from": None,
                               "settle_ms": self.limits["settle_ms"], "timeout_s": min(left, t)}, left)
        self.last = snap
        return screen.describe(self.profile, snap)

    # ---- input --------------------------------------------------------------------------

    def send(self, notation, expect=None, resend=None, _verifying=False):
        """Send keys. When the current screen allows resend and the screen does not change
        within the settle time, resend up to the retry limit, then raise input_ignored."""
        keys = keys_mod.parse(notation)
        if not _verifying:  # only the key verification script sends unverified keys
            keys_mod.check_verified(keys)
        before = self.last
        sid = screen.identify(self.profile, before["rows"])[0] if before else None
        allow = bool(sid and screen_by_id(self.profile, sid).get("resend"))
        if resend is False or self.setup.get("resend") is False:
            allow = False
        chunks = keys_mod.chunks(keys)
        step = {"step": len(self.transcript) + 1, "expect": expect, "keys": notation,
                "screen_hash_before": before["hash"] if before else None, "resend": False}
        self.last = self._call({"op": "send", "chunks": chunks}, 5)
        self.transcript.append(step)
        if allow:
            for attempt in range(self.limits["retry_limit"] + 1):
                t = self._bounded(None)
                snap = self._call({"op": "wait", "any": [], "changed_from": before["hash"],
                                   "settle_ms": self.limits["settle_ms"],
                                   "timeout_s": min(t, self.limits["settle_ms"] / 1000 * 4)}, t)
                self.last = snap
                if snap.get("matched"):
                    break
                if attempt == self.limits["retry_limit"]:
                    raise OracleError("input_ignored", "the screen did not change after %d resends of %s"
                                      % (self.limits["retry_limit"], notation),
                                      {"screen": screen.describe(self.profile, snap)})
                self.resends += 1
                self.transcript.append({"step": len(self.transcript) + 1, "expect": expect, "keys": notation,
                                        "screen_hash_before": before["hash"], "resend": True})
                self.last = self._call({"op": "send", "chunks": chunks}, 5)
        step_after = self.last["hash"]
        self.transcript[-1]["screen_hash_after"] = step_after
        return screen.describe(self.profile, self.last)

    # ---- end ----------------------------------------------------------------------------

    def changed_files(self):
        return sandbox.changed_files(self.drive, self.before) if self.drive else []

    def close(self):
        if self.proc is not None:
            if self.proc.poll() is None:
                try:
                    self.proc.stdin.write(json.dumps({"op": "kill"}) + "\n")
                    self.proc.stdin.flush()
                    self.proc.wait(timeout=5)
                except Exception:
                    pass
            if self.proc.poll() is None:
                self.proc.kill()
                try:
                    self.proc.wait(timeout=10)
                except Exception:
                    pass
                # Killing the docker client does not always stop the container; remove it by label.
                try:
                    left = sandbox.labelled_containers(sandbox.LABEL_SESSION, self.id)
                    sandbox.remove_containers([cid for cid, _ in left])
                except OracleError:
                    pass
            self.proc = None
        if self.drive is not None:
            sandbox.remove_drive(self.drive)
            self.drive = None

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()
