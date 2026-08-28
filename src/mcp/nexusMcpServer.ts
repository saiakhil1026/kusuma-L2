import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { executeVectorSearchTool } from '../tools/vectorSearchTool';
import { executeStoreMemoryTool } from '../tools/storeMemoryTool';
import { executeRefactorCodeTool } from '../tools/refactorCodeTool';
import { executeZeroTrustAuditTool } from '../tools/zeroTrustAuditTool';
import { executeParseVisionTagsTool } from '../tools/parseVisionTagsTool';

export const server = new McpServer({
  name: 'NexusMatrix-MCP-Server',
  version: '1.0.0',
});

// Register Tool 1: vector_search
server.tool(
  'vector_search',
  'Executes 768-dimensional Cosine Similarity vector search against shared memory store & semantic cache (>0.88 threshold).',
  {
    query: z.string().min(1, 'Query string cannot be empty'),
    topK: z.number().min(1).max(50).optional().default(5),
  },
  async (args) => {
    try {
      const res = await executeVectorSearchTool(args);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `vector_search validation error: ${err.message}` }],
      };
    }
  }
);

// Register Tool 2: store_memory
server.tool(
  'store_memory',
  'Indexes a deliverable payload into the 768-dimensional vector memory store and syncs to Supabase.',
  {
    text: z.string().min(1, 'Memory text payload cannot be empty'),
    agentId: z.string().min(1, 'agentId is required'),
    modality: z.enum(['text', 'code', 'vision', 'structured']).optional().default('text'),
    nodeTitle: z.string().optional().default('MCP Memory Entry'),
  },
  async (args) => {
    try {
      const res = await executeStoreMemoryTool(args);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `store_memory validation error: ${err.message}` }],
      };
    }
  }
);

// Register Tool 3: refactor_code
server.tool(
  'refactor_code',
  'Generates or refactors production-grade TypeScript, Python, or SQL code with static analysis type safety.',
  {
    codeRequirement: z.string().min(1, 'codeRequirement description is required'),
    sourceCode: z.string().optional().default(''),
    language: z.enum(['typescript', 'javascript', 'python', 'sql']).optional().default('typescript'),
  },
  async (args) => {
    try {
      const res = await executeRefactorCodeTool(args);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `refactor_code validation error: ${err.message}` }],
      };
    }
  }
);

// Register Tool 4: zero_trust_audit
server.tool(
  'zero_trust_audit',
  'Audits code or parameters against zero-trust safety bounds, type checks, and injection vulnerabilities.',
  {
    payloadToAudit: z.string().min(1, 'payloadToAudit is required'),
  },
  async (args) => {
    try {
      const res = await executeZeroTrustAuditTool(args);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `zero_trust_audit validation error: ${err.message}` }],
      };
    }
  }
);

// Register Tool 5: parse_vision_tags
server.tool(
  'parse_vision_tags',
  'Extracts spatial scene bounding box tags [ymin, xmin, ymax, xmax] and visual wireframe analytics.',
  {
    imagePrompt: z.string().min(1, 'imagePrompt is required'),
    imagePayload: z.string().optional(),
  },
  async (args) => {
    try {
      const res = await executeParseVisionTagsTool(args);
      const isError = res.isError ?? false;
      return {
        isError,
        content: [{ type: 'text', text: typeof res.content === 'string' ? res.content : JSON.stringify(res, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `parse_vision_tags validation error: ${err.message}` }],
      };
    }
  }
);
