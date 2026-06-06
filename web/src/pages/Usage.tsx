import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { 
  BarChart3, 
  Calendar, 
  Coins, 
  Cpu, 
  DollarSign, 
  Filter, 
  RefreshCw 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';

interface UsageSummary {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
}

interface DailyUsage {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
}

interface ModelUsage {
  model: string;
  requests: number;
  tokens: number;
  cost: number;
}

interface KeyUsage {
  keyId: string;
  keyName: string;
  keyPrefix: string;
  requests: number;
  tokens: number;
  cost: number;
}

interface UsageResponse {
  summary: UsageSummary;
  daily: DailyUsage[];
  models: ModelUsage[];
  keys: KeyUsage[];
}

export default function Usage() {
  // Define default dates (last 7 days)
  const getPastDateStr = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };

  const [startDate, setStartDate] = useState(getPastDateStr(6));
  const [endDate, setEndDate] = useState(getPastDateStr(0));
  const [selectedKey, setSelectedKey] = useState('');

  // Fetch API keys (to populate dropdown filter)
  const { data: keysList = [] } = useQuery<any[]>({
    queryKey: ['apiKeysUsageDropdown'],
    queryFn: async () => {
      const res = await apiClient.get('/v1/keys');
      return res.data;
    },
  });

  // Fetch Usage statistics
  const { data, isLoading, refetch, isFetching } = useQuery<UsageResponse>({
    queryKey: ['detailedUsage', startDate, endDate, selectedKey],
    queryFn: async () => {
      const params = {
        startDate,
        endDate,
        ...(selectedKey ? { apiKeyId: selectedKey } : {}),
      };
      const res = await apiClient.get('/v1/usage', { params });
      return res.data;
    },
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight text-white flex items-center gap-3">
            <BarChart3 className="text-brand shrink-0" size={28} />
            Usage Analytics
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Track transaction volume, model allocations, and estimated API expenses.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 self-start bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Dynamic Filter Bar */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold mr-2">
          <Filter size={14} />
          FILTERS
        </div>

        {/* Date Selectors */}
        <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-850">
          <Calendar size={14} className="text-zinc-500" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-transparent text-xs text-zinc-300 focus:outline-none cursor-pointer"
          />
          <span className="text-zinc-600 text-xs">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-transparent text-xs text-zinc-300 focus:outline-none cursor-pointer"
          />
        </div>

        {/* API Key Selector */}
        <div className="bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-850 flex items-center gap-2">
          <span className="text-xs text-zinc-500">API Key:</span>
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="bg-transparent text-xs text-zinc-300 focus:outline-none cursor-pointer font-semibold"
          >
            <option value="">All Keys</option>
            {keysList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name} ({k.keyPrefix})
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-zinc-900 border border-zinc-800 rounded-xl"></div>
          ))}
          <div className="md:col-span-3 h-80 bg-zinc-900 border border-zinc-800 rounded-2xl"></div>
        </div>
      ) : data ? (
        <>
          {/* Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card rounded-2xl p-5 border border-zinc-800/80 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center">
                <Cpu size={20} />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest block font-mono">Requests</span>
                <span className="text-2xl font-display font-extrabold text-white">{data.summary.totalRequests.toLocaleString()}</span>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-zinc-800/80 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Coins size={20} />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest block font-mono">Token Volume</span>
                <span className="text-2xl font-display font-extrabold text-white">{data.summary.totalTokens.toLocaleString()}</span>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-zinc-800/80 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <DollarSign size={20} />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest block font-mono">Calculated Costs</span>
                <span className="text-2xl font-display font-extrabold text-white">${data.summary.totalCost.toFixed(5)}</span>
              </div>
            </div>
          </div>

          {/* Detailed Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tokens Stacked Bar Chart */}
            <div className="glass-card rounded-2xl p-6 border border-zinc-800/80 h-96 flex flex-col justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-white">Daily Token Usage</h3>
                <p className="text-xs text-zinc-500">Volume distribution over time</p>
              </div>

              <div className="flex-1 w-full min-h-0 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis 
                      dataKey="date" 
                      stroke="#52525b" 
                      fontSize={10} 
                      tickFormatter={(val) => {
                        const d = new Date(val);
                        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis stroke="#52525b" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }} />
                    <Bar dataKey="tokens" name="Tokens Used" fill="var(--brand-color)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Costs Area Chart */}
            <div className="glass-card rounded-2xl p-6 border border-zinc-800/80 h-96 flex flex-col justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-white">Cost Accumulation</h3>
                <p className="text-xs text-zinc-500">Accrued billable spend over selected dates</p>
              </div>

              <div className="flex-1 w-full min-h-0 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      stroke="#52525b" 
                      fontSize={10}
                      tickFormatter={(val) => {
                        const d = new Date(val);
                        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis stroke="#52525b" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '11px' }}
                      formatter={(val: any) => [`$${Number(val).toFixed(5)}`, 'Cost']}
                    />
                    <Area type="monotone" dataKey="cost" name="Spend (USD)" stroke="#f59e0b" fillOpacity={1} fill="url(#colorCost)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Model Allocation Summary */}
          <div className="glass-card rounded-2xl border border-zinc-800/80 overflow-hidden">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="font-display font-bold text-lg text-white">Consumption Breakdown</h3>
              <p className="text-xs text-zinc-500">Utilization metrics sorted by Model and API Key</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800">
              {/* Models List */}
              <div className="p-6 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">By AI Model</h4>
                {data.models.length > 0 ? (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-zinc-500 border-b border-zinc-800 pb-2">
                        <th className="pb-2">Model</th>
                        <th className="pb-2 text-right">Requests</th>
                        <th className="pb-2 text-right">Tokens</th>
                        <th className="pb-2 text-right">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850/60">
                      {data.models.map((m) => (
                        <tr key={m.model} className="text-zinc-300">
                          <td className="py-2.5 font-semibold text-white uppercase">{m.model}</td>
                          <td className="py-2.5 text-right font-mono text-zinc-400">{m.requests}</td>
                          <td className="py-2.5 text-right font-mono text-zinc-400">{m.tokens.toLocaleString()}</td>
                          <td className="py-2.5 text-right font-mono text-zinc-200">${m.cost.toFixed(5)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-xs text-zinc-600">No logs for this date range.</p>
                )}
              </div>

              {/* Keys List */}
              <div className="p-6 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">By API Credential</h4>
                {data.keys.length > 0 ? (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-zinc-500 border-b border-zinc-800 pb-2">
                        <th className="pb-2">Key Label</th>
                        <th className="pb-2 text-right">Requests</th>
                        <th className="pb-2 text-right">Tokens</th>
                        <th className="pb-2 text-right">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850/60">
                      {data.keys.map((k) => (
                        <tr key={k.keyId} className="text-zinc-300">
                          <td className="py-2.5">
                            <span className="font-semibold text-white block">{k.keyName}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">{k.keyPrefix}</span>
                          </td>
                          <td className="py-2.5 text-right font-mono text-zinc-400">{k.requests}</td>
                          <td className="py-2.5 text-right font-mono text-zinc-400">{k.tokens.toLocaleString()}</td>
                          <td className="py-2.5 text-right font-mono text-zinc-200">${k.cost.toFixed(5)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-xs text-zinc-600">No active logs for this key selection.</p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
