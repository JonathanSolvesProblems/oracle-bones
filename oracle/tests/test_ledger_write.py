"""ledger_write: the Exhumer's ledger sections, written through ledger.py (exhume-loop task 1.1).

Property 2 (one writer, two owners) and Property 3 (evidence exists) run here with Hypothesis.
"""

import json

import pytest
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from oracle import ledger, manifest, paths
from oracle.jsonschema_lite import validate
from oracle.schemas import output_schema
from oracle.tools import Oracle

RUN = "20261121-115234-d34a50"
BATCH = "batch-20261121-115234-d34a50"
CASE = "nd-trap-000001"
CAPTURE = "oracle/goldens/captures/nd-trap-000001/screen-00.txt"


@pytest.fixture(autouse=True)
def scratch(tmp_path, monkeypatch):
    """A scratch ledger, goldens store with one case and one capture, and run folder."""
    monkeypatch.setattr(paths, "LEDGER", tmp_path / "results" / "ledger.json")
    goldens = tmp_path / "goldens"
    (goldens / "cases").mkdir(parents=True)
    (goldens / "cases" / (CASE + ".json")).write_text("{}", encoding="utf-8")
    cap = goldens / "captures" / CASE / "screen-00.txt"
    cap.parent.mkdir(parents=True)
    cap.write_text("screen\n", encoding="utf-8")
    manifest.update(goldens, {"cases/%s.json" % CASE: "0" * 64, "captures/%s/screen-00.txt" % CASE: "0" * 64})
    monkeypatch.setattr(paths, "GOLDENS", goldens)
    runs = tmp_path / "runs"
    (runs / RUN).mkdir(parents=True)
    (runs / (BATCH + ".json")).write_text("{}", encoding="utf-8")
    monkeypatch.setattr(paths, "RUNS", runs)
    return tmp_path


@pytest.fixture
def ora():
    o = Oracle.__new__(Oracle)  # no session manager: ledger_write starts no container
    o.default_profile = str(paths.DEFAULT_PROFILE)
    return o


def write(ora, **args):
    out = ora.call("ledger_write", args)
    assert validate(out, output_schema("ledger_write")) == [], out
    return out


def refused(out):
    return out.get("error", {}).get("category") == "invalid_arguments"


# ---- each operation -------------------------------------------------------------------------

def test_decide_numbers_entries_and_keeps_evidence(ora):
    a = write(ora, op="decide", saw="6 of 8 timed out", chose="run_case", why="no rejected screen",
              evidence=[BATCH])
    b = write(ora, op="decide", saw="left slope -1", chose="probe_screen", why="see it", evidence=[RUN, CASE])
    assert a["entry"]["n"] == 1 and b["entry"]["n"] == 2
    led = ledger.read()
    assert [d["chose"] for d in led["decisions"]] == ["run_case", "probe_screen"]
    assert led["decisions"][1]["evidence"] == [RUN, CASE]
    assert led["decisions"][0]["at"].endswith("Z")


def test_ask_and_answer(ora):
    q = write(ora, op="ask", question="What does -1 show?")["entry"]
    assert q["id"] == "Q-001" and q["status"] == "open"
    assert write(ora, op="ask", question="And 0?", evidence=[RUN])["entry"]["id"] == "Q-002"
    a = write(ora, op="answer", question_id="Q-001", answer="a message", evidence=[CASE])["entry"]
    assert a["status"] == "answered" and a["answer_evidence"] == [CASE]
    assert refused(write(ora, op="answer", question_id="Q-001", answer="again"))
    assert refused(write(ora, op="answer", question_id="Q-009", answer="none"))


def test_stop_adds_coverage_and_a_decision_clears_it(ora):
    s = write(ora, op="stop", why="nothing worth its credits")["entry"]
    led = ledger.read()
    assert led["stopped"]["why"] == "nothing worth its credits"
    assert "unexercised_fields" in led["stopped"]["coverage"]
    assert led["decisions"][-1]["chose"] == "stop" and led["decisions"][-1]["n"] == s["decision"]
    write(ora, op="decide", saw="new session", chose="probe_screen", why="resume")
    led = ledger.read()
    assert led["stopped"] is None
    assert [d["chose"] for d in led["decisions"]] == ["stop", "probe_screen"]


def test_understood_needs_a_mapped_field_and_a_case(ora):
    assert refused(write(ora, op="understood", field="no_such_field", value=True, evidence=[CASE]))
    assert refused(write(ora, op="understood", field="depth", value=True, evidence=[RUN]))
    write(ora, op="understood", field="depth", value=True, evidence=[CASE])
    write(ora, op="understood", field="area", value=False)
    led = ledger.read()
    assert led["fields"]["depth"] == {"understood": True, "understood_evidence": [CASE]}
    assert led["fields"]["area"]["understood"] is False


def test_keys_untried(ora):
    out = write(ora, op="keys_untried", screen="main_menu", keys=["{f1}", "H", "{F1}"])
    assert out["entry"]["keys_untried"] == ["{F1}", "H"]
    assert ledger.read()["screens"]["main_menu"]["keys_untried"] == ["{F1}", "H"]
    assert ledger.coverage()["untried_keys"] == {"main_menu": ["{F1}", "H"]}
    assert refused(write(ora, op="keys_untried", screen="no_such_screen", keys=["{F1}"]))
    assert refused(write(ora, op="keys_untried", screen="main_menu", keys=["{Nope}"]))
    assert refused(write(ora, op="keys_untried", screen="main_menu", keys=["3{Enter}"]))


def test_triage_needs_a_mismatch_entry(ora):
    assert refused(write(ora, op="triage", field="area", classification="display_rule", status="proposed",
                         why="rounding"))
    ledger.set_mismatches({"area": 4}, "run1")
    write(ora, op="triage", field="area", classification="display_rule", status="proposed", why="rounding",
          evidence=[CASE])
    m = ledger.read()["mismatches"]["area"]
    assert m["status"] == "proposed" and m["classification"] == "display_rule" and m["count"] == 4
    assert ledger.coverage()["untriaged_mismatches"] == []
    ledger.set_mismatches({"area": 2}, "run2")  # the harness keeps the triage
    assert ledger.read()["mismatches"]["area"]["status"] == "proposed"


def test_wrong_fields_and_bad_values_are_refused(ora):
    assert refused(write(ora, op="decide", saw="x", chose="run_case"))  # no why
    assert refused(write(ora, op="ask", question="x", why="extra"))
    assert refused(write(ora, op="decide", saw="x", chose="stop", why="y"))  # stop has its own op
    assert refused(write(ora, op="nope"))
    assert refused(write(ora, op="decide", saw="x", chose="run_case", why="y", evidence=["../etc/passwd"]))
    assert ledger.read()["decisions"] == []


def test_exhumer_writes_cannot_touch_harness_sections():
    from oracle.errors import OracleError
    with pytest.raises(OracleError):
        ledger.update_exhumer(lambda led: led["unanswered"].append({"run_id": "x"}))
    ledger.record_run(["title"], {})
    with pytest.raises(OracleError):
        ledger.update_exhumer(lambda led: led["screens"]["title"].update(visits=99))
    assert ledger.read()["screens"]["title"]["visits"] == 1


def test_harness_can_count_a_screen_the_exhumer_created(ora):
    write(ora, op="keys_untried", screen="shape_menu", keys=["{F1}"])
    ledger.record_run(["shape_menu"], {"shape_menu": ["literal"]})
    s = ledger.read()["screens"]["shape_menu"]
    assert s == {"keys_untried": ["{F1}"], "visits": 1, "keys_tried": ["literal"]}


# ---- Property 3: evidence exists ------------------------------------------------------------

EXISTING = [CASE, CAPTURE, RUN, BATCH]
MISSING = ["nd-trap-000099", "oracle/goldens/captures/nd-trap-000001/screen-07.txt",
           "20261121-000000-abcdef", "batch-20261121-000000-abcdef", "oracle/out/runs/x/final.txt",
           "results/ledger.json", "nd-trap-1"]


@settings(max_examples=60, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(st.lists(st.sampled_from(EXISTING + MISSING), max_size=6))
def test_property3_evidence_accepted_exactly_when_it_exists(ora, items):
    out = write(ora, op="ask", question="q", evidence=items)
    assert refused(out) == any(i in MISSING for i in items), (items, out)
    if refused(out):
        assert {e["evidence"] for e in out["error"]["detail"]["evidence"]} == {i for i in items if i in MISSING}


# ---- Property 2: one writer, two owners -----------------------------------------------------

HARNESS_OPS = st.sampled_from([
    ("record_run", (["title", "main_menu"], {"main_menu": ["literal"]})),
    ("record_run", (["shape_menu"], {})),
    ("set_coverage", ({"depth": 2}, {"nd-trap": {"result": 2}})),
    ("set_mismatches", ({"area": 3}, "run1")),
    ("log_rerecord", ("nd-trap-000001", "a", "b")),
])
EXHUMER_OPS = st.sampled_from([
    ("decide", ("saw", "run_case", "why", [])),
    ("ask", ("q", [])),
    ("set_understood", ("depth", False, [])),
    ("set_keys_untried", ("main_menu", ["{F1}"])),
    ("set_keys_untried", ("irr_editor", ["{F3}"])),
    ("triage", ("area", "haunting", "proposed", "why", [])),
])


def _apply(ops):
    for owner, (name, args) in ops:
        getattr(ledger, name)(*args)


def _state(ops):
    if paths.LEDGER.exists():
        paths.LEDGER.unlink()
    ledger.set_mismatches({"area": 1}, "run0")  # triage needs an entry; both orders start here
    _apply(ops)
    led = ledger.read()
    return ledger._harness_view(led), ledger._exhumer_view(led)


@settings(max_examples=40, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(st.lists(st.one_of(st.tuples(st.just("h"), HARNESS_OPS), st.tuples(st.just("e"), EXHUMER_OPS)),
                max_size=12))
def test_property2_harness_and_exhumer_sections_are_independent(monkeypatch, ops):
    monkeypatch.setattr(ledger, "_now", lambda: "2026-11-21T00:00:00Z")
    mixed_h, mixed_e = _state(ops)
    only_h, _ = _state([o for o in ops if o[0] == "h"])
    _, only_e = _state([o for o in ops if o[0] == "e"])
    assert json.dumps(mixed_h, sort_keys=True) == json.dumps(only_h, sort_keys=True)
    assert json.dumps(mixed_e, sort_keys=True) == json.dumps(only_e, sort_keys=True)
