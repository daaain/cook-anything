/**
 * MCP widget hooks for unified host support.
 *
 * These hooks abstract the differences between Claude and ChatGPT hosts,
 * providing a consistent API for widget development.
 */

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
export { useHostType, useTheme, useWidgetData } from './use-widget-data';
