"""A small JSON Schema validator covering the subset this harness uses.

Supported keywords: type, properties, required, additionalProperties (bool or schema), items,
enum, const, pattern, minimum, maximum, minItems, minLength, oneOf, anyOf, $ref (local
"#/definitions/..." only). Written here so the host side needs no third-party packages.
"""

import re

_TYPES = {
    "object": dict,
    "array": list,
    "string": str,
    "boolean": bool,
    "null": type(None),
}


def _is_type(value, name):
    if name == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if name == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    return isinstance(value, _TYPES[name])


def validate(value, schema, root=None, path="$"):
    """Return a list of error strings; empty when the value is valid."""
    root = schema if root is None else root
    errors = []
    if "$ref" in schema:
        ref = schema["$ref"]
        if not ref.startswith("#/"):
            raise ValueError("only local $ref is supported: " + ref)
        target = root
        for part in ref[2:].split("/"):
            target = target[part]
        return validate(value, target, root, path)

    if "type" in schema:
        names = schema["type"] if isinstance(schema["type"], list) else [schema["type"]]
        if not any(_is_type(value, n) for n in names):
            return ["%s: expected %s, got %s" % (path, "/".join(names), type(value).__name__)]
    if "const" in schema and value != schema["const"]:
        errors.append("%s: must be %r" % (path, schema["const"]))
    if "enum" in schema and value not in schema["enum"]:
        errors.append("%s: must be one of %r" % (path, schema["enum"]))
    if isinstance(value, str):
        if "pattern" in schema and not re.search(schema["pattern"], value):
            errors.append("%s: does not match %s" % (path, schema["pattern"]))
        if "minLength" in schema and len(value) < schema["minLength"]:
            errors.append("%s: shorter than %d" % (path, schema["minLength"]))
    if _is_type(value, "number"):
        if "minimum" in schema and value < schema["minimum"]:
            errors.append("%s: below %r" % (path, schema["minimum"]))
        if "maximum" in schema and value > schema["maximum"]:
            errors.append("%s: above %r" % (path, schema["maximum"]))
    if isinstance(value, list):
        if "minItems" in schema and len(value) < schema["minItems"]:
            errors.append("%s: fewer than %d items" % (path, schema["minItems"]))
        if "items" in schema:
            for i, item in enumerate(value):
                errors += validate(item, schema["items"], root, "%s[%d]" % (path, i))
    if isinstance(value, dict):
        props = schema.get("properties", {})
        for key in schema.get("required", []):
            if key not in value:
                errors.append("%s: missing %r" % (path, key))
        extra = schema.get("additionalProperties", True)
        for key, item in value.items():
            sub = "%s.%s" % (path, key)
            if key in props:
                errors += validate(item, props[key], root, sub)
            elif extra is False:
                errors.append("%s: unknown key" % sub)
            elif isinstance(extra, dict):
                errors += validate(item, extra, root, sub)
    for keyword in ("oneOf", "anyOf"):
        if keyword in schema:
            passing = [s for s in schema[keyword] if not validate(value, s, root, path)]
            if keyword == "oneOf" and len(passing) != 1:
                errors.append("%s: must match exactly one alternative (matched %d)" % (path, len(passing)))
            if keyword == "anyOf" and not passing:
                errors.append("%s: matches no alternative" % path)
    return errors
