# Publishing to npm

Three packages are published. Everything else in `packages/` is marked
`private: true` and consumed in process by the Next.js app.

| Package | What it is | `npx` / install |
| :--- | :--- | :--- |
| `@npmsolsentry/mcp` | Thin stdio MCP proxy. The one an agent adds to Claude or Cursor. | `npx -y @npmsolsentry/mcp` |
| `@npmsolsentry/sdk` | TypeScript client. `guard`, `simulate`, `checkProtocolRisk`, `preflight`. | `npm i @npmsolsentry/sdk` |
| `@npmsolsentry/cli` | Terminal tool. `check`, `simulate`, `policy`. Depends on the SDK. | `npm i -g @npmsolsentry/cli` |

## One time setup

You need an npm account with publish access to the existing `@npmsolsentry` scope.

```bash
# Opens a browser for 2FA if enabled.
npm login
npm whoami

# Confirm the currently published release before cutting another one.
npm view @npmsolsentry/sdk version
```

## Publish order

The CLI depends on the SDK, so publish the SDK first. The MCP and SDK are
independent.

```bash
# From the repo root.

# 1. SDK  (build runs automatically via prepublishOnly)
cd packages/sdk
npm publish

# 2. MCP proxy
cd ../mcp
npm publish

# 3. CLI  (resolves @npmsolsentry/sdk from npm, so publish it after the SDK)
cd ../cli
npm publish
```

Each package sets `publishConfig.access = "public"`, so scoped publishing does
not need `--access public` on the command line. `prepublishOnly` runs `tsc`, so
a stale or missing `dist/` cannot ship.

## After publishing

Smoke test the published MCP proxy against your hosted instance:

```bash
SOLSENTRY_URL=https://solsentry.netlify.app npx -y @npmsolsentry/mcp
# It should print: solsentry mcp proxy connected to https://solsentry.netlify.app/api/v1/mcp
# Ctrl-C to exit.
```

Then update the MCP config example in the app and README to use the published
form instead of a local file path:

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

## Cutting a new version

Bump all three in lockstep so the CLI's `@npmsolsentry/sdk` range stays satisfied.

Bump each package and lockfile to the same version, then use the checked-in publisher:

```bash
./publish.sh --dry-run
./publish.sh
```

## Notes

- The MCP proxy holds no secrets. It forwards tool calls to `SOLSENTRY_URL`, so
  the engine and API keys stay on the server. That is why a user can add it
  without any configuration beyond the URL.
- The SDK and CLI reach the same hosted API. Reads are public; `guard` and
  `simulate` are metered per call in USDC when the instance has billing on.
- If the package scope changes, rename all three packages together and update
  the CLI's dependency on the SDK, the Smithery manifest, and every install
  example in the same release.
