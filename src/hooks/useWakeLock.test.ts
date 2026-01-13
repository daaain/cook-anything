import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import { useWakeLock } from './useWakeLock';

describe('useWakeLock', () => {
  let mockWakeLockSentinel: {
    release: ReturnType<typeof mock>;
    addEventListener: ReturnType<typeof mock>;
    removeEventListener: ReturnType<typeof mock>;
  };
  let mockRequest: ReturnType<typeof mock>;

  beforeEach(() => {
    mockWakeLockSentinel = {
      release: mock(() => Promise.resolve()),
      addEventListener: mock(() => {}),
      removeEventListener: mock(() => {}),
    };

    mockRequest = mock(() => Promise.resolve(mockWakeLockSentinel));

    // Mock navigator.wakeLock
    Object.defineProperty(navigator, 'wakeLock', {
      value: { request: mockRequest },
      writable: true,
      configurable: true,
    });

    // Mock document.visibilityState as 'visible'
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Clean up navigator.wakeLock mock
    Object.defineProperty(navigator, 'wakeLock', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  describe('when Wake Lock API is supported', () => {
    it('returns isSupported as true', () => {
      const { result } = renderHook(() => useWakeLock());

      expect(result.current.isSupported).toBe(true);
    });

    it('starts with isEnabled true by default', () => {
      const { result } = renderHook(() => useWakeLock());

      expect(result.current.isEnabled).toBe(true);
    });

    it('requests wake lock on mount when defaultEnabled is true', async () => {
      renderHook(() => useWakeLock({ defaultEnabled: true }));

      // Wait for the async wake lock request
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockRequest).toHaveBeenCalledWith('screen');
    });

    it('does not request wake lock on mount when defaultEnabled is false', async () => {
      renderHook(() => useWakeLock({ defaultEnabled: false }));

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockRequest).not.toHaveBeenCalled();
    });

    it('releases wake lock when disabled', async () => {
      const { result } = renderHook(() => useWakeLock({ defaultEnabled: true }));

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        result.current.disable();
        await Promise.resolve();
      });

      expect(mockWakeLockSentinel.release).toHaveBeenCalled();
    });

    it('toggles wake lock state', async () => {
      const { result } = renderHook(() => useWakeLock({ defaultEnabled: true }));

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isEnabled).toBe(true);

      await act(async () => {
        result.current.toggle();
        await Promise.resolve();
      });

      expect(result.current.isEnabled).toBe(false);

      await act(async () => {
        result.current.toggle();
        await Promise.resolve();
      });

      expect(result.current.isEnabled).toBe(true);
    });

    it('re-acquires wake lock when page becomes visible', async () => {
      renderHook(() => useWakeLock({ defaultEnabled: true }));

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockRequest).toHaveBeenCalledTimes(1);

      // Simulate page becoming visible again using JSDOM's Event constructor
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });
      await act(async () => {
        const event = document.createEvent('Event');
        event.initEvent('visibilitychange', true, true);
        document.dispatchEvent(event);
        await Promise.resolve();
      });

      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it('does not re-acquire wake lock when page becomes visible but wake lock is disabled', async () => {
      renderHook(() => useWakeLock({ defaultEnabled: false }));

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockRequest).not.toHaveBeenCalled();

      // Simulate page becoming visible using JSDOM's Event constructor
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });
      await act(async () => {
        const event = document.createEvent('Event');
        event.initEvent('visibilitychange', true, true);
        document.dispatchEvent(event);
        await Promise.resolve();
      });

      expect(mockRequest).not.toHaveBeenCalled();
    });

    it('releases wake lock on unmount', async () => {
      const { unmount } = renderHook(() => useWakeLock({ defaultEnabled: true }));

      await act(async () => {
        await Promise.resolve();
      });

      unmount();

      expect(mockWakeLockSentinel.release).toHaveBeenCalled();
    });
  });

  describe('when Wake Lock API is not supported', () => {
    beforeEach(() => {
      // Delete the property entirely so 'wakeLock' in navigator returns false
      delete (navigator as { wakeLock?: unknown }).wakeLock;
    });

    it('returns isSupported as false', () => {
      const { result } = renderHook(() => useWakeLock());

      expect(result.current.isSupported).toBe(false);
    });

    it('returns isEnabled as false', () => {
      const { result } = renderHook(() => useWakeLock());

      expect(result.current.isEnabled).toBe(false);
    });

    it('toggle does nothing', async () => {
      const { result } = renderHook(() => useWakeLock());

      await act(async () => {
        result.current.toggle();
      });

      expect(result.current.isEnabled).toBe(false);
    });
  });

  describe('error handling', () => {
    it('handles wake lock request failure gracefully', async () => {
      mockRequest.mockImplementation(() => Promise.reject(new Error('Wake lock failed')));

      const { result } = renderHook(() => useWakeLock({ defaultEnabled: true }));

      await act(async () => {
        await Promise.resolve();
      });

      // Should not throw, and isEnabled should remain true (user intent)
      expect(result.current.isEnabled).toBe(true);
    });
  });
});
