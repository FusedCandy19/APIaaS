import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/auth.store';
import { useBrandingStore } from '../store/branding.store';
import { 
  Key, 
  Cpu, 
  Coins, 
  TrendingUp, 
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Plus
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';

interface DashboardData {
  cards: {
    activeKeys: number;
    requests30d: number;
    tokens30d: number;
    spend30d: number;
  };
  sparkline: Array<{ date: string; requests: number; cost: number }>;
  modelBreakdown: Array<{ model: string; value: number; cost: number }>;
  recentKeys: Array<{
    id: string;
    name: string;
    keyPrefix: string;
    status: string;
    createdAt: string;
    lastUsedAt: string | null;
    recentRequestsCount: number;
  }>;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const { settings } = useBrandingStore();
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch, isFetching } = useQuery<DashboardData>({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      const res = await apiClient.get('/v1/dashboard/summary');
      return res.data;
    },
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Predefined color palette for models breakdown
  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Welcome Skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-64 bg-zinc-800 rounded-lg"></div>
          <div className="h-4 w-96 bg-zinc-800 rounded-lg"></div>
        </div>

        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-zinc-900 border border-zinc-800 rounded-2xl"></div>
          ))}
        </div>

        {/* Chart Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-zinc-900 border border-zinc-800 rounded-2xl"></div>
          <div className="h-80 bg-zinc-900 border border-zinc-800 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-8 rounded-2xl border border-red-500/20 bg-red-500/10 text-center space-y-4 max-w-lg mx-auto">
        <h3 className="text-lg font-semibold text-red-400">Failed to load console statistics</h3>
        <p className="text-sm text-zinc-400">There was an issue fetching dashboard data. Please try again.</p>
        <button 
          onClick={() => refetch()}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-all"
        >
          Retry Load
        </button>
      </div>
    );
  }

  const cardsData = [
    {
      title: 'Active API Keys',
      value: data.cards.activeKeys,
      desc: 'Keys ready for requests',
      icon: Key,
      colorClass: 'text-brand bg-brand/10 border-brand/20',
      action: () => navigate('/keys')
    },
    {
      title: 'Total Requests (30d)',
      value: data.cards.requests30d.toLocaleString(),
      desc: 'API queries completed',
      icon: Cpu,
      colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      action: () => navigate('/usage')
    },
    {
      title: 'Token Volume (30d)',
      value: data.cards.tokens30d.toLocaleString(),
      desc: 'Input/Output total volume',
      icon: Coins,
      colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      action: () => navigate('/usage')
    },
    {
      title: 'Accrued Costs (30d)',
      value: `$${data.cards.spend30d.toFixed(4)}`,
      desc: 'Estimated pending balance',
      icon: TrendingUp,
      colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      action: () => navigate('/billing')
    }
  ];

  return (
    <div className="space-y-8 font-sans">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight text-white">
            {getGreeting()}, developer
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage your API keys, inspect token usage, and monitor active spend pools.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all disabled:opacity-50"
            title="Refresh analytics"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => navigate('/keys')}
            className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover text-brand-foreground rounded-lg text-sm font-semibold transition-all shadow-[0_4px_15px_rgba(139,92,246,0.15)]"
          >
            <Plus size={16} />
            Generate Token
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {cardsData.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div 
              key={idx}
              onClick={card.action}
              className="glass-card rounded-2xl p-6 border border-zinc-800/80 cursor-pointer group hover:scale-[1.01] transition-all flex flex-col justify-between h-36"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{card.title}</span>
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${card.colorClass}`}>
                  <Icon size={16} />
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <h3 className="text-3xl font-display font-extrabold tracking-tight text-white group-hover:text-brand transition-colors">
                  {card.value}
                </h3>
                <p className="text-xs text-zinc-500 flex items-center gap-1">
                  {card.desc}
                  <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-zinc-400" />
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main 7-day Area Chart */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-zinc-800/80 flex flex-col justify-between h-96">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-lg text-white">Request Velocity</h3>
              <p className="text-xs text-zinc-500">API queries executed in the last 7 days</p>
            </div>
            <span className="text-[10px] font-semibold text-zinc-400 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 font-mono uppercase">
              REAL-TIME
            </span>
          </div>

          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.sparkline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--brand-color)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--brand-color)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  stroke="#52525b" 
                  fontSize={10}
                  tickFormatter={(val) => {
                    if (!val) return '';
                    const parts = val.split('-');
                    if (parts.length !== 3) return val;
                    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
                  }}
                />
                <YAxis stroke="#52525b" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }}
                  labelFormatter={(val) => `Date: ${val}`}
                  formatter={(val: any) => [`${val} requests`, 'Volume']}
                />
                <Area 
                  type="monotone" 
                  dataKey="requests" 
                  stroke="var(--brand-color)" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRequests)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Model Breakdown Donut Chart */}
        <div className="glass-card rounded-2xl p-6 border border-zinc-800/80 flex flex-col h-96 justify-between">
          <div>
            <h3 className="font-display font-bold text-lg text-white">Model Share</h3>
            <p className="text-xs text-zinc-500">Token allocation by model (30d)</p>
          </div>

          <div className="flex-1 w-full min-h-0 relative flex items-center justify-center my-4">
            {data.modelBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.modelBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="model"
                  >
                    {data.modelBreakdown.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '11px' }}
                    formatter={(val: any) => [`${val.toLocaleString()} tokens`, 'Usage']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-zinc-500 text-center">No token logs recorded</div>
            )}
            
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-extrabold text-white font-display">
                {data.modelBreakdown.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Total Tokens</span>
            </div>
          </div>

          {/* Custom Legends */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {data.modelBreakdown.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 min-w-0">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                <span className="text-zinc-300 font-semibold truncate uppercase">{item.model}</span>
                <span className="text-zinc-500 ml-auto font-mono text-[10px]">
                  {Math.round((item.value / (data.modelBreakdown.reduce((sum, i) => sum + i.value, 0) || 1)) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent API Keys Section */}
      <div className="glass-card rounded-2xl border border-zinc-800/80 overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-lg text-white">Recent Credentials</h3>
            <p className="text-xs text-zinc-500">Your latest authentication access keys</p>
          </div>
          <button 
            onClick={() => navigate('/keys')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-xs font-semibold text-zinc-300 transition-colors"
          >
            Manage Keys
            <ChevronRight size={14} />
          </button>
        </div>

        {data.recentKeys.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/30 text-zinc-400 font-semibold">
                  <th className="p-4">Key Name</th>
                  <th className="p-4">Prefix</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4">Last Activated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {data.recentKeys.map((key) => (
                  <tr key={key.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="p-4 font-semibold text-white">{key.name}</td>
                    <td className="p-4 font-mono text-zinc-400">{key.keyPrefix}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        key.status === 'active' 
                          ? 'border-green-500/20 bg-green-500/10 text-green-400' 
                          : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                      }`}>
                        {key.status}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-500">{new Date(key.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-zinc-400 font-mono">
                      {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center gap-3">
            <Key size={32} className="text-zinc-700" />
            <div>
              <p className="font-semibold text-zinc-400 text-sm">No keys found</p>
              <p className="text-xs text-zinc-600 mt-0.5">Generate a key above to start authentication queries.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
