/**
 * MCP API Route Handler
 *
 * Provides an MCP server endpoint for Claude.ai integration.
 * Uses stateless mode (no session IDs) for Vercel serverless compatibility.
 */

import { WebStandardStreamableHTTPServerTransport } from '@/lib/mcp/mcp-sdk';
import { createRecipeFlowServer, setBundledHtml } from '@/lib/mcp/server';

// Load the bundled MCP UI HTML at module initialization
async function initBundledHtml() {
  try {
    const { bundledHtml } = await import('@/lib/mcp/bundled-ui');
    if (bundledHtml) {
      setBundledHtml(bundledHtml);
    }
  } catch {
    console.warn('MCP app UI not bundled yet. Run `bun run build:mcp` to build.');
  }
}

initBundledHtml();

// Stateless: single server+transport reused across warm invocations
let server: ReturnType<typeof createRecipeFlowServer> | null = null;
let transport: WebStandardStreamableHTTPServerTransport | null = null;

async function getTransport(): Promise<WebStandardStreamableHTTPServerTransport> {
  if (!server || !transport) {
    server = createRecipeFlowServer();
    transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless mode — no sessions
    });
    await server.connect(transport);
  }
  return transport;
}

/**
 * POST handler for MCP JSON-RPC messages.
 */
export async function POST(request: Request): Promise<Response> {
  const t = await getTransport();
  return t.handleRequest(request);
}

/**
 * GET handler for MCP SSE streams or server info.
 */
export async function GET(request: Request): Promise<Response> {
  const sessionId = request.headers.get('mcp-session-id');

  if (sessionId) {
    const t = await getTransport();
    return t.handleRequest(request);
  }

  // For non-MCP GET requests, return server info
  return new Response(
    JSON.stringify({
      name: 'Recipe Flow MCP Server',
      version: '1.0.0',
      description: 'MCP server for creating interactive cooking flowcharts',
      tools: ['show-recipe'],
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

/**
 * DELETE handler for MCP session termination.
 */
export async function DELETE(request: Request): Promise<Response> {
  const t = await getTransport();
  return t.handleRequest(request);
}

/**
 * OPTIONS handler for CORS preflight requests.
 */
export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, mcp-session-id, mcp-protocol-version',
    },
  });
}
