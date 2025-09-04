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
app.use(cors());
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// Optional simple auth for downstream clients
app.use((req, res, next) => {
  if (!AGGREGATOR_BEARER) return next();
  const auth = req.headers['authorization'] || '';
  if (auth === `Bearer ${AGGREGATOR_BEARER}`) return next();
  if (req.path === '/healthz') return next();
  res.status(401).json({ error: 'Unauthorized' });
});

async function main() {
  const server = new Server(
    { name: 'mcp-aggregator', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  const upstreamManager = new Upstreams(logger);
  await upstreamManager.connectAll(upstreams);

  const router = new Router(logger, upstreamManager);
  router.attach(server);

  // Create SSE transport with the app and path
  const transport = new SSEServerTransport(SSE_PATH, app);
  await server.connect(transport);

  app.listen(PORT, () => logger.info({ port: PORT, path: SSE_PATH }, 'MCP aggregator listening'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
