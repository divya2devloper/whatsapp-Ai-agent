import { useEffect, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { getAppointments, updateAppointment, deleteAppointment } from '../api/client';
import Badge from '../components/Badge';
import { format } from 'date-fns';

const STATUS_OPTIONS = ['', 'confirmed', 'completed', 'cancelled'];

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

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
    if (!confirm('Delete this appointment?')) return;
    await deleteAppointment(id);
    load();
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Appointments</h1>
        <p className="text-gray-500 text-sm mt-1">Property visit appointments booked via AI agent</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All statuses'}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {dateFilter && (
          <button
            onClick={() => setDateFilter('')}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Clear date
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <CalendarCheck className="w-10 h-10 mb-3" />
            <p>No appointments found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Property</th>
                <th className="px-4 py-3 font-medium">Date & Time</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {appointments.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {a.lead_name || a.lead_display_name || '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.lead_phone}</td>
                  <td className="px-4 py-3 text-gray-500">{a.lead_email || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{a.property_desc || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
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
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {a.status === 'confirmed' && (
                        <button
                          onClick={() => handleStatus(a.id, 'completed')}
                          className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100"
                        >
                          Complete
                        </button>
                      )}
                      {a.status !== 'cancelled' && (
                        <button
                          onClick={() => handleStatus(a.id, 'cancelled')}
                          className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="px-2 py-1 text-xs bg-gray-50 text-gray-500 rounded hover:bg-gray-100"
                      >
                        Delete
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
