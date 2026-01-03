import { OAuthToken } from './types';

const TOKEN_STORAGE_KEY = 'recipe-flow-token';

export function parseToken(jsonString: string): OAuthToken | null {
  try {
    const parsed = JSON.parse(jsonString);

    // Validate the structure
    if (!parsed.claudeAiOauth) {
      return null;
    }

    const { accessToken, refreshToken, expiresAt, scopes } = parsed.claudeAiOauth;

    if (!accessToken || typeof accessToken !== 'string') {
      return null;
    }

    if (!refreshToken || typeof refreshToken !== 'string') {
      return null;
    }

    if (typeof expiresAt !== 'number') {
      return null;
    }

    if (!Array.isArray(scopes)) {
      return null;
    }

    return parsed as OAuthToken;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: OAuthToken): boolean {
  // Add a 5 minute buffer
  const buffer = 5 * 60 * 1000;
  return Date.now() >= token.claudeAiOauth.expiresAt - buffer;
}

export function getAccessToken(token: OAuthToken): string {
  return token.claudeAiOauth.accessToken;
}

export function saveTokenToStorage(token: OAuthToken): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token));
  }
}

export function getTokenFromStorage(): OAuthToken | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  return parseToken(stored);
}

export function clearTokenFromStorage(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function getTokenStatus(token: OAuthToken | null): 'valid' | 'expired' | 'missing' {
  if (!token) {
    return 'missing';
  }

  if (isTokenExpired(token)) {
    return 'expired';
  }

  return 'valid';
}
