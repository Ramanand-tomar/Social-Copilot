"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface ActivityData {
  name: string;
  posts: number;
}

interface PlatformData {
  name: string;
  value: number;
  color: string;
}

interface DashboardChartsProps {
  activityData: ActivityData[];
  platformData: PlatformData[];
  hasConnectedAccounts?: boolean;
}

export function DashboardCharts({
  activityData,
  platformData,
  hasConnectedAccounts = true,
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Activity Chart */}
      <div className="lg:col-span-2 bg-[#0a0a1a] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors" />
        
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Post Activity</h3>
            <p className="text-xs text-zinc-500 mt-1">Total distribution over the last 7 days</p>
          </div>
          <div className="bg-white/5 border border-white/10 text-zinc-400 text-xs font-bold rounded-xl px-4 py-2">
            Last 7 Days
          </div>
        </div>
        
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activityData}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#71717a', fontSize: 10, fontWeight: 600 }}
                dy={15}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#71717a', fontSize: 10, fontWeight: 600 }}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 12 }}
                contentStyle={{ 
                    backgroundColor: '#09090b', 
                    borderRadius: '20px', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                    padding: '12px'
                }}
                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                labelStyle={{ color: '#71717a', marginBottom: '4px', fontSize: '10px', textTransform: 'uppercase' }}
              />
              <Bar dataKey="posts" fill="url(#barGradient)" radius={[10, 10, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Platform Breakdown */}
      <div className="bg-[#0a0a1a] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full -ml-16 -mb-16 group-hover:bg-cyan-500/10 transition-colors" />
        
        <h3 className="text-xl font-bold text-white tracking-tight mb-8 relative z-10">Platform Split</h3>

        {!hasConnectedAccounts ? (
          <div className="h-[240px] flex flex-col items-center justify-center text-center px-4">
            <p className="text-sm font-bold text-zinc-400 mb-2">No accounts connected</p>
            <p className="text-xs text-zinc-600">
              Connect a social account to see your platform distribution.
            </p>
          </div>
        ) : (
          <>
            <div className="h-[240px] w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={10}
                    dataKey="value"
                    stroke="none"
                  >
                    {platformData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        className="hover:scale-105 transition-transform duration-300 outline-none"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#09090b',
                      borderRadius: '16px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-white">{platformData.length}</span>
                <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest block absolute mt-[24px]">Plats</span>
              </div>
            </div>

            <div className="mt-8 space-y-4 relative z-10">
              {platformData.map((item) => (
                <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.03]">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.1)]" style={{ backgroundColor: item.color }} />
                    <span className="text-xs font-bold text-zinc-400 capitalize">{item.name}</span>
                  </div>
                  <span className="text-xs font-black text-white">{item.value}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
