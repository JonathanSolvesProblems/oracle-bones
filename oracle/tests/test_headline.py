"""results/headline.md and results/ablation-manual-only.md are exactly what scripts/headline.py
writes. Offline: it reads the committed goldens and runs the three node rebuilds, and starts no
container. It never writes either file or the ledger."""
import importlib.util

from oracle import paths


def _headline():
    spec = importlib.util.spec_from_file_location("headline_script", paths.ROOT / "scripts" / "headline.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_result_files_are_what_the_script_writes():
    mod = _headline()
    headline, ablation = mod.build()
    assert (paths.ROOT / "results" / "headline.md").read_text(encoding="utf-8") == headline, \
        "results/headline.md differs: run python scripts/headline.py"
    assert (paths.ROOT / "results" / "ablation-manual-only.md").read_text(encoding="utf-8") == ablation, \
        "results/ablation-manual-only.md differs: run python scripts/headline.py"


def test_headline_starts_with_the_lines_the_proof_page_reads():
    lines = (paths.ROOT / "results" / "headline.md").read_text(encoding="utf-8").splitlines()
    assert lines[0].startswith("Cases: ") and " of " in lines[0]
    assert lines[1].startswith("Run: ")
