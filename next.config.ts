import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Empty turbopack config to allow both build modes (needed while webpack config exists)
  turbopack: {},
  // Headers for MCP UI embedding in ChatGPT and Claude
  async headers() {
    return [
      {
        source: '/mcp-ui',
        headers: [
          {
            // Allow embedding in ChatGPT and Claude iframes
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com https://claude.ai https://*.claude.ai",
          },
          {
            // Remove X-Frame-Options to allow embedding (CSP frame-ancestors takes precedence)
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
        ],
      },
    ];
  },
  serverExternalPackages: [
    '@anthropic-ai/claude-code',
    'ai-sdk-provider-claude-code',
    '@modelcontextprotocol/sdk',
    '@modelcontextprotocol/ext-apps',
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Resolve MCP package subpath exports
      config.resolve = config.resolve || {};
      config.resolve.alias = config.resolve.alias || {};

      // Map subpath exports to their actual file locations
      config.resolve.alias['@modelcontextprotocol/ext-apps/server'] = path.resolve(
        process.cwd(),
        'node_modules/@modelcontextprotocol/ext-apps/dist/src/server/index.js',
      );
      config.resolve.alias['@modelcontextprotocol/sdk/server/mcp.js'] = path.resolve(
        process.cwd(),
        'node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js',
      );
      config.resolve.alias['@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'] =
        path.resolve(
          process.cwd(),
          'node_modules/@modelcontextprotocol/sdk/dist/esm/server/webStandardStreamableHttp.js',
        );
    }
    return config;
  },
};

export default nextConfig;
