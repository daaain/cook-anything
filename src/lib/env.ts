export const isVercel = process.env.VERCEL === '1';

/**
 * Base URL for the application.
 * Handles Vercel deployments (production, preview, development) and local development.
 *
 * For server-side code (like MCP server), uses VERCEL_* variables (available at runtime).
 * For client-side code, uses NEXT_PUBLIC_* variables (inlined at build time).
 */
export function getBaseUrl(): string {
  // Server-side: use runtime environment variables
  if (typeof window === 'undefined') {
    const vercelEnv = process.env.VERCEL_ENV;
    if (vercelEnv == null || vercelEnv === 'development') {
      return 'http://localhost:3000';
    }
    if (vercelEnv === 'preview') {
      return `https://${process.env.VERCEL_URL}`;
    }
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  // Client-side: use build-time environment variables
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;
  if (vercelEnv == null || vercelEnv === 'development') {
    return 'http://localhost:3000';
  }
  if (vercelEnv === 'preview') {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  return `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`;
}

// For backwards compatibility
export const BASE_URL = getBaseUrl();
