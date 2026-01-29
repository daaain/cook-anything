/**
 * Type definitions for MCP widget host environments.
 *
 * Supports both Claude (via @modelcontextprotocol/ext-apps) and
 * ChatGPT (via window.openai skybridge runtime).
 */

/** Display mode for widgets */
export type DisplayMode = 'pip' | 'inline' | 'fullscreen';

/** Theme preference */
export type Theme = 'light' | 'dark';

/** Device type */
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

/** Safe area insets */
export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Safe area configuration */
export interface SafeArea {
  insets: SafeAreaInsets;
}

/** User agent capabilities */
export interface UserAgent {
  device: { type: DeviceType };
  capabilities: {
    hover: boolean;
    touch: boolean;
  };
}

/** Tool call response */
export interface CallToolResponse {
  result: string;
}

/**
 * OpenAI's window.openai global interface.
 * Injected by ChatGPT's web sandbox for widget communication.
 */
export interface OpenAiGlobals<
  ToolInput = Record<string, unknown>,
  ToolOutput = Record<string, unknown>,
  ToolResponseMetadata = Record<string, unknown>,
  WidgetState = Record<string, unknown>,
> {
  // Visual/context
  theme: Theme;
  userAgent: UserAgent;
  locale: string;

  // Layout
  maxHeight: number;
  displayMode: DisplayMode;
  safeArea: SafeArea;

  // State/data
  toolInput: ToolInput;
  toolOutput: ToolOutput | null;
  toolResponseMetadata: ToolResponseMetadata | null;
  widgetState: WidgetState | null;
  setWidgetState: (state: WidgetState) => Promise<void>;

  // API methods
  callTool: (name: string, args: Record<string, unknown>) => Promise<CallToolResponse>;
  sendFollowUpMessage: (args: { prompt: string }) => Promise<void>;
  openExternal: (payload: { href: string }) => void;
  requestDisplayMode: (args: { mode: DisplayMode }) => Promise<{ mode: DisplayMode }>;
  requestModal: (args: { title?: string; params?: Record<string, unknown> }) => Promise<unknown>;
  requestClose: () => Promise<void>;
}

/** Event type for OpenAI globals updates */
export const SET_GLOBALS_EVENT_TYPE = 'openai:set_globals';

/** Custom event for OpenAI globals updates */
export class SetGlobalsEvent extends CustomEvent<{
  globals: Partial<OpenAiGlobals>;
}> {
  readonly type = SET_GLOBALS_EVENT_TYPE;
}

// Extend global Window interface
declare global {
  interface Window {
    openai?: OpenAiGlobals;
  }

  interface WindowEventMap {
    [SET_GLOBALS_EVENT_TYPE]: SetGlobalsEvent;
  }
}

/** Host environment type */
export type HostType = 'claude' | 'chatgpt' | 'unknown';

/** Unified widget data from either host */
export interface UnifiedWidgetData<T = Record<string, unknown>> {
  /** The structured data from the tool output */
  data: T | null;
  /** Whether the widget is connected to a host */
  isConnected: boolean;
  /** Which host environment we're running in */
  hostType: HostType;
  /** Current theme */
  theme: Theme;
  /** Current display mode */
  displayMode: DisplayMode;
  /** Any connection or data error */
  error: Error | null;
}
