import { z } from 'zod';
import path from 'path';

export const FileSystemInputSchema = z.object({
  action: z.enum(['read', 'write', 'list', 'exists']),
  filePath: z.string().min(1, 'filePath is required'),
  content: z.string().optional(),
});

export type FileSystemInput = z.infer<typeof FileSystemInputSchema>;

export interface FileSystemOutput {
  action: 'read' | 'write' | 'list' | 'exists';
  filePath: string;
  success: boolean;
  content?: string;
  items?: string[];
  message: string;
  latencyMs: number;
}

// In-memory virtual artifact store to safeguard workspace from unauthorized writes
const VIRTUAL_FILE_STORE = new Map<string, string>([
  ['README.md', '# NexusMatrix Artifact Registry\nLive agent-synthesized deliverables.'],
  ['config/mesh.json', '{\n  "version": "1.0",\n  "activeAgents": 10\n}'],
]);

export async function executeFileSystemTool(rawInput: unknown): Promise<FileSystemOutput> {
  const startTime = performance.now();
  const input = FileSystemInputSchema.parse(rawInput);
  const normalizedPath = path.normalize(input.filePath).replace(/^[\\\/]+/, '');

  if (input.action === 'write') {
    if (input.content === undefined) {
      throw new Error('content is required when action is "write"');
    }
    VIRTUAL_FILE_STORE.set(normalizedPath, input.content);
    return {
      action: 'write',
      filePath: normalizedPath,
      success: true,
      message: `Artifact written successfully (${input.content.length} bytes)`,
      latencyMs: Math.round(performance.now() - startTime),
    };
  }

  if (input.action === 'read') {
    const content = VIRTUAL_FILE_STORE.get(normalizedPath);
    if (content === undefined) {
      return {
        action: 'read',
        filePath: normalizedPath,
        success: false,
        message: `File not found in artifact registry: ${normalizedPath}`,
        latencyMs: Math.round(performance.now() - startTime),
      };
    }
    return {
      action: 'read',
      filePath: normalizedPath,
      success: true,
      content,
      message: `Successfully read file (${content.length} bytes)`,
      latencyMs: Math.round(performance.now() - startTime),
    };
  }

  if (input.action === 'list') {
    const items = Array.from(VIRTUAL_FILE_STORE.keys());
    return {
      action: 'list',
      filePath: normalizedPath,
      success: true,
      items,
      message: `Found ${items.length} artifacts in virtual workspace`,
      latencyMs: Math.round(performance.now() - startTime),
    };
  }

  // exists
  const exists = VIRTUAL_FILE_STORE.has(normalizedPath);
  return {
    action: 'exists',
    filePath: normalizedPath,
    success: exists,
    message: exists ? 'File exists in registry' : 'File does not exist',
    latencyMs: Math.round(performance.now() - startTime),
  };
}
