import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, CalendarCheck } from 'lucide-react';
import { getLead, updateLead } from '../api/client';
import Badge from '../components/Badge';
import { format } from 'date-fns';

import Skeleton from '../components/Skeleton';

const STATUS_OPTIONS = ['new', 'active', 'qualified', 'converted', 'closed'];

export default function LeadDetail() {
  const { phone } = useParams();
  const decodedPhone = decodeURIComponent(phone);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', status: 'active', notes: '' });

  function load() {
    getLead(decodedPhone)
      .then((r) => {
        setData(r.data);
        const l = r.data.lead;
        setForm({ name: l.name || '', email: l.email || '', status: l.status, notes: l.notes || '' });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [decodedPhone]);

  function handleSave() {
    setSaving(true);
    updateLead(decodedPhone, form)
      .then(() => load())
      .catch(console.error)
      .finally(() => setSaving(false));
  }

  if (loading) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div>
            <Skeleton className="h-8 w-48 mb-1" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-[60vh] rounded-xl" />
          </div>
          <div className="space-y-5">
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-8 text-gray-500">Lead not found.</div>;

  const { lead, conversations, appointments } = data;

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/leads" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {lead.name || decodedPhone}
          </h1>
          <p className="text-gray-500 text-sm">{decodedPhone}</p>
        </div>
        <Badge status={lead.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversation */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col" style={{ maxHeight: '70vh' }}>
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <MessageCircle className="w-4 h-4 text-blue-500" />
            <h2 className="font-semibold text-gray-700">Conversation</h2>
            <span className="text-gray-400 text-xs ml-auto">{conversations.length} messages</span>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {conversations.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No messages yet</p>
            ) : (
              conversations.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-gray-100 text-gray-700 rounded-tl-sm'
                        : 'bg-blue-600 text-white rounded-tr-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-gray-400' : 'text-blue-200'}`}>
                      {(() => {
                        try { return format(new Date(msg.created_at), 'MMM d, h:mm a'); }
                        catch { return msg.created_at; }
                      })()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lead info + appointments */}
        <div className="space-y-5">
          {/* Edit form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-700 mb-4">Lead Details</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Appointments */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <CalendarCheck className="w-4 h-4 text-green-500" />
              <h2 className="font-semibold text-gray-700">Appointments</h2>
            </div>
            {appointments.length === 0 ? (
              <p className="text-gray-400 text-sm">No appointments</p>
            ) : (
              <div className="space-y-2">
                {appointments.map((a) => (
                  <div key={a.id} className="p-3 bg-green-50 rounded-lg text-sm">
                    <p className="font-medium text-gray-700">{a.property_desc}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {(() => {
                        try { return format(new Date(a.scheduled_at), 'PPp'); }
                        catch { return a.scheduled_at; }
                      })()}
                    </p>
                    <Badge status={a.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
