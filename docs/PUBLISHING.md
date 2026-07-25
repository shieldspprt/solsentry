# Publishing to npm

Three packages are published. Everything else in `packages/` is marked
`private: true` and consumed in process by the Next.js app.

| Package | What it is | `npx` / install |
| :--- | :--- | :--- |
| `@solsentry/mcp` | Thin stdio MCP proxy. The one an agent adds to Claude or Cursor. | `npx -y @solsentry/mcp` |
| `@solsentry/sdk` | TypeScript client. `guard`, `simulate`, `checkProtocolRisk`, `preflight`. | `npm i @solsentry/sdk` |
| `@solsentry/cli` | Terminal tool. `check`, `simulate`, `policy`. Depends on the SDK. | `npm i -g @solsentry/cli` |

## One time setup

You need an npm account, and the `@solsentry` scope must belong to you.

```bash
# 1. Log in (opens a browser for 2FA if enabled)
npm login

# 2. Create the scope as an organization (free for public packages).
#    Do this once at https://www.npmjs.com/org/create , name it "solsentry".
#    Or publish under your own user scope by renaming the packages first.
```

Confirm the scope is free before the first publish:

```bash
npm view @solsentry/sdk   # should 404 (E404) until you publish
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

# 3. CLI  (resolves @solsentry/sdk from npm, so publish it after the SDK)
cd ../cli
npm publish
```

Each package sets `publishConfig.access = "public"`, so scoped publishing does
not need `--access public` on the command line. `prepublishOnly` runs `tsc`, so
a stale or missing `dist/` cannot ship.

## After publishing

Smoke test the published MCP proxy against your hosted instance:

```bash
SOLSENTRY_URL=https://solsentry.io npx -y @solsentry/mcp
# It should print: solsentry mcp proxy connected to https://solsentry.io/api/v1/mcp
# Ctrl-C to exit.
```

Then update the MCP config example in the app and README to use the published
form instead of a local file path:

```json
{
  "mcpServers": {
    "solsentry": {
      "command": "npx",
      "args": ["-y", "@solsentry/mcp"],
      "env": { "SOLSENTRY_URL": "https://solsentry.io" }
    }
  }
}
```

## Cutting a new version

Bump all three in lockstep so the CLI's `@solsentry/sdk` range stays satisfied.

```bash
npm version patch -w packages/sdk -w packages/mcp -w packages/cli   # if using workspaces
# or bump each package.json by hand, then publish in the same order.
```

## Notes

- The MCP proxy holds no secrets. It forwards tool calls to `SOLSENTRY_URL`, so
  the engine and API keys stay on the server. That is why a user can add it
  without any configuration beyond the URL.
- The SDK and CLI reach the same hosted API. Reads are public; `guard` and
  `simulate` are metered per call in USDC when the instance has billing on.
- If you would rather not own the `@solsentry` org, rename the three packages to
  a scope you control (for example `@yourname/solsentry-mcp`) and update the
  CLI's dependency on the SDK to match.
