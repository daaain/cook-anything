'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseWakeLockOptions {
  defaultEnabled?: boolean;
}

interface UseWakeLockReturn {
  isSupported: boolean;
  isEnabled: boolean;
  toggle: () => void;
  enable: () => void;
  disable: () => void;
}

export function useWakeLock(options: UseWakeLockOptions = {}): UseWakeLockReturn {
  const { defaultEnabled = true } = options;

  const [isSupported] = useState(() => typeof navigator !== 'undefined' && 'wakeLock' in navigator);
  const [isEnabled, setIsEnabled] = useState(isSupported ? defaultEnabled : false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = useCallback(async () => {
    if (!isSupported) return;

    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
    } catch {
      // Wake lock request can fail (e.g., low battery, browser policy)
      // We keep isEnabled true to reflect user intent
    }
  }, [isSupported]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // Release can fail if already released
      }
      wakeLockRef.current = null;
    }
  }, []);

  const enable = useCallback(() => {
    if (!isSupported) return;
    setIsEnabled(true);
  }, [isSupported]);

  const disable = useCallback(() => {
    if (!isSupported) return;
    setIsEnabled(false);
  }, [isSupported]);

  const toggle = useCallback(() => {
    if (!isSupported) return;
    setIsEnabled((prev) => !prev);
  }, [isSupported]);

  // Handle wake lock acquisition/release based on isEnabled state
  useEffect(() => {
    if (!isSupported) return;

    if (isEnabled) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [isSupported, isEnabled, requestWakeLock, releaseWakeLock]);

  // Re-acquire wake lock when page becomes visible (wake locks are released when tab is hidden)
  useEffect(() => {
    if (!isSupported) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isEnabled) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSupported, isEnabled, requestWakeLock]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  return {
    isSupported,
    isEnabled,
    toggle,
    enable,
    disable,
  };
}
