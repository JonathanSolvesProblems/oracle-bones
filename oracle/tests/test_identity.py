"""resurrection-power task 7.1: Kotsu stays out of the reviewer app, its results screen and its
printout (Requirement 4.2). Nothing under app/ names Kotsu or any file in art/. Does not wait
for the art: while art/ is empty only the name is checked."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SKIP = {"node_modules", "dist", "test-results", "playwright-report", ".vite"}


# The app's own identity check (Vitest) names Kotsu in order to refuse it; it is not shown to anyone.
CHECKERS = {"test/identity.ts", "test/identity.test.ts"}


def app_files():
    for p in (ROOT / "app").rglob("*"):
        rel = p.relative_to(ROOT / "app")
        if p.is_file() and not SKIP & set(rel.parts) and rel.as_posix() not in CHECKERS:
            yield p


def test_the_app_never_names_kotsu_or_the_art():
    art = ROOT / "art"
    names = ["kotsu"] + sorted(p.name.lower() for p in art.rglob("*") if p.is_file() and p.name != "LICENSE") \
        if art.is_dir() else ["kotsu"]
    hits = []
    for p in app_files():
        rel = p.relative_to(ROOT).as_posix()
        if any(n in p.name.lower() for n in names):
            hits.append(rel)
            continue
        text = p.read_bytes().decode("utf-8", "replace").lower()
        hits += ["%s: %s" % (rel, n) for n in names if n in text]
    assert hits == []
