import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { getSettings, updateSettings } from '../api/client';

const MODEL_OPTIONS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];

export default function Settings() {
  const [form, setForm] = useState({
    agent_name: '',
    company_name: '',
    openai_model: 'gpt-4o',
    property_website_base_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getSettings()
      .then((r) => setForm(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const r = await updateSettings(form);
      setForm(r.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.response?.data?.errors?.[0]?.msg || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Configure your AI agent</p>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}
          {saved && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
              Settings saved successfully!
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name</label>
            <input
              type="text"
              value={form.agent_name}
              onChange={(e) => setForm({ ...form, agent_name: e.target.value })}
              placeholder="Priya"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Name shown to leads in WhatsApp messages
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              placeholder="YourRealty"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">OpenAI Model</label>
            <select
              value={form.openai_model}
              onChange={(e) => setForm({ ...form, openai_model: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MODEL_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property Website Base URL</label>
            <input
              type="url"
              value={form.property_website_base_url}
              onChange={(e) => setForm({ ...form, property_website_base_url: e.target.value })}
              placeholder="https://yourrealestate.com/properties"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Used as fallback when no exact location match is found in the Properties table
            </p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>

        {/* Env vars info */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <SettingsIcon className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">Environment Variables</h3>
          </div>
          <p className="text-sm text-amber-700 mb-3">
            The following are set via <code className="bg-amber-100 px-1 rounded">.env</code> and cannot be changed here:
          </p>
          <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
            <li><code className="bg-amber-100 px-1 rounded">TWILIO_ACCOUNT_SID</code> / <code className="bg-amber-100 px-1 rounded">TWILIO_AUTH_TOKEN</code></li>
            <li><code className="bg-amber-100 px-1 rounded">OPENAI_API_KEY</code></li>
            <li><code className="bg-amber-100 px-1 rounded">GOOGLE_CLIENT_ID</code> / <code className="bg-amber-100 px-1 rounded">GOOGLE_CLIENT_SECRET</code> / <code className="bg-amber-100 px-1 rounded">GOOGLE_REFRESH_TOKEN</code></li>
            <li><code className="bg-amber-100 px-1 rounded">GOOGLE_CALENDAR_ID</code></li>
            <li><code className="bg-amber-100 px-1 rounded">GMAIL_SENDER</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
