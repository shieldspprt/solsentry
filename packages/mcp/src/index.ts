#!/usr/bin/env node
/**
 * @npmsolsentry/mcp
 *
 * A thin stdio Model Context Protocol server that forwards every tool call to
 * the hosted SolSentry HTTP endpoint. It runs the transport locally so an agent
 * (Claude, Cursor, any MCP client) can add it in one line, while the risk
 * engine, live data grounding, and API keys all stay server side.
 *
 * It deliberately holds NO secrets and runs NO engine code. Point it at your own
 * SolSentry instance with SOLSENTRY_URL, and attribute or pay for calls with
 * SOLSENTRY_API_KEY if the instance requires it.
 *
 *   npx @npmsolsentry/mcp
 *
 * Config for claude_desktop_config.json:
 *   {
 *     "mcpServers": {
 *       "solsentry": {
 *         "command": "npx",
 *         "args": ["-y", "@npmsolsentry/mcp"],
 *         "env": { "SOLSENTRY_URL": "https://solsentry.io" }
 *       }
 *     }
 *   }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const BASE_URL = (process.env.SOLSENTRY_URL || 'https://solsentry.io').replace(/\/$/, '');
const MCP_ENDPOINT = `${BASE_URL}/api/v1/mcp`;
const API_KEY = process.env.SOLSENTRY_API_KEY;
const REQUEST_TIMEOUT_MS = Number(process.env.SOLSENTRY_TIMEOUT_MS || 20000);

let requestId = 0;

async function callHosted(method: string, params?: unknown): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['Authorization'] = `Bearer ${API_KEY}`;
  // Let an agent forward an x402 payment for metered calls.
  const payment = process.env.SOLSENTRY_X402_PAYMENT;
  if (payment) headers['X-402-Payment'] = payment;

  try {
    const res = await fetch(MCP_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: ++requestId, method, params }),
      signal: controller.signal,
    });

    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`SolSentry returned a non-JSON response (HTTP ${res.status}): ${text.slice(0, 200)}`);
    }

    if (json.error) {
      throw new Error(`SolSentry error ${json.error.code ?? ''}: ${json.error.message ?? 'unknown'}`.trim());
    }
    return json.result;
  } finally {
    clearTimeout(timer);
  }
}

const server = new Server(
  { name: 'solsentry', version: '3.1.0' },
  { capabilities: { tools: {} } }
);

// tools/list is proxied verbatim: the hosted server owns the canonical tool set,
// so this package never drifts out of sync with the engine.
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const result = await callHosted('tools/list');
  return { tools: result?.tools ?? [] };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const result = await callHosted('tools/call', request.params);
    return {
      content: result?.content ?? [{ type: 'text', text: JSON.stringify(result ?? {}, null, 2) }],
      structuredContent: result?.structuredContent,
      isError: Boolean(result?.isError),
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: 'text', text: `SolSentry MCP proxy error: ${(err as Error).message}` }],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // A single line to stderr so users see it started without polluting stdout,
  // which stdio MCP reserves for the protocol.
  process.stderr.write(`solsentry mcp proxy connected to ${MCP_ENDPOINT}\n`);
}

main().catch((err) => {
  process.stderr.write(`solsentry mcp failed to start: ${(err as Error).message}\n`);
  process.exit(1);
});
