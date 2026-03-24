---
name: patch-notes
description: Write a new patch notes file documenting proposed changes to the project. Use when the user wants to record architecture decisions, dependency swaps, breaking changes, or any planned modifications before implementation.
usage: /patch-notes
triggers:
  - "write patch notes", "make a patch", "document this change", "propose a patch"
  - "add patch notes", "create a patch file", "patch notes for this"
skip_for: actual implementation (use tasks-write), project spec changes (use spec-write)
---

# Patch Notes Skill

## Purpose

Produce a numbered patch file under `docs/patches/` that serves as a permanent record of a proposed change — what it is, why it's being made, what it touches, and how to implement it. Patch files are written before implementation, not after.

---

## Step 1: Gather Context

Before writing, determine:

1. **What is changing?** — The core change in one sentence
2. **Why?** — The motivation (performance, cost, architecture, dependency swap, etc.)
3. **What type of change?** — Pick from: `dependency swap`, `architecture change`, `model strategy`, `schema migration`, `api change`, `config change`, `refactor`, or a combination
4. **What does it affect?** — Files, routes, DB schema, environment variables, etc.
5. **What stays the same?** — Explicitly call out what is NOT changing

Extract all of this from the conversation. Do not ask for information already discussed.

---

## Step 2: Determine Patch Number

1. Check `docs/patches/` for existing patch files
2. Find the highest existing patch number (e.g. `patch-003-...`)
3. Increment by 1 for the new patch
4. If no patches exist yet, start at `patch-001`

---

## Step 3: Write the Patch File

Filename: `docs/patches/patch-{NNN}-{short-slug}.md`

Use this exact structure:

```markdown
# Patch {NNN} — {Title}

**Date:** {today's date}
**Status:** Proposed
**Type:** {type(s) from Step 1}

---

## Summary

{2-4 sentences describing what this patch does and why. Be specific.}

---

## Motivation

{Bullet points explaining the problem being solved or the opportunity being taken.
Include any constraints (cost, timeouts, compatibility) that drove the decision.}

---

## Changes

### {Section per major change area}

{Describe the change. Include:
- Before/after code snippets where relevant
- New vs removed dependencies
- Environment variable additions/removals
- DB schema changes (as SQL)
- New or modified API routes
- Architecture diagrams in ASCII if the flow changes}

---

## Files Affected

| File | Change |
|---|---|
| `path/to/file` | Description of change |

---

## Cost / Performance Impact

{If relevant: estimate token costs, latency changes, pricing differences, etc.
If not relevant, omit this section.}

---

## No Changes To

{Bullet list of things explicitly NOT changing. This prevents scope creep and
reassures the reader that existing functionality is preserved.}
```

---

## Step 4: Write the File

- Create `docs/patches/` directory if it doesn't exist
- Write the file at the correct path
- Confirm to the user what was created and the patch number

---

## Quality Rules

**ALWAYS:**
- Include before/after code diffs for any API or SDK changes
- Be explicit about what is NOT changing — the no-changes section is mandatory
- Use the correct patch number by checking existing files first
- Keep status as `Proposed` — patches are plans, not changelogs

**NEVER:**
- Write a patch after the fact as a changelog (that's git history's job)
- Leave the motivation section vague — always state the concrete reason
- Bundle unrelated changes into one patch unless they are tightly coupled
- Skip the files affected table — it must always be present
