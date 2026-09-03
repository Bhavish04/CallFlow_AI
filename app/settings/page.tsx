import { Settings, Key, Globe, Database } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Configure API integration keys, Supabase settings, and Voice AI parameters.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Integration Credentials</h2>
            <p className="text-xs text-slate-500">External service connections for production deployment</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 mb-2 font-semibold text-slate-800 text-xs uppercase tracking-wider">
              <Database className="w-4 h-4 text-blue-600" />
              1. Supabase PostgreSQL
            </div>
            <p className="text-xs text-slate-600">Configured via environment variables in `.env.local`.</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 mb-2 font-semibold text-slate-800 text-xs uppercase tracking-wider">
              <Key className="w-4 h-4 text-emerald-600" />
              2. OpenAI & Google Calendar API
            </div>
            <p className="text-xs text-slate-600">Tool calling agent & calendar availability sync.</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 mb-2 font-semibold text-slate-800 text-xs uppercase tracking-wider">
              <Globe className="w-4 h-4 text-purple-600" />
              3. Speech-to-Text & Text-to-Speech
            </div>
            <p className="text-xs text-slate-600">English and Hindi voice synthesis provider API keys.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
