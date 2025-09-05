import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pino from 'pino';
import { z } from 'zod';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { Router } from './router.js';
import { Upstreams } from './upstreams.js';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const PORT = Number(process.env.PORT || 8080);
const SSE_PATH = process.env.SSE_PATH || '/mcp';
const AGGREGATOR_BEARER = process.env.AGGREGATOR_BEARER || '';

// Parse UPSTREAMS env
const upstreamSpec = process.env.UPSTREAMS || '';
const UPSTREAM_HEADERS = process.env.UPSTREAM_HEADERS || '';

const headersSchema = z.record(z.string(), z.object({
  headers: z.record(z.string(), z.string()).optional()
})).optional();

const upstreamHeaders = (() => {
  try {
    if (!UPSTREAM_HEADERS) return {};
    return headersSchema.parse(JSON.parse(UPSTREAM_HEADERS));
  } catch (e) {
    throw new Error('Invalid UPSTREAM_HEADERS JSON');
  }
})();

const upstreams = upstreamSpec.split(',').map(s => s.trim()).filter(Boolean).map(pair => {
  const [name, url] = pair.split('|');
  if (!name || !url) {
    throw new Error(`Invalid UPSTREAMS entry: ${pair} (expected NAME|URL)`);
  }
  const headers = upstreamHeaders?.[name]?.headers || {};
  return { name, url, headers };
});

const app = express();
app.disable('x-powered-by');
app.use(cors({
  origin: '*',
  exposedHeaders: ['Mcp-Session-Id'],
  allowedHeaders: ['Content-Type', 'mcp-session-id']
}));
app.use(express.json());
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// Optional simple auth for downstream clients
app.use((req, res, next) => {
  if (!AGGREGATOR_BEARER) return next();
  const auth = req.headers['authorization'] || '';
  if (auth === `Bearer ${AGGREGATOR_BEARER}`) return next();
  if (req.path === '/healthz') return next();
  res.status(401).json({ error: 'Unauthorized' });
});

// Store transports by session
const transports: Record<string, SSEServerTransport> = {};

async function main() {
  const server = new Server(
    { name: 'mcp-aggregator', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  const upstreamManager = new Upstreams(logger);
  await upstreamManager.connectAll(upstreams);

  const router = new Router(logger, upstreamManager);
  router.attach(server);

  // SSE endpoint - GET request to establish SSE connection
  app.get(SSE_PATH, async (req, res) => {
    try {
      const transport = new SSEServerTransport('/messages', res);
      transports[transport.sessionId] = transport;
      
      // Clean up transport when connection is closed
      res.on('close', () => {
        delete transports[transport.sessionId];
      });
      
      await server.connect(transport);
    } catch (error) {
      logger.error({ error }, 'Error setting up SSE transport');
      if (!res.headersSent) {
        res.status(500).send('Internal Server Error');
      }
    }
  });

  // Message endpoint - POST requests for MCP messages
  app.post('/messages', async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports[sessionId];
    
    if (transport) {
      try {
        await transport.handlePostMessage(req, res, req.body);
      } catch (error) {
        logger.error({ error, sessionId }, 'Error handling POST message');
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error',
            },
            id: null,
          });
        }
      }
    } else {
      res.status(400).send('No transport found for sessionId');
    }
  });

  app.listen(PORT, () => logger.info({ port: PORT, path: SSE_PATH }, 'MCP aggregator listening'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
