# @npmsolsentry/mcp

Model Context Protocol server for [SolSentry](https://solsentry.netlify.app). Add it to Claude, Cursor, or any MCP client to guard Solana transactions and score protocol risk from your agent.

It is a thin stdio proxy. It holds no keys and runs no engine code. The transport runs locally so your client can add it in one line, while the risk engine, live data grounding, and API keys stay server side. The package exposes the `npmsolsentry-mcp` binary name.

## Add to Claude Desktop or Cursor

In `claude_desktop_config.json` (or your Cursor MCP config):

```json
{
  "mcpServers": {
    "solsentry": {
      "command": "npx",
      "args": ["-y", "@npmsolsentry/mcp"],
      "env": { "SOLSENTRY_URL": "https://solsentry.netlify.app" }
    }
  }
}
```

Restart the client. Nine `solsentry_*` tools appear, led by `solsentry_guard_transaction`, the one call to make before signing.

## Tools

| Tool | Purpose |
| :--- | :--- |
| `solsentry_guard_transaction` | Simulate a transaction, scan for drainers, fold in protocol risk and policy. Returns SIGN or DO_NOT_SIGN. |
| `solsentry_simulate_transaction` | Simulate the raw bytes and return balance deltas, compute units, and a drainer verdict. |
| `solsentry_check_protocol_risk` | Provenance tagged safety score with per factor breakdown and coverage. |
| `solsentry_preflight` | Protocol risk plus policy in one verdict. |
| `solsentry_evaluate_policy` | Single transaction caps, daily volume, drawdown, and risk floor. |
| `solsentry_stress_test` | Adverse price shocks against real on chain positions. |
| `solsentry_get_position_health` | Real on chain position health for a wallet. |
| `solsentry_get_business_ratios` | TVL, fees, category share, and token market integrity. |
| `solsentry_get_protocol_list` | The supported protocol registry. |

## Configuration

| Env var | Default | Purpose |
| :--- | :--- | :--- |
| `SOLSENTRY_URL` | `https://solsentry.netlify.app` | Point at your own SolSentry instance. |
| `SOLSENTRY_API_KEY` | none | Sent as a Bearer token to attribute or authorize calls. |
| `SOLSENTRY_X402_PAYMENT` | none | Forwarded as the `X-402-Payment` header for metered calls. |
| `SOLSENTRY_TIMEOUT_MS` | `20000` | Per request timeout. |

MIT licensed. Source: https://github.com/shieldspprt/solsentry
