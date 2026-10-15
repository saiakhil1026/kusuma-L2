import { describe, it, expect } from 'vitest';
import { mcpSDKClient } from '../mcp/nexusMcpClient';

describe('Model Context Protocol (MCP) SDK Integration & Transport Suite', () => {
  it('should initialize client/server and discover tools via MCP transport', async () => {
    const tools = await mcpSDKClient.listTools();
    expect(tools.length).toBeGreaterThanOrEqual(5);

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('vector_search');
    expect(toolNames).toContain('store_memory');
    expect(toolNames).toContain('refactor_code');
    expect(toolNames).toContain('zero_trust_audit');
    expect(toolNames).toContain('parse_vision_tags');
  });

  it('should execute vector_search via MCP transport and return real similarity matches', async () => {
    const result = await mcpSDKClient.callTool('vector_search', {
      query: 'Zero-trust safety protocol',
      topK: 2,
    });

    expect(result.isError).toBe(false);
    expect(result.toolName).toBe('vector_search');
    const parsed = JSON.parse(result.content);
    expect(parsed.topMatches).toBeDefined();
    expect(parsed.topMatches.length).toBeGreaterThan(0);
    expect(parsed.topMatches[0].similarity).toBeGreaterThan(0);
  });

  it('should execute refactor_code via MCP transport and generate input-dependent refactored code', async () => {
    const res1 = await mcpSDKClient.callTool('refactor_code', {
      codeRequirement: 'Convert legacy var to const',
      sourceCode: 'var x = 10; var y = 20;',
      language: 'typescript',
    });

    const res2 = await mcpSDKClient.callTool('refactor_code', {
      codeRequirement: 'Create Python data processor',
      language: 'python',
    });

    expect(res1.isError).toBe(false);
    expect(res2.isError).toBe(false);
    expect(res1.content).not.toEqual(res2.content);
    expect(res1.content).toContain('const x = 10');
    expect(res2.content).toContain('def process_task');
  });

  it('should execute zero_trust_audit via MCP transport and detect unsafe SQL injection fixtures', async () => {
    const unsafeCode = `const query = "SELECT * FROM users WHERE id = " + req.query.id;`;
    const result = await mcpSDKClient.callTool('zero_trust_audit', {
      payloadToAudit: unsafeCode,
    });

    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.content);
    expect(parsed.status).toBe('FAILED');
    expect(parsed.passed).toBe(false);
    expect(parsed.vulnerabilities.length).toBeGreaterThan(0);
    expect(parsed.vulnerabilities[0].category).toBe('SQL Injection');
  });

  it('should execute zero_trust_audit via MCP transport and pass safe code', async () => {
    const safeCode = `export function add(a: number, b: number): number { return a + b; }`;
    const result = await mcpSDKClient.callTool('zero_trust_audit', {
      payloadToAudit: safeCode,
    });

    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.content);
    expect(parsed.status).toBe('PASSED');
    expect(parsed.passed).toBe(true);
  });

  it('should handle invalid tool arguments gracefully via Zod validation over MCP', async () => {
    const result = await mcpSDKClient.callTool('vector_search', {
      query: '', // invalid empty string
    });

    expect(result.isError).toBe(true);
    expect(result.content).toContain('validation error');
  });

  it('should return error for unregistered unknown tool call', async () => {
    const result = await mcpSDKClient.callTool('non_existent_tool', {});
    expect(result.isError).toBe(true);
  });
});