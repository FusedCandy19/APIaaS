import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { 
  Users, 
  RefreshCw, 
  Calendar,
  Search,
  Filter,
  Plus,
  Mail,
  KeyRound,
  AlertCircle,
  CheckCircle,
  Sliders,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

interface UserReportItem {
  id: string;
  email: string;
  role: string;
  plan: string;
  status: string; // Added status field
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
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Create User Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPlan, setNewPlan] = useState<'free' | 'pro' | 'enterprise'>('free');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [newStatus, setNewStatus] = useState<'active' | 'pending' | 'suspended'>('active');
  const [createError, setCreateError] = useState<string | null>(null);

  // Reset Password Modal States
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState('');
  const [resetUserEmail, setResetUserEmail] = useState('');
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      setResetError(null);
      setResetSuccess(null);
      const res = await apiClient.post(`/admin/users/${resetUserId}/reset-password`, {
        password: resetPasswordVal,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setResetSuccess(data.message || 'Password updated successfully.');
      setResetPasswordVal('');
      // Dismiss after 2 seconds
      setTimeout(() => {
        setResetModalOpen(false);
        setResetSuccess(null);
      }, 2000);
    },
    onError: (err: any) => {
      setResetError(err.response?.data?.message || 'Failed to reset user password.');
    }
  });

  // Fetch users report
  const { data: users = [], isLoading, refetch, isFetching } = useQuery<UserReportItem[]>({
    queryKey: ['adminUsersList'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/users');
      return res.data;
    },
  });

  // User update mutation (Plan, Role, Status)
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

  // Create User mutation
  const createUserMutation = useMutation({
    mutationFn: async () => {
      setCreateError(null);
      const res = await apiClient.post('/admin/users', {
        email: newEmail,
        password: newPassword,
        plan: newPlan,
        role: newRole,
        status: newStatus,
      });
      return res.data;
    },
    onSuccess: () => {
      setCreateModalOpen(false);
      setNewEmail('');
      setNewPassword('');
      setNewPlan('free');
      setNewRole('user');
      setNewStatus('active');
      queryClient.invalidateQueries({ queryKey: ['adminUsersList'] });
      queryClient.invalidateQueries({ queryKey: ['adminHealthSummary'] });
    },
    onError: (err: any) => {
      setCreateError(err.response?.data?.message || 'Failed to create user account.');
    }
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

  const handleStatusChange = (userId: string, newStatus: string) => {
    updateUserMutation.mutate({
      id: userId,
      data: { status: newStatus },
    });
  };

  const handleOpenResetModal = (id: string, email: string) => {
    setResetUserId(id);
    setResetUserEmail(email);
    setResetPasswordVal('');
    setResetError(null);
    setResetSuccess(null);
    setResetModalOpen(true);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = planFilter ? u.plan === planFilter : true;
    const matchesStatus = statusFilter ? u.status === statusFilter : true;
    return matchesSearch && matchesPlan && matchesStatus;
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
            Create User
          </button>
        </div>
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
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-850 flex items-center gap-2">
            <span className="text-xs text-zinc-500">Tier:</span>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="bg-transparent text-xs text-zinc-300 focus:outline-none cursor-pointer font-semibold"
            >
              <option value="">All Tiers</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div className="bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-850 flex items-center gap-2">
            <span className="text-xs text-zinc-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-zinc-300 focus:outline-none cursor-pointer font-semibold"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
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
                  <th className="p-4">Role Scope</th>
                  <th className="p-4">Status Override</th>
                  <th className="p-4 text-right">Actions</th>
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
                        className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 px-2 py-1 rounded cursor-pointer focus:outline-none focus:border-brand font-semibold"
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
                        className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-350 px-2 py-1 rounded cursor-pointer focus:outline-none focus:border-brand font-semibold"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <select
                        value={user.status}
                        onChange={(e) => handleStatusChange(user.id, e.target.value)}
                        disabled={updateUserMutation.isPending}
                        className={`border text-xs px-2 py-1 rounded cursor-pointer focus:outline-none font-semibold ${
                          user.status === 'active' 
                            ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                            : user.status === 'pending'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                              : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}
                      >
                        <option value="active" className="bg-zinc-900 text-green-400">Active</option>
                        <option value="pending" className="bg-zinc-900 text-amber-400">Pending</option>
                        <option value="suspended" className="bg-zinc-900 text-red-400">Suspended</option>
                      </select>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleOpenResetModal(user.id, user.email)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-950 border border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-amber-500 hover:text-amber-400 hover:bg-zinc-900 rounded transition-all focus:outline-none"
                        title="Reset User Password"
                      >
                        <KeyRound size={11} className="shrink-0" />
                        Reset Pass
                      </button>
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

      {/* CREATE USER DIALOG MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="space-y-1">
              <h3 className="font-display font-bold text-lg text-white">Create User Profile</h3>
              <p className="text-xs text-zinc-500">Register a new console developer profile directly</p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); createUserMutation.mutate(); }} className="space-y-4">
              {createError && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs">
                  <AlertCircle size={16} />
                  <span>{createError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <Mail size={14} />
                  </div>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="dev@company.com"
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-855 bg-zinc-950 text-sm focus:outline-none focus:border-brand text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <KeyRound size={14} />
                  </div>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-855 bg-zinc-950 text-sm focus:outline-none focus:border-brand text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-450 block truncate">
                    Tier Plan
                  </label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value as any)}
                    className="w-full px-2 py-2 rounded-lg border border-zinc-855 bg-zinc-950 text-xs focus:outline-none focus:border-brand text-white font-semibold cursor-pointer"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-450 block truncate">
                    Role Scope
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full px-2 py-2 rounded-lg border border-zinc-855 bg-zinc-950 text-xs focus:outline-none focus:border-brand text-white font-semibold cursor-pointer"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-450 block truncate">
                    Initial Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full px-2 py-2 rounded-lg border border-zinc-855 bg-zinc-950 text-xs focus:outline-none focus:border-brand text-white font-semibold cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
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
                  disabled={createUserMutation.isPending}
                  className="flex-1 py-2 bg-brand hover:bg-brand-hover text-brand-foreground text-xs font-semibold rounded-lg transition-all"
                >
                  {createUserMutation.isPending ? 'Registering...' : 'Register User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD DIALOG MODAL */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="space-y-1">
              <h3 className="font-display font-bold text-lg text-white">Reset Password</h3>
              <p className="text-xs text-zinc-500">
                Override security credentials for developer: <strong className="text-zinc-300">{resetUserEmail}</strong>
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                resetPasswordMutation.mutate();
              }}
              className="space-y-4"
            >
              {resetError && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs">
                  <AlertCircle size={16} />
                  <span>{resetError}</span>
                </div>
              )}

              {resetSuccess && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg border border-green-500/20 bg-green-500/10 text-green-400 text-xs">
                  <CheckCircle size={16} />
                  <span>{resetSuccess}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <KeyRound size={14} />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={resetPasswordVal}
                    onChange={(e) => setResetPasswordVal(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-855 bg-zinc-950 text-sm focus:outline-none focus:border-brand text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 rounded-lg text-zinc-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold rounded-lg transition-all"
                >
                  {resetPasswordMutation.isPending ? 'Updating...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
