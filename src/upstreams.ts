import { z } from 'zod';
import type pino from 'pino';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

const ToolSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  inputSchema: z.any().optional()
});

type Tool = z.infer<typeof ToolSchema>;

export type UpstreamConfig = { name: string; url: string; headers?: Record<string,string> };

export class Upstreams {
  private clients = new Map<string, Client>();
  private toolCache = new Map<string, Tool[]>();

  constructor(private logger: pino.Logger) {}

  async connectAll(configs: UpstreamConfig[]) {
    await Promise.all(configs.map(c => this.connect(c)));
  }

  async connect(cfg: UpstreamConfig) {
    // Create transport - just pass the URL, no options for now
    const transport = new SSEClientTransport(new URL(cfg.url));
    const client = new Client({ name: 'mcp-aggregator-client', version: '0.1.0' });
    await client.connect(transport);
    this.clients.set(cfg.name, client);
    await this.refreshTools(cfg.name);
    this.logger.info({ upstream: cfg.name, url: cfg.url }, 'Connected upstream');
    // Auto-refresh on disconnect/reconnect would be added here in a fuller impl.
  }

  async refreshTools(name: string) {
    const client = this.clients.get(name);
    if (!client) throw new Error(`No upstream client: ${name}`);
    // Use the request method with proper parameters
    const res: any = await client.request({
      method: 'tools/list',
      params: {}
    });
    const parsed = z.object({ tools: z.array(ToolSchema) }).parse(res);
    const namespaced = parsed.tools.map(t => ({
      ...t,
      name: `${name}__${t.name}`,
      description: `[${name}] ${t.description || ''}`.trim()
    }));
    this.toolCache.set(name, namespaced);
  }

  async listAllTools() {
    const all: Tool[] = [];
    for (const arr of this.toolCache.values()) {
      all.push(...arr);
    }
    return all;
  }

  async callTool(prefix: string, toolName: string, args: any) {
    const client = this.clients.get(prefix);
    if (!client) throw new Error(`Unknown upstream prefix: ${prefix}`);
    // Use the request method with proper parameters
    const res = await client.request({
      method: 'tools/call',
      params: { 
        name: toolName, 
        arguments: args || {} 
      }
    });
    return res;
  }
}
