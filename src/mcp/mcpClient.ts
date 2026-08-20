import { mcpServer } from './mcpServer';
import type { MCPToolDefinition, MCPToolCallResult } from './mcpServer';

export class NexusMatrixMCPClient {
  public async discoverTools(): Promise<MCPToolDefinition[]> {
    return mcpServer.listTools();
  }

  public getGeminiFunctionDeclarations() {
    const tools = mcpServer.listTools();
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    }));
  }

  public async invokeTool(name: string, args: Record<string, any>): Promise<MCPToolCallResult> {
    return mcpServer.callTool(name, args);
  }
}

export const mcpClient = new NexusMatrixMCPClient();
