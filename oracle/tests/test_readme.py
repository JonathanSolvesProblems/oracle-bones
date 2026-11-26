"""The README's numbers are the results files' numbers (resurrection-power Requirement 3.2 and
the README's own claim). A count that drifts from its file, a row of the held-out record left
out or reworded, or a sentence that reads as acceptance by FEMA fails here. Written from the
command line, outside Kiro.
"""

import json
import re
from pathlib import Path

from oracle.schemas import POWER_TOOLS, TOOLS

ROOT = Path(__file__).resolve().parents[2]
README = (ROOT / "README.md").read_text(encoding="utf-8")
WORDS = {1: "One", 2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six", 7: "Seven", 8: "Eight", 9: "Nine"}


def _read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def _headline():
    text = _read("results/headline.md")
    matched, stored = re.search(r"^Cases: (\d+) of (\d+)$", text, re.M).groups()
    drawn = re.search(r"\| Drawn by the generator[^|]*\| (\d+) \|", text).group(1)
    return int(matched), int(stored), int(drawn)


def _run2():
    row = re.search(r"\| The headline batch \(seed 201\) \| (\d+) \| (\d+) \(", _read("results/ablation-manual-only.md"))
    return int(row.group(2))


def _held_out_lines():
    return [line for line in _read("results/held-out.md").splitlines() if line.strip() and not line.startswith("#")]


def test_the_headline_and_the_ablation():
    matched, stored, drawn = _headline()
    assert "%d of %d" % (matched, stored) in README
    assert "{:,} inputs were drawn".format(drawn) in README
    assert "answered %d of them" % stored in README
    assert "%d of %d" % (_run2(), stored) in README
    assert "**The %d it gets wrong.**" % (stored - matched) in README


def test_the_known_miss_classes():
    classes = [c for c in json.loads(_read("results/known-misses.json"))["classes"] if c["limits"]]
    assert "They are in %s classes" % WORDS[len(classes)].lower() in README


def test_the_held_out_record_is_quoted_whole():
    lines = _held_out_lines()
    assert len(lines) >= 4
    for line in lines:
        assert line in README, line
    table = [line for line in lines if line.startswith("|")]
    at = README.index(table[0])
    assert README[at:at + len("\n".join(table))] == "\n".join(table)  # together and in order, nothing between


def test_no_count_in_the_readme_is_typed_apart_from_these():
    matched, stored, _ = _headline()
    allowed = {"%d of %d" % (matched, stored), "%d of %d" % (_run2(), stored)}
    allowed |= {line.split("|")[3].strip() for line in _held_out_lines() if line.startswith("| A-")}
    found = set(re.findall(r"\b\d[\d,]* of \d[\d,]*\b", README))
    assert found <= allowed, found - allowed


def test_the_sessions_prompts_specs_and_tools():
    head = _read("docs/prompts.md")
    sessions, prompts = re.search(r"^(\d+) sessions, (\d+) prompts", head, re.M).groups()
    assert "in %s sessions" % sessions in README
    assert "(%s prompts)" % prompts in README
    specs = [p for p in (ROOT / ".kiro" / "specs").iterdir() if p.is_dir()]
    assert "%s specs." % WORDS[len(specs)] in README
    assert "with %d tools" % (len(TOOLS) + len(POWER_TOOLS)) in README


def test_the_notice_is_the_apps_and_nothing_claims_acceptance():
    notice = re.search(r'export const NOTICE = "([^"]+)";', _read("app/src/ui/views/notice.ts")).group(1)
    assert notice in README
    for m in re.finditer(r"accepted by FEMA|FEMA-accepted|FEMA accepted", README):
        assert README[max(0, m.start() - 4):m.start()] == "not ", README[max(0, m.start() - 40):m.end()]


def test_how_to_run_it_is_near_the_top_and_names_the_package():
    assert README.index("## How to run it") < README.index("## What the numbers are")
    assert README[:README.index("## How to run it")].count("\n") < 20
    assert "powers/oracle-bones" in README and (ROOT / "powers" / "oracle-bones" / "plugin.json").is_file()
    assert "https://jonathansolvesproblems.github.io/quickened/" in README
