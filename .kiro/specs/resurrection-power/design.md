# Design Document

## The format, as checked

Checked on 2026-11-26 against: kiro.dev/docs/powers, /powers/create and /powers/installation
(the `.md` twin), the Agent Plugins Specification 1.0.0 at agent-plugins.org/specification,
and the Agent Skills specification at agentskills.io/specification. The person's reading of
the loader in Kiro agent extension 1.1.1122 is not used as a source. Where the two differ:

- **`$schema`.** The documents name one value, `.../schemas/1.0.0/plugin.schema.json`. A client
  must recognise the exact value and may map other versions it knows to be compatible; no
  `1.x.y` pattern is documented. This package uses 1.0.0.
- **`name`.** Besides the character set and 64-character limit, it must start and end with a
  letter or digit and may not contain `--` or `..`.
- **`displayName`.** Not a manifest field. The manifest is closed: `$schema`, `name`, `version`,
  `description`, `author`, `homepage`, `repository`, `license`, `keywords`, `extensions`. Any
  other field is reported and ignored. Any other schema error (for example an `author` field
  other than `name`, `email`, `url`) rejects the whole plugin.
- **Icon.** No document defines an icon field, so 4.1 adds none.
- **`mcp.json`.** Confirmed: an extra top-level field disables MCP for the plugin. Also: its
  `$schema` version must equal `plugin.json`'s, or MCP is disabled; an unknown field in one
  server entry skips only that server; `command` gets no placeholder expansion; `cwd` must stay
  inside the plugin root or the data folder.
- **`PLUGIN_ROOT`, `PLUGIN_DATA`.** The specification requires a client to set them and forbids
  `env` from setting them. Kiro's own pages do not say that Kiro sets them. Kiro's create page
  shows `${SUPABASE_URL}` in `env`, which the specification does not expand.
- **Server names.** Kiro renames a power's server `power-<power>-<server>`, and keeps it out of
  `~/.kiro/settings/mcp.json`.
- **Skills.** Confirmed, plus: the name is lowercase letters, digits and hyphens (no dots), not
  starting or ending with a hyphen, no `--`; the description must not be empty; only direct
  children of `skills/` are read.
- **Install.** Confirmed: a GitHub or GitLab URL, which may point to a folder and names the
  branch in the URL (no branch means `main`), or a local folder; the CLI takes
  `kiro-cli powers install <name|path>`. Not documented: that installing copies the folder into
  Kiro's powers folder. The legacy format is read by its `POWER.md`; the pages say nothing of a
  legacy `steering/`.

The design therefore depends on neither the copy nor the environment variables: the server
finds its code from its own file path and its workspace as below.

## Layout

```
power/
  plugin.json
  mcp.json            oracle: python -m oracle.mcp_server, no cwd (plugin root)
  skills/resurrect/SKILL.md
  oracle/             generated from oracle/ by scripts/build_power.py
  workspace/          generated templates for init_workspace (7.1)
```

`scripts/build_power.py` writes `power/oracle/` and `power/workspace/` from an include list:
`oracle/*.py`, `oracle/runner/*.py`, `oracle/Dockerfile`, `oracle/.dockerignore`, the JSON files
of `oracle/`, `oracle/targets/quick2.json`, and the files named in 7.1. `--check` compares
without writing and prints each differing, missing or extra file; the drift test runs it (5.2,
7.3). The checks of 1.1 to 1.4 are one test module that applies the rules above to `power/`.

## The server

`mcp.json` sets `ORACLE_TARGET=oracle/targets/quick2.json`, an opaque string the server resolves
against the workspace. `oracle/paths.py` splits into a code root (the package folder, from
`__file__`) and a workspace root; every user path of 6.5 hangs from the workspace root. The
workspace comes from MCP roots, else `set_workspace` (6.3, 6.4), and lives only in the server
process. `PLUGIN_DATA` is not used.

`init_workspace` copies `power/workspace/` into the workspace without overwriting (7.1, 7.2) and
writes `oracle/power.json` there, holding the plugin root. The hook scripts, unchanged here,
read that file to put the package on `sys.path` when `oracle` is not importable (7.4).

Every tool that needs Docker first runs `docker version` once; its exit tells "not installed"
(no executable) from "not running" (non-zero exit) (8.1). The image is built from
`power/oracle/Dockerfile`, which fetches emu2 at a pinned commit (8.2, 8.3). Downloads reuse
`oracle/fetch.py` with the profile's address and hash (9.1, 9.2).

`draft_target(archive, exe)` unpacks into the workspace's downloads folder, boots through the
same runner, reads one screen, and writes `oracle/targets/<id>.json` with `status: draft`,
`started`, `first_screen` and `failures` (2.1, 2.3).

## Open points

- Whether Kiro finds `python` on Windows by that bare name. The clean install tells.
- Whether Kiro offers MCP roots. If not, `set_workspace` carries 6.4; the skill says to call it.
- The agents list `@oracle`; in a power the server is `power-oracle-bones-oracle`. The clean
  install tells whether the agents' tool list needs both names; any change is made here first,
  so the drift test still holds.
- What MAINHLP.EXE does in the emulator is unknown until its live boot.

## What the clean install showed (2026-11-26)

Added from the command line, outside Kiro, after task 6.1 (`docs/build-log.md`, session 16).
The documentation did not say any of these; the install did:

- Kiro names a power installed from a folder after the folder, not after `plugin.json`'s `name`.
  The package moved from `power/` to `powers/oracle-bones/`; `oracle/paths.py` names it as
  `PACKAGE`, and a test fails when the folder's name is not the manifest's (1.5).
- Installing copies the folder into Kiro's own powers folder. Nothing here depends on it.
- Kiro found `python` by its bare name on Windows.
- Kiro gave the server no workspace through MCP roots, so the workspace lives one window:
  `set_workspace` is called again in each new one, and the no-workspace message carries the
  agent there by itself.
- Hooks copied into a window that had opened in Restricted Mode showed as disabled until the
  window was reopened.

For Requirement 10: `init_workspace` returns `next`, three sentences from `oracle/workspace.py`.
`oracle/compare.py` takes the rebuild from `oracle/rebuild.json` in a workspace made by the power
and from `oracle/harness.json` here; with neither it returns `not_graded` and exit code 0.
`scripts/guard_goldens.py` picks its second sentence by whether `oracle/power.json` exists beside
it. `Recorder.create` adds `profile_cases` and `note` to its reply when it had to record the
profile's control cases first.
