import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, MessageCircle, CalendarCheck, Building2, TrendingUp, Clock,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { getStats } from '../api/client';
import StatsCard from '../components/StatsCard';
import Badge from '../components/Badge';
import { format, parseISO } from 'date-fns';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats()
      .then((r) => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1">WhatsApp AI Real Estate Agent overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <StatsCard
          title="Total Leads"
          value={stats?.totalLeads}
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Active Leads"
          value={stats?.activeLeads}
          icon={TrendingUp}
          color="green"
        />
        <StatsCard
          title="Conversations"
          value={stats?.totalConversations}
          icon={MessageCircle}
          color="purple"
        />
        <StatsCard
          title="Today's Appointments"
          value={stats?.todayAppointments}
          icon={Clock}
          color="yellow"
        />
        <StatsCard
          title="Properties Listed"
          value={stats?.totalProperties}
          icon={Building2}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Activity Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">
            Messages (Last 7 Days)
          </h2>
          {stats?.weeklyActivity?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.weeklyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="day"
                  tickFormatter={(d) => {
                    try { return format(parseISO(d), 'MMM d'); } catch { return d; }
                  }}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(d) => {
                    try { return format(parseISO(d), 'PPP'); } catch { return d; }
                  }}
                />
                <Bar dataKey="messages" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">
              No message data yet
            </div>
          )}
        </div>

        {/* Lead Status Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Lead Status</h2>
          {stats?.statusBreakdown?.length > 0 ? (
            <div className="space-y-3">
              {stats.statusBreakdown.map((s) => (
                <div key={s.status} className="flex items-center justify-between">
                  <Badge status={s.status} />
                  <span className="font-semibold text-gray-700">{s.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No leads yet</p>
          )}
        </div>

        {/* Recent Leads */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-700">Recent Leads</h2>
            <Link to="/leads" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          {stats?.recentLeads?.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Phone</th>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.recentLeads.map((l) => (
                  <tr key={l.phone} className="hover:bg-gray-50">
                    <td className="py-2">
                      <Link
                        to={`/leads/${encodeURIComponent(l.phone)}`}
                        className="text-blue-600 hover:underline"
                      >
                        {l.phone}
                      </Link>
                    </td>
                    <td className="py-2 text-gray-600">{l.name || '—'}</td>
                    <td className="py-2">
                      <Badge status={l.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-400 text-sm">No leads yet</p>
          )}
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-700">
              Upcoming Appointments
            </h2>
            <Link to="/appointments" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          {stats?.upcomingAppointments?.length > 0 ? (
            <div className="space-y-3">
              {stats.upcomingAppointments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg"
                >
                  <CalendarCheck className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {a.lead_name || a.lead_phone}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{a.property_desc}</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      {a.scheduled_at
                        ? (() => {
                            try {
                              return format(new Date(a.scheduled_at), 'PPp');
                            } catch {
                              return a.scheduled_at;
                            }
                          })()
                        : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No upcoming appointments</p>
          )}
        </div>
      </div>
    </div>
  );
}
