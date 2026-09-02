import { describe, it, expect } from 'vitest';
import { executeRefactorCodeTool } from '../tools/refactorCodeTool';

describe('TypeScript AST Compiler Refactoring Tool', () => {
  it('transforms legacy var to const using AST node visitor', async () => {
    const sourceCode = `function calculateTotal(price: number) {\n  var tax = 0.08;\n  var total = price * (1 + tax);\n  return total;\n}`;

    const res = await executeRefactorCodeTool({
      codeRequirement: 'Convert var to block-scoped const',
      sourceCode,
      language: 'typescript',
    });

    expect(res.isError).toBe(false);
    expect(res.status).toBe('SUCCESS');
    expect(res.refactoredCode).toContain('const tax = 0.08;');
    expect(res.refactoredCode).toContain('const total = price * (1 + tax);');
    expect(res.refactoredCode).not.toContain('var tax');
  });

  it('preserves string literals containing "var" without incorrect regex substitution (Negative Regex Trap)', async () => {
    // Regex `replace(/\bvar\s+/g, 'const ')` would incorrectly corrupt string literal "var x = 1"
    const sourceCode = `function getSQLSnippet() {\n  const query = "var x = 1;";\n  var count = 10;\n  return { query, count };\n}`;

    const res = await executeRefactorCodeTool({
      codeRequirement: 'Refactor code safely',
      sourceCode,
      language: 'typescript',
    });

    expect(res.isError).toBe(false);
    // AST leaves string literal "var x = 1;" intact!
    expect(res.refactoredCode).toContain('"var x = 1;"');
    expect(res.refactoredCode).toContain('const count = 10;');
  });

  it('transforms Promise .then() chain into async/await AST block', async () => {
    const sourceCode = `function fetchData(url: string) {\n  return fetch(url).then(res => res.json()).then(data => console.log(data));\n}`;

    const res = await executeRefactorCodeTool({
      codeRequirement: 'Convert Promise .then() chain to async/await',
      sourceCode,
      language: 'typescript',
    });

    expect(res.isError).toBe(false);
    expect(res.refactoredCode).toContain('async function fetchData');
    expect(res.refactoredCode).toContain('await fetch(url)');
    expect(res.refactoredCode).toContain('await res.json()');
  });

  it('rejects source code with unrecoverable syntax errors', async () => {
    const invalidSyntaxCode = `function brokenCode( { const = ; return;`;

    const res = await executeRefactorCodeTool({
      codeRequirement: 'Refactor broken syntax',
      sourceCode: invalidSyntaxCode,
      language: 'typescript',
    });

    expect(res.isError).toBe(true);
    expect(res.status).toBe('FAILED');
    expect(res.error).toContain('TypeScript AST Syntax Error');
  });
});
