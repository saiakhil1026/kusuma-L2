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

export class NexusMatrixMCPClient {
  public async discoverTools(): Promise<MCPToolDefinition[]> {
    const tools = await mcpSDKClient.listTools();
    return tools.map((t) => ({
      name: t.name,
      description: t.description || '',
      inputSchema: t.inputSchema as any,
    }));
  }

  public async getGeminiFunctionDeclarations() {
    const tools = await this.discoverTools();
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    }));
  }

  public async invokeTool(name: string, args: Record<string, any>): Promise<MCPToolCallResult> {
    const result = await mcpSDKClient.callTool(name, args);
    return {
      toolName: result.toolName,
      isError: Boolean(result.isError),
      content: result.content,
    };
  }
}

export const mcpClient = new NexusMatrixMCPClient();
