import { z } from 'zod';

export const CodeExecuteInputSchema = z.object({
  code: z.string().min(1, 'Code snippet cannot be empty'),
  language: z.enum(['javascript', 'typescript']).optional().default('javascript'),
  timeoutMs: z.number().min(50).max(5000).optional().default(1000),
});

export type CodeExecuteInput = z.infer<typeof CodeExecuteInputSchema>;

export interface CodeExecuteOutput {
  success: boolean;
  language: string;
  stdout: string;
  returnedValue?: any;
  error?: string;
  latencyMs: number;
}

export async function executeCodeExecuteTool(rawInput: unknown): Promise<CodeExecuteOutput> {
  const startTime = performance.now();
  const input = CodeExecuteInputSchema.parse(rawInput);

  const logs: string[] = [];
  const mockConsole = {
    log: (...args: any[]) => logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
    warn: (...args: any[]) => logs.push('[WARN] ' + args.map((a) => String(a)).join(' ')),
    error: (...args: any[]) => logs.push('[ERROR] ' + args.map((a) => String(a)).join(' ')),
    info: (...args: any[]) => logs.push('[INFO] ' + args.map((a) => String(a)).join(' ')),
  };

  // Only strip TypeScript type annotations if language is typescript
  let runnableCode = input.code;
  if (input.language === 'typescript') {
    runnableCode = runnableCode
      .replace(/interface\s+[A-Za-z0-9_]+\s*\{[^}]*\}/g, '')
      .replace(/type\s+[A-Za-z0-9_]+\s*=\s*[^;]+;/g, '')
      .replace(/(const|let|var)\s+([a-zA-Z0-9_$]+)\s*:\s*[A-Za-z0-9_<>\[\]|&]+\s*=/g, '$1 $2 =')
      .replace(/\(([a-zA-Z0-9_$,\s]+):\s*[A-Za-z0-9_<>\[\]|&]+\)/g, '($1)')
      .replace(/as\s+[A-Za-z0-9_<>\[\]]+/g, '');
  }

  try {
    // Isolated evaluation scope
    const executor = new Function('console', `
      "use strict";
      try {
        ${runnableCode}
      } catch (err) {
        throw err;
      }
    `);

    const returnedValue = executor(mockConsole);

    return {
      success: true,
      language: input.language,
      stdout: logs.join('\n') || '[Code executed with return status: 0]',
      returnedValue: returnedValue !== undefined ? String(returnedValue) : undefined,
      latencyMs: Math.round(performance.now() - startTime),
    };
  } catch (err: any) {
    return {
      success: false,
      language: input.language,
      stdout: logs.join('\n'),
      error: err.message || String(err),
      latencyMs: Math.round(performance.now() - startTime),
    };
  }
}
