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


def text_settle(profile):
    """[[marker, keeps_output], ...] for every screen with a marker, in profile order, or None
    when no screen is marked keeps_output (the runner then uses the output rule everywhere)."""
    marked = [s for s in profile["screens"] if s["marker"] is not None]
    if not any(s.get("keeps_output") for s in marked):
        return None
    return [[s["marker"], bool(s.get("keeps_output"))] for s in marked]


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

    def _wait(self, req, answer_within):
        """A runner wait. When the profile marks any screen keeps_output, the request carries
        every marker in profile order with its mark, so the runner settles a marked screen on
        unchanged text and every other screen on quiet output (runner/settle.py, Q-030)."""
        order = text_settle(self.profile)
        if order:
            req = dict(req, text_settle=order)
        return self._call(req, answer_within)

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
        snap = self._wait({"op": "wait", "any": patterns, "changed_from": changed_from,
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
            p = screen.prompt(sdef, snap["rows"], screen.quiet_for(sdef, snap), settle)
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
        self._arrived(snap)
        return desc

    def _arrived(self, snap):
        """A wait succeeded on this screen. The settle after a send can end in a pause between
        the echo of typed keys and the program's reaction to them (seen in nd-trap-000004: the
        shape menu with T echoed, then the form). The screen a wait then settles on is where
        those keys led, so it becomes the last step's after hash. This keeps each step's after
        hash equal to the next step's before hash."""
        if self.transcript:
            self.transcript[-1]["screen_hash_after"] = snap["hash"]

    def confirm_unchanged(self, unchanged_hash):
        """After a send left the screen as it was, wait the profile's longer hold window for a
        change. Returns the screen: unchanged if the program really held, else the screen it
        settled on afterwards."""
        window_s = self.limits.get("hold_confirm_ms", 2000) / 1000
        t = self._bounded(None)
        snap = self._wait({"op": "wait", "any": [], "changed_from": unchanged_hash,
                           "settle_ms": self.limits["settle_ms"], "timeout_s": min(t, window_s)}, t)
        if snap.get("hash") != unchanged_hash:
            snap = self._settle_after({"hash": unchanged_hash})
        self.last = snap
        self.transcript[-1]["screen_hash_after"] = snap["hash"]
        return screen.describe(self.profile, snap)

    def still_on(self, screen_id, window_s, poll_s=0.5):
        """Watch the screen for window_s, whether or not it settles. True when every look read
        as screen_id, False as soon as one did not, None when the case has too little time
        left to watch the whole window. The last look is kept in self.last and becomes the
        last step's after hash."""
        if self.remaining() < window_s:
            return None
        end = time.monotonic() + window_s
        while True:
            snap = self.snapshot()
            if snap.get("exited") is not None or screen.identify(self.profile, snap["rows"])[0] != screen_id:
                return False
            if time.monotonic() >= end:
                if self.transcript:
                    self.transcript[-1]["screen_hash_after"] = snap["hash"]
                return True
            time.sleep(min(poll_s, max(0.0, end - time.monotonic())))

    def wait_prompt(self, screen_id, prompt_id, timeout_s=None, stops=()):
        """Wait for a prompt; prompts on the same screen are distinguished by their pattern.
        A settled screen that reads as one of `stops` ends the wait early and is returned."""
        sdef = screen_by_id(self.profile, screen_id)
        pat = next(x["pattern"] for x in sdef.get("prompts", []) if x["id"] == prompt_id)
        stop_markers = [screen_by_id(self.profile, sid)["marker"] for sid in stops]
        t = self._bounded(timeout_s)
        snap = self._wait({"op": "wait", "any": ([sdef["marker"]] if sdef["marker"] else []) + stop_markers,
                           "changed_from": None, "settle_ms": self.limits["settle_ms"], "timeout_s": t}, t)
        deadline = time.monotonic() + t

        def stopped(s):
            return s.get("matched") and screen.identify(self.profile, s["rows"])[0] in stops

        while not re.search(pat, screen.text_of(snap["rows"]), re.M) or stopped(snap):
            if stopped(snap):
                self.last = snap
                self._arrived(snap)
                return screen.describe(self.profile, snap)
            left = deadline - time.monotonic()
            if left <= 0 or snap.get("exited") is not None:
                self.last = snap
                raise OracleError("timeout", "waited %.1fs for prompt %s" % (t, prompt_id),
                                  {"screen": screen.describe(self.profile, snap), "waited_for": [screen_id],
                                   "prompt": prompt_id})
            snap = self._wait({"op": "wait", "any": [pat] + stop_markers, "changed_from": None,
                               "settle_ms": self.limits["settle_ms"], "timeout_s": min(left, t)}, left)
        self.last = snap
        self._arrived(snap)
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
                snap = self._wait({"op": "wait", "any": [], "changed_from": before["hash"],
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
        if not allow:
            self.last = self._settle_after(before)
        self.transcript[-1]["screen_hash_after"] = self.last["hash"]
        return screen.describe(self.profile, self.last)

    def _change_window_s(self):
        """How long a screen may stay unchanged after keys before it counts as not reacting.
        The same window the resend check uses."""
        return self.limits["settle_ms"] / 1000 * 4

    def _settle_after(self, before):
        """The screen once it has settled after a send. The snapshot that "send" returns is
        taken before the program redraws, so it cannot be used as the after screen. Wait for
        the screen to change from `before` and then stay quiet for the settle time; if it does
        not change within the change window, the after screen is the unchanged screen, settled."""
        settle = self.limits["settle_ms"]
        t = self._bounded(None)
        snap = self._wait({"op": "wait", "any": [], "changed_from": before["hash"] if before else None,
                           "settle_ms": settle, "timeout_s": min(t, self._change_window_s())}, t)
        if not snap.get("matched") and snap.get("exited") is None:
            # Unchanged, or changed but still drawing when the window closed: wait for quiet.
            t = self._bounded(None)
            snap = self._wait({"op": "wait", "any": [], "changed_from": None,
                               "settle_ms": settle, "timeout_s": t}, t)
        return snap

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
