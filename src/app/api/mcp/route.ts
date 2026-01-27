/**
 * MCP API Route Handler
 *
 * Provides an MCP server endpoint for Claude.ai integration.
 * Handles POST (JSON-RPC messages), GET (SSE stream), and DELETE (session termination).
 */

import { WebStandardStreamableHTTPServerTransport } from '@/lib/mcp/mcp-sdk';
import { createRecipeFlowServer, setBundledHtml } from '@/lib/mcp/server';

// Attempt to load the bundled HTML at module initialization
// This will be populated by the build process
async function initBundledHtml() {
  // Try to import the bundled HTML if it exists
  try {
    // Dynamic import to handle the case where the file doesn't exist yet
    const bundledModule = await import('@/lib/mcp/bundled-ui');
    if (bundledModule.bundledHtml) {
      setBundledHtml(bundledModule.bundledHtml);
    }
  } catch {
    // Bundled HTML not available yet - will show placeholder
    console.warn('MCP app UI not bundled yet. Run `bun run build:mcp` to build.');
  }
}

// Initialize on module load
initBundledHtml();

// Store active transports by session ID for session management
const transports = new Map<string, WebStandardStreamableHTTPServerTransport>();

/**
 * Handle MCP requests - supports POST (messages), GET (SSE), and DELETE (session close).
 */
async function handleMcpRequest(request: Request): Promise<Response> {
  const sessionId = request.headers.get('mcp-session-id');

  // For existing sessions, reuse the transport
  if (sessionId) {
    const existingTransport = transports.get(sessionId);
    if (existingTransport) {
      return existingTransport.handleRequest(request);
    }
  }

  // Create new transport for new sessions
  const server = createRecipeFlowServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    onsessioninitialized: (id) => {
      transports.set(id, transport);
    },
    onsessionclosed: (id) => {
      transports.delete(id);
    },
  });

  // Connect the server to the transport
  await server.connect(transport);

  // Handle the request
  return transport.handleRequest(request);
}

/**
 * POST handler for MCP JSON-RPC messages.
 */
export async function POST(request: Request): Promise<Response> {
  return handleMcpRequest(request);
}

/**
 * GET handler for MCP SSE streams.
 */
export async function GET(request: Request): Promise<Response> {
  // Check if this is a session reconnection
  const sessionId = request.headers.get('mcp-session-id');

  if (sessionId && transports.has(sessionId)) {
    return handleMcpRequest(request);
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
  return handleMcpRequest(request);
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
