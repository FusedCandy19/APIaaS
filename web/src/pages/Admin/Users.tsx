import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { 
  Users, 
  RefreshCw, 
  Trash2,
  Calendar,
  Layers,
  ShieldCheck,
  Search,
  Filter
} from 'lucide-react';

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

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [planFilter, setPlanFilter] = React.useState('');

  // Fetch users report
  const { data: users = [], isLoading, refetch, isFetching } = useQuery<UserReportItem[]>({
    queryKey: ['adminUsersList'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/users');
      return res.data;
    },
  });

  // User update mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiClient.patch(`/admin/users/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsersList'] });
      queryClient.invalidateQueries({ queryKey: ['adminHealthSummary'] });
    },
  });

  const handlePlanChange = (userId: string, newPlan: string) => {
    updateUserMutation.mutate({
      id: userId,
      data: { plan: newPlan },
    });
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    updateUserMutation.mutate({
      id: userId,
      data: { role: newRole },
    });
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = planFilter ? u.plan === planFilter : true;
    return matchesSearch && matchesPlan;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight text-white flex items-center gap-3">
            <Users className="text-amber-500 shrink-0" size={28} />
            User Management
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Browse all user accounts, check their token usage logs, adjust plan tiers, or authorize system roles.
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
            placeholder="Search email address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs text-zinc-300 focus:outline-none w-full placeholder-zinc-700"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-850 flex items-center gap-2">
            <Filter size={14} className="text-zinc-500" />
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="bg-transparent text-xs text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="">All Tiers</option>
              <option value="free">Free Plan</option>
              <option value="pro">Pro Plan</option>
              <option value="enterprise">Enterprise Plan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users DataTable */}
      <div className="glass-card rounded-2xl border border-zinc-800/80 overflow-hidden">
        {isLoading ? (
          <div className="p-12 space-y-4 animate-pulse">
            <div className="h-6 w-full bg-zinc-850 rounded"></div>
            <div className="h-6 w-full bg-zinc-850 rounded"></div>
            <div className="h-6 w-full bg-zinc-850 rounded"></div>
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/30 text-zinc-400 font-semibold">
                  <th className="p-4">Email</th>
                  <th className="p-4">Register Date</th>
                  <th className="p-4">Active Keys</th>
                  <th className="p-4">Total Requests</th>
                  <th className="p-4">Total Cost</th>
                  <th className="p-4">Tier Plan</th>
                  <th className="p-4">Role Authorization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="p-4 font-semibold text-white">
                      <span className="block truncate max-w-[200px]" title={user.email}>{user.email}</span>
                      <span className="text-[10px] font-mono text-zinc-500 block truncate max-w-[150px]">{user.id}</span>
                    </td>
                    <td className="p-4 text-zinc-450">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-zinc-600" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4 font-mono text-zinc-400">{user.activeKeys} keys</td>
                    <td className="p-4 font-mono text-zinc-400">{user.usage.totalRequests.toLocaleString()} reqs</td>
                    <td className="p-4 font-mono text-zinc-200">${user.usage.totalCost.toFixed(4)}</td>
                    <td className="p-4">
                      <select
                        value={user.plan}
                        onChange={(e) => handlePlanChange(user.id, e.target.value)}
                        disabled={updateUserMutation.isPending}
                        className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 px-2 py-1 rounded cursor-pointer focus:outline-none focus:border-amber-500 font-semibold"
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        disabled={updateUserMutation.isPending}
                        className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-350 px-2 py-1 rounded cursor-pointer focus:outline-none focus:border-amber-500 font-semibold"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center text-zinc-500">No users found matching your search.</div>
        )}
      </div>
    </div>
  );
}
