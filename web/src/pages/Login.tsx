import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useBrandingStore } from '../store/branding.store';
import { apiClient } from '../api/client';
import { KeyRound, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuthStore();
  const { settings } = useBrandingStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = res.data;
      login(user, accessToken, refreshToken);
      
      // Redirect to admin dashboard if role is admin, else user dashboard
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Login failed. Please verify your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative gradient glowing spheres */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Branding header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-brand flex items-center justify-center font-display font-extrabold text-brand-foreground shadow-[0_0_30px_rgba(139,92,246,0.4)] mx-auto text-xl">
            {settings.platformName.slice(0, 2).toUpperCase()}
          </div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight text-white mt-4">
            Welcome to {settings.platformName}
          </h1>
          <p className="text-sm text-zinc-400">
            Access your developer tokens & analytics
          </p>
        </div>

        {/* Auth Card */}
        <div className="glass-card rounded-2xl p-8 border border-zinc-800/80">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-800 bg-zinc-950/80 placeholder-zinc-600 focus:outline-none focus:border-brand text-sm transition-all focus:ring-2 focus:ring-brand/10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <KeyRound size={16} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-800 bg-zinc-950/80 placeholder-zinc-600 focus:outline-none focus:border-brand text-sm transition-all focus:ring-2 focus:ring-brand/10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-brand hover:bg-brand-hover text-brand-foreground font-semibold text-sm transition-all shadow-[0_4px_20px_rgba(139,92,246,0.15)] flex items-center justify-center gap-2 group hover:shadow-[0_4px_20px_rgba(139,92,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-800/80 text-center">
            <p className="text-xs text-zinc-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-brand hover:text-brand-hover font-semibold transition-colors">
                Create free console account
              </Link>
            </p>
          </div>
        </div>

        {/* Demo instructions */}
        <div className="p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/30 text-center text-xs text-zinc-500 space-y-1">
          <p>💡 Quick access accounts seeded automatically:</p>
          <div className="grid grid-cols-2 gap-2 mt-2 font-mono">
            <div className="bg-zinc-950/40 p-2 rounded border border-zinc-800/40">
              <span className="text-zinc-400 block font-semibold">User Dashboard</span>
              demo@example.com / demo123
            </div>
            <div className="bg-zinc-950/40 p-2 rounded border border-zinc-800/40">
              <span className="text-zinc-400 block font-semibold">Admin Panel</span>
              admin@example.com / admin123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
