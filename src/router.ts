import type pino from 'pino';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { Upstreams } from './upstreams.js';

export class Router {
  constructor(private logger: pino.Logger, private upstreams: Upstreams) {}

  attach(server: Server) {
    // Tools list: merge with prefixes
    server.setRequestHandler('tools/list' as any, async () => {
      const all = await this.upstreams.listAllTools();
      return { tools: all };
    });

    // Tool call: route by prefix NAME__toolName
    server.setRequestHandler('tools/call' as any, async (req: any) => {
      const { name, arguments: args } = req.params || {};
      const sep = name?.indexOf('__') ?? -1;
      if (sep < 0) {
        throw new Error(`Tool name must include prefix separator "__": received "${name}"`);
      }
      const prefix = name.slice(0, sep);
      const inner = name.slice(sep + 2);
      return this.upstreams.callTool(prefix, inner, args ?? {});
    });
  }
}
