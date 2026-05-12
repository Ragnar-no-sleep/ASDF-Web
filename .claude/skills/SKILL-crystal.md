---
name: crystallize-truth
description: Use when analyzing complex problems before design decisions, architectural choices, or documentation — especially when assumptions might be hidden, when intuition might be wrong, or when the stakes of getting it wrong are high.
---

# Crystallize Truth — Cognitive Ralph Loop

_"The map is not the territory. The model is not the system. Test both."_

Four independent layers. Applied sequentially. Never collapse them into one pass.
Each layer questions the previous. Stop when conclusions stop changing.

---

## Layer 0 — Empirical Grounding (MANDATORY FIRST)

**The LLM's training data is not the current reality. Ground every claim before reasoning about it.**

Before applying any mode of thinking, verify the key factual assumptions against current reality.

```
□ WebSearch: current state of the domain (statistics, recent events, API docs)
□ WebFetch: live documentation for every API, tool, or protocol referenced
□ Data sampling: pull real examples where possible — even 3 data points beats zero
□ Contradiction check: does current reality contradict training-data priors?
□ Sovereignty mapping: for every external solution found, evaluate cost + alternatives
```

**Epistemic classification — mandatory in Layer 1 Mode 5:**

| Class            | Definition                                        | Action                             |
| ---------------- | ------------------------------------------------- | ---------------------------------- |
| MEASURED         | Verified during this session via search/fetch/API | Trust — cite source                |
| KNOWN (training) | From training data, not verified live             | Flag — may be stale                |
| ASSUMED          | Untested belief                                   | Treat as prior, not fact           |
| IGNORED          | Deliberately excluded                             | Name it — exclusions are decisions |

**Research efficiency — think by DATA TYPE, not by source:**

Searching per source creates redundancy and misses consolidation opportunities.
Instead: identify the data TYPES needed → find acquisition paths per type → pick most sovereign.

```
❌ INEFFICIENT: "how to get Coinglass data", then "how to get Hyperliquid funding"
✅ EFFICIENT:   "what are all sources for derivatives data (funding/OI/liquidations)?"
                → maps Coinglass + Hyperliquid + Binance + Bybit simultaneously
                → reveals that Coinglass aggregates data already available for free at source
```

**For every data need, map its sovereignty before implementing:**

```
□ Can this be read on-chain directly? (no service needed)
□ Does the original source expose a free API? (e.g. exchange's own endpoint)
□ Is there an open protocol or public contract? (on-chain, decentralized)
□ Can browser traffic interception yield the data for free?
□ If paid API: is it aggregating data freely available at source?
□ What is the fallback chain if the primary source fails?
□ Verdict: 🟢 SOVEREIGN / 🟡 CONDITIONNEL / 🟠 GÉRABLE / 🔴 VIOLATION
```

**Sovereignty tiers:**

- 🟢 **SOVEREIGN** — on-chain, self-hosted, open protocol. Zero external dependency.
- 🟡 **CONDITIONNEL** — free tier + viable fallback active.
- 🟠 **GÉRABLE** — paid/proprietary BUT a free creative alternative exists and is documented.
  Never implement 🟠 without its alternative route being built too.
- 🔴 **VIOLATION** — single critical paid path, no alternative. Redesign required.

**The browser proxy pattern — first-class acquisition technique:**

Many financial websites provide rich data to free users via their web interface.
The browser fetches this data via internal XHR/fetch API calls.
These internal endpoints work without an API subscription — only a regular user session.
Precedent: twikit works for Twitter exactly this way.

Applicable to: any site showing data publicly to non-paying users.
Examples: Coinglass (funding/OI/liquidations), Nansen free tier, TradingView indicators.

**Critical distinction — dev vs runtime:**

```
DEVELOPER (your machine / IDE / Claude Code)
  → does the recording (Step 1) — browser available here
  → builds the httpx client (Step 2)
  → stores captured headers in .env

RUNTIME SYSTEM (server, VM, production)
  → runs pure httpx only — NO browser, NO Playwright, NO CDP
  → reads headers from .env
  → caches aggressively
```

The recording step is done ONCE by a developer. The runtime system never sees a browser.

**Recording tools — adapted per dev environment:**

```
CASE A — Claude Code (Playwright MCP available in the IDE)
  browser_navigate("https://target.com/page-with-data")
  browser_network_requests()  → filter XHR/fetch with JSON responses
  Note: URL, method, request body, response shape
  Identify: Cookie, Authorization, x-api-key, Referer, User-Agent headers
  Trigger data refresh (scroll/wait/click) → capture updated requests

CASE B — Any browser (universal fallback)
  F12 → Network tab → Fetch/XHR filter → navigate to target page
  Find JSON responses → Right-click → "Copy as cURL"
  curlconverter.com → Python httpx snippet
  Replace hardcoded session values with env vars

CASE C — Playwright Python script (repeatable, CI-friendly)
  page.on("request", lambda r: log.append({
      "url": r.url, "method": r.method, "headers": dict(r.headers)
  }) if r.resource_type in ("fetch", "xhr") else None)
  await page.goto("https://target.com/page")
  await page.wait_for_timeout(5000)
  # → inspect log → extract endpoints + headers → build httpx client
```

**After recording (all cases):**

- Store captured headers/cookies in `.env` (never hardcode, never commit)
- Build `httpx.AsyncClient(headers={...})` replicating the exact call
- Verify: script response matches what the UI displays
- Cache: funding rates 8h TTL, OI/liquidations 1min, labels 24h
- Maintenance: site changes → re-record (same 15min cost as original)

**Creative alternatives — never accept "requires paid API" at face value:**

- Aggregator sites (Coinglass, Nansen) often aggregate data free at source exchanges
- On-chain reads replace REST APIs for blockchain data — no intermediary
- Browser traffic interception turns any public web dashboard into a free data source
- Combining two free signals often replaces one expensive signal
- Caching aggressively reduces per-call costs to near-zero on stable data

**Common training-data priors that expire quickly:**

- API endpoints and versions (deprecate frequently)
- Network statistics (fees, failure rates, TPS)
- Market statistics (survival rates, volume, liquidity)
- Tool capabilities and pricing
- Smart contract behavior and protocol rules

**Red flags — return to Layer 0 if:**

- You state a precise number without a source
- You describe "how X works" without checking current docs
- The domain involves live systems (blockchains, APIs, markets)
- Your confidence exceeds φ⁻¹ on any empirical claim
- You accepted a paid solution without exploring free alternatives

---

## Layer 1 — 10 Modes of Thinking

Apply each mode as a distinct lens. Do not merge them. Write findings per mode.

| #   | Mode              | Core Question                                                               |
| --- | ----------------- | --------------------------------------------------------------------------- |
| 1   | **Causal**        | What causes what? Root causes vs symptoms — never confuse them              |
| 2   | **Abstract**      | What is the highest-level principle? Strip all specifics                    |
| 3   | **Nonlinear**     | What feedback loops exist? What amplifies? What's the observer effect?      |
| 4   | **Recursive**     | Does this structure appear at other scales? Is it self-referential?         |
| 5   | **Epistemic**     | What do we KNOW(measured) vs KNOW(training) vs ASSUME vs IGNORE?            |
| 6   | **Heuristic**     | What rules of thumb emerge? Are they learnable or must they be hardcoded?   |
| 7   | **Bayesian**      | What is the prior? What evidence updates it? What is the posterior?         |
| 8   | **Dialectical**   | State thesis. State antithesis. Force a synthesis. What reverses intuition? |
| 9   | **Integrative**   | How do all elements interconnect? What hidden dependencies exist?           |
| 10  | **Probabilistic** | Replace every point estimate with a distribution. Quantify uncertainty      |

---

## Layer 2 — Recursive Descent

Take the 3–5 most important findings from Layer 1.

For each finding, descend:

```
Level 1: State the finding clearly
Level 2: What would falsify this? Apply the strongest counterargument
Level 3: Does it hold? If yes → crystallized. If no → reformulate or discard
Level N: Repeat until conclusions stop changing (minimum 3 levels)
```

**Rule**: A finding that cannot survive its own counterargument is not a truth — it is a bias.

---

## Layer 3 — Metathinking

Question the analysis itself, not its conclusions:

1. Are these the **right questions** to ask, or am I answering the wrong problem?
2. What has been **systematically ignored** — not by accident, but by the shape of my thinking?
3. What would a **hostile expert** say about this analysis?
4. Am I being **realistic and objective**, or constructing an elegant story?
5. Is the **problem framed correctly** — or does the frame itself create blind spots?
6. **Which conclusions changed when I hit real data?** — these are the most important insights.

Metathinking may invalidate entire sections of Layer 1 or Layer 2. That is its purpose.

---

## Output — TRUTH Statements

```
| T# | Truth | Source | Confidence | Design impact |
|----|-------|--------|------------|---------------|
| T1 | [Falsifiable statement] | MEASURED/KNOWN(training)/ASSUMED | XX% | [Concrete consequence] |
```

**Rules:**

- Maximum confidence = φ⁻¹ = 61.8% — epistemic humility is not optional
- MEASURED truths may approach φ⁻¹. ASSUMED truths cap at φ⁻² = 38.2%
- Every truth must be **falsifiable** — if it cannot be proven wrong, it is not a truth
- Every truth must have a **concrete design impact** — if it changes nothing, it is trivia
- Truths that **reverse intuition** are more valuable than those that confirm it
- When two truths conflict: design to distinguish them empirically, never suppress one

---

## Validation Before Writing

Before committing any truth to a document:

```
□ Is the source class (MEASURED/KNOWN/ASSUMED) declared?
□ Can I state one clear objection to each truth?
□ Is each truth grounded in measurement or logic — not assumption?
□ Have I been realistic, not optimistic?
□ Does each truth change the design in a specific, traceable way?
□ Would I defend this under hostile questioning?
□ Would this truth survive a regime change, an API update, or a market structure shift?
```

Fail any check → return to Layer 0 for that truth.

---

## When to Stop

Stop when:

- Conclusions stop changing between descent levels
- Every truth survives its counterargument
- The metathinking pass finds no new blind spots
- **Layer 0 has validated (or corrected) every empirical claim**

Do not stop because:

- It feels complete
- The document looks full
- Time pressure exists
- The empirical search returned no results (absence of evidence ≠ evidence of absence)

_"Better a short document of crystallized truths than a long document of elegant assumptions."_

---

## Common Failure Modes

| Failure                   | Symptom                                             | Fix                                                                  |
| ------------------------- | --------------------------------------------------- | -------------------------------------------------------------------- |
| **Skipped Layer 0**       | Precise numbers without sources                     | Return to Layer 0 before proceeding                                  |
| **Training data as fact** | "It is known that X" without checking current state | WebSearch + WebFetch on all empirical claims                         |
| Mode collapse             | All 10 modes say the same thing                     | Force dialectical opposition on the dominant view                    |
| Shallow recursive         | Only 1 level of descent                             | Keep asking "what would falsify this?"                               |
| Missing metathinking      | Never questioned the problem frame                  | Apply Layer 3 as separate session, not a footnote                    |
| Point estimate disease    | Specific numbers without distributions              | Replace every number with (expected, φ⁻¹ percentile, φ⁻² percentile) |
| Confirmation bias         | Only truths that confirm the design                 | Actively seek truths that require redesign                           |
| Epistemic cowardice       | Vague truths that offend no one                     | Name the assumption. Commit to a falsifiable claim                   |
| **Stale prior disease**   | "I know how this works" on live systems             | Verify. APIs change. Networks evolve. Markets shift.                 |
