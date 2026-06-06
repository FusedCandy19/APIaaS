import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { 
  Users, 
  Key, 
  Cpu, 
  TrendingUp, 
  RefreshCw,
  UserPlus,
  ArrowRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useNavigate } from 'react-router-dom';

interface AdminSummaryData {
  status: string;
  totalUsers: number;
  activeKeys: number;
  totalRequests: number;
  uptime: number;
}

interface UserReportItem {
  id: string;
  email: string;
  role: string;
  plan: string;
  createdAt: string;
  activeKeys: number;
  usage: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
  };
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  // Fetch Health/Summary metrics
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useQuery<AdminSummaryData>({
    queryKey: ['adminHealthSummary'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/health');
      return res.data;
    },
  });

  // Fetch Users (to get recent registration accounts)
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery<UserReportItem[]>({
    queryKey: ['adminUsersListDashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/users');
      return res.data;
    },
  });

  const refetchAll = () => {
    refetchHealth();
    refetchUsers();
  };

  const isGlobalLoading = healthLoading || usersLoading;

  if (isGlobalLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-zinc-800 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-zinc-900 border border-zinc-800 rounded-xl"></div>
          ))}
        </div>
        <div className="h-80 bg-zinc-900 border border-zinc-800 rounded-2xl"></div>
      </div>
    );
  }

  // Calculate platform-wide totals from users list
  const totalSpend = users.reduce((sum, u) => sum + u.usage.totalCost, 0);

  const stats = [
    { title: 'Total Registered Users', value: health?.totalUsers || 0, icon: Users, color: 'text-blue-400 bg-blue-500/10' },
    { title: 'Active Platform Keys', value: health?.activeKeys || 0, icon: Key, color: 'text-violet-400 bg-violet-500/10' },
    { title: 'Total Completed Queries', value: health?.totalRequests || 0, icon: Cpu, color: 'text-emerald-400 bg-emerald-500/10' },
    { title: 'Total Accrued Revenue', value: `$${totalSpend.toFixed(4)}`, icon: TrendingUp, color: 'text-amber-400 bg-amber-500/10' },
  ];

  // Get recent 5 signups
  const recentSignups = users.slice(0, 5);

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight text-white flex items-center gap-3">
            Admin Console Summary
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Global metrics, server diagnostic statistics, and active developer subscriptions.
          </p>
        </div>
        <button
          onClick={refetchAll}
          className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Grid statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="glass-card rounded-2xl p-5 border border-zinc-800/80 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${stat.color} border border-white/5`}>
                <Icon size={20} />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block font-mono">{stat.title}</span>
                <span className="text-2xl font-display font-extrabold text-white block">{stat.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main split dashboard view */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Platform traffic mockup chart */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-zinc-800/80 flex flex-col justify-between h-96">
          <div>
            <h3 className="font-display font-bold text-lg text-white">Cumulative Request Traffic</h3>
            <p className="text-xs text-zinc-500">Platform-wide query totals</p>
          </div>

          <div className="flex-1 w-full min-h-0 mt-6 text-zinc-500 text-xs flex items-center justify-center border border-dashed border-zinc-850 rounded-xl">
            <div className="text-center space-y-1 p-6">
              <Cpu size={24} className="mx-auto text-zinc-655" />
              <p className="font-semibold text-zinc-400 text-xs">Traffic charts are aggregates</p>
              <p className="text-[11px] text-zinc-600 max-w-sm">
                System aggregates are processed directly in database logs. Navigate to system health to inspect real-time server latencies.
              </p>
            </div>
          </div>
        </div>

        {/* Recent accounts registrations */}
        <div className="glass-card rounded-2xl border border-zinc-800/80 p-6 flex flex-col justify-between h-96">
          <div className="space-y-1">
            <h3 className="font-display font-bold text-lg text-white">Recent Accounts</h3>
            <p className="text-xs text-zinc-500">Latest developer console registrations</p>
          </div>

          <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-1">
            {recentSignups.length > 0 ? (
              recentSignups.map((user) => (
                <div 
                  key={user.id} 
                  className="p-3 rounded-xl border border-zinc-850 bg-zinc-950/30 flex items-center justify-between text-xs hover:border-zinc-800 transition-colors"
                >
                  <div className="space-y-1">
                    <span className="font-semibold text-white block truncate max-w-[150px]">{user.email}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-[9px] uppercase tracking-wider text-zinc-400">
                      {user.plan}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-600 text-center py-12">No registered accounts found.</p>
            )}
          </div>

          <button
            onClick={() => navigate('/admin/users')}
            className="flex items-center justify-center gap-1.5 py-2 w-full text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-350 transition-colors border border-zinc-800"
          >
            Manage Users List
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
