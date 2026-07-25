import { describe, it, expect } from 'vitest';
import { TOOL_DEFINITIONS, dispatchToolCall } from '../tool-registry';

describe('MCP Tool Registry & Canonical Dispatcher', () => {
  it('should expose all canonical tools with solsentry_ prefix, guard first', () => {
    expect(TOOL_DEFINITIONS).toHaveLength(9);
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.name).toMatch(/^solsentry_/);
    }
    // The pre-signing guard is the lead tool an agent should reach for first.
    expect(TOOL_DEFINITIONS[0].name).toBe('solsentry_guard_transaction');
  });

  it('should dispatch the guard and force DO_NOT_SIGN on an undecodable transaction', async () => {
    const res = await dispatchToolCall('solsentry_guard_transaction', { transaction: 'not_a_real_tx' });
    expect(res.isError).toBe(false);
    expect(res.verdict).toBe('DO_NOT_SIGN');
    expect(res.blockingReasons.length).toBeGreaterThan(0);
  }, 30000);

  it('should dispatch canonical solsentry_check_protocol_risk tool call successfully', async () => {
    const res = await dispatchToolCall('solsentry_check_protocol_risk', { protocolSlug: 'jupiter' });
    expect(res.isError).toBe(false);
    expect(res.slug).toBe('jupiter');
    expect(res.safetyScore).toBeGreaterThan(0);
  }, 30000);

  it('should support backward compatibility for legacy agentgate_ and get_ tool names', async () => {
    const res1 = await dispatchToolCall('agentgate_check_protocol_risk', { protocolSlug: 'kamino' });
    expect(res1.isError).toBe(false);
    expect(res1.slug).toBe('kamino');

    const res2 = await dispatchToolCall('get_protocol_risk', { protocolSlug: 'orca' });
    expect(res2.isError).toBe(false);
    expect(res2.slug).toBe('orca');
  }, 30000);

  it('should throw when calling an unknown tool name', async () => {
    await expect(dispatchToolCall('unknown_tool', {})).rejects.toThrow();
  });
});
