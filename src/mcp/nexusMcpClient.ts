import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { server } from './nexusMcpServer';

export class NexusMcpSDKClient {
  private client: Client;
  private isConnected = false;

  constructor() {
    this.client = new Client(
      { name: 'NexusMatrix-MCP-Client', version: '1.0.0' },
      { capabilities: {} }
    );
  }

  public async connectIfNeeded(): Promise<void> {
    if (!this.isConnected) {
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      await server.connect(serverTransport);
      await this.client.connect(clientTransport);
      this.isConnected = true;
    }
  }

  public async listTools() {
    await this.connectIfNeeded();
    const response = await this.client.listTools();
    return response.tools;
  }

  public async callTool(name: string, args: Record<string, any>) {
    await this.connectIfNeeded();
    try {
      const response = await this.client.callTool({
        name,
        arguments: args,
      });

      const isError = response.isError ?? false;
      const textContent = Array.isArray(response.content)
        ? response.content.map((c: any) => (c.type === 'text' ? c.text : JSON.stringify(c))).join('\n')
        : String(response.content ?? '');

      return {
        toolName: name,
        isError,
        content: textContent,
      };
    } catch (err: any) {
      return {
        toolName: name,
        isError: true,
        content: `MCP Protocol Call Error: ${err.message}`,
      };
    }
  }
}

export const mcpSDKClient = new NexusMcpSDKClient();
