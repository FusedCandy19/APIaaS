import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth.store';
import { apiClient } from '../api/client';
import { 
  CreditCard, 
  Check, 
  Download, 
  HelpCircle,
  AlertCircle,
  Zap,
  Layers,
  Award,
  ChevronRight
} from 'lucide-react';

interface BillingData {
  plan: 'free' | 'pro' | 'enterprise';
  currentSpend: number;
  billingCycleStart: string;
  paymentMethod: {
    brand: string;
    last4: string;
    expiry: string;
  };
  invoices: Array<{
    id: string;
    date: string;
    amount: number;
    status: string;
    downloadUrl: string;
  }>;
}

export default function Billing() {
  const queryClient = useQueryClient();
  const { updateUserPlan } = useAuthStore();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [selectedPlanToUpgrade, setSelectedPlanToUpgrade] = useState<'free' | 'pro' | 'enterprise' | null>(null);

  // Fetch Billing Data
  const { data, isLoading, refetch } = useQuery<BillingData>({
    queryKey: ['billingInfo'],
    queryFn: async () => {
      const res = await apiClient.get('/v1/billing');
      return res.data;
    },
  });

  // Upgrade Mutation
  const upgradeMutation = useMutation({
    mutationFn: async (plan: 'free' | 'pro' | 'enterprise') => {
      const res = await apiClient.post('/v1/billing/upgrade', { plan });
      return res.data;
    },
    onSuccess: (data, variables) => {
      updateUserPlan(variables);
      setUpgradeModalOpen(false);
      setSelectedPlanToUpgrade(null);
      refetch();
    },
  });

  const planTiers = [
    {
      id: 'free',
      name: 'Sandbox Free',
      price: '$0',
      description: 'Ideal for prototyping and developer experiments.',
      features: [
        '100 requests per minute limit',
        'Access to basic models (GPT-3.5)',
        'Shared analytics dashboard',
        'Standard community support',
      ],
      icon: Layers,
      colorClass: 'border-zinc-800 text-zinc-400 bg-zinc-900/40',
    },
    {
      id: 'pro',
      name: 'Developer Pro',
      price: '$29',
      description: 'Perfect for production applications and scaling teams.',
      features: [
        '500 requests per minute limit',
        'Full catalog access (GPT-4o, Claude)',
        'Priority queue processing',
        'Historical logs & detail reports',
        '24/7 priority email support',
      ],
      icon: Zap,
      colorClass: 'border-brand/35 text-brand bg-brand/5 shadow-[0_0_20px_rgba(139,92,246,0.05)]',
    },
    {
      id: 'enterprise',
      name: 'Enterprise Plus',
      price: 'Custom',
      description: 'For corporate systems and high-throughput requirements.',
      features: [
        'Unlimited custom rate limits',
        'Dedicated API endpoint proxies',
        'SLA guaranteed 99.9% uptime',
        'Dedicated account manager',
        'Custom contract invoicing options',
      ],
      icon: Award,
      colorClass: 'border-amber-500/20 text-amber-400 bg-amber-500/5',
    },
  ];

  if (isLoading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-zinc-900 border border-zinc-800 rounded-2xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-60 bg-zinc-900 border border-zinc-800 rounded-2xl"></div>
          <div className="h-60 bg-zinc-900 border border-zinc-800 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const currentPlanDetails = planTiers.find((p) => p.id === data.plan) || planTiers[0];

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div>
        <h1 className="font-display font-extrabold text-3xl tracking-tight text-white flex items-center gap-3">
          <CreditCard className="text-brand shrink-0" size={28} />
          Billing & Plans
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Review your subscription settings, credit card details, and pending cycle costs.
        </p>
      </div>

      {/* Overview Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Plan Card */}
        <div className="glass-card rounded-2xl p-6 border border-zinc-800/80 flex flex-col justify-between h-48 lg:col-span-1">
          <div>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest font-mono">Current Plan</span>
            <h3 className="text-2xl font-display font-extrabold text-white mt-1 capitalize">{data.plan} Tier</h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Active since registration. Configured with standard API throttling limits.
            </p>
          </div>
          <button
            onClick={() => setUpgradeModalOpen(true)}
            className="flex items-center justify-center gap-1.5 py-2 w-full text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors border border-zinc-800"
          >
            Upgrade Subscription
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Pending Cycle Spend Card */}
        <div className="glass-card rounded-2xl p-6 border border-zinc-800/80 flex flex-col justify-between h-48 lg:col-span-1">
          <div>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest font-mono">Pending Balance</span>
            <h3 className="text-3xl font-display font-extrabold text-white mt-1">${data.currentSpend.toFixed(5)}</h3>
            <p className="text-xs text-zinc-400 mt-2">
              Billing cycle started: <span className="font-mono font-semibold text-zinc-300">{data.billingCycleStart}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 bg-zinc-950 px-3 py-2 rounded border border-zinc-850">
            <AlertCircle size={12} className="shrink-0 text-zinc-400" />
            <span>Usage calculations updated in 5-minute increments.</span>
          </div>
        </div>

        {/* Payment Method Card */}
        <div className="glass-card rounded-2xl p-6 border border-zinc-800/80 flex flex-col justify-between h-48 lg:col-span-1">
          <div>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest font-mono">Payment Method</span>
            <div className="flex items-center gap-3 mt-3">
              <div className="w-12 h-8 bg-zinc-950 border border-zinc-850 rounded flex items-center justify-center text-xs font-bold text-blue-400">
                {data.paymentMethod.brand.toUpperCase()}
              </div>
              <div>
                <span className="text-sm font-semibold text-white block">
                  •••• •••• •••• {data.paymentMethod.last4}
                </span>
                <span className="text-[10px] text-zinc-500 block">
                  Expires {data.paymentMethod.expiry}
                </span>
              </div>
            </div>
          </div>
          <button className="py-2 w-full text-xs font-semibold rounded-lg bg-zinc-950 hover:bg-zinc-900 text-zinc-400 border border-dashed border-zinc-800 transition-colors">
            Update Payment Card
          </button>
        </div>
      </div>

      {/* Invoice list */}
      <div className="glass-card rounded-2xl border border-zinc-800/80 overflow-hidden">
        <div className="p-6 border-b border-zinc-800">
          <h3 className="font-display font-bold text-lg text-white">Invoice History</h3>
          <p className="text-xs text-zinc-500">Download past statements and invoice documents</p>
        </div>
        
        {data.invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/30 text-zinc-400 font-semibold">
                  <th className="p-4">Invoice ID</th>
                  <th className="p-4">Billing Date</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {data.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="p-4 font-mono font-semibold text-white">{inv.id}</td>
                    <td className="p-4 text-zinc-400">{inv.date}</td>
                    <td className="p-4 font-mono text-zinc-300">${inv.amount.toFixed(2)}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border border-green-500/20 bg-green-500/10 text-green-400">
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <a 
                        href={inv.downloadUrl}
                        className="p-1.5 inline-block border border-zinc-850 bg-zinc-900 text-zinc-400 hover:text-white rounded-lg transition-colors"
                        title="Download invoice PDF"
                      >
                        <Download size={12} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-zinc-500">No invoices recorded yet.</div>
        )}
      </div>

      {/* PLAN CHOICES UPGRADE MODAL */}
      {upgradeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="text-center space-y-1">
              <h3 className="font-display font-extrabold text-2xl text-white">Upgrade Subscription Plan</h3>
              <p className="text-sm text-zinc-400">Select a scale tier matching your architecture needs.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {planTiers.map((plan) => {
                const Icon = plan.icon;
                const isCurrent = data.plan === plan.id;
                return (
                  <div 
                    key={plan.id}
                    className={`rounded-xl border p-5 flex flex-col justify-between space-y-4 relative ${plan.colorClass} ${
                      isCurrent ? 'ring-2 ring-brand ring-offset-2 ring-offset-zinc-900' : ''
                    }`}
                  >
                    {isCurrent && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-brand text-brand-foreground shadow">
                        Active Plan
                      </span>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white block">{plan.name}</span>
                        <Icon size={18} />
                      </div>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-2xl font-extrabold text-white font-display">{plan.price}</span>
                        <span className="text-[10px] text-zinc-500">/ month</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">{plan.description}</p>
                    </div>

                    <ul className="text-[11px] space-y-1.5 pt-2 text-zinc-300 border-t border-zinc-800/80">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <Check size={12} className="text-brand mt-0.5 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => !isCurrent && setSelectedPlanToUpgrade(plan.id as any)}
                      disabled={isCurrent || upgradeMutation.isPending}
                      className={`w-full py-2 rounded-lg text-xs font-semibold transition-all ${
                        isCurrent 
                          ? 'bg-zinc-850 text-zinc-500 cursor-not-allowed border border-zinc-800' 
                          : 'bg-brand hover:bg-brand-hover text-brand-foreground shadow-[0_4px_10px_rgba(139,92,246,0.15)]'
                      }`}
                    >
                      {isCurrent ? 'Active Sub' : 'Select Plan'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4 border-t border-zinc-800">
              <button
                onClick={() => setUpgradeModalOpen(false)}
                className="px-5 py-2 text-xs font-semibold rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 transition-colors text-zinc-400"
              >
                Close Portal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPGRADE CONFIRMATION MODAL */}
      {selectedPlanToUpgrade && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="text-center space-y-2">
              <Zap className="text-amber-400 mx-auto" size={32} />
              <h3 className="font-display font-bold text-lg text-white">Confirm Subscription Swap</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                You are switching your platform tier to <span className="font-bold uppercase text-brand">{selectedPlanToUpgrade}</span>. Do you wish to authorize this update?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setSelectedPlanToUpgrade(null)}
                className="flex-1 py-2 text-xs font-semibold border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 rounded-lg transition-colors text-zinc-400"
              >
                Cancel
              </button>
              <button
                onClick={() => upgradeMutation.mutate(selectedPlanToUpgrade)}
                disabled={upgradeMutation.isPending}
                className="flex-1 py-2 bg-brand hover:bg-brand-hover text-brand-foreground text-xs font-semibold rounded-lg transition-all"
              >
                {upgradeMutation.isPending ? 'Confirming...' : 'Yes, Upgrade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
