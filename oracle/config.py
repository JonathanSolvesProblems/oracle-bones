"""Harness config: settings that belong to the harness, not to any one program."""

import json

from . import paths
from .errors import OracleError
from .jsonschema_lite import validate

SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["emu2", "image", "max_sessions", "container", "session_idle_limit_s", "rebuild"],
    "properties": {
        "emu2": {
            "type": "object", "additionalProperties": False, "required": ["repo", "commit"],
            "properties": {"repo": {"type": "string"},
                           "commit": {"type": "string", "pattern": "^[0-9a-f]{40}$"}},
        },
        "image": {"type": "string", "pattern": "^[a-z0-9][a-z0-9._-]*$"},
        "max_sessions": {"type": "integer", "minimum": 1},
        "container": {
            "type": "object", "additionalProperties": False, "required": ["cpus", "memory", "pids"],
            "properties": {"cpus": {"type": "string", "pattern": r"^\d+(\.\d+)?$"},
                           "memory": {"type": "string", "pattern": r"^\d+[kmg]$"},
                           "pids": {"type": "integer", "minimum": 8}},
        },
        "session_idle_limit_s": {"type": "number", "minimum": 1},
        "rebuild": {
            "type": "object", "additionalProperties": False, "required": ["command", "time_limit_s"],
            "properties": {"command": {"type": ["array", "null"], "items": {"type": "string"}},
                           "time_limit_s": {"type": "number", "minimum": 1}},
        },
    },
}


def load(path=None):
    path = path or paths.HARNESS_CONFIG
    try:
        data = json.loads(open(path, encoding="utf-8").read())
    except (OSError, ValueError) as e:
        raise OracleError("invalid_arguments", "cannot read harness config %s: %s" % (path, e))
    errors = validate(data, SCHEMA)
    if errors:
        raise OracleError("invalid_arguments", "harness config is invalid", {"errors": errors})
    return data


def runner_hash():
    """Short hash of the files baked into the image, so a changed runner means a new image."""
    import hashlib
    h = hashlib.sha256()
    for p in (paths.ORACLE / "Dockerfile", paths.ORACLE / "runner" / "agent.py"):
        h.update(p.read_bytes().replace(b"\r\n", b"\n"))
    return h.hexdigest()[:8]


def image_tag(cfg):
    """The image tag carries the emu2 commit and the runner hash."""
    return "%s:%s-%s" % (cfg["image"], cfg["emu2"]["commit"][:12], runner_hash())
