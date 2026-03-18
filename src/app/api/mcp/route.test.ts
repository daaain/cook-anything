import { describe, expect, it, mock } from 'bun:test';
import { DELETE, GET, OPTIONS, POST } from './route';

// Mock the MCP SDK transport — stateless mode (no session IDs)
mock.module('@/lib/mcp/mcp-sdk', () => ({
  WebStandardStreamableHTTPServerTransport: class MockTransport {
    handleRequest = mock(async (request: Request) => {
      const method = request.method;

      if (method === 'POST') {
        return new Response(JSON.stringify({ result: 'success' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (method === 'DELETE') {
        return new Response(null, { status: 204 });
      }

      return new Response(null, { status: 200 });
    });
  },
}));

// Mock the server module
mock.module('@/lib/mcp/server', () => ({
  createRecipeFlowServer: () => ({
    connect: mock(async () => {}),
  }),
  setBundledHtml: mock(() => {}),
}));

describe('MCP API Route', () => {
  describe('OPTIONS', () => {
    it('returns CORS headers', async () => {
      const response = await OPTIONS();

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
        'GET, POST, DELETE, OPTIONS',
      );
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe(
        'Content-Type, mcp-session-id, mcp-protocol-version',
      );
    });

    it('returns no body', async () => {
      const response = await OPTIONS();
      const body = await response.text();

      expect(body).toBe('');
    });
  });

  describe('GET (no session)', () => {
    it('returns server info JSON', async () => {
      const request = new Request('http://localhost/api/mcp', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('includes server name and version', async () => {
      const request = new Request('http://localhost/api/mcp', {
        method: 'GET',
      });

      const response = await GET(request);
      const body = await response.json();

      expect(body.name).toBe('Recipe Flow MCP Server');
      expect(body.version).toBe('1.0.0');
    });

    it('includes tools list', async () => {
      const request = new Request('http://localhost/api/mcp', {
        method: 'GET',
      });

      const response = await GET(request);
      const body = await response.json();

      expect(body.tools).toContain('show-recipe');
    });

    it('includes description', async () => {
      const request = new Request('http://localhost/api/mcp', {
        method: 'GET',
      });

      const response = await GET(request);
      const body = await response.json();

      expect(body.description).toContain('MCP server');
      expect(body.description).toContain('cooking flowcharts');
    });
  });

  describe('POST', () => {
    it('handles requests in stateless mode', async () => {
      const request = new Request('http://localhost/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {},
          id: 1,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('returns JSON response', async () => {
      const request = new Request('http://localhost/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: { name: 'show-recipe', arguments: {} },
          id: 2,
        }),
      });

      const response = await POST(request);

      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('DELETE', () => {
    it('returns 204 on session termination', async () => {
      const deleteRequest = new Request('http://localhost/api/mcp', {
        method: 'DELETE',
      });

      const deleteResponse = await DELETE(deleteRequest);

      expect(deleteResponse.status).toBe(204);
    });
  });
});
