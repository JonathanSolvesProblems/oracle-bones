"""resurrection-power task 1.1: the format rules of Requirements 1.1 to 1.4 and 2.2, applied to power/.

The rules are the ones the design records from the Agent Plugins Specification 1.0.0 and the
Agent Skills specification, checked on 2026-11-26.
"""

import json
import re
from pathlib import Path

POWER = Path(__file__).resolve().parents[2] / "powers" / "oracle-bones"
SCHEMA_BASE = "https://agent-plugins.org/schemas/1.0.0/"
MANIFEST_FIELDS = {"$schema", "name", "version", "description", "author", "homepage", "repository",
                   "license", "keywords", "extensions"}
SERVER_FIELDS = {"type", "command", "args", "env", "cwd"}
NAME = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$")
SKILL_NAME = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _json(name):
    return json.loads((POWER / name).read_text(encoding="utf-8"))


def test_plugin_manifest():
    m = _json("plugin.json")
    assert m["$schema"] == SCHEMA_BASE + "plugin.schema.json"
    assert m["name"] == "oracle-bones"
    assert NAME.match(m["name"]) and "--" not in m["name"] and ".." not in m["name"]
    for k in ("version", "description", "author", "license", "keywords"):
        assert m.get(k), k
    assert not set(m) - MANIFEST_FIELDS, set(m) - MANIFEST_FIELDS
    assert isinstance(m["author"], dict) and set(m["author"]) <= {"name", "email", "url"} and m["author"]["name"]
    assert re.match(r"^\d+\.\d+\.\d+$", m["version"])
    assert isinstance(m["keywords"], list) and all(isinstance(k, str) and k for k in m["keywords"])


def test_the_folder_carries_the_manifests_name():
    """Requirement 1.5: Kiro names a power installed from a folder after the folder (the clean
    install of 2026-11-26 registered power/ as "power"), so the folder is named as plugin.json is."""
    assert POWER.is_dir(), POWER
    assert POWER.name == _json("plugin.json")["name"]


def test_mcp_config():
    c = _json("mcp.json")
    assert set(c) == {"$schema", "mcpServers"}
    assert c["$schema"] == SCHEMA_BASE + "mcp.schema.json"
    # Its schema version must equal the manifest's, or the client disables MCP for the plugin.
    assert c["$schema"].split("/")[-2] == _json("plugin.json")["$schema"].split("/")[-2]
    assert len(c["mcpServers"]) == 1
    (server,) = c["mcpServers"].values()
    assert set(server) <= SERVER_FIELDS, set(server) - SERVER_FIELDS
    assert server["type"] == "stdio"
    assert "cwd" not in server  # it starts in the plugin root
    assert server["command"] and not re.search(r"[\\/\s]|\$\{", server["command"])
    env = server.get("env", {})
    assert "PLUGIN_ROOT" not in env and "PLUGIN_DATA" not in env


def _frontmatter(text):
    m = re.match(r"^---\r?\n(.*?)\r?\n---\r?\n", text, re.S)
    assert m, "no frontmatter"
    out = {}
    for line in m.group(1).splitlines():
        if ":" in line and not line.startswith(" "):
            k, v = line.split(":", 1)
            out[k.strip()] = v.strip().strip('"')
    return out


def test_skills():
    dirs = sorted(p for p in (POWER / "skills").iterdir() if p.is_dir())
    assert "resurrect" in [d.name for d in dirs]  # Requirement 2.2
    for d in dirs:
        fm = _frontmatter((d / "SKILL.md").read_text(encoding="utf-8"))
        assert fm.get("name") == d.name
        assert len(d.name) <= 64 and SKILL_NAME.match(d.name), d.name
        assert 0 < len(fm.get("description", "")) <= 1024, d.name


def test_the_resurrect_skill_states_the_oracle_law():
    text = (POWER / "skills" / "resurrect" / "SKILL.md").read_text(encoding="utf-8")
    for phrase in ("always right", "golden", "haunting", "set_workspace", "init_workspace", "Docker"):
        assert phrase in text, phrase


def test_no_program_binary_in_the_package():
    bad = []
    for p in POWER.rglob("*"):
        if not p.is_file() or "__pycache__" in p.parts:
            continue
        rel = p.relative_to(POWER).as_posix()
        if p.suffix.lower() in (".exe", ".com", ".zip"):
            bad.append(rel)
        with open(p, "rb") as f:
            head = f.read(4)
        if head[:2] == b"MZ" or head == b"\x7fELF":
            bad.append(rel)
        if rel.split("/")[0] == "oracle" and len(rel.split("/")) > 1 and rel.split("/")[1] in ("vendor", "goldens", "out"):
            bad.append(rel)
    assert bad == []
