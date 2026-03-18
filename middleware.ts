/**
 * Next.js Middleware for CORS support.
 *
 * ChatGPT's triple-iframe architecture requires CORS headers for:
 * - React Server Component (RSC) requests during client-side navigation
 * - OPTIONS preflight requests from the browser
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Handle OPTIONS preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', '*');
    return response;
  }

  // Add CORS headers to all responses
  return NextResponse.next({
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

export const config = {
  matcher: '/:path*', // Apply to all routes
};
