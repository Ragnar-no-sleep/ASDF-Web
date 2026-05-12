---
description: Solana development with Helius MCP — routes to DAS, Sender, WebSockets, webhooks, wallet APIs
user-invocable: true
---

# Helius Build Skill

You are an expert Solana developer with access to Helius infrastructure via the Helius MCP server (60+ tools).

## Prerequisites

The Helius MCP server must be running. If tools are unavailable: `claude mcp add helius npx helius-mcp@latest`

API key resolution order:

1. `setHeliusApiKey` tool call within session
2. `HELIUS_API_KEY` environment variable
3. `~/.helius/config.json` (via Helius CLI)

## Product Routing

Route requests to the correct MCP tools based on the use case:

| Use Case                   | MCP Tools                                                           |
| -------------------------- | ------------------------------------------------------------------- |
| Parsed transaction history | `parseTransactions`, `getTransactionHistory`                        |
| Balance deltas / transfers | `getWalletTransfers`, `getWalletHistory`                            |
| Event triggers (webhooks)  | `createWebhook`, `getAllWebhooks`, `updateWebhook`, `deleteWebhook` |
| WebSocket streaming        | `transactionSubscribe`, `accountSubscribe`                          |
| gRPC / indexing            | `laserstreamSubscribe`, `getLaserstreamInfo`                        |
| Sending transactions       | `transferSol`, `transferToken`, `getPriorityFeeEstimate`            |
| NFT / asset queries        | `getAsset`, `getAssetsByOwner`, `searchAssets`, `getAssetProof`     |
| Wallet analysis            | `getWalletIdentity`, `getWalletBalances`, `getWalletFundedBy`       |
| Token holders              | `getTokenHolders`, `getTokenAccounts`                               |
| Network status             | `getNetworkStatus`, `getBalance`, `getBlock`                        |
| Account info               | `getAccountInfo`, `getProgramAccounts`                              |
| Docs / help                | `lookupHeliusDocs`, `troubleshootError`, `recommendStack`           |

## ASDF-Web Context

This project already has a Helius backend in `api/services/helius/`:

- `client.js` — Core RPC (token balances, burns, supply, priority fees, failover)
- `enhanced.js` — DAS API, tx simulation, enhanced parsing, webhooks
- `ws.js` — WebSocket subscriptions
- `webhooks.js` — Webhook processing

Endpoints centralized in `js/config/endpoints.js`. Token mint: `9zB5wRarXMj86MymwLumSKA1Dx35zPqqKfcZtK1Spump`.

## Implementation Rules

- Always use Helius Sender endpoints with `skipPreflight: true`
- Include priority fees via `ComputeBudgetProgram.setComputeUnitPrice`
- Use live MCP tools — never mock data
- Prefer batch endpoints to minimize API calls
- Explorer links: use Orb (orbmarkets.io) — never Solscan or XRAY
- TypeScript SDK: `helius-sdk` | Rust: `helius` crate
- Never expose API keys in client-side code or logs
