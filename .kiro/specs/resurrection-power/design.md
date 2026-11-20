# Design Document

## Overview

`power/` holds the installable package.

```
power/
  plugin.json
  mcp.json
  skills/
    resurrect/
      SKILL.md
      references/oracle-law.md
```

`plugin.json` uses the schema `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`, with
keywords that trigger on the job: legacy, dead program, reverse engineer, DOS, emulator, port,
no source.

`mcp.json` uses `https://agent-plugins.org/schemas/1.0.0/mcp.schema.json` and starts the same
server as `.kiro/settings/mcp.json`.

The skill name must match its folder name. Steering is not shipped as a separate file: the
oracle law goes in the skill's references, so that the method travels with the power.

## Correctness Properties

### Property 1: One law

`power/skills/resurrect/references/oracle-law.md` has the same rules as
`.kiro/steering/oracle-law.md`. A test fails if they drift.
**Validates: Requirements 2.2**

## Error Handling

Missing Docker and failed emulator starts stop the run with a plain message.

## Testing Strategy

Install into an empty folder in Kiro and run the smoke test. This is the clean-clone test the
pre-submit gate requires.
