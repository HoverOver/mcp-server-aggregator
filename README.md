# MCP Aggregator (Render-ready)

This project runs a single **Model Context Protocol (MCP)** server that **aggregates multiple upstream MCP servers**
and exposes them through **one SSE endpoint**. It **namespaces** all upstream tools to avoid collisions.

## How it works
- On startup, the aggregator connects (as a client) to each upstream MCP server via **SSE**.
- It fetches their **tool lists** and **exposes** them with **prefixed names**, e.g. `web3__token-research`, `dexs__search`.
- When a client calls `tools/call` on a namespaced tool, the aggregator routes the call to the matching upstream and relays the result back.

## Environment
Copy `.env.example` to `.env` and set values:

```env
UPSTREAMS=web3|https://your-web3-research-mcp/mcp,cmc|https://your-investor-agent/mcp,dexs|https://your-mcp-dexscreener/mcp
PORT=8080
SSE_PATH=/mcp
# Optionally:
# UPSTREAM_HEADERS={"web3":{"headers":{"Authorization":"Bearer token"}}}
```

- `UPSTREAMS`: comma-separated pairs `NAME|URL`. The `NAME` becomes the tool prefix (e.g., `NAME__toolName`).
- `UPSTREAM_HEADERS`: optional JSON object per upstream for custom headers (auth keys, etc.).

## Local dev
```bash
pnpm i   # or npm i / yarn
pnpm dev
```

The server listens on `http://localhost:8080/mcp` by default.

## Build & run
```bash
pnpm build
node dist/index.js
```

## Deploy to Render
1. Create a new Web Service from this repo.
2. Build Command: `pnpm install && pnpm build` (or `npm ci && npm run build`)
3. Start Command: `node dist/index.js`
4. Add required **Environment Variables** from `.env.example`.
5. Expose on port `8080`.
6. Health Check Path: `/healthz`.

## n8n Configuration
- In your workflow, add **MCP Client Tool**.
- Set **SSE endpoint** to `https://your-render-service.onrender.com/mcp`.
- (Optional) Add Bearer token if you configured `AGGREGATOR_BEARER`.
- All tools appear with names like `web3__token-research`, `dexs__search`, etc.

## Notes
- This template assumes the upstream MCP servers adhere to MCP tool discovery and tool call semantics.
- If an upstream disconnects, the aggregator will try to reconnect and reflect current availability.
- Tool and resource listing is cached and refreshed on reconnect.
- If two upstreams publish the same tool name, the prefix keeps them distinct.
- You can safely add/remove upstreams by editing `UPSTREAMS` and restarting.
- If your upstreams need secrets (API keys), put them into `UPSTREAM_HEADERS` per upstream.
