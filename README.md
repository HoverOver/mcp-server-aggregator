# MCP Aggregator

A **Model Context Protocol (MCP)** server that aggregates multiple upstream MCP servers and exposes them through a single SSE endpoint with namespaced tools to avoid naming collisions.

## How it works

- On startup, the aggregator connects to each configured upstream MCP server via SSE
- It fetches their tool lists and exposes them with prefixed names (e.g., `web3__token-research`, `dexs__search`)  
- When a client calls a namespaced tool, the aggregator routes the call to the matching upstream server and relays the result back
- All upstream tools are automatically namespaced to prevent conflicts between servers with similar tool names

## Configuration

Create a `.env` file based on `.env.example`:

```env
# Comma-separated list of upstream MCP servers to aggregate
# Format: NAME|SSE_URL
UPSTREAMS=web3|https://web3-research-mcp.example.com/mcp,cmc|https://investor-agent.example.com/mcp

# Optional bearer token for client authentication (none by default)
AGGREGATOR_BEARER=your-secret-token

# Optional headers for upstream authentication (JSON format)
UPSTREAM_HEADERS={"web3":{"headers":{"Authorization":"Bearer abc"}},"cmc":{"headers":{"X-API-Key":"xyz"}}}

# Server configuration
PORT=8080
SSE_PATH=/mcp
```

### Configuration Options

- **UPSTREAMS**: Comma-separated pairs of `NAME|URL` where `NAME` becomes the tool prefix
- **AGGREGATOR_BEARER**: Optional bearer token that clients must provide to access the aggregator
- **UPSTREAM_HEADERS**: Optional JSON object containing custom headers for each upstream (useful for API keys)
- **PORT**: Server port (default: 8080)
- **SSE_PATH**: SSE endpoint path (default: /mcp)

## Installation & Development

### Local Development
```bash
npm install
npm run dev
```

The server will be available at `http://localhost:8080/mcp`

### Production Build
```bash
npm install
npm run build
node dist/index.js
```

### Docker
```bash
docker build -t mcp-aggregator .
docker run -p 8080:8080 --env-file .env mcp-aggregator
```

## API Endpoints

### Health Check
- **GET** `/healthz` - Health check endpoint, returns `ok`

### MCP Protocol Endpoints
- **GET** `/mcp` - Establishes SSE connection for MCP protocol communication
- **POST** `/messages` - Handles MCP protocol messages (requires `sessionId` query parameter)

### Tool Access

All upstream tools are exposed with the format `{UPSTREAM_NAME}__{TOOL_NAME}`:

#### Example Upstream Tools

Based on the example configuration, here are common tools you might find:

**Web3 Research Tools** (prefix: `web3__`)
- `web3__token-research` - Research cryptocurrency tokens and projects
- `web3__market-analysis` - Analyze crypto market trends and data
- `web3__contract-audit` - Audit smart contracts for security issues

**CoinMarketCap Tools** (prefix: `cmc__`)
- `cmc__price-lookup` - Get current cryptocurrency prices
- `cmc__market-cap` - Retrieve market capitalization data
- `cmc__trending-coins` - Get trending cryptocurrency information

**DEX Screener Tools** (prefix: `dexs__`)
- `dexs__search` - Search for token pairs on decentralized exchanges
- `dexs__pair-info` - Get detailed information about trading pairs
- `dexs__price-alerts` - Set up price monitoring and alerts

**BlockBeats Tools** (prefix: `blockbeats__`)
- `blockbeats__news` - Get latest cryptocurrency news
- `blockbeats__market-updates` - Retrieve market update notifications

**Chain List Tools** (prefix: `chainlist__`)
- `chainlist__networks` - Get blockchain network information
- `chainlist__rpc-endpoints` - Retrieve RPC endpoints for various chains

**Cointelegraph Tools** (prefix: `ctgraph__`)
- `ctgraph__articles` - Fetch cryptocurrency news articles
- `ctgraph__analysis` - Get market analysis and insights

**Fear & Greed Index Tools** (prefix: `feargreed__`)
- `feargreed__index` - Get current market sentiment index
- `feargreed__historical` - Retrieve historical sentiment data

**DeFi Yields Tools** (prefix: `defiyields__`)
- `defiyields__pools` - Find high-yield liquidity pools
- `defiyields__strategies` - Get optimal yield farming strategies

*Note: Actual available tools depend on your configured upstream servers. Use the MCP client to list all available tools dynamically.*

## Client Usage

### MCP Client Connection

Connect to the aggregator using any MCP-compatible client:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

const client = new Client({
  name: 'my-client',
  version: '1.0.0'
});

const transport = new SSEClientTransport(new URL('http://localhost:8080/mcp'));
await client.connect(transport);

// List all available tools
const tools = await client.listTools();

// Call a namespaced tool
const result = await client.callTool({
  name: 'web3__token-research',
  arguments: { symbol: 'BTC' }
});
```

### Authentication

If `AGGREGATOR_BEARER` is configured, include it in your requests:

```bash
curl -H "Authorization: Bearer your-secret-token" http://localhost:8080/mcp
```

## Features

- **Tool Namespacing**: Prevents conflicts between upstream servers with similar tool names
- **Dynamic Discovery**: Automatically discovers and exposes all upstream tools
- **Session Management**: Proper SSE session handling with cleanup
- **Error Handling**: Graceful handling of upstream server failures
- **Authentication**: Optional bearer token authentication for clients
- **Upstream Authentication**: Support for custom headers to authenticate with upstream servers
- **Health Monitoring**: Built-in health check endpoint
- **CORS Support**: Configured for web-based MCP clients

## Architecture

```
Client → MCP Aggregator → Multiple Upstream MCP Servers
                ↓
         [web3__*, cmc__*, dexs__*, ...]
```

The aggregator acts as a proxy, maintaining connections to multiple upstream MCP servers and presenting their tools as a unified interface with namespaced tool names.

## Troubleshooting

- **Connection Issues**: Check that upstream servers are accessible and responding
- **Authentication Errors**: Verify `UPSTREAM_HEADERS` configuration for upstream authentication
- **Tool Not Found**: Ensure upstream server is connected and tool exists (check logs)
- **Session Errors**: Client disconnections are normal; sessions are automatically cleaned up

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `UPSTREAMS` | Yes | Comma-separated upstream servers | `web3\|https://example.com/mcp` |
| `PORT` | No | Server port | `8080` |
| `SSE_PATH` | No | SSE endpoint path | `/mcp` |
| `AGGREGATOR_BEARER` | No | Client authentication token | `secret123` |
| `UPSTREAM_HEADERS` | No | Upstream server authentication | `{"web3":{"headers":{"Authorization":"Bearer token"}}}` |
| `LOG_LEVEL` | No | Logging level | `info` |
