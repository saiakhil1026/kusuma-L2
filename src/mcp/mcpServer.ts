import { mcpSDKClient } from './nexusMcpClient';

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPToolCallResult {
  toolName: string;
  isError: boolean;
  content: string;
  metadata?: Record<string, any>;
}

export class NexusMatrixMCPServer {
  public async listTools(): Promise<MCPToolDefinition[]> {
    const tools = await mcpSDKClient.listTools();
    return tools.map((t) => ({
      name: t.name,
      description: t.description || '',
      inputSchema: t.inputSchema as any,
    }));
  }

  public async callTool(name: string, args: Record<string, any>): Promise<MCPToolCallResult> {
    const result = await mcpSDKClient.callTool(name, args);
    return {
      toolName: result.toolName,
      isError: Boolean(result.isError),
      content: result.content,
    };
  }
}

export const mcpServer = new NexusMatrixMCPServer();