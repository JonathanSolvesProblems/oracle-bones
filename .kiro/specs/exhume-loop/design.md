# Design Document

## Overview

The Exhumer is a custom Kiro agent with the oracle MCP tools. The loop lives in the model's
own session, not in code. Code supplies the tools and the ledger; the model decides what to
do next, based on what it has just seen.

## Architecture

- `.kiro/agents/exhumer.md`: the agent. Tools: read, write, `@oracle`, and the `skeptic` sub-agent.
- `.kiro/agents/skeptic.md`: an independent reviewer that sees a mismatch and the oracle, and can run cases.
- `.kiro/workflows/resurrect.workflow.json`: an optional recipe that runs the phases in order. The ordering of phases is fixed; the choices inside each are the model's.

## The decision

After each observation the Exhumer reads the ledger and picks one action:

| Action | When |
|---|---|
| `probe_screen` | an untried key or an unvisited screen is listed |
| `run_case` | a field's behaviour is not understood, or a hypothesis needs testing |
| `read_manual` | the observation is unexplained and the manual may help |
| `write_requirement` | the behaviour has been seen and repeated |
| `stop` | no open question is worth its credits, and the reason is written down |

## Ledger

The ledger's schema, its single writer and `ledger_read` belong to the oracle-harness spec
(Requirement 13, and the Ledger section of its design). The Exhumer reads it with
`ledger_read` and adds only its own sections, for example:

```json
{
  "open_questions": ["Why does 3.27 ft print with an area of 59.6?"],
  "decisions": [{"t": 1, "saw": "...", "chose": "run_case", "why": "..."}],
  "stopped": null
}
```

## First questions worth giving the Exhumer

These come from the spike. They are questions, not answers, and do not belong in the spec
until observed.

- Printed depth 3.27 sits beside area 59.6, but 3.27 ft gives 59.4. Is the depth truncated for
  display while the area uses a hidden value? Does the solver stop at a tolerance?
- At 3.27 ft the channel carries 297.2 cfs, not 300. What is the convergence rule?
- Does it use 1.486 or 1.49 for the Manning constant?
- The program is compiled BASIC. Is it single precision?

## Correctness Properties

### Property 1: Traceability

Every requirement in the generated spec cites a case id or capture that exists.
**Validates: Requirements 3.2**

### Property 2: Decisions are recorded

Every tool call that the Exhumer makes has a ledger decision naming what prompted it.
**Validates: Requirements 1.2**

## Error Handling

If the harness times out, the Exhumer records the case as unanswered and moves on. It never
infers a value for a case that did not finish.

## Testing Strategy

The run itself is the test. A script checks Property 1 against the case store. The ablation
is the external comparison.
