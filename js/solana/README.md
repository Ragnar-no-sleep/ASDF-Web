# ASDF Solana Integration (Kit-first)

## Architecture

```
js/solana/
├── kit/
│   ├── client.js          # RPC client (createSolanaRpc)
│   ├── wallet-manager.js  # Wallet Standard multi-wallet
│   └── transactions.js    # SOL/SPL transfer builders
├── web3-compat/
│   └── adapter.js         # Bridge for legacy code
└── index.js               # Main entry point
```

## Stack

| Layer | Package | CDN |
|-------|---------|-----|
| RPC | @solana/kit | esm.sh |
| Transactions | @solana-program/system, @solana-program/token | esm.sh |
| Legacy bridge | Custom adapter | local |

## Quick Start

Add this to your HTML `<head>`:

```html
<!-- Solana Kit Import Map -->
<script type="importmap">
{
  "imports": {
    "@solana/kit": "https://esm.sh/@solana/kit@5",
    "@solana-program/system": "https://esm.sh/@solana-program/system@0.7",
    "@solana-program/token": "https://esm.sh/@solana-program/token@0.5"
  }
}
</script>

<!-- ASDF Solana Module -->
<script type="module">
  import ASDFSolana from './js/solana/index.js';

  // Initialize with Helius API key
  await ASDFSolana.init({ apiKey: 'YOUR_HELIUS_KEY' });

  // Connect wallet
  const wallets = ASDFSolana.getWallets();
  console.log('Available wallets:', wallets);

  // Listen for connection
  ASDFSolana.on('connect', (account) => {
    console.log('Connected:', account.address);
  });

  // Connect to Phantom
  await ASDFSolana.connect('Phantom');

  // Get balances
  const sol = await ASDFSolana.getBalanceSOL();
  const asdf = await ASDFSolana.getTokenBalance();
  console.log(`Balance: ${sol} SOL, ${asdf} ASDF`);

  // Transfer SOL
  const sig = await ASDFSolana.transferSOL(0.01);
  console.log('TX:', ASDFSolana.getExplorerUrl(sig));
</script>
```

## API Reference

### Wallet Management

```javascript
// Get available wallets
ASDFSolana.getWallets()  // [{name: 'Phantom', icon: '...'}]

// Connect to wallet
await ASDFSolana.connect('Phantom')

// Disconnect
await ASDFSolana.disconnect()

// Check connection
ASDFSolana.isConnected()  // boolean

// Get address
ASDFSolana.getAddress()  // '5VUu...'

// Events
ASDFSolana.on('connect', (account) => {})
ASDFSolana.on('disconnect', () => {})
ASDFSolana.on('walletsChanged', (wallets) => {})
```

### Balances

```javascript
// SOL balance
await ASDFSolana.getBalanceSOL()  // 1.234

// ASDF token balance
await ASDFSolana.getTokenBalance()  // 1000000
```

### Transactions

```javascript
// Transfer SOL to treasury
await ASDFSolana.transferSOL(0.1)  // signature

// Transfer ASDF to escrow
await ASDFSolana.transferTokens(1000)  // signature

// Transfer to any address
await ASDFSolana.transferTokensTo('recipient...', 500)

// Check balances before tx
await ASDFSolana.hasSufficientSol(0.1)  // boolean
await ASDFSolana.hasSufficientAsdf(1000)  // boolean
```

### Utilities

```javascript
// Validate address
ASDFSolana.isValidAddress('5VUu...')  // boolean

// Explorer URL
ASDFSolana.getExplorerUrl(signature)  // 'https://solscan.io/tx/...'
```

## Migration from Legacy

Old (`js/games/solana.js`):
```javascript
const provider = SolanaPayment.getProvider();
await provider.connect();
await SolanaPayment.transferSOL(0.1);
```

New:
```javascript
await ASDFSolana.connect('Phantom');
await ASDFSolana.transferSOL(0.1);
```

The legacy `SolanaPayment` API is still available via the compatibility adapter.

## Wallet Standard Benefits

- **Multi-wallet**: Phantom, Backpack, Solflare, Glow, etc.
- **Auto-discovery**: No hardcoded wallet checks
- **Standard events**: connect, disconnect, accountChanged
- **Mobile-ready**: Deep links supported
- **Future-proof**: New wallets work automatically
