'use client';

import { TokenInput } from '@/components/TokenInput';
import { Info } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-amber-900 mb-2">Settings</h1>
        <p className="text-amber-700">Manage your API token and preferences</p>
      </div>

      {/* Token Input */}
      <TokenInput />

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800 mb-1">About API Tokens</h3>
            <p className="text-sm text-blue-700">
              Your API token is stored locally in your browser and is only used to communicate with Claude&apos;s API.
              It is never sent to our servers or stored externally.
            </p>
            <p className="text-sm text-blue-700 mt-2">
              To get a token, you&apos;ll need access to the Claude API through Anthropic&apos;s developer portal.
            </p>
          </div>
        </div>
      </div>

      {/* Token Format Help */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-medium text-gray-800 mb-3">Expected Token Format</h3>
        <pre className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 overflow-x-auto">
{`{
  "claudeAiOauth": {
    "accessToken": "sk-ant-oat01-...",
    "refreshToken": "sk-ant-ort01-...",
    "expiresAt": 1790527580972,
    "scopes": ["user:inference"],
    "subscriptionType": null
  }
}`}
        </pre>
      </div>
    </div>
  );
}
