# @npmsolsentry/sdk

TypeScript SDK for [SolSentry](https://solsentry.netlify.app). Guard a Solana transaction before your agent signs it: simulate the bytes against mainnet, detect wallet drainer patterns, and score protocol risk from live sources.

```bash
npm install @npmsolsentry/sdk
```

## The one call before signing

```ts
import { SolSentryClient } from '@npmsolsentry/sdk';

const sentry = new SolSentryClient({ baseUrl: 'https://solsentry.netlify.app' });

const verdict = await sentry.guard({
  transaction: serializedTx,   // base58 or base64
  protocolSlug: 'kamino',      // optional: folds in protocol risk and policy
  action: 'borrow',
  amountUsd: 500,
});

if (!verdict.proceed) {
  console.warn('Do not sign:', verdict.blockingReasons);
}
```

`guard` returns `{ verdict, proceed, blockingReasons, simulation, protocol, policy }`. A drainer pattern, a failed simulation, a blocked protocol, or a policy violation each force `proceed: false`.

## Other methods

```ts
await sentry.simulateTransaction({ transaction, encoding: 'base58' });
await sentry.checkProtocolRisk('jupiter');
await sentry.preflight({ action: 'swap', protocolSlug: 'jupiter', amountUsd: 2500 });
await sentry.evaluatePolicy({ action: 'lend', protocolSlug: 'kamino', amountUsd: 800 });
```

## Options

```ts
new SolSentryClient({
  baseUrl: 'https://solsentry.netlify.app', // default
  apiKey: 'ss_live_...',           // optional; required only for authenticated endpoints
  timeoutMs: 5000,                 // default
});
```

Reads are free and public. Paid endpoints (guard, simulate) are metered per call in USDC via the `X-402-Payment` header when the hosted instance has billing enabled.

MIT licensed. Source: https://github.com/shieldspprt/solsentry
