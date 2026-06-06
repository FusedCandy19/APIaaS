import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth.store';
import { apiClient } from '../api/client';
import { 
  Settings2, 
  User, 
  Lock, 
  CheckCircle, 
  AlertCircle,
  ShieldAlert,
  Calendar
} from 'lucide-react';

interface ProfileData {
  id: string;
  email: string;
  role: string;
  plan: string;
  createdAt: string;
}

export default function Settings() {
  const { user, login, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  
  // Profile Form State
  const [email, setEmail] = useState(user?.email || '');
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Fetch full profile info
  const { data: profile } = useQuery<ProfileData>({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const res = await apiClient.get('/v1/settings/profile');
      return res.data;
    },
    onSuccess: (data) => {
      setEmail(data.email);
    },
  });

  // Profile Mutation
  const profileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.patch('/v1/settings/profile', { email });
      return res.data;
    },
    onSuccess: (data) => {
      setProfileSuccess('Profile updated successfully.');
      setProfileError(null);
      // Update store
      if (user) {
        localStorage.setItem('apiaas_user', JSON.stringify({ ...user, email: data.email }));
        useAuthStore.setState({ user: { ...user, email: data.email } });
      }
      setTimeout(() => setProfileSuccess(null), 3000);
    },
    onError: (err: any) => {
      setProfileError(err.response?.data?.message || 'Failed to update profile.');
      setProfileSuccess(null);
    },
  });

  // Password Mutation
  const passwordMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch('/v1/settings/password', { currentPassword, newPassword });
    },
    onSuccess: () => {
      setPasswordSuccess('Password changed successfully.');
      setPasswordError(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 3000);
    },
    onError: (err: any) => {
      setPasswordError(err.response?.data?.message || 'Failed to change password.');
      setPasswordSuccess(null);
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    profileMutation.mutate();
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      return setPasswordError('New passwords do not match.');
    }

    if (newPassword.length < 6) {
      return setPasswordError('Password must be at least 6 characters.');
    }

    passwordMutation.mutate();
  };

  return (
    <div className="space-y-6 font-sans max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="font-display font-extrabold text-3xl tracking-tight text-white flex items-center gap-3">
          <Settings2 className="text-brand shrink-0" size={28} />
          Account Settings
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Customize your profile, configure developer details, and rotate password keys.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'profile'
              ? 'border-brand text-brand'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <User size={14} />
          Developer Profile
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'password'
              ? 'border-brand text-brand'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Lock size={14} />
          Credentials & Security
        </button>
      </div>

      {/* Profile settings panel */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 glass-card rounded-2xl p-6 border border-zinc-800/80 space-y-6">
            <h3 className="font-display font-bold text-lg text-white">General Information</h3>
            
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              {profileSuccess && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg border border-green-500/20 bg-green-500/10 text-green-400 text-xs">
                  <CheckCircle size={16} />
                  <span>{profileSuccess}</span>
                </div>
              )}
              {profileError && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs">
                  <AlertCircle size={16} />
                  <span>{profileError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    User Identifier
                  </label>
                  <input
                    type="text"
                    disabled
                    value={profile?.id || ''}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-850 bg-zinc-950/60 text-zinc-500 text-xs font-mono select-all focus:outline-none cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Registration Date
                  </label>
                  <div className="w-full px-3 py-2 rounded-lg border border-zinc-850 bg-zinc-950/60 text-zinc-400 text-xs flex items-center gap-2 cursor-not-allowed">
                    <Calendar size={12} className="text-zinc-600" />
                    {profile ? new Date(profile.createdAt).toLocaleDateString() : ''}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-850 bg-zinc-950 text-sm focus:outline-none focus:border-brand transition-all text-white focus:ring-2 focus:ring-brand/10"
                />
              </div>

              <button
                type="submit"
                disabled={profileMutation.isPending}
                className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-brand-foreground text-xs font-semibold rounded-lg transition-all disabled:opacity-50"
              >
                {profileMutation.isPending ? 'Updating...' : 'Save Profile'}
              </button>
            </form>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-zinc-800/80 space-y-4">
            <h3 className="font-display font-bold text-lg text-white">Console Role & Tier</h3>
            
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-850 flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider font-mono">Console Tier</span>
                  <span className="text-sm font-extrabold text-white block capitalize">{profile?.plan} Plan</span>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-brand/10 border border-brand/20 text-brand font-mono">
                  ACTIVE
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-850 flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider font-mono">Role Authorization</span>
                  <span className="text-sm font-extrabold text-white block capitalize">{profile?.role} Scope</span>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-zinc-900 border border-zinc-850 text-zinc-400 font-mono">
                  SYSTEM
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password panel */}
      {activeTab === 'password' && (
        <div className="glass-card rounded-2xl p-6 border border-zinc-800/80 space-y-6 max-w-2xl">
          <h3 className="font-display font-bold text-lg text-white">Change Account Password</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Ensure your account is using a long, random password to prevent unauthorized key generation.
          </p>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {passwordSuccess && (
              <div className="flex items-center gap-2.5 p-3 rounded-lg border border-green-500/20 bg-green-500/10 text-green-400 text-xs">
                <CheckCircle size={16} />
                <span>{passwordSuccess}</span>
              </div>
            )}
            {passwordError && (
              <div className="flex items-center gap-2.5 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs">
                <AlertCircle size={16} />
                <span>{passwordError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">
                Current Account Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-3 py-2 rounded-lg border border-zinc-850 bg-zinc-950 text-sm focus:outline-none focus:border-brand transition-all text-white focus:ring-2 focus:ring-brand/10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-850 bg-zinc-950 text-sm focus:outline-none focus:border-brand transition-all text-white focus:ring-2 focus:ring-brand/10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Verify new password"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-850 bg-zinc-950 text-sm focus:outline-none focus:border-brand transition-all text-white focus:ring-2 focus:ring-brand/10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={passwordMutation.isPending}
              className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-brand-foreground text-xs font-semibold rounded-lg transition-all disabled:opacity-50"
            >
              {passwordMutation.isPending ? 'Changing...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
