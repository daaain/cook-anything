/**
 * Unified widget data hook for MCP apps.
 *
 * Automatically detects whether the widget is running in Claude or ChatGPT
 * and uses the appropriate API to access tool output data.
 *
 * Usage:
 * ```tsx
 * const { data, isConnected, hostType, theme, error } = useWidgetData<MyDataType>();
 * ```
 */

'use client';

import { useApp, useHostStyleVariables } from '@modelcontextprotocol/ext-apps/react';
import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import type { DisplayMode, HostType, Theme, UnifiedWidgetData } from './types';
import { SET_GLOBALS_EVENT_TYPE } from './types';

/**
 * Detects which host environment we're running in.
 */
function detectHostType(): HostType {
  if (typeof window === 'undefined') {
    return 'unknown';
  }

  // ChatGPT injects window.openai
  if (window.openai?.toolOutput !== undefined || window.openai?.toolInput !== undefined) {
    return 'chatgpt';
  }

  // Claude's MCP ext-apps will connect via postMessage
  // We detect this by checking if we're in an iframe with certain characteristics
  // or by the presence of the MCP app SDK
  return 'claude';
}

/**
 * Hook to access OpenAI globals reactively.
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
    () => null, // Server-side snapshot
  );
}

/**
 * ChatGPT-specific hook for widget data.
 */
function useChatGPTWidgetData<T>(): UnifiedWidgetData<T> {
  const toolOutput = useOpenAiGlobal('toolOutput') as T | null;
  const theme = (useOpenAiGlobal('theme') ?? 'light') as Theme;
  const displayMode = (useOpenAiGlobal('displayMode') ?? 'inline') as DisplayMode;

  // ChatGPT widgets are connected once toolOutput is available
  // or when window.openai exists
  const isConnected = typeof window !== 'undefined' && window.openai !== undefined;

  return {
    data: toolOutput,
    isConnected,
    hostType: 'chatgpt',
    theme,
    displayMode,
    error: null,
  };
}

/**
 * Claude-specific hook for widget data.
 */
function useClaudeWidgetData<T>(): UnifiedWidgetData<T> {
  const [data, setData] = useState<T | null>(null);

  const handleAppCreated = useCallback(
    (app: Parameters<NonNullable<Parameters<typeof useApp>[0]['onAppCreated']>>[0]) => {
      // Handle tool input - receives the tool arguments
      app.ontoolinput = (params) => {
        const args = params.arguments as { recipe?: T };
        if (args.recipe) {
          setData(args.recipe as T);
        }
      };

      // Handle tool result - receives the structured content
      app.ontoolresult = (params) => {
        if (params.structuredContent) {
          const content = params.structuredContent as { recipe?: T };
          if (content.recipe) {
            setData(content.recipe as T);
          }
        }
      };

      // Handle tool cancellation - keep current data
      app.ontoolcancelled = () => {};

      // Handle errors
      app.onerror = (err) => {
        console.error('MCP App error:', err);
      };
    },
    [],
  );

  const {
    app,
    isConnected,
    error: connectionError,
  } = useApp({
    appInfo: { name: 'Recipe Flow', version: '1.0.0' },
    capabilities: {},
    onAppCreated: handleAppCreated,
  });

  // Apply host styles (theme, fonts) for Claude
  useHostStyleVariables(app, app?.getHostContext());

  // Derive theme from host context (Claude applies theme via CSS variables)
  const theme = useMemo(() => {
    if (app) {
      const context = app.getHostContext();
      return (context?.theme as Theme) ?? 'light';
    }
    return 'light' as Theme;
  }, [app]);

  return {
    data,
    isConnected,
    hostType: 'claude',
    theme,
    displayMode: 'inline',
    error: connectionError,
  };
}

/**
 * Hook to get host type using useSyncExternalStore for SSR safety.
 */
function useHostTypeInternal(): HostType {
  return useSyncExternalStore(
    // Subscribe function - no-op since host type doesn't change at runtime
    () => () => {},
    // Client snapshot
    () => detectHostType(),
    // Server snapshot
    () => 'unknown' as HostType,
  );
}

/**
 * Unified hook for accessing widget data from either Claude or ChatGPT.
 *
 * Automatically detects the host environment and uses the appropriate API.
 *
 * @template T - The type of the structured data from the tool output
 * @returns UnifiedWidgetData<T> - The widget data and connection state
 */
export function useWidgetData<T = Record<string, unknown>>(): UnifiedWidgetData<T> {
  const hostType = useHostTypeInternal();

  // For ChatGPT, use window.openai
  const chatGPTData = useChatGPTWidgetData<T>();

  // For Claude, use the MCP app SDK
  const claudeData = useClaudeWidgetData<T>();

  // Return data based on detected host type
  return useMemo(() => {
    if (hostType === 'chatgpt') {
      return chatGPTData;
    }
    if (hostType === 'claude') {
      return claudeData;
    }
    // Unknown host - return disconnected state
    return {
      data: null,
      isConnected: false,
      hostType: 'unknown',
      theme: 'light' as Theme,
      displayMode: 'inline' as DisplayMode,
      error: null,
    };
  }, [hostType, chatGPTData, claudeData]);
}

/**
 * Hook to get the current host type.
 */
export function useHostType(): HostType {
  return useHostTypeInternal();
}

/**
 * Hook to get the current theme from the host.
 */
export function useTheme(): Theme {
  const { theme } = useWidgetData();
  return theme;
}
