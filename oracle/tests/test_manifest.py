"""Task 7.3: the manifest is updated on every store and replace."""

from oracle import manifest
from oracle.tests.test_recorder import INPUTS, prof, rec  # noqa: F401  (fixtures)


def test_every_store_is_in_the_manifest(rec, prof):  # noqa: F811
    rec.create(prof, "normal_depth", "trapezoid", INPUTS)
    files = manifest.load(rec.store.root)
    assert "cases/nd-trap-000003.json" in files
    assert "captures/nd-trap-000003/files/QUICK2/HEC2.DAT" in files
    assert "MANIFEST.json" not in files
    assert manifest.check(rec.store.root) == []


def test_replace_updates_the_manifest(rec, prof):  # noqa: F811
    rec.create(prof, "normal_depth", "trapezoid", INPUTS)
    stale = rec.store.captures_dir / "nd-trap-000003" / "screen-07.txt"
    stale.write_text("from an earlier recording")
    manifest.update(rec.store.root, {"captures/nd-trap-000003/screen-07.txt": manifest.on_disk(rec.store.root)[
        "captures/nd-trap-000003/screen-07.txt"]})
    rec.rerecord(prof, "nd-trap-000003")
    files = manifest.load(rec.store.root)
    assert "captures/nd-trap-000003/screen-07.txt" not in files
    assert files["cases/nd-trap-000003.json"] == rec.store.golden_sha256("nd-trap-000003")
    assert manifest.check(rec.store.root) == []


def test_check_finds_an_edit_an_extra_file_and_a_missing_file(rec, prof):  # noqa: F811
    rec.create(prof, "normal_depth", "trapezoid", INPUTS)
    root = rec.store.root
    g = root / "cases" / "nd-trap-000003.json"
    g.write_text(g.read_text().replace("9.99", "9.98"))
    (root / "cases" / "typed-by-hand.json").write_text("{}")
    (root / "captures" / "nd-trap-000001" / "screen-00.txt").unlink()
    problems = manifest.check(root)
    assert any(p.startswith("hash differs: cases/nd-trap-000003.json") for p in problems)
    assert "not in the manifest: cases/typed-by-hand.json" in problems
    assert "missing: captures/nd-trap-000001/screen-00.txt" in problems
