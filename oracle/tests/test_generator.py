"""Property 3: generator reproducibility, and ids fixed before dispatch."""

from hypothesis import given, strategies as st

from oracle import cases, generator, profile

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
            if c["shape"] == "irregular":
                continue  # varied from recorded sections; see the section tests below
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


def practical(seed, n=80, **kw):
    return generator.generate(PROF, seed, n, range_set="practical", **kw)


@given(seed=st.integers(0, 2**32))
def test_practical_circles_fit_their_pipe(seed):
    """Q-014. Requirement 8.5: a depth deeper than the pipe holds the prompt (cc-circ-000018),
    so depths stay inside it; discharges stay under the pipe's full-flow Manning discharge."""
    for c in practical(seed, 20, shapes=["circle"]):
        i = c["inputs"]
        d_ft = float(i["diameter"]) / 12
        assert 8 <= float(i["diameter"]) <= 180
        if "depth" in i:
            assert 0 < float(i["depth"]) < d_ft
        if c["mode"] == "normal_depth":
            full = generator._full_pipe_cfs(float(i["diameter"]), float(i["n"]), float(i["slope"]))
            assert 1 <= float(i["discharge"]) <= 0.9 * full + 0.5
        if c["mode"] == "critical_depth":
            assert 1 <= float(i["discharge"]) <= generator._critical_cfs(float(i["diameter"]), 0.9) + 0.5


def test_critical_discharge_of_a_pipe():
    # half full: A = pi D^2 / 8, T = D
    import math
    d = 1.0
    a = math.pi * d * d / 8
    assert abs(generator._critical_cfs(12, 0.5) - a * math.sqrt(32.2 * a / d)) < 1e-9


@given(seed=st.integers(0, 2**32))
def test_practical_sections_keep_what_the_editor_accepts(seed):
    """Requirement 10: 2 to 40 points, strictly increasing stations, elevations above 0, banks on
    a ground station as typed (Requirement 9.6), left of right."""
    flow = PROF["flows"]["normal_depth/irregular"]
    for c in practical(seed, 10, modes=["normal_depth"], shapes=["irregular"]):
        i = c["inputs"]
        k = max(cases.point_number(flow, name) or 0 for name in i)
        sta = [i["sta_%02d" % n] for n in range(1, k + 1)]
        elev = [float(i["elev_%02d" % n]) for n in range(1, k + 1)]
        assert 2 <= k <= 40
        assert all(float(a) < float(b) for a, b in zip(sta, sta[1:]))
        assert min(elev) > 0
        assert i["bank_left"] in sta and i["bank_right"] in sta
        assert sta.index(i["bank_left"]) < sta.index(i["bank_right"])
        steps = cases.steps_for(PROF, "normal_depth", "irregular", inputs=i)
        assert [s["input"] for s in steps if "input" in s] == list(i)


def test_sections_are_never_drawn_in_the_accepted_set():
    assert ("normal_depth", "irregular") not in generator.split_pairs(PROF)[0]
    assert ("normal_depth", "irregular") in generator.split_pairs(PROF, range_set="practical")[0]


def test_fewer_points_end_entry_with_f10_after_the_last_one():
    """Requirement 10.1 (obs-irrtwopt-000001): F10 after the second point's elevation ends entry."""
    flow = PROF["flows"]["normal_depth/irregular"]
    full = {s["input"]: "1" for s in flow["steps"] if "input" in s}
    assert cases.steps_for(PROF, "normal_depth", "irregular", inputs=full) == flow["steps"]
    two = {k: v for k, v in full.items() if cases.point_number(flow, k) in (None, 1, 2)}
    steps = cases.steps_for(PROF, "normal_depth", "irregular", inputs=two)
    names = [s.get("input") or s.get("keys") for s in steps]
    at = names.index("elev_02")
    assert names[at + 1] == "{F10}" and names[at + 2] == "bank_left"
    import pytest
    from oracle.errors import OracleError
    with pytest.raises(OracleError):
        cases.steps_for(PROF, "normal_depth", "irregular",
                        inputs={k: v for k, v in full.items() if cases.point_number(flow, k) in (None, 1)})
