import { NextRequest, NextResponse } from 'next/server';
import { TOOL_DEFINITIONS, dispatchToolCall } from '../../../../packages/mcp-server/src/tool-registry';
import { logger } from '../../../../lib/logger';

export async function GET() {
  return NextResponse.json({
    name: 'solsentry-mcp-server',
    version: '3.0.0',
    protocol_version: '2024-11-05',
    transport: 'HTTP POST & SSE',
    endpoint: '/api/v1/mcp',
    status: 'online',
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jsonrpc, id, method, params } = body || {};

    if (jsonrpc !== '2.0') {
      return NextResponse.json({ jsonrpc: '2.0', id: id || null, error: { code: -32600, message: 'Invalid Request — expected jsonrpc 2.0' } }, { status: 400 });
    }

    if (method === 'initialize') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {}, resources: {}, prompts: {} },
          serverInfo: { name: 'solsentry-mcp-server', version: '3.0.0' },
        },
      });
    }

    if (method === 'tools/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: TOOL_DEFINITIONS,
        },
      });
    }

    if (method === 'tools/call') {
      const rawName = params?.name || '';
      const toolArgs = params?.arguments || {};

      try {
        const result = await dispatchToolCall(rawName, toolArgs);
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result,
            isError: (result as any)?.isError === true,
          },
        });
      } catch (err: any) {
        logger.warn('mcp_tool_call_error', { tool: rawName, error: err.message });
        return NextResponse.json(
          { jsonrpc: '2.0', id, error: { code: -32601, message: err.message || `Tool '${rawName}' failed` } },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method '${method}' not supported` } }, { status: 400 });
  } catch (err: any) {
    logger.error('mcp_internal_error', { error: err?.message || String(err) });
    return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Internal MCP execution error' } }, { status: 500 });
  }
}
