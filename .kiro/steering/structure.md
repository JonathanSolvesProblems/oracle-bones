---
inclusion: auto
name: structure
description: Repository layout and naming rules for case ids, haunting ids and bugfix specs. Use when creating files, folders, cases or specs.
---

# Structure

```
.kiro/                 specs, steering, hooks, agents, workflows, MCP settings. Never gitignored.
oracle/                Python: runner, screen parser, MCP server
  runner/              code that runs inside the container
  goldens/             answers recorded from the binary, one file per mode. Read-only to agents.
  vendor/              downloaded binaries. Gitignored.
  out/                 run reports. Gitignored.
app/                   Quickened, Vite and TypeScript
  src/solver/          the rebuilt calculations
  src/format/          QUICK-2 print and rounding rules
  src/ui/              screens
power/                 the Kiro power: plugin.json, mcp.json, skills/
scripts/               setup, hook scripts, ablation
results/               ledger, hauntings, headline numbers, ablation. Committed.
art/                   Kotsu, the mascot: icon, header, four poses. CC BY 4.0, own LICENSE.
docs/                  build log, mascot brief
```

## Naming

- Case ids look like `nd-trap-000123` (mode, shape, sequence).
- Haunting ids look like `H-001`.
- A bugfix spec is named after the behaviour, for example `nd-depth-truncation`.
