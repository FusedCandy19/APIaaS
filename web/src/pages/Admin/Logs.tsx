import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { 
  BookOpen, 
  Search, 
  Filter, 
  RefreshCw,
  Clock,
  Terminal,
  User,
  Coins
} from 'lucide-react';

interface PlatformLogItem {
  id: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  createdAt: string;
  keyName: string;
  keyPrefix: string;
  userEmail: string;
}

export default function AdminLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [modelFilter, setModelFilter] = useState('');

  // Fetch all logs
  const { data: logs = [], isLoading, refetch, isFetching } = useQuery<PlatformLogItem[]>({
    queryKey: ['adminPlatformLogs'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/logs');
      return res.data;
    },
  });

  // Extract unique models from logs for dropdown filter
  const uniqueModels = Array.from(new Set(logs.map((log) => log.model)));

  // Filter logs locally
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.keyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.keyPrefix.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesModel = modelFilter ? log.model === modelFilter : true;
    
    return matchesSearch && matchesModel;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight text-white flex items-center gap-3">
            <BookOpen className="text-amber-500 shrink-0" size={28} />
            Platform Transaction Logs
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Audit real-time API transactions completed by all client keys across your host network.
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

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex flex-wrap gap-4 items-center justify-between">
        {/* Search */}
        <div className="bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-850 flex items-center gap-2 max-w-sm w-full">
          <Search size={14} className="text-zinc-650" />
          <input
            type="text"
            placeholder="Search email, key name, prefix..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs text-zinc-300 focus:outline-none w-full placeholder-zinc-700"
          />
        </div>

        {/* Filters */}
        <div className="bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-850 flex items-center gap-2">
          <Filter size={14} className="text-zinc-500" />
          <select
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            className="bg-transparent text-xs text-zinc-300 focus:outline-none cursor-pointer font-semibold"
          >
            <option value="">All Models</option>
            {uniqueModels.map((m) => (
              <option key={m} value={m}>
                {m.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card rounded-2xl border border-zinc-800/80 overflow-hidden">
        {isLoading ? (
          <div className="p-12 space-y-4 animate-pulse">
            <div className="h-6 w-full bg-zinc-850 rounded"></div>
            <div className="h-6 w-full bg-zinc-850 rounded"></div>
            <div className="h-6 w-full bg-zinc-850 rounded"></div>
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/30 text-zinc-400 font-semibold">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Developer Account</th>
                  <th className="p-4">API Key used</th>
                  <th className="p-4">Model ID</th>
                  <th className="p-4 text-right">Tokens (In / Out)</th>
                  <th className="p-4 text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="p-4 text-zinc-450 font-mono flex items-center gap-2 mt-1">
                      <Clock size={12} className="text-zinc-600 shrink-0" />
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <User size={12} className="text-zinc-500 shrink-0" />
                        <span className="truncate max-w-[150px]" title={log.userEmail}>{log.userEmail}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-zinc-300 block font-semibold">{log.keyName}</span>
                      <span className="text-[10px] text-zinc-550 font-mono">{log.keyPrefix}</span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-brand/10 border border-brand/20 text-brand uppercase">
                        {log.model}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono text-zinc-400">
                      <span className="text-zinc-300 font-bold">{log.totalTokens.toLocaleString()}</span>
                      <span className="text-zinc-550 block text-[9px]">
                        ({log.inputTokens} / {log.outputTokens})
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-white">
                      ${log.costUsd.toFixed(5)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center text-zinc-500 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
              <Terminal size={24} />
            </div>
            <div>
              <p className="font-semibold text-zinc-300 text-sm">No transaction logs recorded</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Once clients begin querying models through the gateway endpoint, audit logs will register here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
