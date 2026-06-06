import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/auth.store';
import { useBrandingStore } from './store/branding.store';

// Pages (We will create these files next)
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Keys from './pages/Keys';
import Usage from './pages/Usage';
import Billing from './pages/Billing';
import Settings from './pages/Settings';
import Docs from './pages/Docs';
import Models from './pages/Models';

// Admin Pages
import AdminDashboard from './pages/Admin/Dashboard';
import AdminUsers from './pages/Admin/Users';
import AdminBranding from './pages/Admin/Branding';
import AdminHealth from './pages/Admin/Health';
import AdminModels from './pages/Admin/Models';
import AdminLogs from './pages/Admin/Logs';

// Icons
import { 
  LayoutDashboard, 
  Key, 
  BarChart3, 
  CreditCard, 
  Settings2, 
  BookOpen, 
  Users, 
  ShieldAlert, 
  Activity, 
  Palette, 
  LogOut,
  Menu,
  X,
  User as UserIcon,
  ChevronRight,
  Cpu
} from 'lucide-react';

const queryClient = new QueryClient();

// --- PROTECTED ROUTE COMPONENT ---
const ProtectedRoute = ({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// --- APP LAYOUT SHELL ---
const AppLayout = () => {
  const { user, logout } = useAuthStore();
  const { settings } = useBrandingStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const isAdminPath = location.pathname.startsWith('/admin');

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, role: 'all' },
    { name: 'API Keys', path: '/keys', icon: Key, role: 'all' },
    { name: 'Models & Pricing', path: '/models', icon: Cpu, role: 'all' },
    { name: 'Usage', path: '/usage', icon: BarChart3, role: 'all' },
    { name: 'Billing', path: '/billing', icon: CreditCard, role: 'all' },
    { name: 'Settings', path: '/settings', icon: Settings2, role: 'all' },
    { name: 'Documentation', path: '/docs', icon: BookOpen, role: 'all' },
  ];

  const adminNavItems = [
    { name: 'Admin Summary', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Users List', path: '/admin/users', icon: Users },
    { name: 'Model Catalog', path: '/admin/models', icon: Cpu },
    { name: 'Platform Logs', path: '/admin/logs', icon: BookOpen },
    { name: 'Branding Theme', path: '/admin/branding', icon: Palette },
    { name: 'System Health', path: '/admin/health', icon: Activity },
  ];

  const activeNavItems = isAdminPath ? adminNavItems : navItems;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col md:flex-row text-zinc-100">
      {/* Mobile Header */}
      <header className="md:hidden glass-panel border-b border-zinc-800 p-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center font-display font-extrabold text-brand-foreground shadow-[0_0_15px_rgba(139,92,246,0.5)]">
            {settings.platformName.slice(0, 2).toUpperCase()}
          </div>
          <span className="font-display font-bold text-xl tracking-tight">{settings.platformName}</span>
          {user?.role === 'admin' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-400">
              Admin Mode
            </span>
          )}
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col z-40 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Logo Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center font-display font-extrabold text-brand-foreground shadow-[0_0_20px_rgba(139,92,246,0.3)]">
              {settings.platformName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <span className="font-display font-bold text-lg tracking-tight block leading-tight">{settings.platformName}</span>
              <span className="text-xs text-zinc-500 tracking-wider font-mono">CONSOLE</span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {user?.role === 'admin' && (
            <div className="mb-6">
              <div className="flex items-center justify-between px-3 mb-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Navigation Scope</span>
              </div>
              <div className="grid grid-cols-2 gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800/80">
                <button
                  onClick={() => { navigate('/dashboard'); setSidebarOpen(false); }}
                  className={`py-1.5 text-center text-xs font-semibold rounded-md transition-all ${!isAdminPath ? 'bg-brand text-brand-foreground shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  Console
                </button>
                <button
                  onClick={() => { navigate('/admin/dashboard'); setSidebarOpen(false); }}
                  className={`py-1.5 text-center text-xs font-semibold rounded-md transition-all ${isAdminPath ? 'bg-amber-500 text-black shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  Admin
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 px-3 block mb-2">
              {isAdminPath ? 'Platform Controls' : 'Developer Console'}
            </span>
            {activeNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group
                    ${isActive 
                      ? (isAdminPath 
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
                          : 'bg-brand/10 text-brand border border-brand/20 shadow-[0_0_15px_rgba(139,92,246,0.05)]')
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'}
                  `}
                >
                  <Icon size={18} className={`transition-transform duration-200 group-hover:scale-105 ${isActive ? (isAdminPath ? 'text-amber-400' : 'text-brand') : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                  {item.name}
                  {isActive && <ChevronRight size={14} className="ml-auto opacity-70" />}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Sidebar User Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
              <UserIcon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-zinc-200 block truncate">{user?.email}</span>
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block">
                {user?.plan} Plan
              </span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2 text-xs font-semibold rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 hover:text-red-400 text-zinc-400 transition-colors border-dashed"
          >
            <LogOut size={12} />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main View Container */}
      <main className="flex-1 flex flex-col md:h-screen overflow-y-auto min-w-0">
        <div className="p-6 md:p-10 flex-1 max-w-7xl w-full mx-auto space-y-8 fade-in">
          <Routes>
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/keys" element={<ProtectedRoute><Keys /></ProtectedRoute>} />
            <Route path="/models" element={<ProtectedRoute><Models /></ProtectedRoute>} />
            <Route path="/usage" element={<ProtectedRoute><Usage /></ProtectedRoute>} />
            <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/docs" element={<ProtectedRoute><Docs /></ProtectedRoute>} />
            
            {/* Admin console routes */}
            <Route path="/admin/dashboard" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/models" element={<ProtectedRoute requireAdmin><AdminModels /></ProtectedRoute>} />
            <Route path="/admin/logs" element={<ProtectedRoute requireAdmin><AdminLogs /></ProtectedRoute>} />
            <Route path="/admin/branding" element={<ProtectedRoute requireAdmin><AdminBranding /></ProtectedRoute>} />
            <Route path="/admin/health" element={<ProtectedRoute requireAdmin><AdminHealth /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

// --- APP COMPONENT ---
export default function App() {
  const { fetchBranding } = useBrandingStore();

  useEffect(() => {
    // Initial fetch of custom brand assets
    fetchBranding();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
