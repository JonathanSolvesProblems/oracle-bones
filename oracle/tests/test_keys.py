"""Property 7 (key notation) and key verification. No Docker needed."""

import pytest
from hypothesis import given, strategies as st

from oracle import paths, profile
from oracle.errors import OracleError
from oracle.runner import keys

named = st.sampled_from(sorted(keys.NAMED))
mods = st.lists(st.sampled_from(keys.MODS), unique=True, max_size=3)
literal = st.characters(min_codepoint=0x20, max_codepoint=0x7E)
token = st.one_of(
    literal.map(lambda c: keys.Key("char", c)),
    st.tuples(named, mods).map(lambda t: keys.Key("named", t[0], t[1])),
    st.tuples(st.sampled_from("abcxyz019"), st.sampled_from([["ctrl"], ["alt"]])).map(
        lambda t: keys.Key("char", t[0], t[1])),
)


@given(st.lists(token, max_size=20))
def test_format_then_parse_round_trips(tokens):
    assert keys.parse(keys.format_keys(tokens)) == tokens


@given(named)
def test_every_named_key_encodes_to_fixed_bytes(name):
    k = keys.Key("named", name)
    assert keys.encode(k) and keys.encode(k) == keys.encode(k)


@given(named, mods)
def test_modified_keys_encode_or_are_unsupported(name, ms):
    k = keys.Key("named", name, ms)
    try:
        assert keys.encode(k) == keys.encode(k) != b""
    except OracleError as e:
        assert e.category == "unsupported_key"
        assert keys.NAMED[name][:1] != b"\x1b" or not keys.NAMED[name].startswith((b"\x1bO", b"\x1b["))


def test_examples():
    assert keys.parse("3{Enter}") == [keys.Key("char", "3"), keys.Key("named", "enter")]
    assert keys.parse("{f5}{SHIFT+F1}{{}}") == [keys.Key("named", "f5"), keys.Key("named", "f1", ["shift"]),
                                                keys.Key("char", "{"), keys.Key("char", "}")]
    assert keys.encode(keys.parse("{F10}")[0]) == b"\x1b[21~"
    assert keys.encode(keys.parse("{Shift+F1}")[0]) == b"\x1b[1;2P"
    assert keys.encode(keys.parse("{Ctrl+C}")[0]) == b"\x03"


@pytest.mark.parametrize("bad", ["{Nope}", "{Hyper+F1}", "{Enter", "\x01", "{Shift+Shift+F1}"])
def test_bad_notation(bad):
    with pytest.raises(OracleError) as e:
        keys.parse(bad)
    assert e.value.category == "invalid_arguments"


def test_esc_sequences_are_sent_alone():
    assert keys.chunks(keys.parse("12{F2}3{Esc}4")) == [b"12".hex(), b"\x1bOQ".hex(), b"3".hex(),
                                                        b"\x1b".hex(), b"4".hex()]


def test_unverified_key_refused():
    with pytest.raises(OracleError) as e:
        keys.check_verified(keys.parse("{F4}"))
    assert e.value.category == "unsupported_key"


def test_profile_keys_are_verified():
    keys.check_profile_keys(profile.load())


def test_verification_evidence_exists():
    for evidence in keys.VERIFIED.values():
        assert (paths.ROOT / evidence).exists(), evidence
