export default function StatsCard({ title, value, icon: Icon, color = 'blue', sub }) {
  const colors = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', icon: 'bg-blue-600 text-white' },
    green: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', icon: 'bg-emerald-600 text-white' },
    yellow: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', icon: 'bg-amber-600 text-white' },
    purple: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-100', icon: 'bg-violet-600 text-white' },
    red: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100', icon: 'bg-rose-600 text-white' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100', icon: 'bg-indigo-600 text-white' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-100', icon: 'bg-cyan-600 text-white' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-100', icon: 'bg-teal-600 text-white' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100', icon: 'bg-orange-600 text-white' },
    pink: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-100', icon: 'bg-pink-600 text-white' },
  };

  const c = colors[color] || colors.blue;

  return (
    <div className={`rounded-2xl border-2 p-6 transition-all hover:scale-[1.02] hover:shadow-lg ${c.bg} ${c.border}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-bold uppercase tracking-wider ${c.text} opacity-80 mb-1`}>{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-gray-900 leading-none">
              {value ?? '—'}
            </h3>
          </div>
          {sub && <p className="text-[10px] text-gray-500 font-medium mt-2 leading-none">{sub}</p>}
        </div>
        <div className={`rounded-xl p-3 shadow-sm ${c.icon}`}>
          <Icon className="w-5 h-5 stroke-[2.5]" />
        </div>
      </div>
    </div>
  );
}
