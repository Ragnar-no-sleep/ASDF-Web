# Workflow

This document defines a practical engineering workflow for software work in any repository.

In this repository, this file is the universal method layer.
Project-specific operating rules, stack constraints, deploy policy, and local conventions belong in `CLAUDE.md`.

It is intended to be universal:

- small team or solo project
- startup or product team
- greenfield or legacy codebase
- local-first or GitHub-centered development

It is also intentionally strict on the points that usually create hidden failure:

- local state drifting from shared state
- unclear scope
- mixed commits
- "green tests" masking real risk
- weak release discipline

## 1. Principles

### 1.1 Reality Before Action

Do not begin implementation from assumptions.

Before changing code, establish:

- the shared state
- the local state
- the uncommitted state
- the real production or runtime constraints

If those differ, say so explicitly and work from that reality.

### 1.2 One Problem, One Scope

Every piece of work should answer one primary question:

- what problem is being solved
- what invariant is being protected
- what evidence proves the change is correct

If a branch or commit cannot be explained that way, the scope is too wide.

### 1.3 Proof Over Intuition

"Looks correct" is not enough.

A change should be supported by at least one of:

- a targeted test
- a build or typecheck
- a reproducible failing scenario
- a direct code-path argument with concrete references

### 1.4 Shared Truth Wins

The shared remote repository is the team truth.

Local commits are private progress, not shared truth.
Uncommitted changes are working material, not durable state.

The longer local and shared reality diverge, the more risk accumulates.

## 2. State Model

Treat work as existing in three layers:

1. Shared state

- remote default branch
- open pull requests
- remote CI status

2. Local committed state

- local commits not yet pushed or reviewed

3. Local uncommitted state

- staged changes
- unstaged changes
- generated artifacts or temporary edits

Never mix these mentally. A rigorous workflow names them explicitly.

## 3. Session Start

At the beginning of a work session, check:

- current branch
- working tree status
- recent local commits
- remote tracking status
- pull request status if relevant

Minimum commands:

```bash
git status --short --branch
git log --oneline --decorate -n 10
git branch -vv
gh pr status
```

If there is already drift between local and remote, record it before making further changes.

## 4. Branching Strategy

### 4.1 Do Not Work Long on `main`

Use topic branches for any non-trivial work.

Examples:

- `fix/socket-reconnect-lifecycle`
- `fix/account-deletion-anonymization`
- `feat/puzzle-export`
- `audit/backend-hardening`

### 4.2 One Branch, One Intent

A branch should represent one coherent intent:

- one bug family
- one feature slice
- one audit hardening theme

Do not mix unrelated backend, frontend, schema, and infra work unless they are inseparable.

### 4.3 Keep Branches Short-Lived

Open a pull request as soon as the branch is:

- scoped
- testable
- reviewable

Do not let branches become private long-running forks of reality.

## 5. Work Sequence

The default sequence is:

1. establish reality
2. define the problem
3. define the invariant
4. inspect code paths
5. write or update tests where needed
6. implement the change
7. verify locally
8. commit in coherent slices
9. push and open a pull request

This sequence applies to fixes, refactors, audits, and security work.

## 6. Scoping Rules

Before implementation, write down:

- what is broken
- who is affected
- what the correct behavior is
- what must not regress

A good scope statement is concrete:

> A socket must not remain associated with multiple active rooms after reconnect or requeue.

Bad scope statements are vague:

> Improve multiplayer handling.

## 7. Commit Discipline

### 7.1 One Commit, One Defensible Change

Each commit should be understandable on its own.

Good examples:

- `fix(server): enforce single active game association per socket`
- `fix(web): clamp invalid pagination input to page 1`
- `test(server): cover first-move clock deduction and reconnect cache migration`

Weak examples:

- `misc fixes`
- `cleanup`
- `wip`

### 7.2 Separate Concerns

Split commits when concerns are distinct:

- backend lifecycle
- API hardening
- schema change
- tests
- documentation

This makes review, rollback, and blame analysis significantly easier.

### 7.3 Commit Only What You Intend

Before every commit, verify:

```bash
git diff --cached --name-only
git diff --cached
```

Never commit accidental local edits because they happen to be nearby.

## 8. Validation Gates

Every repository should define explicit validation gates.

Typical gates:

- unit tests
- integration tests
- typecheck
- build
- lint
- migration validation if schema changed

Run only what is relevant while iterating, then run the full relevant gate before publishing.

Examples:

```bash
npm test
npm run build
pnpm test
cargo test
pytest
go test ./...
```

## 9. Invariants

For critical systems, define invariants explicitly.

Examples:

- a user session cannot authenticate as two different principals
- a socket cannot belong to two active rooms
- a completed transaction must be idempotent
- account deletion must remove or anonymize public personal data
- public routes must not return soft-deleted data
- concurrency-sensitive writes must be serialized or retried safely

If a change affects a critical path, ask:

- what invariant could fail here
- what test proves it now holds

## 10. Audits and Reviews

When auditing or reviewing, report in this order:

1. findings
2. severity
3. evidence
4. open questions
5. summary

Always distinguish between:

- already fixed remotely
- fixed locally but unpublished
- fixed only in working tree
- not fixed
- falsely assumed fixed

This avoids wasting time on stale conclusions.

## 11. GitHub and Shared Workflow

### 11.1 Pull Requests Are Work Objects

A pull request should contain:

- the problem
- the change
- the evidence
- the residual risk

Short template:

- Problem: what was wrong
- Change: what was done
- Validation: what was run
- Residual risk: what is still not covered

### 11.2 Ready for PR

A branch is ready for PR when:

- the working tree is clean
- commits are coherent
- targeted verification passes
- the scope is stable
- the description can be reviewed in minutes, not hours

### 11.3 Ready to Merge

A change is ready to merge when:

- remote CI is green
- there is no known blocking runtime/config issue
- the branch reflects current shared reality
- the residual risks are explicitly accepted

## 12. Configuration and Environment Discipline

Code can be correct while deployment remains unsafe.

Treat configuration as part of the system.

Classify each config item as:

- required in production
- required in preview/staging
- optional in local development

Examples:

- database URL: required in all non-mock environments
- auth secret: required in production
- social provider credentials: required only if the feature is enabled

Warnings during build or startup are not noise. They must be triaged.

## 13. Handling Sensitive or Regulated Data

When the system stores user or business data, define these separately:

- deletion
- anonymization
- retention
- soft delete
- export/access

These are not interchangeable.

Examples:

- deletion may remove references
- anonymization may preserve records but scrub identity
- retention may preserve data for legal reasons
- export must include all user-owned data that policy promises

A mature system writes these rules down and encodes them in queries and jobs.

## 14. Failure Modes to Watch

Common patterns that produce false confidence:

- tests pass but the wrong invariant is being tested
- a fix blocks one entry point but leaves others open
- concurrency is reduced but not eliminated
- data is unlinked but still publicly visible
- CI is green on an old branch while local work is unpublished
- "local works" hides missing runtime configuration

A strong workflow looks for these patterns on purpose.

## 15. End of Session

Never end a session in an ambiguous state.

Choose one:

1. Published state

- changes committed
- pushed
- PR opened or updated

2. Stable local state

- changes committed locally
- next step documented

3. Explicit work-in-progress

- uncommitted changes intentionally kept
- scope and reason recorded

What must be avoided:

- unknown local drift
- half-staged work
- mixed concerns waiting in one working tree

## 16. Minimal Universal Checklist

Before coding:

- What is the real current state?
- What exactly is broken?
- What invariant must hold?

Before commit:

- Is the scope coherent?
- Is the change verified?
- Is the commit explainable in one sentence?

Before PR:

- Is the branch clean?
- Are the commits reviewable?
- Is the residual risk explicit?

Before merge:

- Is CI green on the actual branch?
- Are runtime/config blockers resolved?
- Is shared truth up to date?

## 17. Suggested Local Adaptation

Every repository should add a small local appendix covering:

- required commands for tests/builds
- branch naming conventions
- release policy
- deployment-specific config rules
- definitions of critical invariants

This document is the universal base.
The repository-specific appendix should stay small and concrete.
