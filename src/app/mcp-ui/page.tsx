'use client';

import dynamic from 'next/dynamic';

// Dynamically import with SSR disabled - the ext-apps/react hooks
// require browser APIs and cannot be prerendered.
// This page is useful for local development/testing of the MCP UI.
const RecipeFlowApp = dynamic(
  () => import('@/mcp/components/RecipeFlowApp').then((m) => m.RecipeFlowApp),
  {
    ssr: false,
    loading: () => (
      <div className="p-6 text-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    ),
  },
);

export default function McpUiPage() {
  return <RecipeFlowApp />;
}
