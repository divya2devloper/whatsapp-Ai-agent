import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import { getLeads } from '../api/client';
import Badge from '../components/Badge';
import { formatDistanceToNow } from 'date-fns';

const STATUS_OPTIONS = ['', 'new', 'active', 'qualified', 'converted', 'closed'];

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    getLeads({ search: search || undefined, status: status || undefined })
      .then((r) => {
        setLeads(r.data.leads);
        setTotal(r.data.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [search, status]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Leads</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total leads</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by phone, name, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All statuses'}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Users className="w-10 h-10 mb-3" />
            <p>No leads found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Messages</th>
                <th className="px-4 py-3 font-medium">Appointments</th>
                <th className="px-4 py-3 font-medium">Last Active</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.map((l) => (
                <tr key={l.phone} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{l.phone}</td>
                  <td className="px-4 py-3">{l.name || <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-3 text-gray-500">{l.email || <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-3"><Badge status={l.status} /></td>
                  <td className="px-4 py-3 text-gray-600">{l.message_count}</td>
                  <td className="px-4 py-3 text-gray-600">{l.appointment_count}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {l.last_message_at
                      ? (() => {
                          try {
                            return formatDistanceToNow(new Date(l.last_message_at), { addSuffix: true });
                          } catch { return l.last_message_at; }
                        })()
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/leads/${encodeURIComponent(l.phone)}`}
                      className="text-blue-600 hover:underline text-xs font-medium"
                    >
                      View
                    </Link>
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
