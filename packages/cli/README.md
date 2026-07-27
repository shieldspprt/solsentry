# @npmsolsentry/cli

Command line tool for [SolSentry](https://solsentry.netlify.app). Guard a Solana transaction before signing, score protocol risk, and check policy from your terminal.

```bash
npm install -g @npmsolsentry/cli
```

The package installs `solsentry` as the primary executable and keeps `npmsolsentry-cli` as a compatibility alias.

## Commands

```bash
# Score a protocol, with the full factor breakdown
solsentry check kamino --details

# Simulate a serialized transaction and scan it for drainer patterns
solsentry simulate 3s8xK9vW2zL... --encoding base58

# Evaluate a trade against the policy guardrails
solsentry policy swap jupiter 5000
```

## Options

```
-k, --api-key <key>    API key, for authenticated or metered endpoints
-e, --endpoint <url>   SolSentry base URL (default: https://solsentry.netlify.app)
-v, --verbose          Verbose output
```

Point `--endpoint` at your own SolSentry instance to use your keys and pricing.

MIT licensed. Source: https://github.com/shieldspprt/solsentry
