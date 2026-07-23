import { describe, it, expect } from 'vitest';
import { TOOL_DEFINITIONS, dispatchToolCall } from '../tool-registry';

describe('MCP Tool Registry & Canonical Dispatcher', () => {
  it('should expose all 7 canonical tools with solsentry_ prefix', () => {
    expect(TOOL_DEFINITIONS).toHaveLength(7);
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.name).toMatch(/^solsentry_/);
    }
  });

  it('should dispatch canonical solsentry_check_protocol_risk tool call successfully', async () => {
    const res = await dispatchToolCall('solsentry_check_protocol_risk', { protocolSlug: 'jupiter' });
    expect(res.isError).toBe(false);
    expect(res.slug).toBe('jupiter');
    expect(res.safetyScore).toBeGreaterThan(0);
  }, 15000);

  it('should support backward compatibility for legacy agentgate_ and get_ tool names', async () => {
    const res1 = await dispatchToolCall('agentgate_check_protocol_risk', { protocolSlug: 'kamino' });
    expect(res1.isError).toBe(false);
    expect(res1.slug).toBe('kamino');

    const res2 = await dispatchToolCall('get_protocol_risk', { protocolSlug: 'orca' });
    expect(res2.isError).toBe(false);
    expect(res2.slug).toBe('orca');
  }, 15000);

  it('should throw when calling an unknown tool name', async () => {
    await expect(dispatchToolCall('unknown_tool', {})).rejects.toThrow();
  });
});
