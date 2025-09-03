import type pino from 'pino';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { Upstreams } from './upstreams.js';

// Define schemas for request validation
const ToolsListSchema = z.object({
  method: z.literal('tools/list')
});

const ToolsCallSchema = z.object({
  method: z.literal('tools/call'),
  params: z.object({
    name: z.string(),
    arguments: z.record(z.any()).optional()
  })
});

export class Router {
  constructor(private logger: pino.Logger, private upstreams: Upstreams) {}

  attach(server: Server) {
    // Tools list: merge with prefixes
    server.setRequestHandler(ToolsListSchema, async () => {
      const all = await this.upstreams.listAllTools();
      return { tools: all };
    });

    // Tool call: route by prefix NAME__toolName
    server.setRequestHandler(ToolsCallSchema, async (req) => {
      const { name, arguments: args } = req.params;
      const sep = name.indexOf('__');
      if (sep < 0) {
        throw new Error(`Tool name must include prefix separator "__": received "${name}"`);
      }
      const prefix = name.slice(0, sep);
      const inner = name.slice(sep + 2);
      return this.upstreams.callTool(prefix, inner, args ?? {});
    });
  }
}
