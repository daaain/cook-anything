'use client';

import { useApp, useHostStyleVariables } from '@modelcontextprotocol/ext-apps/react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { FlowChart } from '@/components/FlowChart';
import type { RecipeOutput } from '@/lib/recipe';
import { type HostType, SET_GLOBALS_EVENT_TYPE } from '../hooks/types';

interface AppState {
  recipe: RecipeOutput | null;
  error: string | null;
}

/**
 * Detects which host environment we're running in.
 * ChatGPT injects window.openai, Claude doesn't.
 */
function detectHostType(): HostType {
  if (typeof window === 'undefined') {
    return 'unknown';
  }

  // ChatGPT injects window.openai before the widget loads
  if (window.openai !== undefined) {
    return 'chatgpt';
  }

  // No window.openai means we're in Claude or standalone
  return 'claude';
}

/**
 * Hook to access OpenAI globals reactively (for ChatGPT).
 * Returns unknown to avoid complex generic type inference issues.
 */
function useOpenAiGlobal(key: string): unknown {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined') {
        return () => {};
      }

      const handleSetGlobal = (event: CustomEvent<{ globals?: Record<string, unknown> }>) => {
        const globals = event.detail?.globals;
        if (!globals || globals[key] === undefined) {
          return;
        }
        onChange();
      };

      window.addEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal as EventListener, {
        passive: true,
      });

      return () => {
        window.removeEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal as EventListener);
      };
    },
    () => {
      const openai = window.openai as Record<string, unknown> | undefined;
      return openai?.[key] ?? null;
    },
    () => null,
  );
}

/**
 * ChatGPT-specific component that uses window.openai for data.
 */
function ChatGPTRecipeFlow() {
  // Get tool output from ChatGPT's window.openai
  const toolOutput = useOpenAiGlobal('toolOutput') as { recipe?: RecipeOutput } | null;
  const theme = useOpenAiGlobal('theme') as 'light' | 'dark' | null;

  // Apply theme class to body for ChatGPT
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const recipe = toolOutput?.recipe ?? null;

  if (recipe) {
    return <FlowChart recipe={recipe} />;
  }

  // Idle state - waiting for a recipe
  return (
    <div className="p-6 text-center">
      <div className="text-lg font-medium text-gray-700 dark:text-gray-200">Recipe Flow</div>
      <div className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
        Ask ChatGPT to create a recipe to see an interactive cooking flowchart.
      </div>
    </div>
  );
}

/**
 * Claude-specific component that uses the MCP ext-apps SDK.
 */
function ClaudeRecipeFlow() {
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

  // Also apply dark class for Tailwind dark mode support
  useEffect(() => {
    if (app) {
      const context = app.getHostContext();
      if (context?.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [app]);

  if (connectionError) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 dark:text-red-400 font-medium">Connection Error</div>
        <div className="text-gray-600 dark:text-gray-400 text-sm mt-2">
          {connectionError.message}
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-600 dark:text-gray-400">Connecting to host...</div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 dark:text-red-400 font-medium">Error</div>
        <div className="text-gray-600 dark:text-gray-400 text-sm mt-2">{state.error}</div>
      </div>
    );
  }

  if (state.recipe) {
    return <FlowChart recipe={state.recipe} />;
  }

  // Idle state - waiting for a recipe
  return (
    <div className="p-6 text-center">
      <div className="text-lg font-medium text-gray-700 dark:text-gray-200">Recipe Flow</div>
      <div className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
        Ask Claude to create a recipe to see an interactive cooking flowchart.
      </div>
    </div>
  );
}

/**
 * Hook to detect host type using useSyncExternalStore for SSR safety.
 */
function useHostDetection(): { hostType: HostType; isClient: boolean } {
  return useSyncExternalStore(
    // Subscribe function - no-op since host type doesn't change
    () => () => {},
    // Client snapshot
    () => ({ hostType: detectHostType(), isClient: true as boolean }),
    // Server snapshot
    () => ({ hostType: 'unknown' as HostType, isClient: false as boolean }),
  );
}

/**
 * Main Recipe Flow app component.
 * Automatically detects the host (Claude or ChatGPT) and uses the appropriate
 * communication method.
 *
 * - Claude: Uses @modelcontextprotocol/ext-apps SDK with postMessage
 * - ChatGPT: Uses window.openai skybridge runtime
 */
export function RecipeFlowApp() {
  const { hostType, isClient } = useHostDetection();

  // During SSR or before hydration, show loading state
  if (!isClient) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  // Render the appropriate component based on host type
  if (hostType === 'chatgpt') {
    return <ChatGPTRecipeFlow />;
  }

  // Default to Claude for 'claude' and 'unknown' hosts
  // This ensures the widget works in development/preview mode
  return <ClaudeRecipeFlow />;
}
