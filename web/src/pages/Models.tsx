import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { 
  Cpu, 
  Search, 
  Coins, 
  ArrowRight,
  TrendingDown,
  Info
} from 'lucide-react';

interface ModelInfo {
  id: string;
  owned_by: string;
  pricing: {
    inputPricePerMillion: number;
    outputPricePerMillion: number;
  };
}

export default function Models() {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch active models catalog from public API endpoint through same-origin proxy
  const { data: modelsData, isLoading, isError, refetch } = useQuery<{ data: ModelInfo[] }>({
    queryKey: ['consoleModelsList'],
    queryFn: async () => {
      const res = await apiClient.get('/v1/models');
      return res.data;
    },
  });

  const models = modelsData?.data || [];

  // Filter models based on search term
  const filteredModels = models.filter((m) =>
    m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.owned_by.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper to get developer-friendly provider name
  const getProviderName = (ownedBy: string) => {
    const nameMap: Record<string, string> = {
      'openai': 'OpenAI',
      'anthropic': 'Anthropic',
      'meta': 'Meta (Llama)',
      'google': 'Google (Gemma)',
      'deepseek': 'DeepSeek',
      'mistral': 'Mistral AI',
      'alibaba': 'Alibaba (Qwen)',
      'microsoft': 'Microsoft (Phi)',
    };
    return nameMap[ownedBy.toLowerCase()] || ownedBy;
  };

  // Find the cheapest active model
  const cheapestModel = models.length > 0 
    ? [...models].sort((a, b) => a.pricing.inputPricePerMillion - b.pricing.inputPricePerMillion)[0]
    : null;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-zinc-800 rounded-lg"></div>
          <div className="h-4 w-96 bg-zinc-800 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-zinc-900 border border-zinc-800 rounded-2xl"></div>
          ))}
        </div>
        <div className="h-80 bg-zinc-900 border border-zinc-800 rounded-2xl"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 rounded-2xl border border-red-500/20 bg-red-500/10 text-center space-y-4 max-w-lg mx-auto">
        <h3 className="text-lg font-semibold text-red-400">Failed to load model catalog</h3>
        <p className="text-sm text-zinc-400">Could not retrieve models and pricing from the gateway. Please try again.</p>
        <button 
          onClick={() => refetch()}
          className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 rounded-lg text-sm transition-all text-white border border-zinc-800"
        >
          Retry Load
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div>
        <h1 className="font-display font-extrabold text-3xl tracking-tight text-white flex items-center gap-3">
          <Cpu className="text-brand shrink-0 animate-pulse" size={28} />
          Models & Pricing
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Explore the active LLM catalog, inspect token pricing, and reference model identifiers.
        </p>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card rounded-2xl p-5 border border-zinc-800/80 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center">
            <Cpu size={20} />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest block font-mono">Available Models</span>
            <span className="text-2xl font-display font-extrabold text-white">{models.length} active</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-zinc-800/80 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <TrendingDown size={20} />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest block font-mono">Lowest Input Cost</span>
            <span className="text-2xl font-display font-extrabold text-white">
              {cheapestModel ? `$${cheapestModel.pricing.inputPricePerMillion.toFixed(4)}` : '$0.0000'}
            </span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-zinc-800/80 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Coins size={20} />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest block font-mono">Billing Increment</span>
            <span className="text-2xl font-display font-extrabold text-white">Per 1M Tokens</span>
          </div>
        </div>
      </div>

      {/* Models Search Table */}
      <div className="glass-card rounded-2xl border border-zinc-800/80 overflow-hidden">
        {/* Search Header */}
        <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-bold text-lg text-white">Active Model Registry</h3>
            <p className="text-xs text-zinc-500">Fully compatible with standard OpenAI SDK completion routes</p>
          </div>
          
          <div className="bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-850 flex items-center gap-2 max-w-xs w-full">
            <Search size={14} className="text-zinc-600" />
            <input
              type="text"
              placeholder="Search by ID or provider..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-xs text-zinc-300 focus:outline-none w-full placeholder-zinc-700 font-medium"
            />
          </div>
        </div>

        {filteredModels.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/30 text-zinc-400 font-semibold">
                  <th className="p-4">Model ID / Tag</th>
                  <th className="p-4">Provider</th>
                  <th className="p-4 text-right">Input Price (per 1M tokens)</th>
                  <th className="p-4 text-right">Output Price (per 1M tokens)</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {filteredModels.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="p-4 font-mono font-semibold text-brand select-all">{m.id}</td>
                    <td className="p-4 font-semibold text-zinc-300">{getProviderName(m.owned_by)}</td>
                    <td className="p-4 text-right font-mono text-zinc-400 font-semibold">
                      ${m.pricing.inputPricePerMillion.toFixed(4)}
                    </td>
                    <td className="p-4 text-right font-mono text-zinc-400 font-semibold">
                      ${m.pricing.outputPricePerMillion.toFixed(4)}
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border border-green-500/25 bg-green-500/10 text-green-400">
                        active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center text-zinc-500 flex flex-col items-center gap-3">
            <Cpu size={32} className="text-zinc-700" />
            <div>
              <p className="font-semibold text-zinc-400 text-sm">No models found</p>
              <p className="text-xs text-zinc-600 mt-0.5">We couldn't find any active models matching your search query.</p>
            </div>
          </div>
        )}
      </div>

      {/* Info Callout */}
      <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/20 flex gap-3 text-xs leading-relaxed text-zinc-400 max-w-4xl">
        <Info size={16} className="text-brand shrink-0 mt-0.5" />
        <p>
          Need to call these models? Navigate to the <a href="/docs#examples" className="text-brand hover:underline font-semibold">Documentation</a> page to copy code templates in Python, Node.js, and curl. To authenticate, generate a key under the <a href="/keys" className="text-brand hover:underline font-semibold">API Keys</a> tab and pass it as a Bearer token.
        </p>
      </div>
    </div>
  );
}
