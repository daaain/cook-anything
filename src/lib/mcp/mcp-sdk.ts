/**
 * Combined MCP SDK re-exports.
 * Merges exports from @modelcontextprotocol/sdk and @modelcontextprotocol/ext-apps.
 */

export {
  RESOURCE_MIME_TYPE,
  registerAppResource,
  registerAppTool,
} from '@modelcontextprotocol/ext-apps/server';
export { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
export { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
