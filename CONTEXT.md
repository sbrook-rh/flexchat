## Ways of Working
- Discuss → Confirm → Run: we talk through intent first, then I make changes only after your explicit go-ahead.
- Transparency: I announce planned commands and summarize expected effects before running them.
- Safety: anything requiring network or privileged access is requested before execution.
- Scope control: changes are surgical and focused; I won't fix unrelated issues without agreement.
- Logging: impactful commands and changes are recorded in `SESSION_LOG.md`.
- Documentation: Keep only README.md in root; all other documentation goes in `docs/` folder.

## Change Planning
- Simplicity first: prefer the minimal, robust fix over broader refactors.
- Discuss-first triggers: pause and align before edits when any apply:
  - Changes span multiple files or >50 lines, or alter cross-cutting behavior
  - External contracts/data shapes are uncertain or unverified
  - Adding/removing routes/endpoints, or touching persistence
  - I cannot reproduce locally and would be guessing
- Evidence before edits: capture one concrete log/command showing the issue and the expected vs. actual behavior.
- Minimal-first fix: add the smallest instrumentation to confirm the hypothesis, apply the smallest viable change in one place, validate, then consider refactors.
- Git safety: 
  - NEVER use `git add -A` or `git add .` - always add files individually to avoid accidentally committing secrets or sensitive files.
  - Make atomic commits where each commit contains all changes required for a single logical change.
  - Avoid "initial commit" with all code - build up the repository incrementally with meaningful commits.
  - Always review what's being committed before committing.
- Change budget guidelines:
  - Small (≤15 lines, 1 file): proceed with a brief heads-up
  - Medium (16–50 lines or 2 files): propose options and wait for confirmation
  - Large (>50 lines or 3+ files): discuss approach and alternatives first
- Proposal template I’ll use:
  - Evidence (1–2 observations)
  - Options (A: smallest, B: robust, C: longer-term)
  - Expected outcome (what we’ll see if it works)
  - Rollback (what to revert if it doesn’t)


## Key Scripts and Config


## Common Tasks / Runbook


## Build and Deployment Operations

## How We Use the Session Log
- Each session gets a dated section.
- We capture: context, decisions, commands run (with outputs when relevant), changes made, TODOs/next, and open questions.

Template snippet:

```
## YYYY-MM-DD
### Context
- ...

### Decisions
- ...

### Commands Run
- ...

### Changes Made
- ...

### TODOs / Next
- ...

### Open Questions
- ...
```

## Open Questions
- Preferred detail for logging: only impactful actions (default) or everything?
- Any additional conventions (branching, commit style, naming) to capture?
