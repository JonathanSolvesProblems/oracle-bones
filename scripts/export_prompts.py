"""Writes docs/prompts.md: every prompt sent to Kiro in this workspace, as Kiro stored it.

Kiro keeps each session under the user's .kiro/sessions/<workspace>/sess_*/ as messages.jsonl
and session.json. This script reads those files and nothing else: the prompts are copied word
for word, and the credits are the ones Kiro recorded for each turn. It was written from the
command line, outside Kiro.

Usage: python scripts/export_prompts.py [--sessions <folder>] [--check]
  --sessions  the workspace's sessions folder (default: the newest folder under ~/.kiro/sessions
              whose sessions name this repository's path)
  --check     write nothing; exit 1 when docs/prompts.md differs from what would be written
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "prompts.md"


def text_of(payload):
    c = payload.get("content")
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        return "\n".join(x.get("text", "") if isinstance(x, dict) else str(x) for x in c)
    return ""


def unix_lines(text):
    """The text with every line ending as a line feed, so the file reads the same on any system."""
    return chr(10).join(text.splitlines())


def find_sessions_folder():
    base = Path.home() / ".kiro" / "sessions"
    want = str(ROOT).lower().replace("/", "\\")
    best = None
    for ws in base.iterdir():
        if not ws.is_dir() or ws.name.startswith("."):
            continue
        for meta in ws.glob("sess_*/session.json"):
            try:
                paths = json.loads(meta.read_text(encoding="utf-8")).get("workspacePaths") or []
            except (OSError, ValueError):
                continue
            if any(str(p).lower().replace("/", "\\") == want for p in paths):
                best = ws
                break
        if best:
            break
    if not best:
        raise SystemExit("no Kiro sessions folder names this repository")
    return best


def read_session(folder):
    meta = json.loads((folder / "session.json").read_text(encoding="utf-8"))
    rows = [json.loads(line) for line in (folder / "messages.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]
    agent = ""
    turns = []
    for r in rows:
        p = r["payload"]
        t = p.get("type")
        if t == "session_start":
            agent = p.get("agentType") or agent
        elif t == "user":
            turns.append({"at": r["timestamp"], "prompt": unix_lines(text_of(p)).strip(), "credits": None, "end": None})
        elif t == "usage_summary" and turns:
            used = sum(x.get("usage", 0) for x in p.get("promptTurnSummaries", []))
            turns[-1]["credits"] = (turns[-1]["credits"] or 0) + used
        elif t == "turn_end" and turns:
            turns[-1]["end"] = p.get("stopReason")
    return {"id": meta.get("id", folder.name), "title": meta.get("title") or "", "created": meta.get("createdAt") or "",
            "model": meta.get("modelId") or "", "agent": agent, "turns": turns}


def fence_for(text):
    longest = 0
    run = 0
    for ch in text:
        run = run + 1 if ch == "~" else 0
        longest = max(longest, run)
    return "~" * max(4, longest + 1)


def render(sessions):
    sessions = [s for s in sessions if s["turns"]]
    sessions.sort(key=lambda s: s["turns"][0]["at"])
    models = [s["model"] for s in sessions if s["model"]]
    usual = max(set(models), key=models.count) if models else ""
    prompts = sum(len(s["turns"]) for s in sessions)
    credits = sum(t["credits"] or 0 for s in sessions for t in s["turns"])
    out = [
        "# Every prompt sent to Kiro",
        "",
        "Written by `python scripts/export_prompts.py` from Kiro's own session files for this workspace.",
        "Each prompt is copied word for word, in the order it was sent, with the credits Kiro recorded",
        "for its turn. Times are UTC. A session that sent no prompt is left out. Credits Kiro spent",
        "outside a recorded turn are not in these files, so the total here is below the account's.",
        "",
        "%d sessions, %d prompts, %.2f credits recorded. The model was `%s` in every session that"
        % (len(sessions), prompts, credits, usual),
        "does not name another. The agent `default-v2` is Kiro's Default agent; `exhumer` is this",
        "repository's own, in `.kiro/agents/`.",
        "",
    ]
    for n, s in enumerate(sessions, 1):
        first = s["turns"][0]["at"]
        out.append("## %d. %s" % (n, s["title"] or "(untitled)"))
        out.append("")
        line = "%s %s UTC. Agent: %s." % (first[:10], first[11:16], s["agent"] or "not recorded")
        if s["model"] != usual:
            line += " Model: %s." % (s["model"] or "not recorded")
        out.append(line)
        out.append("")
        for k, t in enumerate(s["turns"], 1):
            head = "Prompt %d of %d, %s UTC" % (k, len(s["turns"]), t["at"][11:16])
            if t["credits"] is not None:
                head += ", %.2f credits" % t["credits"]
            if t["end"] and t["end"] != "end_turn":
                head += ", ended: %s" % t["end"]
            out.append("**%s**" % head)
            out.append("")
            fence = fence_for(t["prompt"])
            out.append(fence + "text")
            out.append(t["prompt"])
            out.append(fence)
            out.append("")
    return "\n".join(out).rstrip("\n") + "\n"


def main(argv):
    folder = Path(argv[argv.index("--sessions") + 1]) if "--sessions" in argv else find_sessions_folder()
    sessions = [read_session(d) for d in sorted(folder.glob("sess_*")) if (d / "messages.jsonl").exists() and (d / "session.json").exists()]
    text = render(sessions)
    if "--check" in argv:
        same = OUT.exists() and OUT.read_bytes().decode("utf-8") == text
        print("docs/prompts.md is up to date" if same else "docs/prompts.md differs from Kiro's session files")
        return 0 if same else 1
    OUT.write_text(text, encoding="utf-8", newline="\n")
    print("wrote %s: %d characters" % (OUT.relative_to(ROOT), len(text)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
