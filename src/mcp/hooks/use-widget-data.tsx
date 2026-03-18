/**
 * Unified widget data hook for MCP apps.
 *
 * Automatically detects whether the widget is running in Claude or ChatGPT
 * and uses the appropriate API to access tool output data.
 *
 * Usage:
 * ```tsx
 * // Wrap your app in the provider:
 * <WidgetDataProvider>
 *   <MyWidget />
 * </WidgetDataProvider>
 *
 * // Then consume in any child component:
 * const { data, isConnected, hostType, theme, error } = useWidgetData<MyDataType>();
 * ```
 */

'use client';

import type { McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import { useApp, useHostStyleVariables } from '@modelcontextprotocol/ext-apps/react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { detectHostType, useOpenAiGlobal } from './host-detection';
import type { DisplayMode, HostType, Theme, UnifiedWidgetData } from './types';

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
  const [hostContext, setHostContext] = useState<McpUiHostContext | undefined>(undefined);

  const handleAppCreated = useCallback(
    (app: Parameters<NonNullable<Parameters<typeof useApp>[0]['onAppCreated']>>[0]) => {
      // Handle tool input - receives the tool arguments
      // Return the whole arguments object for consistency with ChatGPT path
      app.ontoolinput = (params) => {
        if (params.arguments) {
          setData(params.arguments as T);
        }
      };

      // Handle tool result - receives the structured content
      // Return the whole structuredContent object for consistency with ChatGPT path
      app.ontoolresult = (params) => {
        if (params.structuredContent) {
          setData(params.structuredContent as T);
        }
      };

      // Handle tool cancellation - keep current data
      app.ontoolcancelled = () => {};

      // Handle errors
      app.onerror = (err) => {
        console.error('MCP App error:', err);
      };

      // Subscribe to host context changes (theme, fonts, etc.)
      app.onhostcontextchanged = (params) => {
        setHostContext((prev) => ({ ...prev, ...params }));
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

  // Set initial host context when app connects
  /* eslint-disable react-hooks/set-state-in-effect -- Syncing initial state from MCP SDK after connection */
  useEffect(() => {
    if (app) {
      setHostContext(app.getHostContext() ?? undefined);
    }
  }, [app]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Apply host styles (theme, fonts) reactively
  useHostStyleVariables(app, hostContext);

  // Derive theme reactively from host context state
  const theme = (hostContext?.theme as Theme) ?? 'light';

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

const DEFAULT_WIDGET_DATA: UnifiedWidgetData = {
  data: null,
  isConnected: false,
  hostType: 'unknown',
  theme: 'light',
  displayMode: 'inline',
  error: null,
};

// biome-ignore lint/suspicious/noExplicitAny: generic context requires any
const WidgetDataContext = createContext<UnifiedWidgetData<any>>(DEFAULT_WIDGET_DATA); // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * ChatGPT-specific provider — only mounts ChatGPT hooks.
 */
function ChatGPTWidgetDataProvider({ children }: { children: ReactNode }) {
  const data = useChatGPTWidgetData();
  return <WidgetDataContext.Provider value={data}>{children}</WidgetDataContext.Provider>;
}

/**
 * Claude-specific provider — only mounts Claude/MCP hooks.
 */
function ClaudeWidgetDataProvider({ children }: { children: ReactNode }) {
  const data = useClaudeWidgetData();
  return <WidgetDataContext.Provider value={data}>{children}</WidgetDataContext.Provider>;
}

/**
 * Unknown host provider — returns disconnected default state.
 */
function UnknownWidgetDataProvider({ children }: { children: ReactNode }) {
  return (
    <WidgetDataContext.Provider value={DEFAULT_WIDGET_DATA}>{children}</WidgetDataContext.Provider>
  );
}

/**
 * Provider that detects the host environment and mounts only the relevant
 * host-specific hook tree. This ensures useClaudeWidgetData (and its useApp
 * call) never runs in ChatGPT, and vice versa.
 *
 * Wrap your app in this provider, then use useWidgetData() in child components.
 */
export function WidgetDataProvider({ children }: { children: ReactNode }) {
  const hostType = useHostTypeInternal();

  if (hostType === 'chatgpt') {
    return <ChatGPTWidgetDataProvider>{children}</ChatGPTWidgetDataProvider>;
  }
  if (hostType === 'claude') {
    return <ClaudeWidgetDataProvider>{children}</ClaudeWidgetDataProvider>;
  }
  return <UnknownWidgetDataProvider>{children}</UnknownWidgetDataProvider>;
}

/**
 * Unified hook for accessing widget data from either Claude or ChatGPT.
 *
 * Must be used within a WidgetDataProvider. The provider detects the host
 * environment and only mounts the appropriate host-specific hooks, avoiding
 * unnecessary MCP connections in ChatGPT or OpenAI global access in Claude.
 *
 * @template T - The type of the structured data from the tool output
 * @returns UnifiedWidgetData<T> - The widget data and connection state
 */
export function useWidgetData<T = Record<string, unknown>>(): UnifiedWidgetData<T> {
  return useContext(WidgetDataContext) as UnifiedWidgetData<T>;
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
