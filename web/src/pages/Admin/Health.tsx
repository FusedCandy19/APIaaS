import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { 
  Activity, 
  Database, 
  Server, 
  Cpu, 
  Users, 
  Key, 
  RefreshCw 
} from 'lucide-react';

interface HealthData {
  status: string;
  dbStatus: string;
  totalUsers: number;
  activeKeys: number;
  totalRequests: number;
  uptime: number;
  memoryUsage: {
    heapUsedMB: number;
    heapTotalMB: number;
  };
}

export default function AdminHealth() {
  const { data, isLoading, refetch, isFetching } = useQuery<HealthData>({
    queryKey: ['adminHealthMetrics'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/health');
      return res.data;
    },
    refetchInterval: 15000, // Auto refresh every 15s
  });

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-zinc-800 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-zinc-900 border border-zinc-800 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: 'Platform Status',
      value: data.status === 'OK' ? 'Healthy' : 'Degraded',
      desc: `Service runs in HTTPS`,
      icon: Activity,
      colorClass: data.status === 'OK' ? 'text-green-400 border-green-500/20 bg-green-500/10' : 'text-red-400 border-red-500/20 bg-red-500/10',
    },
    {
      title: 'PostgreSQL Database',
      value: data.dbStatus === 'healthy' ? 'Connected' : 'Offline',
      desc: 'Active pool handles sessions',
      icon: Database,
      colorClass: data.dbStatus === 'healthy' ? 'text-green-400 border-green-500/20 bg-green-500/10' : 'text-red-400 border-red-500/20 bg-red-500/10',
    },
    {
      title: 'API Server Uptime',
      value: formatUptime(data.uptime),
      desc: 'Process continuity duration',
      icon: Server,
      colorClass: 'text-brand border-brand/20 bg-brand/10',
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight text-white flex items-center gap-3">
            <Activity className="text-amber-500 shrink-0" size={28} />
            System Health
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Real-time diagnostics, memory footprint statistics, and database status indicators.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Diagnostics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="glass-card rounded-2xl p-6 border border-zinc-800/80 flex flex-col justify-between h-36">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">{card.title}</span>
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${card.colorClass}`}>
                  <Icon size={16} />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-display font-extrabold text-white">{card.value}</h3>
                <p className="text-xs text-zinc-550">{card.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Core Diagnostics Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Node Memory */}
        <div className="glass-card rounded-2xl p-6 border border-zinc-800/80 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-850 pb-3">
            <Cpu size={16} className="text-zinc-400" />
            <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider">Server Memory Footprint</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-zinc-400">Heap Memory Used</span>
                <span className="font-mono text-white">
                  {data.memoryUsage.heapUsedMB} MB / {data.memoryUsage.heapTotalMB} MB
                </span>
              </div>
              <div className="w-full bg-zinc-950 rounded-full h-2.5 border border-zinc-850">
                <div 
                  className="bg-brand h-1.5 rounded-full mt-0.5 ml-0.5" 
                  style={{ width: `${Math.min(100, (data.memoryUsage.heapUsedMB / data.memoryUsage.heapTotalMB) * 100)}%` }}
                ></div>
              </div>
            </div>

            <p className="text-[11px] text-zinc-550 leading-relaxed">
              Allocated memory tracks JavaScript objects loaded in heap. Garbage collection runs automatically when thresholds are reached.
            </p>
          </div>
        </div>

        {/* Database statistics */}
        <div className="glass-card rounded-2xl p-6 border border-zinc-800/80 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-850 pb-3">
            <Database size={16} className="text-zinc-400" />
            <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider">Database Registry Stats</h3>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850">
              <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-mono font-bold">Total Accounts</span>
              <span className="text-lg font-display font-extrabold text-white block mt-1">{data.totalUsers}</span>
            </div>

            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850">
              <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-mono font-bold">Active Tokens</span>
              <span className="text-lg font-display font-extrabold text-white block mt-1">{data.activeKeys}</span>
            </div>

            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850">
              <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-mono font-bold">Recorded Logs</span>
              <span className="text-lg font-display font-extrabold text-white block mt-1">{data.totalRequests}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
