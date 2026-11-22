"""Property 3: generator reproducibility, and ids fixed before dispatch."""

from hypothesis import given, strategies as st

from oracle import generator, profile

PROF = profile.load()


@given(seed=st.integers(0, 2**32), count=st.integers(0, 60))
def test_same_seed_same_cases(seed, count):
    a = generator.generate(PROF, seed, count)
    b = generator.generate(PROF, seed, count)
    assert a == b
    assert len({c["id"] for c in a}) == len(a)


@given(seed=st.integers(0, 2**32))
def test_inputs_match_the_form_and_are_strings(seed):
    for c in generator.generate(PROF, seed, 20):
        names = [s["input"] for s in PROF["flows"]["%s/%s" % (c["mode"], c["shape"])]["steps"] if "input" in s]
        assert list(c["inputs"]) == names
        assert all(isinstance(v, str) and v for v in c["inputs"].values())


def test_ids_continue_after_existing():
    cases = generator.generate(PROF, 7, 3, ["normal_depth"], ["trapezoid"],
                               existing_ids=["nd-trap-000001", "nd-trap-000002"])
    assert [c["id"] for c in cases] == ["nd-trap-000003", "nd-trap-000004", "nd-trap-000005"]


def test_boundaries_appear():
    values = [v for c in generator.generate(PROF, 1, 400) for v in c["inputs"].values()]
    assert "0" in values and "-1" in values


def test_typed_like_the_manual():
    assert generator._fmt(0.035, 3) == ".035"
    assert generator._fmt(300.2, 0) == "300"
    assert generator._fmt(10.0, 1) == "10"


def test_pairs_without_every_range_are_uncovered_and_never_drawn():
    ready, uncovered = generator.split_pairs(PROF)
    for u in uncovered:
        assert u["missing_ranges"] == generator.missing_ranges(PROF, u["mode"], u["shape"]) != []
        assert (u["mode"], u["shape"]) not in ready
    drawn = {(c["mode"], c["shape"]) for c in generator.generate(PROF, 3, 200)}
    assert drawn <= set(ready)


@given(seed=st.integers(0, 2**32))
def test_practical_draws_stay_inside_the_cited_bounds_and_skip_boundaries(seed):
    for c in generator.generate(PROF, seed, 30, range_set="practical"):
        assert c["range_set"] == "practical"
        for name, text in c["inputs"].items():
            rng = PROF["ranges"][name]
            assert text not in rng.get("boundaries", [])
            lo, hi = generator.practical_bounds(rng, c["shape"]) or (rng["min"], rng["max"])
            step = 10 ** -rng["decimals"] / 2
            assert lo - step <= float(text) <= hi + step


def test_circle_n_uses_the_pipe_bounds():
    assert generator.practical_bounds(PROF["ranges"]["n"], "circle") == (0.008, 0.033)
    assert generator.practical_bounds(PROF["ranges"]["n"], "trapezoid") == (0.011, 0.5)


@given(seed=st.integers(0, 2**32))
def test_the_accepted_set_draws_what_version_1_drew(seed):
    import random
    rnd = random.Random("1/%s" % seed)
    choices = generator.split_pairs(PROF)[0]
    for c in generator.generate(PROF, seed, 10):
        assert (c["mode"], c["shape"]) == choices[rnd.randrange(len(choices))]
        for name, text in c["inputs"].items():
            rng = PROF["ranges"][name]
            if rng.get("boundaries") and rnd.random() < generator.BOUNDARY_SHARE:
                assert text == rnd.choice(rng["boundaries"])
            else:
                assert text == generator._fmt(rnd.uniform(rng["min"], rng["max"]), rng["decimals"])


def test_an_unknown_range_set_is_refused():
    import pytest
    from oracle.errors import OracleError
    with pytest.raises(OracleError):
        generator.generate(PROF, 1, 1, range_set="typical")