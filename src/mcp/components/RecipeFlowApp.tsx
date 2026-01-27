'use client';

import { useApp, useHostStyleVariables } from '@modelcontextprotocol/ext-apps/react';
import { useState } from 'react';
import { FlowChart } from '@/components/FlowChart';
import type { RecipeOutput } from '@/lib/recipe';

interface AppState {
  recipe: RecipeOutput | null;
  error: string | null;
}

/**
 * Main Recipe Flow app component.
 * Used by both the Vite MCP bundle and the Next.js preview page.
 */
export function RecipeFlowApp() {
  const [state, setState] = useState<AppState>({
    recipe: null,
    error: null,
  });

  const {
    app,
    isConnected,
    error: connectionError,
  } = useApp({
    appInfo: { name: 'Recipe Flow', version: '1.0.0' },
    capabilities: {},
    onAppCreated: (app) => {
      // Handle tool input - receives the tool arguments (recipe data)
      app.ontoolinput = (params) => {
        const args = params.arguments as { recipe?: RecipeOutput };

        if (args.recipe) {
          setState({
            recipe: args.recipe,
            error: null,
          });
        }
      };

      // Handle tool result - receives the structured content
      app.ontoolresult = (params) => {
        if (params.structuredContent) {
          const content = params.structuredContent as {
            mode?: string;
            recipe?: RecipeOutput;
          };

          if (content.recipe) {
            setState({
              recipe: content.recipe,
              error: null,
            });
          }
        }
      };

      // Handle tool cancellation
      app.ontoolcancelled = () => {
        // Keep displaying the current recipe if any
      };

      // Handle errors
      app.onerror = (err) => {
        console.error('MCP App error:', err);
        setState((prev) => ({
          ...prev,
          error: err.message || 'An error occurred',
        }));
      };
    },
  });

  // Apply host styles (theme, fonts)
  useHostStyleVariables(app, app?.getHostContext());

  if (connectionError) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 font-medium">Connection Error</div>
        <div className="text-gray-600 text-sm mt-2">{connectionError.message}</div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-600">Connecting to host...</div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 font-medium">Error</div>
        <div className="text-gray-600 text-sm mt-2">{state.error}</div>
      </div>
    );
  }

  if (state.recipe) {
    return <FlowChart recipe={state.recipe} />;
  }

  // Idle state - waiting for a recipe
  return (
    <div className="p-6 text-center">
      <div className="text-lg font-medium text-gray-700">Recipe Flow</div>
      <div className="text-gray-500 mt-2 text-sm">
        Ask Claude to create a recipe to see an interactive cooking flowchart.
      </div>
    </div>
  );
}
