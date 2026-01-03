'use client';

import { useState, useEffect } from 'react';
import { Key, CheckCircle, XCircle, AlertCircle, Trash2, Eye, EyeOff } from 'lucide-react';
import { OAuthToken } from '@/lib/types';
import { parseToken, getTokenFromStorage, saveTokenToStorage, clearTokenFromStorage, getTokenStatus } from '@/lib/token';

interface TokenInputProps {
  onTokenChange?: (token: OAuthToken | null) => void;
}

export function TokenInput({ onTokenChange }: TokenInputProps) {
  const [token, setToken] = useState<OAuthToken | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedToken = getTokenFromStorage();
    setToken(storedToken);
    onTokenChange?.(storedToken);
    setIsLoaded(true);
  }, [onTokenChange]);

  const handleSaveToken = () => {
    setError(null);

    if (!inputValue.trim()) {
      setError('Please paste your token JSON');
      return;
    }

    const parsed = parseToken(inputValue);
    if (!parsed) {
      setError('Invalid token format. Please paste the complete JSON object.');
      return;
    }

    saveTokenToStorage(parsed);
    setToken(parsed);
    setInputValue('');
    onTokenChange?.(parsed);
  };

  const handleClearToken = () => {
    clearTokenFromStorage();
    setToken(null);
    onTokenChange?.(null);
  };

  const status = getTokenStatus(token);

  if (!isLoaded) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
          <div className="flex-1 h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${
          status === 'valid' ? 'bg-green-100' :
          status === 'expired' ? 'bg-yellow-100' :
          'bg-gray-100'
        }`}>
          <Key className={`w-6 h-6 ${
            status === 'valid' ? 'text-green-600' :
            status === 'expired' ? 'text-yellow-600' :
            'text-gray-500'
          }`} />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-gray-800">API Token</h2>
          <p className="text-sm text-gray-500">
            {status === 'valid' && 'Token is valid and ready to use'}
            {status === 'expired' && 'Token has expired, please update'}
            {status === 'missing' && 'No token configured'}
          </p>
        </div>
        <div>
          {status === 'valid' && <CheckCircle className="w-6 h-6 text-green-500" />}
          {status === 'expired' && <AlertCircle className="w-6 h-6 text-yellow-500" />}
          {status === 'missing' && <XCircle className="w-6 h-6 text-gray-400" />}
        </div>
      </div>

      {token ? (
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Access Token</span>
              <button
                onClick={() => setShowToken(!showToken)}
                className="text-gray-400 hover:text-gray-600"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="font-mono text-xs text-gray-600 break-all">
              {showToken
                ? token.claudeAiOauth.accessToken
                : token.claudeAiOauth.accessToken.substring(0, 20) + '...'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-xs font-medium text-gray-500">Expires</span>
              <p className="text-gray-700">
                {new Date(token.claudeAiOauth.expiresAt).toLocaleDateString()}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-xs font-medium text-gray-500">Scopes</span>
              <p className="text-gray-700">
                {token.claudeAiOauth.scopes.join(', ')}
              </p>
            </div>
          </div>

          <button
            onClick={handleClearToken}
            className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Remove Token
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder='Paste your OAuth token JSON here (the object containing "claudeAiOauth")...'
            className="w-full h-32 p-3 border border-gray-200 rounded-lg text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />

          {error && (
            <p className="text-sm text-red-600 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              {error}
            </p>
          )}

          <button
            onClick={handleSaveToken}
            className="w-full py-2 px-4 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium text-sm"
          >
            Save Token
          </button>
        </div>
      )}
    </div>
  );
}
