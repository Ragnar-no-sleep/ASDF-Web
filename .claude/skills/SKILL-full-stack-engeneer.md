---
name: engineering-stack-design
description: Use when starting implementation of a complex system — before writing code, before choosing architecture, before defining principles. Use when the question is "how do we build this?" and the answer isn't obvious. Triggers on: "what architecture?", "what principles?", "how do we structure this?", "engineering foundations", "where do we start?".
---

# Engineering Stack Design

## Overview

**Inventory before priority. Always.**

The failure mode: jumping to "we'll use hexagonal + SOLID + TDD" without mapping the full decision space. Premature convergence on familiar patterns while missing critical ones.

Three phases, never collapsed:

- **Phase 1 — INVENTORY**: exhaustive enumeration across 7 domains. No judgment. No filtering.
- **Phase 2 — CRYSTALLIZATION**: applicability filter → dependency map → emergent patterns.
- **Phase 3 — BUILD SEQUENCE**: dependency graph → realistic development phases.

Complete Phase 1 fully before starting Phase 2. Complete Phase 2 before deriving Phase 3.

**The output document answers HOW. The design document answers WHAT. They must be orthogonal.**
If your "How" section describes what a component does rather than how to implement it, it belongs in the design doc, not here.

---

## Phase 1 — Inventory

Enumerate ALL potentially relevant items from the 7 domains below.
Do not skip domains. Do not filter while enumerating.

### D1 — Architecture Patterns (structural)

How the system is shaped at the macro level.

| Pattern                      | Core problem it solves                                       |
| ---------------------------- | ------------------------------------------------------------ |
| Hexagonal (Ports & Adapters) | External dependencies swappable without touching domain      |
| Event-Driven Architecture    | Components decoupled via events, not direct calls            |
| CQRS                         | Read and write models separated for clarity and scale        |
| Event Sourcing               | State derived from append-only event log                     |
| Pipeline                     | Data flows through sequential transformation stages          |
| Reactive / Actor Model       | Async message-passing, backpressure-native                   |
| Layered / Clean Architecture | Dependency rule: outer layers depend on inner, never reverse |
| Modular Monolith             | Single deployable, strong module boundaries                  |
| Microservices                | Independent deployables, network boundary between modules    |
| Saga / Choreography          | Distributed transactions via event chains                    |

### D2 — Design Patterns (tactical)

How components interact internally.

| Pattern                    | Core problem it solves                            |
| -------------------------- | ------------------------------------------------- |
| Repository                 | Domain doesn't know where data lives              |
| Factory / Abstract Factory | Object creation decoupled from usage              |
| Strategy                   | Algorithms swappable at runtime                   |
| Observer / Pub-Sub         | Producers don't know their consumers              |
| Adapter / Facade           | External interface mismatch hidden from domain    |
| Decorator                  | Behavior added without modifying base             |
| Circuit Breaker            | Fail fast, prevent cascade on remote failures     |
| Bulkhead                   | Isolate failures to one resource pool             |
| Outbox                     | Reliable event publication with local transaction |
| Unit of Work               | Group operations into atomic commits              |
| Domain Event               | State change broadcast within domain boundary     |

### D3 — Development Methodology (process)

How code is written and validated.

| Method                  | Core problem it solves                            |
| ----------------------- | ------------------------------------------------- |
| TDD                     | Design before implementation, tests as spec       |
| DDD                     | Model reflects domain language, not tech language |
| BDD                     | Acceptance criteria readable by domain experts    |
| Property-Based Testing  | Edge cases found by generators, not by hand       |
| Contract Testing        | Interface boundaries verified independently       |
| SOLID                   | Maintainability under change                      |
| YAGNI / DRY             | Avoid complexity that isn't needed yet            |
| Clean Code              | Code reads as prose, not puzzles                  |
| Trunk-Based Development | Integration friction minimized                    |

### D4 — Engineering Principles (operational)

How the running system behaves under stress and failure.

| Principle                             | Core problem it solves                               |
| ------------------------------------- | ---------------------------------------------------- |
| Observability (logs/metrics/traces)   | You can understand what the system is doing          |
| Idempotency                           | Retry-safe operations, no double-effects             |
| Resilience (retry, timeout, fallback) | Transient failures don't cascade                     |
| Backpressure                          | Fast producers don't overwhelm slow consumers        |
| Graceful Degradation                  | Partial failure → reduced service, not total failure |
| Fault Tolerance                       | System continues despite component failure           |
| Eventual Consistency                  | Strong consistency sacrificed for availability       |
| Immutability                          | No hidden mutation, safe concurrency                 |
| Structured Concurrency                | Async tasks scoped, never leaked                     |
| Audit Trail                           | Every state change traceable and replayable          |

### D5 — Language / Runtime Specific

Adapt this domain to the actual stack. **Document the stack first, then enumerate.**

_Example: Python + asyncio_
| Decision | Options | Stakes |
|---|---|---|
| Async model | asyncio TaskGroup vs raw create_task | Leak prevention |
| Type system | Protocol (structural) vs ABC (nominal) | Adapter flexibility |
| Data modeling | dataclass vs pydantic vs attrs | Validation, serialization |
| DI approach | Manual vs framework (inject, dependency-injector) | Complexity vs control |
| Type strictness | mypy strict vs pyright basic | Bug surface vs velocity |
| Logging | structlog vs stdlib logging | Structured output |
| Package mgmt | uv vs pip vs poetry | Reproducibility |

### D6 — Domain-Specific Patterns

Patterns native to the problem domain. Enumerate the domain's known patterns even if unfamiliar — research during Phase 2.

_Example: Algorithmic trading systems_
| Pattern | Core problem it solves |
|---|---|
| Tick-to-trade latency management | Decision loop fast enough for market conditions |
| Signal generation pipeline | Raw data → conditioned signal → decision |
| Risk circuit breaker | Position limits enforced before execution |
| P&L attribution | Which signal generated which profit/loss |
| Order flow integrity | No duplicate orders, idempotent execution |
| Warm-up protocol | System behavior until calibrated |
| Regime detection | Strategy adapted to market conditions |
| Audit trail (trading) | Regulatory + forensic reconstruction of every decision |

### D7 — Fractal Meta-Principle

**After enumerating D1–D6, identify the meta-principle.**

The meta-principle is the pattern that appears at every scale of the system — in the file, the module, the layer, the architecture, the documentation structure, the development phases. It is not a pattern among others: it is the generator of structure.

Ask: _Which principle, if applied consistently at every scale, would produce most of the patterns I just enumerated?_

If one principle generates 80%+ of the others when applied recursively → it is the meta-principle.
Document it separately. It governs the output document's own structure.

_Example: Separation of Concerns applied at every scale generates: Hexagonal (architecture scale), Pipeline (data scale), Bulkhead (concurrency scale), Structured Concurrency (task scope scale), TDD (test/code separation), document separation (design doc vs engineering stack)._

---

## Phase 2 — Crystallization

**REQUIRED SUB-SKILL:** Use `crystallize-truth` for this phase.

Crystallize-truth governs two things here:

1. **Layer 0 (empirical)**: verify technical claims about each pattern before adopting. "Hexagonal adds overhead" — measured or assumed? Apply to every pattern where you have a prior.
2. **Layers 1–3**: apply to tensions between adopted patterns. Every tension is a potential crystallize-truth session.

For each enumerated item, answer:

```
Applicable?     yes / partial / no / defer
Tension with:   [list conflicting items]
Enables:        [list items this unlocks]
Cost of adopt:  [concrete estimate]
Cost of skip:   [concrete risk]
Verdict:        ADOPT / ADAPT / REJECT / DEFER
```

**Filtering rules:**

- **ADOPT**: cost-of-skip > cost-of-adopt, no unresolvable tension
- **ADAPT**: partially applicable — document explicitly what's excluded
- **REJECT**: document reason (prevents future re-opening)
- **DEFER**: cost unknown → define empirical condition that will resolve it

### Emergent Patterns (after filtering)

After the dependency graph is built, look for patterns that emerge from _combinations_ of adopted items — patterns that were not in the original D1–D6 inventory but arise from their interaction.

These are often the most architecturally significant insights. They cannot be discovered before Phase 2 because they require knowing which patterns were adopted and how they relate.

```
For each combination of 2+ adopted patterns, ask:
"Does adopting both create a new constraint or capability not present in either alone?"
If yes → document as Emergent Pattern.
```

_Example: adopting Hexagonal + Structured Concurrency + FrequencyBridge simultaneously creates:
"Every task group boundary IS a frequency tier boundary IS a port boundary."
This emergent pattern is not in any inventory — it arises from the three adopted together._

---

## Dependency Mapping

After filtering, map dependencies between ADOPTED items:

```
Which patterns ENABLE others?     → these come first
Which can be decided in parallel? → these are independent
Which have circular tension?      → these need synthesis
```

The dependency graph IS the build order. Critical path = implementation sequence.

---

## Phase 3 — Build Sequence

Collapse the dependency graph into realistic development phases.

**Rules:**

- Patterns at Level 0 (no dependencies) → Phase 0 (before any domain code)
- Patterns that are expensive to retrofit → promote to earliest phase
- Phases must be observable: each phase ends with a demonstrable behavior, not just working code
- A phase that produces no observable output is not a phase — merge it with the next

Ask for each phase:

1. What can you observe at the end of this phase that you couldn't before?
2. What does the system do if this phase is skipped and you try to build the next?
3. Is this phase genuinely independent of the next, or are they coupled?

_Realistic means: account for the fact that retrofitting costs 3–5× implementing correctly from the start. Level 0 patterns (hexagonal ports, concurrency model, test pipeline) pay off across all future phases — invest in them first._

---

## Output — Engineering Stack Document

**Structure of the output document:**

```
1. Meta-principle (fractal — governs the document's own structure)
2. Dependency graph → development phases
3. Emergent patterns
4. Per-cluster implementation guides (WHAT → reference design doc; HOW → this document)
5. Rejected / Deferred
```

One entry per ADOPTED pattern:

```
### [Pattern Name]
Design doc ref: [§X — what this component IS]
Why:       [one sentence — what failure does this prevent?]
How:       [concrete implementation — file locations, class names, interfaces, test strategy]
Phase:     [P0 / P1 / P2 / P3 / P4 — when this is built]
Scope:     [what is explicitly NOT included]
Tension:   [known conflicts and resolution]
```

**The "How" field must answer: given the design doc's description of this component, how do I write the code?**

- File locations and module names
- Interface signatures
- Wiring points (where adapters are constructed)
- Test strategy specific to this pattern
- Rules that prevent known violations

If the "How" field describes what the component does rather than how to implement it → move it to the design doc.

One section for REJECTED / DEFERRED:

```
### Rejected
[Pattern]: [reason]. Revisit if [condition].

### Deferred
[Pattern]: unknown cost. Resolve when [observable condition].
```

---

## Common Failures

| Failure                         | Symptom                                          | Fix                                                    |
| ------------------------------- | ------------------------------------------------ | ------------------------------------------------------ |
| Phase collapse                  | Filtering while enumerating                      | Stop. Complete inventory first.                        |
| Domain skip                     | "D6 doesn't apply here"                          | It always applies. Enumerate then reject.              |
| D7 skip                         | Meta-principle not identified                    | Ask: what generates most of the other patterns?        |
| Premature convergence           | First familiar pattern adopted without inventory | Inventory is not optional                              |
| Missing tensions                | Two conflicting patterns both adopted            | Explicitly resolve or reject one                       |
| No dependency map               | Stack is a list, not a sequence                  | Build the graph before the document                    |
| Missing emergent patterns       | Only patterns from inventory documented          | Look for combinations that create new constraints      |
| Vague "how"                     | "Use Repository pattern"                         | "how" must name files, classes, interfaces             |
| **Document is design doc copy** | "How" describes what components do               | Move to design doc. Describe implementation only.      |
| No build phases                 | Stack is complete but unbuildable                | Phase 3 is not optional — derive from dependency graph |
| Phases not observable           | "Phase 2 — set up internals"                     | Each phase must produce a demonstrable behavior        |
