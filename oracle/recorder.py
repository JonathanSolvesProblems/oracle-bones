"""The only code that writes under oracle/goldens/.

A recording run runs a case in a fresh container and stores what the binary printed. A
timeout or an unknown final screen goes to the run log and the ledger and is never stored.

There are two ways in:
- create() and create_batch(), which the MCP tools use. They only create new case ids and
  refuse an id that already exists.
- rerecord(), which replaces one golden. Only the command line calls it
  (python -m oracle.record --rerecord <case-id>), and it logs the old and new hashes in the
  ledger's `rerecords`.

Control cases are recorded before any other case. A control case that differs from what the
profile expects is a harness failure: nothing is stored for the control cases and the run stops.
"""

import hashlib
import json
import os
import queue
import shutil
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from . import cases, generator, ledger, manifest, paths, runs
from . import config as config_mod
from . import profile as profile_mod
from .errors import OracleError

STORED = ("result", "rejected", "error", "observed")
SCREEN_FILE = runs.SCREEN_FILE


def _now():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def json_bytes(obj):
    return (json.dumps(obj, indent=2) + "\n").encode("utf-8")


def screen_bytes(rows):
    return ("\n".join(rows) + "\n").encode("utf-8")


class Store:
    """Goldens on disk: cases/<case-id>.json and captures/<case-id>/. Every write holds the lock,
    and every file is written under a temporary name and renamed into place."""

    def __init__(self, root=None):
        self.root = Path(root) if root else paths.GOLDENS
        self.lock = threading.RLock()
        self._reserved = set()

    @property
    def cases_dir(self):
        return self.root / "cases"

    @property
    def captures_dir(self):
        return self.root / "captures"

    def case_file(self, cid):
        return self.cases_dir / ("%s.json" % cid)

    def ids(self):
        if not self.cases_dir.exists():
            return []
        return sorted(p.stem for p in self.cases_dir.glob("*.json"))

    def taken_ids(self):
        with self.lock:
            return sorted(set(self.ids()) | self._reserved)

    def exists(self, cid):
        return self.case_file(cid).exists()

    def load(self, cid):
        p = self.case_file(cid)
        if not p.exists():
            raise OracleError("invalid_arguments", "no golden %s" % cid)
        return json.loads(p.read_text(encoding="utf-8"))

    def golden_sha256(self, cid):
        return sha256(self.case_file(cid).read_bytes())

    def all(self):
        return [self.load(c) for c in self.ids()]

    def reserve(self, cids):
        """Claim new ids before dispatch. Refuses any id that is stored or already claimed."""
        with self.lock:
            taken = sorted(c for c in cids if self.exists(c) or c in self._reserved)
            if taken:
                raise OracleError("invalid_arguments",
                                  "case ids already exist; recording here never replaces a golden",
                                  {"existing": taken})
            self._reserved.update(cids)

    def release(self, cids):
        with self.lock:
            self._reserved.difference_update(cids)

    def capture_rel(self, cid):
        d = self.captures_dir / cid
        try:
            return d.resolve().relative_to(paths.ROOT.resolve()).as_posix() + "/"
        except ValueError:
            return d.as_posix() + "/"

    def rel(self, p):
        return Path(p).relative_to(self.root).as_posix()

    def _capture_files(self, cid):
        d = self.captures_dir / cid
        return sorted(self.rel(p) for p in d.rglob("*") if p.is_file()) if d.exists() else []

    def write(self, golden, screens, drive_files, replace=False):
        """Store one golden and its capture. Returns {path under the goldens root: sha256, or
        None for a file that was removed}."""
        cid = golden["id"]
        with self.lock:
            if self.exists(cid) and not replace:
                raise OracleError("invalid_arguments", "golden %s already exists" % cid, {"existing": [cid]})
            if replace and not self.exists(cid):
                raise OracleError("invalid_arguments", "no golden %s to replace" % cid)
            changes = {rel: None for rel in self._capture_files(cid)} if replace else {}
            entries = {SCREEN_FILE % i: screen_bytes(rows) for i, rows in enumerate(screens)}
            for path, data in sorted(drive_files.items()):
                entries["files/" + path] = data
            self.captures_dir.mkdir(parents=True, exist_ok=True)
            tmp = self.captures_dir / (".tmp-%s-%s" % (cid, uuid.uuid4().hex[:8]))
            for name, data in entries.items():
                t = tmp / name
                t.parent.mkdir(parents=True, exist_ok=True)
                t.write_bytes(data)
            tmp.mkdir(parents=True, exist_ok=True)
            final = self.captures_dir / cid
            old = None
            if final.exists():
                old = self.captures_dir / (".old-%s-%s" % (cid, uuid.uuid4().hex[:8]))
                os.replace(final, old)
            os.replace(tmp, final)
            if old is not None:
                shutil.rmtree(old)
            for name, data in entries.items():
                changes["captures/%s/%s" % (cid, name)] = sha256(data)
            data = json_bytes(golden)
            self.cases_dir.mkdir(parents=True, exist_ok=True)
            gtmp = self.cases_dir / ("%s.json.tmp" % cid)
            gtmp.write_bytes(data)
            os.replace(gtmp, self.case_file(cid))
            changes["cases/%s.json" % cid] = sha256(data)
            self._reserved.discard(cid)
            self._after_write(changes)
            return changes

    def _after_write(self, changes):
        manifest.update(self.root, changes)


SAMPLE_EVERY = 20


def profile_cases_note(ids):
    """What a recording adds to its reply when it first recorded the profile's own cases
    (resurrection-power Requirement 10.4): in a new workspace that is dozens of boots and minutes
    of silence, and goldens the user did not ask for."""
    if not ids:
        return {}
    return {"profile_cases": list(ids),
            "note": "Before this case the oracle recorded the profile's own %d control case(s), which were not "
                    "stored yet. They check the profile against the program, and they are in oracle/goldens/ "
                    "beside this one. Later recordings skip this step." % len(ids)}


def sequence(cid):
    tail = cid.rsplit("-", 1)[-1]
    return int(tail) if tail.isdigit() else None


def sampled(job):
    """Requirement 8.1: every control case, and every case whose sequence is a multiple of 20."""
    if job.get("control"):
        return True
    seq = sequence(job["id"])
    return seq is not None and seq % SAMPLE_EVERY == 0


def fingerprint(got):
    """What two runs of one case must agree on: outcome, raw field text, hashes of files written."""
    return {"outcome": got.get("outcome"), "printed": dict(got.get("printed", {})),
            "files": {f["path"]: f["sha256"] for f in got.get("files", [])}}


def captures_all(job):
    """Every screen is captured for control cases and for cases recorded through MCP one at a
    time, which requirements cite. Generated batch cases keep only the final screen; their
    transcript still holds the hash of every screen."""
    return job.get("control") is not None or job.get("seed") is None


def capture_screens(got, every):
    """Every screen when `every`, else the final screen."""
    final = got.get("final") or []
    if not every:
        return [final]
    screens = [s["rows"] for s in got.get("screens", [])]
    if not screens or screens[-1] != final:
        screens.append(final)
    return screens


class Recorder:
    def __init__(self, store=None, cfg=None):
        self.store = store or Store()
        self.cfg = cfg or config_mod.load()

    # ---- one run ------------------------------------------------------------------------

    def _run(self, profile, job, manager=None, block=True):
        if manager is not None:
            manager.acquire(block=block)
        try:
            return cases.run(profile, job["mode"], job["shape"], job["inputs"], control=job.get("control"),
                             cfg=self.cfg, server_id=manager.server_id if manager else None,
                             capture_all=captures_all(job))
        finally:
            if manager is not None:
                manager.release()

    def _log(self, kind, job, got):
        run_id = runs.new_run_id()
        d = runs.write_run_log(run_id, got, {"kind": kind, "case_id": job["id"],
                                             "control": job["control"]["id"] if job.get("control") else None})
        runs.note_in_ledger(run_id, got, d)
        return run_id, d

    def golden(self, profile, job, got):
        control = job.get("control")
        return {
            "id": job["id"],
            "control": control is not None,
            "expected_screen": control["expect"].get("screen_id") if control else None,
            "mode": job["mode"], "shape": job["shape"],
            "inputs": dict(job["inputs"]),
            "outcome": got["outcome"],
            "printed": got.get("printed", {}),
            "message": got.get("message"),
            "held_prompt": got.get("held_prompt"),
            "stuck_screen": got.get("stuck_screen"),
            "seed": job.get("seed"), "generator_version": job.get("generator_version"),
            "range_set": job.get("range_set"),
            "emu2_commit": self.cfg["emu2"]["commit"],
            "profile_version": profile["version"], "profile_sha256": profile["_sha256"],
            "archive_sha256": profile["archive"]["sha256"],
            "transcript": got["transcript"],
            "screens": "all" if captures_all(job) else "final",
            "capture_path": self.store.capture_rel(job["id"]),
            "files": got.get("files", []),
            "recorded_at": _now(),
        }

    def attempt(self, profile, job, manager=None, block=True):
        """Run a job, and run it a second time when it is in the determinism sample.
        Returns (got, run_id, run dir, control differences). got["determinism"] is None when
        the job was not sampled or did not answer, else "same" or "differs"."""
        got = self._run(profile, job, manager, block)
        run_id, d = self._log("recording", job, got)
        got["determinism"] = None
        if sampled(job) and got["outcome"] in STORED:
            second = self._run(profile, job, manager, block=True)
            self._log("determinism", job, second)
            a, b = fingerprint(got), fingerprint(second)
            got["determinism"] = "same" if a == b else "differs"
            if a != b:
                ledger.log_nondeterminism(job["id"], a, b)
        diffs = cases.check_control(profile, job["control"], got) if job.get("control") else []
        return got, run_id, d, diffs

    def _store(self, profile, job, got, replace=False):
        golden = self.golden(profile, job, got)
        self.store.write(golden, capture_screens(got, captures_all(job)), got.get("drive_files", {}), replace)
        return golden

    @staticmethod
    def _summary(job, got, run_id, d, stored, capture_path):
        return {"run_id": run_id, "case_id": job["id"] if stored else None, "outcome": got["outcome"],
                "screen_id": got.get("screen_id"), "printed": got.get("printed", {}),
                "message": got.get("message"), "files": got.get("files", []),
                "capture_path": capture_path if stored else runs.rel(d), "recorded": stored,
                "reason": got.get("reason"), "determinism": got.get("determinism")}

    # ---- control cases ------------------------------------------------------------------

    def control_jobs(self, profile, only_missing=True):
        out = []
        for c in profile["controls"]:
            if only_missing and self.store.exists(c["id"]):
                continue
            out.append({"id": c["id"], "mode": c["mode"], "shape": c["shape"], "inputs": dict(c["inputs"]),
                        "control": c, "seed": None, "generator_version": None})
        return out

    def ensure_controls(self, profile, manager=None):
        """Record every control case not yet stored, before any other case. All or nothing."""
        jobs = self.control_jobs(profile)
        if not jobs:
            return []
        self.store.reserve([j["id"] for j in jobs])
        try:
            done = self.parallel(profile, jobs, manager, lambda *item: item)
            errors = [{"case_id": job["id"], "error": err.to_dict()["error"]}
                      for job, got, run_id, d, diffs, err in done if err is not None]
            if errors:
                raise OracleError("internal", "harness failure: a control case could not run; "
                                  "nothing was stored and the run stopped", {"failed": errors})
            done = [item[:5] for item in sorted(done, key=lambda item: item[0]["id"])]
            failed = [{"case_id": job["id"], "run_id": run_id, "differences": diffs}
                      for job, got, run_id, d, diffs in done if diffs or got["outcome"] not in STORED]
            if failed:
                raise OracleError("internal", "harness failure: a control case differs from the profile; "
                                  "nothing was stored and the run stopped", {"failed": failed})
            out = []
            for job, got, run_id, d, _ in done:
                self._store(profile, job, got)
                ledger.record_run(got.get("visited", []), got.get("keys_by_screen", {}))
                out.append(self._summary(job, got, run_id, d, True, self.store.capture_rel(job["id"])))
            return out
        finally:
            self.store.release([j["id"] for j in jobs])

    # ---- create-only path (MCP) ---------------------------------------------------------

    def _new_id(self, profile, mode, shape):
        with self.store.lock:
            prefix = generator.case_prefix(profile, mode, shape)
            taken = self.store.taken_ids() + [c["id"] for c in profile["controls"]]
            cid = "%s-%06d" % (prefix, generator.next_sequences(profile, taken).get(prefix, 1))
            self.store.reserve([cid])
            return cid

    def parallel(self, profile, jobs, manager, on_result):
        """Run jobs on up to max_sessions workers. Each finished job goes through a queue to one
        writer thread, which calls on_result(job, got, run_id, run dir, control differences,
        error). Returns what on_result returned, in finishing order."""
        q = queue.Queue()
        results, failures = [], []

        def writer():
            while True:
                item = q.get()
                if item is None:
                    return
                try:
                    results.append(on_result(*item))
                except BaseException as e:  # noqa: BLE001  re-raised on the calling thread
                    failures.append(e)

        def work(job):
            try:
                q.put((job,) + self.attempt(profile, job, manager) + (None,))
            except OracleError as e:
                q.put((job, None, None, None, None, e))

        wt = threading.Thread(target=writer, name="golden-writer", daemon=True)
        wt.start()
        try:
            with ThreadPoolExecutor(self.cfg["max_sessions"], thread_name_prefix="case") as ex:
                list(ex.map(work, jobs))
        finally:
            q.put(None)
            wt.join()
        if failures:
            raise failures[0]
        return results

    def _write_result(self, profile, job, got, run_id, d, diffs, err):
        """On the writer thread: store an answered case, release the id of any other."""
        try:
            if err is not None:
                return {"run_id": None, "case_id": None, "generated_id": job["id"], "outcome": "harness_error",
                        "error": err.to_dict()["error"], "recorded": False, "determinism": None}
            stored = got["outcome"] in STORED
            if stored:
                self._store(profile, job, got)
            out = self._summary(job, got, run_id, d, stored, self.store.capture_rel(job["id"]))
            out["generated_id"] = job["id"]
            return out
        finally:
            self.store.release([job["id"]])

    def record_job(self, profile, job, manager=None, block=True):
        """Record one non-control job whose id is already reserved."""
        try:
            got, run_id, d, _ = self.attempt(profile, job, manager, block)
            stored = got["outcome"] in STORED
            if stored:
                self._store(profile, job, got)
            return self._summary(job, got, run_id, d, stored, self.store.capture_rel(job["id"]))
        finally:
            self.store.release([job["id"]])

    def create(self, profile, mode, shape, inputs, manager=None):
        ledger.set_unobserved(profile_mod.unobserved(profile))
        controls = self.ensure_controls(profile, manager)
        cases.steps_for(profile, mode, shape)  # unknown mode or shape fails before an id is taken
        job = {"id": self._new_id(profile, mode, shape), "mode": mode, "shape": shape, "inputs": dict(inputs),
               "control": None, "seed": None, "generator_version": None}
        out = self.record_job(profile, job, manager, block=False)
        self.update_coverage()
        out.pop("determinism")  # a differing second run is in the ledger's nondeterminism
        out.update(profile_cases_note([c["case_id"] for c in controls]))
        return out

    def create_batch(self, profile, seed, count, modes=None, shapes=None, manager=None, range_set="accepted"):
        ledger.set_unobserved(profile_mod.unobserved(profile))
        started = time.monotonic()
        controls = self.ensure_controls(profile, manager)
        with self.store.lock:
            jobs = generator.generate(profile, seed, count, modes, shapes,
                                      existing_ids=self.store.taken_ids() + [c["id"] for c in profile["controls"]],
                                      range_set=range_set)
            self.store.reserve([j["id"] for j in jobs])
        try:
            results = self.parallel(profile, [dict(j, control=None) for j in jobs], manager,
                                    lambda *item: self._write_result(profile, *item))
        finally:
            self.store.release([j["id"] for j in jobs])
        results.sort(key=lambda r: r["generated_id"])
        self.update_coverage()
        return self._batch_report(seed, count, controls, results, started,
                                  {"uncovered": generator.split_pairs(profile, modes, shapes, range_set)[1], "range_set": range_set})

    def _batch_report(self, seed, count, controls, results, started, extra=None):
        minutes = max((time.monotonic() - started) / 60, 1e-9)
        by_outcome = {}
        for r in results:
            by_outcome[r["outcome"]] = by_outcome.get(r["outcome"], 0) + 1
        batch_id = "batch-" + runs.new_run_id()
        report = paths.RUNS / (batch_id + ".json")
        report.parent.mkdir(parents=True, exist_ok=True)
        done = len(results) + len(controls)
        body = {"seed": seed, "count": count, "generator_version": generator.GENERATOR_VERSION, "record": True,
                "controls": controls, "results": results}
        body.update(extra or {})
        report.write_text(json.dumps(body, indent=2) + "\n", encoding="utf-8", newline="\n")
        out = {"batch_id": batch_id, "cases_run": len(results),
               "recorded": sum(1 for r in results if r["recorded"]),
               "timeouts": by_outcome.get("timeout", 0), "unknown_screens": by_outcome.get("unknown_screen", 0),
               "nondeterministic": sum(1 for r in results + controls if r.get("determinism") == "differs"),
               "determinism_checked": True, "by_outcome": by_outcome,
               "cases_per_minute": round(done / minutes, 1), "report_path": runs.rel(report)}
        out.update({k: v for k, v in (extra or {}).items() if k in out})
        if extra and "uncovered" in extra:
            out["uncovered"] = ["%s/%s" % (u["mode"], u["shape"]) for u in extra["uncovered"]]
        return out

    # ---- replace (command line only) ----------------------------------------------------

    def rerecord(self, profile, cid, manager=None):
        """Rerun a stored golden's inputs and replace it. Called only from oracle/record.py."""
        old = self.store.load(cid)
        old_sha = self.store.golden_sha256(cid)
        control = next((c for c in profile["controls"] if c["id"] == cid), None) if old["control"] else None
        if old["control"] and control is None:
            raise OracleError("invalid_arguments", "%s is a control case the profile no longer lists" % cid)
        job = {"id": cid, "mode": old["mode"], "shape": old["shape"], "inputs": dict(old["inputs"]),
               "control": control, "seed": old.get("seed"), "generator_version": old.get("generator_version"),
               "range_set": old.get("range_set")}
        got, run_id, d, diffs = self.attempt(profile, job, manager)
        if diffs:
            raise OracleError("internal", "harness failure: control case %s differs from the profile; "
                              "the golden was not replaced" % cid, {"differences": diffs, "run_id": run_id})
        if got["outcome"] not in STORED:
            raise OracleError("timeout" if got["outcome"] == "timeout" else "internal",
                              "%s ended in %s; the golden was not replaced" % (cid, got["outcome"]),
                              {"run_id": run_id, "reason": got.get("reason")})
        self._store(profile, job, got, replace=True)
        new_sha = self.store.golden_sha256(cid)
        ledger.log_rerecord(cid, old_sha, new_sha)
        self.update_coverage()
        return {"case_id": cid, "old": old_sha, "new": new_sha, "outcome": got["outcome"], "run_id": run_id}

    # ---- replay (never stored) ----------------------------------------------------------

    def replay(self, profile, cid, manager=None):
        """Rerun a stored golden's inputs and compare. Writes only the run log under oracle/out/."""
        g = self.store.load(cid)
        control = next((c for c in profile["controls"] if c["id"] == cid), None) if g["control"] else None
        if g["control"] and control is None:
            raise OracleError("invalid_arguments", "%s is a control case the profile no longer lists" % cid)
        job = {"id": cid, "mode": g["mode"], "shape": g["shape"], "inputs": dict(g["inputs"]), "control": control}
        got = self._run(profile, job, manager)
        run_id, _ = self._log("replay", job, got)
        want = {"outcome": g["outcome"], "printed": g["printed"],
                "files": {f["path"]: f["sha256"] for f in g["files"]}}
        have = fingerprint(got)
        diffs = [{"what": k, "golden": want[k], "replay": have[k]} for k in want if want[k] != have[k]]
        for what in ("held_prompt", "stuck_screen"):
            if g.get(what) != got.get(what):
                diffs.append({"what": what, "golden": g.get(what), "replay": got.get(what)})
        if g["outcome"] == "observed" and got.get("screen_id") != g["expected_screen"]:
            diffs.append({"what": "screen_id", "golden": g["expected_screen"], "replay": got.get("screen_id")})
        return {"case_id": cid, "run_id": run_id, "match": not diffs, "differences": diffs}

    # ---- coverage -----------------------------------------------------------------------

    def update_coverage(self):
        """Fields count only stored goldens with outcome `result` (Requirement 13.3)."""
        fields, counts = {}, {}
        for g in self.store.all():
            key = g["id"].rsplit("-", 1)[0]
            by = counts.setdefault(key, {"result": 0, "rejected": 0, "error": 0, "observed": 0})
            by[g["outcome"]] = by.get(g["outcome"], 0) + 1
            if g["outcome"] == "result":
                for name in g["printed"]:
                    fields[name] = fields.get(name, 0) + 1
        ledger.set_coverage(fields, counts)
