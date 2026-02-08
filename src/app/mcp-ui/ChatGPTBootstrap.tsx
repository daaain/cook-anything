'use client';

import { useEffect } from 'react';
// Import types from the existing hooks to avoid duplicate declarations
import '@/mcp/hooks/types';

declare global {
  interface Window {
    innerBaseUrl?: string;
  }
}

interface ChatGPTBootstrapProps {
  baseUrl: string;
}

/**
 * ChatGPT SDK Bootstrap Component
 *
 * Applies runtime patches required for Next.js to work inside ChatGPT's
 * triple-iframe architecture:
 *
 * 1. Sets <base href> for relative URL resolution
 * 2. MutationObserver to prevent parent frame interference with hydration
 * 3. History API patches to prevent URL leaks
 * 4. External link interception via openai.openExternal()
 * 5. Fetch patching for client-side navigation in iframes
 */
export function ChatGPTBootstrap({ baseUrl }: ChatGPTBootstrapProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Store base URL globally
    window.innerBaseUrl = baseUrl;
    const appOrigin = new URL(baseUrl).origin;

    // 1. MutationObserver to remove parent-injected attributes
    const htmlElement = document.documentElement;
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.target === htmlElement) {
          const attrName = mutation.attributeName;
          if (attrName && attrName !== 'suppresshydrationwarning' && attrName !== 'class') {
            htmlElement.removeAttribute(attrName);
          }
        }
      }
    });
    observer.observe(htmlElement, { attributes: true, attributeOldValue: true });

    // 2. Patch history.replaceState to prevent URL leaks
    const originalReplaceState = history.replaceState.bind(history);
    history.replaceState = (state, unused, url) => {
      const u = new URL(url?.toString() ?? '', window.location.href);
      const href = u.pathname + u.search + u.hash;
      originalReplaceState(state, unused, href);
    };

    // 3. Patch history.pushState to prevent URL leaks
    const originalPushState = history.pushState.bind(history);
    history.pushState = (state, unused, url) => {
      const u = new URL(url?.toString() ?? '', window.location.href);
      const href = u.pathname + u.search + u.hash;
      originalPushState(state, unused, href);
    };

    // 4. Intercept external links
    const handleClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest('a');
      if (!a || !a.href) return;

      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin && url.origin !== appOrigin) {
        try {
          if (window.openai?.openExternal) {
            window.openai.openExternal({ href: a.href });
            e.preventDefault();
          }
        } catch {
          console.warn('openExternal failed, likely not in OpenAI client');
        }
      }
    };
    window.addEventListener('click', handleClick, true);

    // 5. Patch fetch for iframe navigation
    const isInIframe = window.self !== window.top;
    const originalFetch = window.fetch;

    if (isInIframe && window.location.origin !== appOrigin) {
      const patchedFetch = (input: URL | RequestInfo, init?: RequestInit): Promise<Response> => {
        let url: URL;
        if (typeof input === 'string') {
          url = new URL(input, window.location.href);
        } else if (input instanceof URL) {
          url = input;
        } else if (input instanceof Request) {
          url = new URL(input.url);
        } else {
          return originalFetch.call(window, input, init);
        }

        // If request targets the iframe's origin, rewrite to app origin
        if (url.origin === window.location.origin) {
          const newUrl = new URL(baseUrl);
          newUrl.pathname = url.pathname;
          newUrl.search = url.search;
          newUrl.hash = url.hash;

          return originalFetch.call(window, newUrl.toString(), {
            ...init,
            mode: 'cors',
          });
        }

        return originalFetch.call(window, input, init);
      };
      // Preserve static properties from original fetch
      Object.assign(patchedFetch, originalFetch);
      window.fetch = patchedFetch as typeof fetch;
    }

    // Cleanup
    return () => {
      observer.disconnect();
      window.removeEventListener('click', handleClick, true);
      history.replaceState = originalReplaceState;
      history.pushState = originalPushState;
      if (isInIframe) {
        window.fetch = originalFetch;
      }
    };
  }, [baseUrl]);

  // Render base element for relative URL resolution
  return <base href={baseUrl} />;
}
