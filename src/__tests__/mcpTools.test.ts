import { describe, it, expect } from 'vitest';
import { mcpClient } from '../mcp/mcpClient';

describe('Model Context Protocol (MCP) Server & Client Suite', () => {
  it('should discover all registered MCP tools via listTools()', async () => {
    const tools = await mcpClient.discoverTools();
    expect(tools.length).toBeGreaterThanOrEqual(5);
    const names = tools.map((t) => t.name);
    expect(names).toContain('vector_search');
    expect(names).toContain('store_memory');
    expect(names).toContain('refactor_code');
    expect(names).toContain('zero_trust_audit');
    expect(names).toContain('parse_vision_tags');
  });

  it('should execute vector_search MCP tool and return structured observations', async () => {
    const result = await mcpClient.invokeTool('vector_search', { query: 'security audit', topK: 3 });
    expect(result.isError).toBe(false);
    expect(result.toolName).toBe('vector_search');
    expect(result.content).toContain('cacheResult');
  });

  it('should execute zero_trust_audit MCP tool and pass schema bounds', async () => {
    const result = await mcpClient.invokeTool('zero_trust_audit', { payloadToAudit: 'export class Test {}' });
    expect(result.isError).toBe(false);
    expect(result.content).toContain('PASSED');
  });
});
