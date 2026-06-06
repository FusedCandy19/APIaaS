import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { 
  Key, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  AlertTriangle, 
  RefreshCw,
  Sliders,
  Calendar,
  Lock
} from 'lucide-react';

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  rateLimit: number;
  status: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface CreatedKeyResponse {
  id: string;
  name: string;
  rawKey: string;
  keyPrefix: string;
  rateLimit: number;
  status: string;
  createdAt: string;
}

export default function Keys() {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  
  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [rateLimit, setRateLimit] = useState(120);
  const [createdKey, setCreatedKey] = useState<CreatedKeyResponse | null>(null);
  const [hasConfirmedCopy, setHasConfirmedCopy] = useState(false);

  // Revoke states
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);

  // Fetch Keys list
  const { data: keys = [], isLoading, refetch, isFetching } = useQuery<ApiKeyItem[]>({
    queryKey: ['apiKeys'],
    queryFn: async () => {
      const res = await apiClient.get('/v1/keys');
      return res.data;
    },
  });

  // Create Key Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/v1/keys', { name: keyName, rateLimit });
      return res.data;
    },
    onSuccess: (data: CreatedKeyResponse) => {
      setCreatedKey(data);
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      // Reset creation form
      setKeyName('');
      setRateLimit(120);
    },
  });

  // Revoke Key Mutation
  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/v1/keys/${id}`);
    },
    onSuccess: () => {
      setRevokeConfirmId(null);
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  const handleCopy = (keyText: string) => {
    navigator.clipboard.writeText(keyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseCreateModal = () => {
    if (createdKey && !hasConfirmedCopy) return; // Block closing if not copy-confirmed
    setCreateModalOpen(false);
    setCreatedKey(null);
    setHasConfirmedCopy(false);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight text-white flex items-center gap-3">
            <Key className="text-brand shrink-0" size={28} />
            API Keys
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Keys are used to authenticate your application queries to the OpenAI API gateway.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover text-brand-foreground rounded-lg text-sm font-semibold transition-all shadow-[0_4px_15px_rgba(139,92,246,0.15)]"
          >
            <Plus size={16} />
            Create API Key
          </button>
        </div>
      </div>

      {/* Keys Table / Card */}
      <div className="glass-card rounded-2xl border border-zinc-800/80 overflow-hidden">
        {isLoading ? (
          <div className="p-12 space-y-4 animate-pulse">
            <div className="h-6 w-full bg-zinc-850 rounded"></div>
            <div className="h-6 w-full bg-zinc-850 rounded"></div>
            <div className="h-6 w-full bg-zinc-850 rounded"></div>
          </div>
        ) : keys.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/30 text-zinc-400 font-semibold">
                  <th className="p-4">Name</th>
                  <th className="p-4">Prefix ID</th>
                  <th className="p-4">Rate Limit</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Created</th>
                  <th className="p-4">Last Used</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {keys.map((key) => (
                  <tr key={key.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="p-4 font-semibold text-white">{key.name}</td>
                    <td className="p-4 font-mono text-zinc-400">{key.keyPrefix}</td>
                    <td className="p-4 font-mono text-zinc-400">{key.rateLimit} req/min</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        key.status === 'active' 
                          ? 'border-green-500/20 bg-green-500/10 text-green-400' 
                          : 'border-red-500/20 bg-red-500/10 text-red-400'
                      }`}>
                        {key.status}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-500 flex items-center gap-1.5 mt-0.5">
                      <Calendar size={12} className="opacity-60" />
                      {new Date(key.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-zinc-400 font-mono">
                      {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="p-4 text-right">
                      {key.status === 'active' ? (
                        <button
                          onClick={() => setRevokeConfirmId(key.id)}
                          className="p-1.5 border border-zinc-850 bg-zinc-900 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-all"
                          title="Revoke API key"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <span className="text-[10px] text-zinc-600 italic">Inactive</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center text-zinc-500 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
              <Key size={24} />
            </div>
            <div>
              <p className="font-semibold text-zinc-300 text-sm">No API keys generated</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Generate an authentication key to authenticate your server calls and begin querying AI models.
              </p>
            </div>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold transition-all mt-2"
            >
              Generate first key
            </button>
          </div>
        )}
      </div>

      {/* CREATE KEY DIALOG MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative space-y-5">
            {!createdKey ? (
              // Step 1: Configure Key Details
              <>
                <div className="space-y-1">
                  <h3 className="font-display font-bold text-lg text-white">Generate API Key</h3>
                  <p className="text-xs text-zinc-500">Configure key limits and credentials metadata</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Key Name
                    </label>
                    <input
                      type="text"
                      required
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      placeholder="e.g. Production Backend Service"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-850 bg-zinc-950 text-sm placeholder-zinc-700 focus:outline-none focus:border-brand transition-all focus:ring-2 focus:ring-brand/10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sliders size={12} />
                        Rate Limit
                      </label>
                      <span className="font-mono text-zinc-500">{rateLimit} requests / min</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={1000}
                      step={10}
                      value={rateLimit}
                      onChange={(e) => setRateLimit(Number(e.target.value))}
                      className="w-full accent-brand bg-zinc-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setCreateModalOpen(false)}
                    className="flex-1 py-2 text-xs font-semibold border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 rounded-lg transition-colors text-zinc-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending || !keyName.trim()}
                    className="flex-1 py-2 bg-brand hover:bg-brand-hover text-brand-foreground text-xs font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_10px_rgba(139,92,246,0.1)]"
                  >
                    {createMutation.isPending ? 'Generating...' : 'Create Key'}
                  </button>
                </div>
              </>
            ) : (
              // Step 2: Show Key Once (Enforce check confirm)
              <>
                <div className="text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-brand/10 text-brand border border-brand/20 flex items-center justify-center mx-auto mb-2 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                    <Lock size={18} />
                  </div>
                  <h3 className="font-display font-bold text-lg text-white">Save Your API Key</h3>
                  <p className="text-xs text-zinc-400">
                    For security reasons, this token will only be shown **once**. You will not be able to retrieve it again.
                  </p>
                </div>

                {/* Key box */}
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850 flex items-center justify-between font-mono text-xs select-all relative group overflow-hidden">
                  <span className="text-brand font-semibold break-all mr-6 pr-2">
                    {createdKey.rawKey}
                  </span>
                  <button
                    onClick={() => handleCopy(createdKey.rawKey)}
                    className="p-1.5 shrink-0 bg-zinc-900 hover:bg-zinc-850 hover:text-white rounded-lg border border-zinc-800 text-zinc-400 transition-all absolute right-2 top-2"
                  >
                    {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  </button>
                </div>

                {/* Warning alert */}
                <div className="flex gap-3 p-3 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400 text-xs">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>
                    Do not store this key publicly, commit it to GitHub, or share it in client-side code.
                  </span>
                </div>

                {/* Confirm copied checkbox */}
                <div className="flex items-start gap-2.5 pt-2">
                  <input
                    id="copy-confirm"
                    type="checkbox"
                    checked={hasConfirmedCopy}
                    onChange={(e) => setHasConfirmedCopy(e.target.checked)}
                    className="w-4 h-4 accent-brand rounded border-zinc-800 bg-zinc-950 focus:ring-0 cursor-pointer mt-0.5"
                  />
                  <label htmlFor="copy-confirm" className="text-xs text-zinc-400 font-semibold cursor-pointer select-none">
                    I have safely copied this key and saved it in a password manager.
                  </label>
                </div>

                <button
                  onClick={handleCloseCreateModal}
                  disabled={!hasConfirmedCopy}
                  className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-750 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-700"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* REVOKE CONFIRMATION DIALOG MODAL */}
      {revokeConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center mx-auto mb-2 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <AlertTriangle size={18} />
              </div>
              <h3 className="font-display font-bold text-lg text-white">Revoke API Key</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Are you sure you want to revoke this API key? This action is **irreversible** and will immediately break any active servers utilizing this token.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setRevokeConfirmId(null)}
                className="flex-1 py-2 text-xs font-semibold border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 rounded-lg transition-colors text-zinc-400"
              >
                No, Keep Key
              </button>
              <button
                onClick={() => revokeConfirmId && revokeMutation.mutate(revokeConfirmId)}
                disabled={revokeMutation.isPending}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-all"
              >
                {revokeMutation.isPending ? 'Revoking...' : 'Yes, Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
