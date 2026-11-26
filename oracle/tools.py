"""The nine oracle tools. Protocol-free, so they can be tested without an MCP client.

Every function takes the parsed arguments and returns a dict that matches its output schema,
or raises OracleError. No tool accepts golden content, printed field values, a case id to
write, or a path under oracle/goldens/ to write. ledger_write takes case ids and capture paths
only as evidence, checks that they exist, and writes only results/ledger.json.
"""

import json
import os
import time
import traceback
import uuid
from concurrent.futures import ThreadPoolExecutor

from . import cases, evidence, fetch, freshness, generator, ledger, paths, reread, runs, sandbox, screen
from .recorder import Recorder
from . import profile as profile_mod
from .errors import OracleError
from .jsonschema_lite import validate
from .runner import keys as keys_mod
from .schemas import LEDGER_OPS, TOOLS, output_schema
from .sessions import SessionManager



def _compare(which, case_ids=None):
    """The compare tool: the same function scripts/oracle_quick.py runs. When the harness
    cannot compare (exit code 4) the tool fails, with the reason, instead of returning counts."""
    from . import compare
    out = compare.run(which, case_ids)
    if out["exit_code"] == 4:
        raise OracleError(out["category"], out["note"], {"problems": out["problems"][:50]})

    return compare.tool_output(out)


class Oracle:
    def __init__(self, cfg=None, default_profile=None):
        self.manager = SessionManager(cfg)
        self.default_profile = default_profile or os.environ.get("ORACLE_TARGET") or str(paths.DEFAULT_PROFILE)
        self.session_profiles = {}
        self.recorder = Recorder(cfg=self.manager.cfg)  # create-only: never replaces a golden
        self.comparator = _compare

    # ---- helpers ------------------------------------------------------------------------

    def _profile(self, name=None):
        if name is None:
            p = paths.ROOT / self.default_profile if not os.path.isabs(self.default_profile) else self.default_profile
        else:
            p = paths.TARGETS / ("%s.json" % name)
        if not os.path.exists(p):
            raise OracleError("invalid_arguments", "no target profile %s" % (name or self.default_profile))
        return profile_mod.load(p)

    def _running_profile(self, name=None):
        """The profile for a tool that runs the program. Whenever its sha256 changes, every
        stored golden is re-read under it first (exhume-loop Requirement 4.3)."""
        prof = self._profile(name)
        if paths.INSTALLED:  # resurrection-power 9.1: fetch the program into the workspace
            fetch.ensure(prof)
        if getattr(self, "_reread_sha", None) != prof["_sha256"]:
            reread.check(prof, self.recorder.store)
            self._reread_sha = prof["_sha256"]
        return prof

    def _need_docker(self):
        if not sandbox.docker_available():
            raise OracleError("docker_unavailable", "Docker is not running. Start Docker Desktop and try again.")

    @staticmethod
    def _screen(desc):
        keys = ("rows", "hash", "cursor", "screen_id", "unknown", "prompt", "fields", "exited")
        return {k: desc.get(k) for k in keys}

    def call(self, name, args):
        """Validate, run and validate the reply. Always returns a dict, never raises."""
        if name not in TOOLS:
            return OracleError("invalid_arguments", "unknown tool %s" % name).to_dict()
        errors = validate(args or {}, TOOLS[name]["input"])
        if errors:
            return OracleError("invalid_arguments", "invalid arguments", {"errors": errors}).to_dict()
        try:
            out = getattr(self, name)(**(args or {}))
        except OracleError as e:
            out = e.to_dict()
        except Exception:
            tb = traceback.format_exc()
            log = paths.OUT / "server.log"
            log.parent.mkdir(parents=True, exist_ok=True)
            with open(log, "a", encoding="utf-8") as f:
                f.write("%s %s\n%s\n" % (time.strftime("%Y-%m-%dT%H:%M:%S"), name, tb))
            out = OracleError("internal", "internal error; see oracle/out/server.log").to_dict()
        bad = validate(out, output_schema(name))
        if bad:
            out = OracleError("internal", "reply did not match the output schema", {"errors": bad[:10]}).to_dict()
        return out

    # ---- tools --------------------------------------------------------------------------

    def boot_target(self, profile=None):
        freshness.check()
        prof = self._running_profile(profile)
        self._need_docker()
        s = self.manager.start(prof)
        self.session_profiles[s.id] = prof
        desc = s.wait(None, timeout_s=prof["limits"]["wait_timeout_s"])
        ledger.record_run([desc["screen_id"]] if desc["screen_id"] else [], {})
        return {"session_id": s.id, "screen": self._screen(desc)}

    def read_screen(self, session_id):
        s = self.manager.get(session_id)
        return {"screen": self._screen(s.read())}

    def send_keys(self, session_id, keys, expect=None, timeout_s=None):
        freshness.check()
        s = self.manager.get(session_id)
        prof = self.session_profiles[session_id]
        before = screen.identify(prof, s.last["rows"])[0] if s.last else None
        resends_before = s.resends
        desc = s.send(keys, expect=before)
        if expect:
            ids = [x["id"] for x in prof["screens"]]
            if expect in ids:
                desc = s.wait([expect], timeout_s=timeout_s)
            else:
                owner = next((x["id"] for x in prof["screens"]
                              if expect in [p["id"] for p in x.get("prompts", [])]), None)
                if owner is None:
                    raise OracleError("invalid_arguments", "expect %r is neither a screen nor a prompt id" % expect)
                desc = s.wait_prompt(owner, expect, timeout_s=timeout_s)
        else:
            try:
                desc = s.wait(None, timeout_s=timeout_s)
            except OracleError as e:
                if e.category != "timeout":
                    raise
                desc = screen.describe(prof, s.last)
        tried = {before: ["literal" if k.kind == "char" and not k.mods else k.notation()
                          for k in keys_mod.parse(keys)]} if before else {}
        ledger.record_run([desc["screen_id"]] if desc["screen_id"] else [], tried)
        if desc["unknown"]:
            run_id = runs.new_run_id()
            d = runs.write_run_log(run_id, {"final": desc["rows"], "transcript": s.transcript},
                                   {"kind": "interactive", "session_id": session_id})
            ledger.log_unknown_screen(run_id, desc["hash"], runs.rel(d) + "/final.txt")
        return {"screen": self._screen(desc), "resends": s.resends - resends_before}

    def run_case(self, mode, shape, inputs, record=False):
        freshness.check()
        prof = self._running_profile()
        self._need_docker()
        if record:
            return self.recorder.create(prof, mode, shape, inputs, manager=self.manager)
        out = runs.explore(prof, mode, shape, inputs, manager=self.manager, block=False)
        out.pop("_got", None)
        out.update({"case_id": None, "recorded": False})
        out.pop("resends", None)
        return out

    def run_batch(self, seed, count, modes=None, shapes=None, record=False, ranges="accepted"):
        freshness.check()
        prof = self._running_profile()
        self._need_docker()
        if record:
            return self.recorder.create_batch(prof, seed, count, modes, shapes, manager=self.manager,
                                             range_set=ranges)
        batch = generator.generate(prof, seed, count, modes, shapes, range_set=ranges)
        started = time.monotonic()

        def one(c):
            try:
                r = runs.explore(prof, c["mode"], c["shape"], c["inputs"], manager=self.manager, block=True)
                r.pop("_got", None)
            except OracleError as e:
                r = {"outcome": "harness_error", "error": e.to_dict()["error"]}
            r["generated_id"] = c["id"]
            r["inputs"] = c["inputs"]
            return r

        with ThreadPoolExecutor(self.manager.cfg["max_sessions"]) as ex:
            results = list(ex.map(one, batch))
        minutes = max((time.monotonic() - started) / 60, 1e-9)
        by_outcome = {}
        for r in results:
            by_outcome[r["outcome"]] = by_outcome.get(r["outcome"], 0) + 1
        batch_id = "batch-" + runs.new_run_id()
        report = paths.RUNS / (batch_id + ".json")
        report.parent.mkdir(parents=True, exist_ok=True)
        uncovered = generator.split_pairs(prof, modes, shapes, ranges)[1]
        report.write_text(json.dumps({"seed": seed, "count": count, "generator_version": generator.GENERATOR_VERSION,
                                      "range_set": ranges, "record": False, "uncovered": uncovered, "results": results},
                                     indent=2) + "\n", encoding="utf-8")
        return {"batch_id": batch_id, "cases_run": len(results), "recorded": 0,
                "timeouts": by_outcome.get("timeout", 0), "unknown_screens": by_outcome.get("unknown_screen", 0),
                "nondeterministic": 0, "determinism_checked": False, "by_outcome": by_outcome,
                "cases_per_minute": round(len(results) / minutes, 1), "report_path": runs.rel(report),
                "uncovered": ["%s/%s" % (u["mode"], u["shape"]) for u in uncovered]}

    def compare(self, set, case_ids=None):
        return self.comparator(set, case_ids)


    def ledger_read(self, section=None):
        led = ledger.read()
        if section is None:
            return led
        if section == "coverage":
            return ledger.coverage(led, self._profile())
        if section not in led:
            raise OracleError("invalid_arguments", "no ledger section %r" % section, {"sections": sorted(led)})
        return {section: led[section]}

    def ledger_write(self, op, **args):
        """The Exhumer's sections, through ledger.update_exhumer (exhume-loop Requirement 2)."""
        required, optional = LEDGER_OPS[op]
        missing = [k for k in required if k not in args]
        extra = [k for k in args if k not in required + optional]
        if missing or extra:
            raise OracleError("invalid_arguments", "wrong fields for op %s" % op,
                              {"missing": missing, "unexpected": extra, "required": list(required),
                               "optional": list(optional)})
        ev = list(args.get("evidence", []))
        bad = evidence.problems(ev)
        if bad:
            raise OracleError("invalid_arguments", "evidence that does not exist", {"evidence": bad})
        if op == "decide":
            entry = ledger.decide(args["saw"], args["chose"], args["why"], ev)
        elif op == "ask":
            entry = ledger.ask(args["question"], ev)
        elif op == "answer":
            entry = ledger.answer(args["question_id"], args["answer"], ev)
        elif op == "stop":
            entry = ledger.stop(args["why"], self._profile())
        elif op == "understood":
            prof = self._profile()
            mapped = sorted({f["name"] for s in prof["screens"] for f in s.get("fields", [])})
            if args["field"] not in mapped:
                raise OracleError("invalid_arguments", "the profile maps no field %s" % args["field"],
                                  {"fields": mapped})
            if args["value"] and not any(evidence.kind(e) == "case" for e in ev):
                raise OracleError("invalid_arguments", "understood: true needs a case id among the evidence")
            entry = ledger.set_understood(args["field"], args["value"], ev)
        elif op == "keys_untried":
            prof = self._profile()
            ids = [s["id"] for s in prof["screens"]]
            if args["screen"] not in ids:
                raise OracleError("invalid_arguments", "the profile lists no screen %s" % args["screen"],
                                  {"screens": ids})
            notes = []
            for k in args["keys"]:
                parsed = keys_mod.parse(k)  # raises invalid_arguments on bad notation
                if len(parsed) != 1:
                    raise OracleError("invalid_arguments", "keys_untried takes one key per entry: %r" % k)
                if parsed[0].notation() not in notes:
                    notes.append(parsed[0].notation())
            entry = ledger.set_keys_untried(args["screen"], notes)
        else:
            entry = ledger.triage(args["field"], args["classification"], args["status"], args["why"], ev)
        return {"op": op, "entry": entry}

    def shutdown(self, session_id=None):
        if session_id is None:
            ids = list(self.manager.sessions)
            for sid in ids:
                self._log_interactive(sid)
            return {"closed": self.manager.end_all()}
        self.manager.get(session_id)
        self._log_interactive(session_id)
        self.manager.end(session_id)
        self.session_profiles.pop(session_id, None)
        return {"closed": [session_id]}

    def _log_interactive(self, sid):
        """Requirement 14.7: keep what an agent saw in an interactive session."""
        s = self.manager.sessions.get(sid)
        if s is None:
            return
        try:
            got = {"final": s.snapshot()["rows"], "transcript": s.transcript, "files": s.changed_files(),
                   "drive_files": {f["path"]: (s.drive / f["path"]).read_bytes() for f in s.changed_files()}}
        except OracleError:
            got = {"final": s.last["rows"] if s.last else [], "transcript": s.transcript}
        runs.write_run_log(runs.new_run_id(), got, {"kind": "interactive", "session_id": sid})

    def close(self):
        for sid in list(self.manager.sessions):
            self._log_interactive(sid)
        self.manager.shutdown_all()
