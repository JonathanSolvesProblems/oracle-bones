"""Key notation, the bytes each key becomes, and which keys are verified to reach the program.

Notation: literal characters as themselves; named keys in braces such as {Enter}, {F5},
{PgUp}; modifiers as {Shift+F1}, {Ctrl+X}, {Alt+X}; a literal brace as {{ or }}.
Names are case-insensitive.

Bytes are what an xterm sends, which is what emu2's keyboard decoder reads. A key is
refused until it is verified: a capture showed the program reacting to it under emu2.
"""

import re

from ..errors import OracleError

NAMED = {
    "enter": b"\r", "esc": b"\x1b", "tab": b"\t", "backspace": b"\x7f",
    "up": b"\x1b[A", "down": b"\x1b[B", "right": b"\x1b[C", "left": b"\x1b[D",
    "home": b"\x1b[H", "end": b"\x1b[F",
    "pgup": b"\x1b[5~", "pgdn": b"\x1b[6~", "ins": b"\x1b[2~", "del": b"\x1b[3~",
    "f1": b"\x1bOP", "f2": b"\x1bOQ", "f3": b"\x1bOR", "f4": b"\x1bOS",
    "f5": b"\x1b[15~", "f6": b"\x1b[17~", "f7": b"\x1b[18~", "f8": b"\x1b[19~",
    "f9": b"\x1b[20~", "f10": b"\x1b[21~", "f11": b"\x1b[23~", "f12": b"\x1b[24~",
}
CANON = {k: k.capitalize() if not k.startswith("f") or not k[1:].isdigit() else k.upper() for k in NAMED}
CANON.update({"pgup": "PgUp", "pgdn": "PgDn", "esc": "Esc", "ins": "Ins", "del": "Del"})
MODS = ("shift", "ctrl", "alt")

# Key -> evidence that the program received it under emu2 (a capture path or case id).
# Tokens are written in canonical notation; "literal" covers printable ASCII characters.
VERIFIED = {
    # Typed digits and letters echo on the form and select menu entries; Enter moves on.
    "literal": "oracle/tests/captures/quick2/trap_result_300.txt",
    "{Enter}": "oracle/tests/captures/quick2/trap_result_300.txt",
    # Each pair of captures shows the screen before and after the key (task 4.4).
    "{F2}": "oracle/tests/captures/quick2/keys/F2-after.txt",   # back to the previous prompt
    "{F5}": "oracle/tests/captures/quick2/keys/F5-after.txt",   # print; the screen changes
    "{F6}": "oracle/tests/captures/quick2/keys/F6-after.txt",   # save; asks for the drive letter
    "{F7}": "oracle/tests/captures/quick2/keys/F7-after.txt",   # main menu
    "{F9}": "oracle/tests/captures/quick2/keys/F9-after.txt",   # new shape
    "{F10}": "oracle/tests/captures/quick2/keys/F10-after.txt",  # quit; the program exits 0
}


def check_profile_keys(profile):
    """Session start: every key the profile lists must be valid notation and verified."""
    for k in profile["keys"]["list"]:
        check_verified(parse(k))

_TOKEN = re.compile(r"\{\{|\}\}|\{([^{}]+)\}|(.)", re.S)


class Key(tuple):
    """(kind, value, mods): kind is 'char' or 'named'; mods is a sorted tuple."""

    __slots__ = ()

    def __new__(cls, kind, value, mods=()):
        return super().__new__(cls, (kind, value, tuple(sorted(mods))))

    kind = property(lambda s: s[0])
    value = property(lambda s: s[1])
    mods = property(lambda s: s[2])

    def notation(self):
        if self.kind == "char" and not self.mods:
            return {"{": "{{", "}": "}}"}.get(self.value, self.value)
        name = CANON[self.value] if self.kind == "named" else self.value.upper()
        return "{%s}" % "+".join([m.capitalize() for m in self.mods] + [name])


def parse(notation):
    keys = []
    pos = 0
    for m in _TOKEN.finditer(notation):
        if m.start() != pos:
            raise OracleError("invalid_arguments", "bad key notation near %r" % notation[pos:])
        pos = m.end()
        tok = m.group(0)
        if tok == "{{":
            keys.append(Key("char", "{"))
        elif tok == "}}":
            keys.append(Key("char", "}"))
        elif m.group(1) is not None:
            parts = m.group(1).split("+")
            mods, name = [p.lower() for p in parts[:-1]], parts[-1]
            if any(p not in MODS for p in mods) or len(set(mods)) != len(mods):
                raise OracleError("invalid_arguments", "unknown modifier in {%s}" % m.group(1))
            if name.lower() in NAMED:
                keys.append(Key("named", name.lower(), mods))
            elif len(name) == 1 and mods and name.isascii() and name.isalnum():
                keys.append(Key("char", name.lower(), mods))
            else:
                raise OracleError("invalid_arguments", "unknown key {%s}" % m.group(1))
        else:
            ch = m.group(2)
            if ch in "{}":
                raise OracleError("invalid_arguments", "unmatched brace; write a literal brace as {{ or }}")
            if not (" " <= ch <= "~"):
                raise OracleError("invalid_arguments", "only printable ASCII may be typed literally: %r" % ch)
            keys.append(Key("char", ch))
    if pos != len(notation):
        raise OracleError("invalid_arguments", "bad key notation near %r" % notation[pos:])
    return keys


def format_keys(keys):
    return "".join(k.notation() for k in keys)


def _mod_param(mods):
    return 1 + (1 if "shift" in mods else 0) + (2 if "alt" in mods else 0) + (4 if "ctrl" in mods else 0)


def encode(key):
    """The bytes for one key."""
    if key.kind == "char":
        if not key.mods:
            return key.value.encode("ascii")
        if key.mods == ("ctrl",):
            return bytes([ord(key.value.upper()) & 0x1F])
        if key.mods == ("alt",):
            return b"\x1b" + key.value.encode("ascii")
        raise OracleError("unsupported_key", "no encoding for %s" % key.notation())
    base = NAMED[key.value]
    if not key.mods:
        return base
    if key.value == "tab" and key.mods == ("shift",):
        return b"\x1b[Z"
    p = _mod_param(key.mods)
    if base.startswith(b"\x1bO") or base[-1:] in b"ABCDFH" and base.startswith(b"\x1b["):
        return b"\x1b[1;%d%s" % (p, base[-1:])
    if base.endswith(b"~"):
        return base[:-1] + b";%d~" % p
    raise OracleError("unsupported_key", "no encoding for %s" % key.notation())


def is_verified(key):
    if key.kind == "char" and not key.mods:
        return "literal" in VERIFIED
    return key.notation() in VERIFIED


def check_verified(keys):
    bad = [k.notation() for k in keys if not is_verified(k)]
    if bad:
        raise OracleError("unsupported_key", "not yet verified to reach the program: %s" % ", ".join(bad),
                          {"keys": bad})


def chunks(keys):
    """Hex chunks to write. A sequence that starts with ESC goes alone, so emu2 does not read
    the next key as part of it."""
    out, cur = [], b""
    for k in keys:
        b = encode(k)
        if b.startswith(b"\x1b"):
            if cur:
                out.append(cur)
                cur = b""
            out.append(b)
        else:
            cur += b
    if cur:
        out.append(cur)
    return [c.hex() for c in out]
