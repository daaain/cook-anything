'use client';

import { Info, CheckCircle } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-amber-900 mb-2">Settings</h1>
        <p className="text-amber-700">Application configuration</p>
      </div>

      {/* Server Authentication Status */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-green-800 mb-1">Server Authentication</h3>
            <p className="text-sm text-green-700">
              This app uses the server&apos;s Claude CLI authentication. No additional configuration
              is required.
            </p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800 mb-1">How It Works</h3>
            <p className="text-sm text-blue-700">
              Recipe Flow uses the Claude Code CLI for AI processing. The server authenticates with
              Claude on your behalf using the CLI&apos;s stored credentials.
            </p>
            <p className="text-sm text-blue-700 mt-2">
              For developers: Run <code className="bg-blue-100 px-1 rounded">claude login</code> on
              the server to set up authentication.
            </p>
          </div>
        </div>
      </div>

      {/* Future: API Key Support */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 opacity-60">
        <h3 className="font-medium text-gray-600 mb-1">API Key Support</h3>
        <p className="text-sm text-gray-500">
          Direct API key authentication coming soon. This will allow you to use your own Anthropic
          API key instead of the CLI authentication.
        </p>
      </div>
    </div>
  );
}
