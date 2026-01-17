'use client';

import {
  AlertCircle,
  Check,
  CheckCircle,
  Copy,
  Cpu,
  Eye,
  EyeOff,
  Info,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  clearCustomModel,
  clearOAuthToken,
  getApiEndpoint,
  getCustomModel,
  getModel,
  getOAuthToken,
  getProviderType,
  setApiEndpoint,
  setCustomModel,
  setModel,
  setOAuthToken,
  setProviderType,
} from '@/lib/storage';
import type { ModelId, OpenAIModel, ProviderType, TestConnectionResponse } from '@/lib/types';

export default function SettingsPage() {
  const [token, setToken] = useState('');
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelId>('opus');
  const [providerType, setProviderTypeState] = useState<ProviderType>('claude');
  const [apiEndpointUrl, setApiEndpointUrl] = useState('http://localhost:1234/v1');
  const [availableModels, setAvailableModels] = useState<OpenAIModel[]>([]);
  const [selectedCustomModel, setSelectedCustomModel] = useState<string>('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState<string>('');

  /* eslint-disable react-hooks/set-state-in-effect -- Valid pattern for SSR hydration */
  useEffect(() => {
    const stored = getOAuthToken();
    setSavedToken(stored);
    if (stored) {
      setToken(stored);
    }
    setSelectedModel(getModel());
    setProviderTypeState(getProviderType());
    setApiEndpointUrl(getApiEndpoint());
    const customModel = getCustomModel();
    if (customModel) {
      setSelectedCustomModel(customModel);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleModelChange = (model: ModelId) => {
    setSelectedModel(model);
    setModel(model);
  };

  const handleSave = () => {
    if (token.trim()) {
      setOAuthToken(token.trim());
      setSavedToken(token.trim());
    }
  };

  const handleClear = () => {
    clearOAuthToken();
    setToken('');
    setSavedToken(null);
  };

  const handleCopyCommand = async () => {
    await navigator.clipboard.writeText('claude setup-token');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProviderChange = (newProviderType: ProviderType) => {
    setProviderTypeState(newProviderType);
    setProviderType(newProviderType);
    setConnectionStatus('idle');
    setConnectionError('');
  };

  const handleEndpointChange = (endpoint: string) => {
    setApiEndpointUrl(endpoint);
    setApiEndpoint(endpoint);
    setConnectionStatus('idle');
    setConnectionError('');
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus('idle');
    setConnectionError('');

    try {
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiEndpoint: apiEndpointUrl,
        }),
      });

      const result: TestConnectionResponse = await response.json();

      if (result.success && result.models) {
        setConnectionStatus('success');
        setAvailableModels(result.models);
        // If there's only one model, select it automatically
        if (result.models.length === 1 && !selectedCustomModel) {
          const modelId = result.models[0].id;
          setSelectedCustomModel(modelId);
          setCustomModel(modelId);
        }
      } else {
        setConnectionStatus('error');
        setConnectionError(result.error || 'Failed to connect');
      }
    } catch (error) {
      setConnectionStatus('error');
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleCustomModelChange = (model: string) => {
    setSelectedCustomModel(model);
    if (model) {
      setCustomModel(model);
    } else {
      clearCustomModel();
    }
  };

  const maskedToken = savedToken ? `${savedToken.slice(0, 8)}...${savedToken.slice(-4)}` : null;

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-amber-900 mb-2">Settings</h1>
        <p className="text-amber-700">Application configuration</p>
      </div>

      {/* Provider Selection */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <div>
          <h3 className="font-medium text-gray-800 mb-1">AI Provider</h3>
          <p className="text-sm text-gray-600 mb-3">
            Choose between Claude subscription or local OpenAI-compatible API
          </p>
        </div>

        <div className="space-y-2">
          <label
            className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
              providerType === 'claude'
                ? 'border-amber-500 bg-amber-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="provider"
              value="claude"
              checked={providerType === 'claude'}
              onChange={() => handleProviderChange('claude')}
              className="mt-1 accent-amber-500"
            />
            <div>
              <div className="font-medium text-gray-800">Claude Subscription</div>
              <div className="text-sm text-gray-600">
                Use Claude Code CLI with your Pro/Max subscription
              </div>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
              providerType === 'openai-local'
                ? 'border-amber-500 bg-amber-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="provider"
              value="openai-local"
              checked={providerType === 'openai-local'}
              onChange={() => handleProviderChange('openai-local')}
              className="mt-1 accent-amber-500"
            />
            <div>
              <div className="font-medium text-gray-800">Local OpenAI API</div>
              <div className="text-sm text-gray-600">
                Use local inference (LM Studio, Ollama, etc.)
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800 mb-1">How It Works</h3>
            {providerType === 'claude' ? (
              <>
                <p className="text-sm text-blue-700">
                  Recipe Flow uses the Claude Code CLI for AI processing. Your OAuth token is stored
                  locally in your browser and sent with each request.
                </p>
                <p className="text-sm text-blue-700 mt-2">
                  The token is generated from your Claude Pro/Max subscription via the CLI.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-blue-700">
                  Recipe Flow will connect to your local OpenAI-compatible API endpoint. This works
                  with LM Studio, Ollama, and other compatible servers.
                </p>
                <p className="text-sm text-blue-700 mt-2">
                  Make sure your API supports vision (image input) and structured output for best
                  results.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Claude Authentication Status */}
      {providerType === 'claude' &&
        (savedToken ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-green-800 mb-1">Authenticated</h3>
                <p className="text-sm text-green-700">
                  OAuth token is configured:{' '}
                  <code className="bg-green-100 px-1 rounded">{maskedToken}</code>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800 mb-1">Authentication Required</h3>
                <p className="text-sm text-amber-700">
                  Please set your OAuth token to use the recipe analysis feature.
                </p>
              </div>
            </div>
          </div>
        ))}

      {/* OAuth Token Input (Claude only) */}
      {providerType === 'claude' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <div>
            <h3 className="font-medium text-gray-800 mb-1">OAuth Token</h3>
            <p className="text-sm text-gray-600 mb-3">
              Generate a token by running this command locally:
            </p>
            <div className="flex items-center gap-2 mb-4">
              <code className="flex-1 bg-gray-100 px-3 py-2 rounded-lg text-sm font-mono">
                claude setup-token
              </code>
              <button
                type="button"
                onClick={handleCopyCommand}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Copy command"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
              Paste your token here
            </label>
            <div className="relative">
              <input
                id="token"
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter your OAuth token..."
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!token.trim() || token === savedToken}
              className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save Token
            </button>
            {savedToken && (
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* OpenAI API Configuration (Local only) */}
      {providerType === 'openai-local' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <div>
            <h3 className="font-medium text-gray-800 mb-1">API Configuration</h3>
            <p className="text-sm text-gray-600 mb-3">
              Configure your local OpenAI-compatible API endpoint
            </p>
          </div>

          <div>
            <label htmlFor="endpoint" className="block text-sm font-medium text-gray-700 mb-1">
              API Endpoint URL
            </label>
            <input
              id="endpoint"
              type="text"
              value={apiEndpointUrl}
              onChange={(e) => handleEndpointChange(e.target.value)}
              placeholder="http://localhost:1234/v1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Default: http://localhost:1234/v1</p>
          </div>

          <div>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {testingConnection ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Test Connection & Load Models
                </>
              )}
            </button>
          </div>

          {connectionStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Connection successful!</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Found {availableModels.length} model{availableModels.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {connectionStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Connection failed</span>
              </div>
              <p className="text-sm text-red-700 mt-1">{connectionError}</p>
            </div>
          )}

          {availableModels.length > 0 && (
            <div>
              <label
                htmlFor="custom-model"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Select Model (optional)
              </label>
              <select
                id="custom-model"
                value={selectedCustomModel}
                onChange={(e) => handleCustomModelChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
              >
                <option value="">Use default model</option>
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.id}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Leave unselected to use the server&apos;s default model
              </p>
            </div>
          )}
        </div>
      )}

      {/* Model Selection (Claude only) */}
      {providerType === 'claude' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="w-4 h-4 text-gray-600" />
              <h3 className="font-medium text-gray-800">AI Model</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Choose which Claude model to use for recipe analysis.
            </p>
          </div>

          <div className="space-y-2">
            <label
              className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedModel === 'haiku'
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="model"
                value="haiku"
                checked={selectedModel === 'haiku'}
                onChange={() => handleModelChange('haiku')}
                className="mt-1 accent-amber-500"
              />
              <div>
                <div className="font-medium text-gray-800">Haiku</div>
                <div className="text-sm text-gray-600">Fastest and most cost-effective</div>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedModel === 'sonnet'
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="model"
                value="sonnet"
                checked={selectedModel === 'sonnet'}
                onChange={() => handleModelChange('sonnet')}
                className="mt-1 accent-amber-500"
              />
              <div>
                <div className="font-medium text-gray-800">Sonnet</div>
                <div className="text-sm text-gray-600">Balanced performance (recommended)</div>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedModel === 'opus'
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="model"
                value="opus"
                checked={selectedModel === 'opus'}
                onChange={() => handleModelChange('opus')}
                className="mt-1 accent-amber-500"
              />
              <div>
                <div className="font-medium text-gray-800">Opus</div>
                <div className="text-sm text-gray-600">Most capable, best for complex recipes</div>
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
