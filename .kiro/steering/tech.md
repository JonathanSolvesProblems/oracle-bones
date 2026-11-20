---
inclusion: fileMatch
fileMatchPattern: ["app/**", "oracle/**", "scripts/**", "power/**"]
---

# Tech

- **Oracle runner:** Linux container. emu2 (GPL-2.0, github.com/dmsc/emu2) built from a
  pinned commit, as a separate process only. Python 3 with `pty` and `pyte`.
- **MCP server:** Python, stdio, running on the host and starting containers.
- **Solver and app:** TypeScript with Vite. Static site, no server, works offline.
- **Tests:** Vitest. fast-check for property tests.
- **Containers run with `--network none`.** The binary never gets network access.
- **Windows host:** the dev machine is Windows with Docker Desktop. Scripts must work from
  PowerShell and from Linux CI. Do not assume bash on the host.

## Numeric rules

- Keep the solver's raw value and the printed value as separate things. Comparing printed
  strings is the contract; comparing raw floats is not.
- QUICK-2 was compiled with QuickBASIC 4.5, so assume single-precision floats until shown
  otherwise. Use `Math.fround` where the oracle requires it.
- All units are US customary, as in the program: feet, cubic feet per second.

## Credits

Agent hooks and agent loops spend Kiro credits. Oracle runs are shell commands and spend
none, so prefer a command hook. Do not rerun the whole case set from an agent loop when the
quick set would answer the question.
