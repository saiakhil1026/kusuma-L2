import { describe, it, expect } from 'vitest';
import { executeParseVisionTagsTool } from '../tools/parseVisionTagsTool';
import { executeRefactorCodeTool } from '../tools/refactorCodeTool';
import { mcpClient } from '../mcp/mcpClient';

describe('MCP Tools Implementation Suite (Gates 12 & 13)', () => {
  it('should analyze two genuinely different base64 images and produce distinct visual feature results (Gate 12)', async () => {
    const imgA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const imgB = 'data:image/jpeg;base64,AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGE=';

    const resA = await executeParseVisionTagsTool({ imagePrompt: 'Architecture diagram A', imagePayload: imgA });
    const resB = await executeParseVisionTagsTool({ imagePrompt: 'Architecture diagram B', imagePayload: imgB });

    expect(resA.isError).toBe(false);
    expect(resB.isError).toBe(false);

    expect(resA.payloadSizeBytes).not.toEqual(resB.payloadSizeBytes);
    expect(resA.visualMetrics?.entropyScore).not.toEqual(resB.visualMetrics?.entropyScore);
    expect(resA.extractedElements).toBeDefined();
    expect(resB.extractedElements).toBeDefined();
  });

  it('should safely reject empty or malformed base64 image payloads (Gate 12)', async () => {
    const emptyRes = await executeParseVisionTagsTool({ imagePrompt: 'Test', imagePayload: 'data:image/png;base64,' });
    expect(emptyRes.isError).toBe(true);
    expect(emptyRes.content).toContain('Empty image payload');

    const malformedRes = await executeParseVisionTagsTool({ imagePrompt: 'Test', imagePayload: 'invalid_uri_string' });
    expect(malformedRes.isError).toBe(true);
    expect(malformedRes.content).toContain('Invalid image payload format');
  });

  it('should transform Promise .then() chains to async/await and compile cleanly using TypeScript Compiler API (Gate 13)', async () => {
    const legacyCode = `function loadData(url: string) { return fetch(url).then(res => res.json()).then(data => console.log(data)); }`;
    const res = await executeRefactorCodeTool({
      codeRequirement: 'Convert Promise .then() to async await syntax',
      sourceCode: legacyCode,
      language: 'typescript',
    });

    expect(res.isError).toBe(false);
    expect(res.refactoredCode).toContain('async');
    expect(res.refactoredCode).toContain('await');
    expect(res.refactoredCode).not.toContain('.then(');
    expect(res.refactoringNotes?.some((n) => n.includes('AST Transformer'))).toBe(true);
  });

  it('should safely reject unrecoverable corrupted syntax errors during AST parsing (Gate 13)', async () => {
    const corruptedCode = `function broken() { syntax_error_corrupted_tokens_### };`;
    const res = await executeRefactorCodeTool({
      codeRequirement: 'Refactor broken syntax',
      sourceCode: corruptedCode,
      language: 'typescript',
    });

    expect(res.isError).toBe(true);
    expect(res.error).toContain('AST Syntax Error');
  });

  it('should discover all registered MCP tools via mcpClient.discoverTools()', async () => {
    const tools = await mcpClient.discoverTools();
    expect(tools.length).toBeGreaterThanOrEqual(5);
    const names = tools.map((t) => t.name);
    expect(names).toContain('vector_search');
    expect(names).toContain('store_memory');
    expect(names).toContain('refactor_code');
    expect(names).toContain('zero_trust_audit');
    expect(names).toContain('parse_vision_tags');
  });
});
