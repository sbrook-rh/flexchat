<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

---

<!-- OPENPLAN:START -->
# OpenPlan Instructions

**OpenPlan** is for exploratory planning - decomposing epics, validating approaches, and preparing features for OpenSpec.

**Suggest OpenPlan commands when the request:**
- Mentions exploring, decomposing, or breaking down large initiatives
- Needs to validate technical approaches before specifying
- Involves iterative discovery or proving assumptions
- Preparing features to be "ready for OpenSpec"

**Quick commands** (slash commands for discovery):
- `/openplan-list` - See all items by phase
- `/openplan-overview` - Validation dashboard
- `/openplan-status <id>` - Item details
- `/openplan-sessions` - List active sessions
- `/openplan-health` - System health

**Workflow commands** (natural CLI):
- `openplan idea` - Capture new ideas
- `openplan discuss <id>` - Explore and validate
- `openplan decompose <id>` - Break down epics (iterative)
- `openplan sync <id>` - Check progress, recenter context
- `openplan ready <id>` - Generate OpenSpec handoff prompt

**How it works:**
- User types `openplan <command> [args]`
- Dispatcher rule (.cursor/rules/openplan-commands.mdc) triggers
- Loads `openplan/OPENPLAN.md` + `openplan/commands/<COMMAND>.md`
- Follows references, executes with parsed arguments

**OpenPlan complements OpenSpec:**
- OpenPlan = exploration, decomposition, validation (before specification)
- OpenSpec = specification, implementation, testing (after planning)
- Handoff: `openplan ready <id>` generates context for `openspec propose`

Keep this managed block so 'openplan update' can refresh the instructions.

<!-- OPENPLAN:END -->