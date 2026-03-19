import { useEffect, useState } from 'react';
import { CalendarCheck, Plus, Trash2, X, ExternalLink, Calendar } from 'lucide-react';
import { getAppointments, createAppointment, updateAppointment, deleteAppointment } from '../api/client';
import Badge from '../components/Badge';
import { format } from 'date-fns';

const STATUS_OPTIONS = ['', 'confirmed', 'completed', 'cancelled'];

const EMPTY_FORM = {
  lead_phone: '',
  lead_name: '',
  lead_email: '',
  property_desc: '',
  scheduled_at: '',
  notes: '',
};

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [calendarNotice, setCalendarNotice] = useState('');

  function load() {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (dateFilter) params.date = dateFilter;
    getAppointments(params)
      .then((r) => setAppointments(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [statusFilter, dateFilter]);

  async function handleStatus(id, status) {
    await updateAppointment(id, { status });
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this appointment? The Google Calendar event will also be removed.')) return;
    await deleteAppointment(id);
    load();
  }

  async function handleBook() {
    if (!form.lead_phone || !form.scheduled_at) {
      setFormError('Lead phone and date/time are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      // Convert local datetime-local value to ISO string
      const isoDate = new Date(form.scheduled_at).toISOString();
      const res = await createAppointment({ ...form, scheduled_at: isoDate });
      const link = res.data?.calendar_event_link;
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
      if (link) {
        setCalendarNotice(link);
      }
    } catch (e) {
      setFormError(e.response?.data?.errors?.[0]?.msg || e.response?.data?.error || 'Booking failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 bg-gray-50 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Appointments</h1>
          <p className="text-gray-500 mt-1">Property visit appointments — synced with Google Calendar</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormError(''); setCalendarNotice(''); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-md transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          Book Appointment
        </button>
      </div>

      {/* Calendar event created notice */}
      {calendarNotice && (
        <div className="flex items-center justify-between mb-6 px-5 py-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-full">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-emerald-800 text-sm">Appointment booked &amp; synced to Google Calendar!</p>
              <p className="text-xs text-emerald-600 mt-0.5">A calendar invite has been created.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={calendarNotice}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700"
            >
              <ExternalLink className="w-3 h-3" />
              Open in Google Calendar
            </a>
            <button onClick={() => setCalendarNotice('')} className="text-emerald-400 hover:text-emerald-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All statuses'}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {dateFilter && (
          <button onClick={() => setDateFilter('')} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
            Clear date
          </button>
        )}
      </div>

      {/* Booking Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-800">Book Appointment</h2>
                  <p className="text-[10px] text-gray-400 mt-0.5">Will be synced to Google Calendar</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-xl border border-red-100">
                  {formError}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1">
                    Lead Phone *
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={form.lead_phone}
                    onChange={(e) => setForm({ ...form, lead_phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1">
                    Lead Name
                  </label>
                  <input
                    type="text"
                    placeholder="Rahul Sharma"
                    value={form.lead_name}
                    onChange={(e) => setForm({ ...form, lead_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1">
                  Lead Email (for calendar invite)
                </label>
                <input
                  type="email"
                  placeholder="rahul@email.com"
                  value={form.lead_email}
                  onChange={(e) => setForm({ ...form, lead_email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1">
                  Property / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2BHK at Bandra West from ₹80L"
                  value={form.property_desc}
                  onChange={(e) => setForm({ ...form, property_desc: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1">
                  Date &amp; Time *
                </label>
                <input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1">
                  Notes
                </label>
                <textarea
                  placeholder="Any special instructions..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleBook}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                <Calendar className="w-4 h-4" />
                {saving ? 'Booking...' : 'Book & Sync to Calendar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-3">
            <div className="p-4 bg-gray-50 rounded-full">
              <CalendarCheck className="w-10 h-10 opacity-30" />
            </div>
            <p className="font-medium text-sm">No appointments found</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-xs text-blue-600 font-bold hover:underline mt-1"
            >
              + Book the first one
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 bg-gray-50 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Property</th>
                <th className="px-4 py-3">Date &amp; Time</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Calendar</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {appointments.map((a) => (
                <tr key={a.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-gray-800">
                    {a.lead_name || a.lead_display_name || '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.lead_phone}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{a.lead_email || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate text-xs">{a.property_desc || '—'}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs font-medium">
                    {a.scheduled_at
                      ? (() => {
                          try { return format(new Date(a.scheduled_at), 'PPp'); }
                          catch { return a.scheduled_at; }
                        })()
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge status={a.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {a.calendar_event_link ? (
                      <a
                        href={a.calendar_event_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View in Google Calendar"
                        className="inline-flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Calendar className="w-4 h-4" />
                      </a>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {a.status === 'confirmed' && (
                        <button
                          onClick={() => handleStatus(a.id, 'completed')}
                          className="px-2.5 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-colors uppercase tracking-wide"
                        >
                          Complete
                        </button>
                      )}
                      {a.status !== 'cancelled' && (
                        <button
                          onClick={() => handleStatus(a.id, 'cancelled')}
                          className="px-2.5 py-1 text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100 rounded-lg hover:bg-rose-100 transition-colors uppercase tracking-wide"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1.5 bg-gray-50 text-gray-400 border border-gray-100 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-colors"
                        title="Delete (also removes from Google Calendar)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
