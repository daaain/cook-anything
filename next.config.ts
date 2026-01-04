import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@anthropic-ai/claude-code', 'ai-sdk-provider-claude-code'],
};

export default nextConfig;
