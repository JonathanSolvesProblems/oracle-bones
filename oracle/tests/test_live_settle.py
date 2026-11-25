"""Live check for Q-030: A-011's S2 (12 in, .013, 4 cfs, .005) reaches the circle Critical
Depth rejection, which keeps sending output while its text stays the same. With the screen
marked keeps_output the case ends as rejected with its message instead of timing out.
Runs the case only: nothing is recorded and no golden is written.
"""
from oracle import cases

S2 = {"diameter": "12", "n": ".013", "discharge": "4", "slope": ".005"}


def test_s2_ends_on_the_rejection_instead_of_timing_out(live):
    got = cases.run(live, "critical_depth", "circle", dict(S2))
    assert got["outcome"] == "rejected", got.get("reason")
    assert got["screen_id"] == "cd_circ_rejected"
    assert got["message"].strip() == "DEPTH is Greater than the DIAMETER"
    assert got["printed"] == {}
    assert got["resends"] == 0
