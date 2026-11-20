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
    cases = generator.generate(PROF, 7, 3, existing_ids=["nd-trap-000001", "nd-trap-000002"])
    assert [c["id"] for c in cases] == ["nd-trap-000003", "nd-trap-000004", "nd-trap-000005"]


def test_boundaries_appear():
    values = [v for c in generator.generate(PROF, 1, 400) for v in c["inputs"].values()]
    assert "0" in values and "-1" in values


def test_typed_like_the_manual():
    assert generator._fmt(0.035, 3) == ".035"
    assert generator._fmt(300.2, 0) == "300"
    assert generator._fmt(10.0, 1) == "10"
