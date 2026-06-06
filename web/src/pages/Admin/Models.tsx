import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { 
  Cpu, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Check, 
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  RefreshCw
} from 'lucide-react';

interface ModelItem {
  id: string;
  owned_by: string;
  pricing: {
    inputPricePerMillion: number;
    outputPricePerMillion: number;
  };
  enabled?: boolean; // Note: our backend returns it
}

// Backend models list structure
interface DbModelItem {
  id: string;
  name: string;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  enabled: boolean;
}

export default function AdminModels() {
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  
  // Create Form State
  const [modelId, setModelId] = useState('');
  const [modelName, setModelName] = useState('');
  const [inputPrice, setInputPrice] = useState(0.0);
  const [outputPrice, setOutputPrice] = useState(0.0);
  const [modelEnabled, setModelEnabled] = useState(true);
  const [createError, setCreateError] = useState<string | null>(null);

  // Editing Row State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInputPrice, setEditInputPrice] = useState(0.0);
  const [editOutputPrice, setEditOutputPrice] = useState(0.0);

  // Fetch all models
  const { data: models = [], isLoading, refetch, isFetching } = useQuery<DbModelItem[]>({
    queryKey: ['adminModelsList'],
    queryFn: async () => {
      // We query the standard models list, but wait, since public lists them, we can also write a clean admin list.
      // We already returned public v1/models, let's query the public models and fetch the db models.
      // Wait, let's just write a query to /v1/models, or we can use the backend models list if we have one.
      // In modelsRoutes, we returned the public models. Let's write a route that returns the raw list, or we can fetch /v1/models and map it.
      // Actually, since /v1/models already returns all active/enabled models, let's check:
      // In api/src/routes/admin.ts we registered standard PATCH /admin/models/:id.
      // Let's check how the models are retrieved. We can just fetch /v1/models or write a query to fetch the DB model config directly.
      // Wait! In `api/src/routes/models.ts` we fetch all models where `enabled: true`. But admins need to see ALL models (including disabled ones) so they can enable them!
      // Let's check if there is an endpoint to fetch all models. In `api/src/routes/models.ts`, we filtered `where: { enabled: true }`.
      // Wait, let's write a quick admin GET `/api/admin/models` endpoint if needed, or did we define one?
      // In our implementation plan we did:
      // "POST /api/admin/models: Create a new model configuration"
      // "DELETE /api/admin/models/:id: Delete a model configuration"
      // Wait! Let's check if we can query `/v1/models` and see if we can get all models. If `/v1/models` only returns active ones, can we write a `GET /api/admin/models` that returns all?
      // Yes! Let's check if we added `GET /admin/models` in `admin.ts`.
      // Let's check our `admin.ts` file in step 23:
      // Wait, we didn't add a `GET /admin/models` in `admin.ts`!
      // Ah! We have `PATCH /admin/models/:id` and `POST /admin/models` and `DELETE /admin/models/:id`.
      // Can we easily fetch all models from the DB? Yes, we can just write a quick GET `/api/admin/models` in `admin.ts`! Or we can query the database directly in a new endpoint.
      // Wait, did we miss `GET /admin/models` in `admin.ts`?
      // Let's check: yes, we have `GET /branding` and `GET /admin/users` and `GET /admin/health` but no `GET /admin/models`!
      // We should definitely add `GET /api/admin/models` to retrieve the list of all models in the database (enabled and disabled) so that the admin page can display them all!
      // This is a very important detail! Let's write the `GET /api/admin/models` route in `api/src/routes/admin.ts` right away using `replace_file_content`.
      const res = await apiClient.get('/v1/models'); // Let's check: if we map it or write an admin route. Writing an admin route is much cleaner.
      // Let's write the admin GET /admin/models endpoint in backend right now!
      // Where should it go? Inside `adminSecured` block in `api/src/routes/admin.ts`.
      // Let's fetch `/api/admin/models` in the React query.
      const response = await apiClient.get('/admin/models');
      return response.data;
    },
  });

  // Create Model Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      setCreateError(null);
      await apiClient.post('/admin/models', {
        id: modelId,
        name: modelName,
        inputPricePerMillion: inputPrice,
        outputPricePerMillion: outputPrice,
        enabled: modelEnabled,
      });
    },
    onSuccess: () => {
      setCreateModalOpen(false);
      setModelId('');
      setModelName('');
      setInputPrice(0.0);
      setOutputPrice(0.0);
      queryClient.invalidateQueries({ queryKey: ['adminModelsList'] });
      queryClient.invalidateQueries({ queryKey: ['docsModelsList'] });
    },
    onError: (err: any) => {
      setCreateError(err.response?.data?.message || 'Failed to create model profile.');
    }
  });

  // Update Model Mutation (Pricing/Enabled)
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiClient.patch(`/admin/models/${id}`, data);
    },
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['adminModelsList'] });
      queryClient.invalidateQueries({ queryKey: ['docsModelsList'] });
    },
  });

  // Delete Model Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/admin/models/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminModelsList'] });
      queryClient.invalidateQueries({ queryKey: ['docsModelsList'] });
    },
  });

  const handleStartEdit = (model: DbModelItem) => {
    setEditingId(model.id);
    setEditInputPrice(model.inputPricePerMillion);
    setEditOutputPrice(model.outputPricePerMillion);
  };

  const handleSaveEdit = (id: string) => {
    updateMutation.mutate({
      id,
      data: {
        inputPricePerMillion: editInputPrice,
        outputPricePerMillion: editOutputPrice,
      },
    });
  };

  const handleToggleEnabled = (id: string, currentEnabled: boolean) => {
    updateMutation.mutate({
      id,
      data: { enabled: !currentEnabled },
    });
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight text-white flex items-center gap-3">
            <Cpu className="text-amber-500 shrink-0" size={28} />
            Model Catalog
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Expose local Ollama models or custom APIs to developers. Define rate calculations and status parameters.
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
            Add AI Model
          </button>
        </div>
      </div>

      {/* Model Catalog Table */}
      <div className="glass-card rounded-2xl border border-zinc-800/80 overflow-hidden">
        {isLoading ? (
          <div className="p-12 space-y-4 animate-pulse">
            <div className="h-6 w-full bg-zinc-850 rounded"></div>
            <div className="h-6 w-full bg-zinc-850 rounded"></div>
            <div className="h-6 w-full bg-zinc-850 rounded"></div>
          </div>
        ) : models.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/30 text-zinc-400 font-semibold">
                  <th className="p-4">Model ID / Tag</th>
                  <th className="p-4">Display Name</th>
                  <th className="p-4 text-right">Input Price (per 1M)</th>
                  <th className="p-4 text-right">Output Price (per 1M)</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {models.map((model) => {
                  const isEditing = editingId === model.id;
                  return (
                    <tr key={model.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="p-4 font-mono font-semibold text-brand select-all">{model.id}</td>
                      <td className="p-4 font-semibold text-white">{model.name}</td>
                      <td className="p-4 text-right font-mono">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-zinc-500">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editInputPrice}
                              onChange={(e) => setEditInputPrice(Number(e.target.value))}
                              className="w-16 px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-950 text-right focus:outline-none focus:border-brand text-xs text-white"
                            />
                          </div>
                        ) : (
                          <span className="text-zinc-300">${model.inputPricePerMillion.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="p-4 text-right font-mono">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-zinc-500">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editOutputPrice}
                              onChange={(e) => setEditOutputPrice(Number(e.target.value))}
                              className="w-16 px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-950 text-right focus:outline-none focus:border-brand text-xs text-white"
                            />
                          </div>
                        ) : (
                          <span className="text-zinc-300">${model.outputPricePerMillion.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleEnabled(model.id, model.enabled)}
                          className="focus:outline-none inline-block align-middle transition-colors text-zinc-400 hover:text-white"
                          title={model.enabled ? 'Click to disable model' : 'Click to enable model'}
                        >
                          {model.enabled ? (
                            <ToggleRight size={24} className="text-green-500" />
                          ) : (
                            <ToggleLeft size={24} className="text-zinc-650" />
                          )}
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(model.id)}
                                className="p-1 border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-green-400 rounded transition-all"
                                title="Save pricing"
                              >
                                <Save size={12} />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1 border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 rounded transition-all"
                                title="Cancel edit"
                              >
                                <X size={12} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEdit(model)}
                                className="p-1 border border-zinc-850 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-all"
                                title="Edit prices"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete model '${model.id}'?`)) {
                                    deleteMutation.mutate(model.id);
                                  }
                                }}
                                className="p-1 border border-zinc-850 bg-zinc-900 text-zinc-450 hover:text-red-400 hover:bg-zinc-800 rounded transition-all"
                                title="Delete model profile"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-zinc-500">No models found in database catalog.</div>
        )}
      </div>

      {/* CREATE MODEL MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="space-y-1">
              <h3 className="font-display font-bold text-lg text-white">Register AI Model</h3>
              <p className="text-xs text-zinc-500">Add a custom model tag matching your Ollama library</p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
              {createError && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs">
                  <AlertCircle size={16} />
                  <span>{createError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">
                  Model ID / Tag
                </label>
                <input
                  type="text"
                  required
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  placeholder="e.g. llama3:70b or custom-coder"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-855 bg-zinc-950 text-sm focus:outline-none focus:border-brand text-white font-mono"
                />
                <span className="text-[10px] text-zinc-500 block leading-normal">
                  Must match the model identifier passed in your API payload calls.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="e.g. Llama 3 (70B Instruct)"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-855 bg-zinc-950 text-sm focus:outline-none focus:border-brand text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">
                    Input Cost ($/1M tokens)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={inputPrice}
                    onChange={(e) => setInputPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-855 bg-zinc-950 text-sm focus:outline-none focus:border-brand text-white font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">
                    Output Cost ($/1M tokens)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={outputPrice}
                    onChange={(e) => setOutputPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-855 bg-zinc-950 text-sm focus:outline-none focus:border-brand text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <input
                  id="model-enabled-check"
                  type="checkbox"
                  checked={modelEnabled}
                  onChange={(e) => setModelEnabled(e.target.checked)}
                  className="w-4 h-4 accent-brand rounded border-zinc-800 bg-zinc-950 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="model-enabled-check" className="text-xs text-zinc-400 font-semibold cursor-pointer select-none">
                  Enable model immediately for API calls
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 rounded-lg text-zinc-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 py-2 bg-brand hover:bg-brand-hover text-brand-foreground text-xs font-semibold rounded-lg transition-all"
                >
                  {createMutation.isPending ? 'Registering...' : 'Register Model'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
