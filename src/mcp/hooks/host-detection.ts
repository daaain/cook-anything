/**
 * Shared host-detection utilities.
 *
 * Both RecipeFlowApp and use-widget-data need to detect the host environment
 * and reactively read OpenAI globals. This module is the single source of
 * truth so the two consumers never diverge.
 */

'use client';

import { useSyncExternalStore } from 'react';
import type { HostType } from './types';
import { SET_GLOBALS_EVENT_TYPE } from './types';

/**
 * Detects which host environment we're running in.
 *
 * ChatGPT injects `window.openai` with `toolOutput` / `toolInput` properties.
 * We check for those specifically rather than just `window.openai !== undefined`
 * to avoid false positives from other libraries that might set that key.
 */
export function detectHostType(): HostType {
  if (typeof window === 'undefined') {
    return 'unknown';
  }

  // ChatGPT injects window.openai with toolOutput / toolInput
  if (window.openai?.toolOutput !== undefined || window.openai?.toolInput !== undefined) {
    return 'chatgpt';
  }

  // Claude's MCP ext-apps will connect via postMessage
  return 'claude';
}

/**
 * Hook to access OpenAI globals reactively (for ChatGPT).
 *
 * Subscribes to the `openai:set_globals` custom event so the component
 * re-renders when ChatGPT updates its globals.
 *
 * Returns `unknown` to avoid complex generic type inference issues —
 * callers should cast the result to the expected type.
 */
export function useOpenAiGlobal(key: string): unknown {
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
