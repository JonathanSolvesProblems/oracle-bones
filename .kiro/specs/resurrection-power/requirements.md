# Requirements Document

## Introduction

The Kiro power is what a developer installs to run a resurrection on their own dead program.
It is an Agent Plugins 1.0.0 package in `powers/oracle-bones/` (`power/` until 2026-11-26; see 1.5): a manifest, one MCP server (the oracle) and
skills. Everything else the method needs is copied into the user's workspace. The format was
checked against the documentation on 2026-11-26; see the design.

Terms: the *package* is `powers/oracle-bones/`, written `power/` in the criteria below, which predate the move. The *plugin root* is the folder Kiro runs it from. The
*workspace* is the folder the user has open in Kiro.

## Requirements

### Requirement 1: The package

**User Story:** As a developer, I want one install, so that I can try this on my own binary.

#### Acceptance Criteria

1. THE SYSTEM SHALL ship `power/plugin.json` with `$schema` `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`, name `oracle-bones`, version, description, author, license and keywords, and no field outside the specification's list.
2. THE SYSTEM SHALL ship `power/mcp.json` with the 1.0.0 `mcp.schema.json`, only `$schema` and `mcpServers` at the top level, and one stdio server that uses only `type`, `command`, `args`, `env` and `cwd`, whose `command` is a bare name, with no `cwd` (so it starts in the plugin root), and whose `env` does not set `PLUGIN_ROOT` or `PLUGIN_DATA`.
3. THE SYSTEM SHALL ship each skill as `power/skills/<name>/SKILL.md` whose frontmatter `name` equals `<name>` and follows the Agent Skills name rules, with a non-empty `description` of at most 1,024 characters.
4. THE SYSTEM SHALL ship no program binary, no emu2 file and no file from `oracle/vendor/`, `oracle/goldens/` or `oracle/out/`: no file in the package starts with the bytes `MZ` or `\x7fELF`, or ends in `.exe`, `.com` or `.zip`.

5. THE SYSTEM SHALL keep the package in a folder named as `plugin.json` names the power, `oracle-bones`. _(Added 2026-11-26 from the command line, outside Kiro: the clean install showed that Kiro names a power installed from a folder after the folder, so `power/` installed as "power".)_

### Requirement 2: Run on a new target

**User Story:** As a developer, I want to start from my own program, so that this is not tied to QUICK-2.

#### Acceptance Criteria

1. WHEN a user names a program archive and an executable in it THE SYSTEM SHALL boot the executable and write a draft profile to the workspace, marked `draft`, with the archive's sha256 and a report of whether the program started, the text of the first screen as read, and what failed.
2. THE SYSTEM SHALL ship a `resurrect` skill describing the method and the oracle law.
3. WHEN the program needs something the emulator lacks, or no screen is read, THE SYSTEM SHALL record in the report what failed, as the emulator or the runner reported it, and mark the draft as not started; no profile SHALL say a program ran unless a screen was read from it.
4. THE SYSTEM SHALL be tested on MAINHLP.EXE from the QUICK-2 archive, which has no profile, by a live boot whose draft is compared with what that boot showed.

### Requirement 3: Prove the install

**User Story:** As a judge, I want it to work from clean, so that the claim is real.

#### Acceptance Criteria

1. WHEN the power is installed into an empty folder opened in a new Kiro window THE SYSTEM SHALL reproduce the control case, Normal Depth for the trapezoid, at the depth the binary printed at the checkpoint: 3.27 ft at 300 cfs (`docs/build-log.md`, "Checkpoint passed"). The person runs this and pastes back what happened; the record goes in the build log.
2. THE SYSTEM SHALL describe in the README's "How to run it" only steps that appear in that record, and the section SHALL NOT be written before the record exists.

### Requirement 4: Identity

**User Story:** As a developer browsing powers, I want to recognise this one at a glance, so that I remember it and come back to it.

#### Acceptance Criteria

1. THE SYSTEM SHALL use `art/kotsu-header.png` as the README header, and `art/kotsu-icon-512.png` as the power's icon only through a field the documentation defines; with no such field, no icon field SHALL be added.
2. THE SYSTEM SHALL keep Kotsu out of the reviewer app, its results screen and its printout.
3. THE SYSTEM SHALL credit the art and state its licence (CC BY 4.0, `art/LICENSE`) in the README.
4. WHILE `art/` holds no art THE SYSTEM SHALL leave 4.1 and 4.3 open without blocking any other criterion.

### Requirement 5: The harness copy

**User Story:** As the maintainer, I want the power's harness to be the harness, so that the two never drift.

#### Acceptance Criteria

1. THE SYSTEM SHALL produce the package's copy of `oracle/` with one script, `scripts/build_power.py`, from an include list in that script; no file in the copy SHALL be edited by hand.
2. WHEN any file in the package differs from what the script would produce, or is missing, or is extra, THE SYSTEM SHALL fail a test that names the file.
3. THE SYSTEM SHALL keep the copy to the Python standard library: a test fails when a module in it imports anything else.

### Requirement 6: The server and the workspace

**User Story:** As a developer, I want the installed server to work on my files, so that my runs stay in my project.

#### Acceptance Criteria

1. WHEN the server is started as `mcp.json` says, from a copy of the package in a folder outside this repository, THE SYSTEM SHALL answer MCP `initialize` and list its tools.
2. THE SYSTEM SHALL write nothing under the plugin root.
3. WHEN the client offers MCP roots and lists exactly one `file:` root THE SYSTEM SHALL use it as the workspace.
4. WHEN the client offers no roots, or more than one, THE SYSTEM SHALL use the folder given to a `set_workspace` tool, which must be an existing absolute path; until then every tool that reads or writes the user's files SHALL return one message saying to call `set_workspace`, and do nothing else.
5. THE SYSTEM SHALL keep the target profiles, the downloaded programs, the runs, the goldens and the ledger under the workspace, at the paths `oracle/paths.py` names relative to this repository, so that in this repository nothing moves.

### Requirement 7: Workspace files

**User Story:** As a developer, I want the agents, hooks, law and workflow in my project, so that the method runs there as it runs here.

#### Acceptance Criteria

1. WHEN the user calls the `init_workspace` tool THE SYSTEM SHALL copy into the workspace, from templates in the package, `.kiro/agents/exhumer.md` and `skeptic.md`, the four hooks in `.kiro/hooks/`, `.kiro/steering/oracle-law.md`, `.kiro/workflows/resurrect.workflow.json`, the scripts the hooks call, the QUICK-2 profile, and a `.gitignore` line for the downloads folder.
2. WHEN a file to be copied exists with other content THE SYSTEM SHALL leave it unchanged and list it in the reply.
3. WHEN a template differs from this repository's file of the same path THE SYSTEM SHALL fail the drift test of 5.2, naming the file.
4. THE SYSTEM SHALL run each hook's command in a workspace made by `init_workspace` without an import error, in an offline test.

### Requirement 8: Docker and the runner

**User Story:** As a developer, I want to know at once when Docker is the problem, so that I do not chase other errors.

#### Acceptance Criteria

1. WHEN Docker is not installed, or is installed and not running, THE SYSTEM SHALL return one plain message saying which, and SHALL start no other process and write no file.
2. THE SYSTEM SHALL build the runner image on the user's machine from the package's Dockerfile, the first time a tool needs it.
3. THE SYSTEM SHALL fetch emu2 at a pinned version while that image is built, and run it as its own process in the container.

### Requirement 9: The program download

**User Story:** As a developer, I want the program fetched and checked for me, so that the power never ships it.

#### Acceptance Criteria

1. WHEN a profile's program is not in the workspace THE SYSTEM SHALL download it from the address in the profile into the workspace, as `scripts/setup.py` does now.
2. WHEN the download's sha256 differs from the profile's pinned hash THE SYSTEM SHALL delete it, say both hashes, and boot nothing.

### Requirement 10: What the clean install found

Added 2026-11-26 from the command line, outside Kiro, after task 6.1. Kiro had reached its usage
limit, so these criteria, their tests and their code were not written in a Kiro session. Each
one is something the person met in a workspace made by the power; the record is in
`docs/build-log.md`, session 16.

**User Story:** As a developer who has just installed the power, I want it to tell me what my new workspace still needs, so that I am not misled by a guard that is off or a grade that is not mine.

#### Acceptance Criteria

1. WHEN `init_workspace` replies THE SYSTEM SHALL say in plain sentences, under `next`: that hooks shown as disabled stay off until the window is closed and the folder opened again, and that the guard does not run while they are off; that `set_workspace` is needed in each new window; and where the user names their rebuild's command.
2. WHEN a workspace made by the power has no `oracle/rebuild.json` THE SYSTEM's grading script SHALL print one line saying that no rebuild is set and nothing was graded, grade nothing, and exit with code 0; it SHALL never grade the user on this repository's app. WHEN the file names a command THE SYSTEM SHALL grade that command, run in the workspace.
3. WHEN the guard refuses an edit THE SYSTEM SHALL name what works where it runs: in this repository the recorder's command line, and in a workspace made by the power the oracle's `run_case` tool with `record` true.
4. WHEN a recording first records the profile's own control cases THE SYSTEM SHALL list them in its reply and say that they check the profile against the program and where they are stored.
5. THE SYSTEM's `resurrect` skill SHALL say each of 10.1, 10.2 and 10.4 before the user meets it, and that the first recording takes a few minutes.

Not covered, and said in the README's limits: whether the Exhumer's `@oracle` tool source finds the power's server in a new workspace. No Exhumer run was made in a clean folder.
