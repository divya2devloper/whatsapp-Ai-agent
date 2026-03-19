import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, MessageCircle, CalendarCheck, Building2, TrendingUp, Clock,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { getStats } from '../api/client';
import StatsCard from '../components/StatsCard';
import Badge from '../components/Badge';
import { format, parseISO, subDays } from 'date-fns';

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#1e40af', '#1d4ed8', '#1e3a8a', '#3b82f6', '#2563eb'];

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
    <div className="p-8 bg-gray-50 min-h-full">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-gray-500 mt-1 text-lg">Real-time overview of your WhatsApp AI Real Estate Agent</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
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
          title="Today"
          value={stats?.todayAppointments}
          icon={Clock}
          color="orange"
        />
        <StatsCard
          title="Listed Properties"
          value={stats?.totalProperties}
          icon={Building2}
          color="cyan"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Weekly Activity Chart (Bar Graph) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-8 transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-800">
              Message Activity
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Messages</span>
              </div>
            </div>
          </div>
          {stats?.weeklyActivity?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.weeklyActivity}>
                <defs>
                  <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickFormatter={(d) => {
                    try { return format(parseISO(d), 'EEE'); } catch { return d; }
                  }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  labelFormatter={(d) => {
                    try { return format(parseISO(d), 'pppp'); } catch { return d; }
                  }}
                />
                <Bar dataKey="messages" fill="url(#colorMessages)" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[260px] text-gray-400 space-y-2">
              <MessageCircle className="w-8 h-8 opacity-20" />
              <p className="text-sm">No activity recorded yet</p>
            </div>
          )}
        </div>

        {/* Lead Status Distribution (Pie Graph) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 transition-all hover:shadow-md">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Lead Distribution</h2>
          {stats?.statusBreakdown?.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="status"
                  >
                    {stats.statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[260px] text-gray-400 space-y-2">
              <Users className="w-8 h-8 opacity-20" />
              <p className="text-sm">No leads to display</p>
            </div>
          )}
        </div>

        {/* Properties by Type Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 transition-all hover:shadow-md">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Properties by Type</h2>
          {stats?.propertyBreakdown?.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.propertyBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={80}
                    dataKey="count"
                    nameKey="type"
                  >
                    {stats.propertyBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[260px] text-gray-400 space-y-2">
              <Building2 className="w-8 h-8 opacity-20" />
              <p className="text-sm">No property data available</p>
            </div>
          )}
        </div>

        {/* Recent Leads */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 underline decoration-blue-500 decoration-4 underline-offset-8">
              Recent Leads
            </h2>
            <Link to="/leads" className="text-sm font-bold text-blue-600 hover:text-blue-800 px-3 py-1 bg-blue-50 rounded-full transition-colors">
              View all leads
            </Link>
          </div>
          <div className="overflow-x-auto">
            {stats?.recentLeads?.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 font-semibold uppercase tracking-wider text-[10px] bg-gray-50/50">
                    <th className="px-8 py-4">Lead Phone</th>
                    <th className="px-8 py-4">Name</th>
                    <th className="px-8 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.recentLeads.map((l) => (
                    <tr key={l.phone} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-8 py-4">
                        <Link
                          to={`/leads/${encodeURIComponent(l.phone)}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {l.phone}
                        </Link>
                      </td>
                      <td className="px-8 py-4 text-gray-700 font-medium">{l.name || '—'}</td>
                      <td className="px-8 py-4">
                        <Badge status={l.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-20 text-center text-gray-400 flex flex-col items-center gap-3">
                <div className="p-4 bg-gray-50 rounded-full">
                  <Users className="w-8 h-8 opacity-20" />
                </div>
                <p className="text-xs font-medium">No recent leads yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-gray-800 underline decoration-blue-500 decoration-4 underline-offset-8">
              Upcoming
            </h2>
            <Link to="/appointments" className="text-sm font-bold text-blue-600 hover:text-blue-800 px-3 py-1 bg-blue-50 rounded-full transition-colors">
              View all
            </Link>
          </div>
          {stats?.upcomingAppointments?.length > 0 ? (
            <div className="space-y-4">
              {stats.upcomingAppointments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors group border border-transparent hover:border-blue-100"
                >
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <CalendarCheck className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-800 truncate">
                      {a.lead_display_name || a.lead_phone}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{a.property_desc}</p>
                    <p className="text-[10px] font-black text-blue-600 mt-1 uppercase tracking-wider">
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
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-3">
              <div className="p-4 bg-gray-50 rounded-full">
                <Clock className="w-8 h-8 opacity-20" />
              </div>
              <p className="text-xs font-medium text-center">No upcoming appointments scheduled</p>
            </div>
          )}
        </div>
      </div>

      {/* Leads Trend Area Chart */}
      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-8 transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-bold text-gray-800 underline decoration-blue-500 decoration-4 underline-offset-8">
            Leads Trend
          </h2>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-blue-700 font-black uppercase tracking-widest">New Leads</span>
          </div>
        </div>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats?.weeklyActivity || []}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickFormatter={(d) => {
                  try { return format(parseISO(d), 'MMM d'); } catch { return d; }
                }}
              />
              <YAxis hide={true} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                labelFormatter={(d) => {
                  try { return format(parseISO(d), 'PPPP'); } catch { return d; }
                }}
              />
              <Area 
                type="monotone" 
                dataKey="messages" 
                stroke="#2563eb" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorLeads)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
