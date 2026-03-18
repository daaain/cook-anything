/**
 * MCP widget hooks for unified host support.
 *
 * These hooks abstract the differences between Claude and ChatGPT hosts,
 * providing a consistent API for widget development.
 */

export { detectHostType, useOpenAiGlobal } from './host-detection';
export type {
  CallToolResponse,
  DeviceType,
  DisplayMode,
  HostType,
  OpenAiGlobals,
  SafeArea,
  SafeAreaInsets,
  Theme,
  UnifiedWidgetData,
  UserAgent,
} from './types';
export { useHostType, useTheme, useWidgetData, WidgetDataProvider } from './use-widget-data';
