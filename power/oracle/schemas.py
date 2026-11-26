"""Input and output JSON Schemas for the nine MCP tools (oracle-harness Requirement 14.3).

Every reply is checked against its tool's output schema before it is sent. A failure reply is
{"error": {category, message, retryable, detail}} and is part of every output schema.
"""

from .errors import CATEGORIES

NAME = r"^[a-z][a-z0-9_]*$"

ERROR = {
    "type": "object", "additionalProperties": False, "required": ["error"],
    "properties": {"error": {
        "type": "object", "additionalProperties": False,
        "required": ["category", "message", "retryable", "detail"],
        "properties": {"category": {"enum": sorted(CATEGORIES)}, "message": {"type": "string"},
                       "retryable": {"type": "boolean"}, "detail": {"type": "object"}}}},
}

SCREEN = {
    "type": "object", "additionalProperties": False,
    "required": ["rows", "hash", "cursor", "screen_id", "unknown", "prompt", "fields"],
    "properties": {
        "rows": {"type": "array", "items": {"type": "string"}},
        "hash": {"type": "string", "pattern": "^[0-9a-f]{64}$"},
        "cursor": {"type": "object", "required": ["row", "col"],
                   "properties": {"row": {"type": "integer"}, "col": {"type": "integer"}}},
        "screen_id": {"type": ["string", "null"]},
        "unknown": {"type": "boolean"},
        "prompt": {"anyOf": [{"type": "null"},
                             {"type": "object", "required": ["id", "text"],
                              "properties": {"id": {"type": "string"}, "text": {"type": "string"}}}]},
        "fields": {"type": "object", "additionalProperties": {"type": "string"}},
        "exited": {"type": ["integer", "null"]},
    },
}

FILES = {"type": "array", "items": {"type": "object", "required": ["path", "sha256"],
                                    "properties": {"path": {"type": "string"}, "sha256": {"type": "string"}}}}
STRMAP = {"type": "object", "additionalProperties": {"type": "string"}}
INTMAP = {"type": "object", "additionalProperties": {"type": "integer"}}


# ledger_write: each operation and the fields it takes (required, optional).
LEDGER_OPS = {
    "decide": (("saw", "chose", "why"), ("evidence",)),
    "ask": (("question",), ("evidence",)),
    "answer": (("question_id", "answer"), ("evidence",)),
    "stop": (("why",), ()),
    "understood": (("field", "value"), ("evidence",)),
    "keys_untried": (("screen", "keys"), ()),
    "triage": (("field", "classification", "status", "why"), ("evidence",)),
}
# The Exhumer's actions (exhume-loop design, "The decision"); stop has its own operation.
DECISIONS = ("probe_screen", "run_case", "read_help", "change_profile", "record_case", "write_requirement",
             "triage", "ask_skeptic")


def _ok(props, required):
    return {"type": "object", "additionalProperties": False, "required": required, "properties": props}


TOOLS = {
    "boot_target": {
        "description": "Start an interactive session on the target program and return its first screen. "
                       "Sessions end after the idle limit or with shutdown.",
        "input": {"type": "object", "additionalProperties": False, "properties": {
            "profile": {"type": "string", "pattern": NAME,
                        "description": "Target profile name in oracle/targets/; defaults to ORACLE_TARGET."}}},
        "output": _ok({"session_id": {"type": "string"}, "screen": SCREEN}, ["session_id", "screen"]),
    },
    "read_screen": {
        "description": "Read the current screen of a session: text, hash, cursor, screen id, prompt and raw fields.",
        "input": {"type": "object", "additionalProperties": False, "required": ["session_id"],
                  "properties": {"session_id": {"type": "string"}}},
        "output": _ok({"screen": SCREEN}, ["screen"]),
    },
    "send_keys": {
        "description": "Send keys to a session. Notation: literal characters; {Enter} {Esc} {Tab} {Backspace} "
                       "{Up} {Down} {Left} {Right} {Home} {End} {PgUp} {PgDn} {Ins} {Del} {F1}..{F12}; "
                       "modifiers such as {Shift+F1} {Ctrl+X} {Alt+X}; {{ and }} for braces. Keys not yet "
                       "verified to reach the program are refused. With `expect`, waits for that screen or "
                       "prompt id; otherwise waits for the screen to settle.",
        "input": {"type": "object", "additionalProperties": False, "required": ["session_id", "keys"],
                  "properties": {"session_id": {"type": "string"}, "keys": {"type": "string", "minLength": 1},
                                 "expect": {"type": "string", "pattern": NAME},
                                 "timeout_s": {"type": "number", "minimum": 0.1}}},
        "output": _ok({"screen": SCREEN, "resends": {"type": "integer", "minimum": 0}}, ["screen", "resends"]),
    },
    "run_case": {
        "description": "Run one case in a fresh session and report its outcome: result, rejected, error, "
                       "or timeout/unknown_screen (no answer). Inputs are typed strings. Exploratory unless "
                       "record is true; recording creates a new case id and never replaces a golden.",
        "input": {"type": "object", "additionalProperties": False, "required": ["mode", "shape", "inputs"],
                  "properties": {"mode": {"type": "string", "pattern": NAME},
                                 "shape": {"type": "string", "pattern": NAME},
                                 "inputs": STRMAP, "record": {"type": "boolean"},
                                 "ranges": {"type": "string", "enum": ["accepted", "practical"]}}},
        "output": _ok({"run_id": {"type": "string"}, "case_id": {"type": ["string", "null"]},
                       "outcome": {"enum": ["result", "rejected", "error", "observed", "timeout", "unknown_screen"]},
                       "screen_id": {"type": ["string", "null"]},
                       "printed": STRMAP, "message": {"type": ["string", "null"]}, "files": FILES,
                       "capture_path": {"type": "string"}, "recorded": {"type": "boolean"},
                       "reason": {"type": ["string", "null"]}},
                      ["run_id", "case_id", "outcome", "printed", "message", "files", "capture_path", "recorded"]),
    },
    "run_batch": {
        "description": "Generate cases from a seed and run them in parallel sessions. Exploratory unless "
                       "record is true. Reports counts and cases per minute; details go to report_path.",
        "input": {"type": "object", "additionalProperties": False, "required": ["seed", "count"],
                  "properties": {"seed": {"type": "integer", "minimum": 0},
                                 "count": {"type": "integer", "minimum": 1, "maximum": 2000},
                                 "modes": {"type": "array", "items": {"type": "string", "pattern": NAME}},
                                 "shapes": {"type": "array", "items": {"type": "string", "pattern": NAME}},
                                 "record": {"type": "boolean"},
                                 "ranges": {"type": "string", "enum": ["accepted", "practical"]}}},
        "output": _ok({"batch_id": {"type": "string"}, "cases_run": {"type": "integer"},
                       "recorded": {"type": "integer"}, "timeouts": {"type": "integer"},
                       "unknown_screens": {"type": "integer"}, "nondeterministic": {"type": "integer"},
                       "determinism_checked": {"type": "boolean"}, "by_outcome": INTMAP,
                       "cases_per_minute": {"type": "number"}, "report_path": {"type": "string"},
                       "uncovered": {"type": "array", "items": {"type": "string"}}},
                      ["batch_id", "cases_run", "recorded", "timeouts", "unknown_screens", "nondeterministic",
                       "cases_per_minute", "report_path"]),
    },
    "compare": {
        "description": "Grade the rebuild against stored goldens: the quick set or the full set. Writes "
                       "oracle/out/mismatches.json and reports counts by kind and by field.",
        "input": {"type": "object", "additionalProperties": False, "required": ["set"],
                  "properties": {"set": {"enum": ["quick", "full"]},
                                 "case_ids": {"type": "array", "items": {"type": "string"}}}},
        "output": _ok({"total": {"type": "integer"}, "matched": {"type": "integer"}, "by_kind": INTMAP,
                       "by_field": INTMAP, "uncovered": {"type": "array", "items": {"type": "string"}},
                       "report_path": {"type": "string"}, "exit_code": {"type": "integer"}},
                      ["total", "matched", "by_kind", "by_field", "uncovered", "report_path", "exit_code"]),
    },
    "ledger_read": {
        "description": "Read the coverage ledger, or one section of it. Use section 'coverage' for unexercised "
                       "fields, untried keys, unobserved profile facts and untriaged mismatches.",
        "input": {"type": "object", "additionalProperties": False,
                  "properties": {"section": {"type": "string", "pattern": NAME}}},
        "output": {"type": "object"},
    },
    "ledger_write": {
        "description": "Write the Exhumer's own ledger sections. op decide: saw, chose, why, evidence. "
                       "op ask: question, evidence. op answer: question_id, answer, evidence. op stop: why "
                       "(the coverage report is added for you). op understood: field, value, evidence (a case "
                       "id is required when value is true). op keys_untried: screen, keys. op triage: field, "
                       "classification, status, why, evidence. Evidence is a list of case ids, capture paths, "
                       "run ids and batch ids, and each must exist. Never edit results/ledger.json as a file.",
        "input": {"type": "object", "additionalProperties": False, "required": ["op"],
                  "properties": {
                      "op": {"enum": list(LEDGER_OPS)},
                      "saw": {"type": "string", "minLength": 1},
                      "chose": {"enum": list(DECISIONS)},
                      "why": {"type": "string", "minLength": 1},
                      "evidence": {"type": "array", "items": {"type": "string", "minLength": 1}},
                      "question": {"type": "string", "minLength": 1},
                      "question_id": {"type": "string", "pattern": r"^Q-\d{3,}$"},
                      "answer": {"type": "string", "minLength": 1},
                      "field": {"type": "string", "pattern": NAME},
                      "value": {"type": "boolean"},
                      "screen": {"type": "string", "pattern": NAME},
                      "keys": {"type": "array", "items": {"type": "string", "minLength": 1}},
                      "classification": {"enum": ["spec_error", "display_rule", "haunting"]},
                      "status": {"enum": ["proposed", "accepted", "disputed"]}}},
        "output": {"type": "object"},
    },
    "shutdown": {
        "description": "End one session, or every session when session_id is absent.",
        "input": {"type": "object", "additionalProperties": False,
                  "properties": {"session_id": {"type": "string"}}},
        "output": _ok({"closed": {"type": "array", "items": {"type": "string"}}}, ["closed"]),
    },
}


# Tools that only an installed power lists (resurrection-power Requirements 6.4, 7.1, 2.1). In
# this repository the workspace is the repository, so the server lists only the nine above.
POWER_TOOLS = {
    "set_workspace": {
        "description": "Set the folder the oracle works in: your project folder, as an existing absolute path. "
                       "Profiles, downloaded programs, runs, goldens and the ledger all go under it. Call this "
                       "first when another tool says no workspace is set.",
        "input": {"type": "object", "additionalProperties": False, "required": ["path"],
                  "properties": {"path": {"type": "string", "minLength": 1}}},
        "output": _ok({"workspace": {"type": "string"}, "from": {"enum": ["roots", "set_workspace"]}},
                      ["workspace", "from"]),
    },
    "init_workspace": {
        "description": "Copy the method's files into the workspace: the Exhumer and Skeptic agents, the four hooks, "
                       "the oracle law, the resurrect workflow, the scripts the hooks call, the QUICK-2 profile and "
                       "a .gitignore line for the downloads folder. Never overwrites: a file that exists with other "
                       "content is left alone and listed under kept.",
        "input": {"type": "object", "additionalProperties": False, "properties": {}},
        "output": _ok({"workspace": {"type": "string"},
                       "copied": {"type": "array", "items": {"type": "string"}},
                       "unchanged": {"type": "array", "items": {"type": "string"}},
                       "kept": {"type": "array", "items": {"type": "string"}},
                       "gitignore": {"enum": ["added", "present"]}},
                      ["workspace", "copied", "unchanged", "kept", "gitignore"]),
    },
}


def tool_def(name):
    return TOOLS.get(name) or POWER_TOOLS[name]


def output_schema(name):
    return {"anyOf": [tool_def(name)["output"], ERROR]}
