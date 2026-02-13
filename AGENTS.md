
---

<!-- OPENPLAN:START -->
# OpenPlan Instructions

**OpenPlan** is for exploratory planning - decomposing epics, validating approaches, and preparing features for OpenSpec.

**Suggest OpenPlan commands when the request:**
- Mentions exploring, decomposing, or breaking down large initiatives
- Needs to validate technical approaches before specifying
- Involves iterative discovery or proving assumptions
- Preparing features to be "ready for OpenSpec"

**Quick query commands** (data only, no context):
- `/openplan-list` - See all items by phase
- `/openplan-view` - Comprehensive dashboard (also: `/openplan-overview`)
- `/openplan-status <id>` - Item details
- `/openplan-sessions` - List active sessions
- `/openplan-health` - System health check (with auto-fix option)

**Experiment queries** (extract from structured markdown):
- `openplan experiments list <id>` - List all experiments
- `openplan experiments summary <id>` - Objectives and conclusions
- `openplan experiments show <id> --experiment <N> [--section <name>]` - Extract sections
  - Sections: `objective`, `findings`, `results`, `implications`, `next-steps`, `conclusions`
- `openplan experiments priorities <id>` - HIGH/MEDIUM/LOW classifications
- `openplan experiments next-steps <id>` - Aggregate action items
- **Fast, cheap, deterministic** - No LLM parsing needed

**Note**: The `openplan` CLI tool also supports `openplan context <id>` to show the context chain (task → feature → epic), and experiment queries for fast section extraction. These are typically called from workflow commands rather than directly.

**Workflow commands** (loads constitution + command instructions):
- `/openplan-idea` - Capture new ideas
- `/openplan-discuss <id>` - Explore and validate
- `/openplan-decompose <id>` - Break down epics (iterative)
- `/openplan-validate <id>` - Deep validation audit (quality gate)
- `/openplan-start <id>` - Begin work session
- `/openplan-sync <id>` - Check progress, recenter context
- `/openplan-ready <id>` - Generate OpenSpec handoff prompt

**How it works:**

*Workflow commands* (slash commands):
- User types `/openplan-discuss <id>` in Cursor
- Loads constitution + command file
- Agent follows instructions

*Query commands* (CLI tool):
- User types `/openplan-list` or agent runs `openplan list` in terminal
- Fast data access, no conversation

*Alternative: Dispatcher rule*:
- User types natural text: `openplan discuss <id>`
- Dispatcher rule (.cursor/rules/openplan-commands.mdc) triggers
- Loads same files as slash commands

**OpenPlan complements OpenSpec:**
- OpenPlan = exploration, decomposition, validation (before specification)
- OpenSpec = specification, implementation, testing (after planning)
- Handoff: `openplan ready <id>` generates context for `openspec propose`

Keep this managed block so 'openplan update' can refresh the instructions.

<!-- OPENPLAN:END -->
