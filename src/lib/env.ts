export const isVercel = process.env.VERCEL === '1';

/**
 * Base URL for the application.
 * Handles Vercel deployments (production, preview, development) and local development.
 */
export const BASE_URL =
  process.env.NEXT_PUBLIC_VERCEL_ENV == null || process.env.NEXT_PUBLIC_VERCEL_ENV === 'development'
    ? 'http://localhost:3000'
    : process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview'
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`;
