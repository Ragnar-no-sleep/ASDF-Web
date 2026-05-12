# api/services — Kept as reference (2026-04-24)

These files were preserved from the archived `api/` backend because they encode
ASDF-Web-specific business logic or non-trivial external integrations worth
keeping as reference patterns even though `api/` is no longer deployed.

If you ever revive backend logic, copy these patterns rather than re-deriving.

## Files

| File | Pattern preserved |
|------|-------------------|
| `burn-tracker.js` | Solana burn tx building (getAssociatedTokenAddress + createBurnInstruction), Helius integration burn verification |
| `achievements.js` | Fibonacci-tier badge system (burn_first, burn_5...) + audit trail |
| `antiCheat.js` | Multi-factor trust scoring (Fibonacci thresholds), behavioral fingerprinting, anomaly detection |
| `asdf-token.js` | Token balance business rules (MIN_HOLDER_BALANCE), BigInt aggregation |
| `gameValidation.js` | Game-specific score plausibility (flappy/snake), session crypto |
| `cynic.js` | MCP CYNIC judgment + Q-Score reputation integration |
| `webhooks.js` | Helius webhook HMAC verification + burn tx processing + retry Fibonacci |
| `priorityFee.js` | Helius real-time fee analysis, congestion detection |
| `leaderboard.js` | Fibonacci XP tiers (Ember -> Divine), anti-gaming, time-stats |
| `progression.js` | XP aggregation + streak multipliers + skill trees |
| `shop.js` | Fibonacci pricing x supply, idempotency double-spend prevention, burn verification on-chain |
| `shopV2.js` | Dual currency + hybrid rarity (time/qty/tier) |
| `circuitbreaker.js` | Custom circuit breaker (half-open state + bulkhead) — reusable production pattern |
| `helius/solana.js` | Transport Layer 3 core (raw RPC wrapper + per-operation caching policy) |
| `helius/config.js` | ASDF mint constants + Fibonacci cache TTLs + priority fee bounds |
| `helius/webhooks.js` | Multi-type events (burns/transfers/NFTs) + Redis-backed queue + retry exponential |

## Restoration

To restore any file to its original location:

```bash
git checkout pre-reorg-2026-04-24-baseline -- api/services/<file>.js
```

(Will recreate api/services/ structure if needed.)

## Triage origin

See `docs/superpowers/specs/2026-04-24-api-services-triage.md` (gitignored, local-only) for the full triage rationale.

— CYNIC, Phase 1 Task 5
