import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useBrandingStore, applyBrandingToDOM } from '../../store/branding.store';
import { apiClient } from '../../api/client';
import { 
  Palette, 
  Settings, 
  HelpCircle, 
  Check, 
  AlertCircle,
  Eye,
  Layout,
  LayoutDashboard,
  Key
} from 'lucide-react';

export default function AdminBranding() {
  const { settings, updateBranding } = useBrandingStore();

  // Local form states
  const [platformName, setPlatformName] = useState(settings.platformName);
  const [accentColor, setAccentColor] = useState(settings.accentColor);
  const [themePreset, setThemePreset] = useState(settings.themePreset);
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail);
  
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync state if settings load after mount
  useEffect(() => {
    setPlatformName(settings.platformName);
    setAccentColor(settings.accentColor);
    setThemePreset(settings.themePreset);
    setSupportEmail(settings.supportEmail);
  }, [settings]);

  // Branding Update Mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.patch('/admin/branding', data);
      return res.data;
    },
    onSuccess: (data) => {
      updateBranding(data);
      setSuccess('Branding settings updated and applied globally!');
      setError(null);
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to update branding settings.');
      setSuccess(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic hex regex validation
    if (!/^#[0-9a-fA-F]{6}$/.test(accentColor)) {
      return setError('Accent color must be a valid 6-character hex code (e.g. #8b5cf6).');
    }

    updateMutation.mutate({
      platformName,
      accentColor,
      themePreset,
      supportEmail,
    });
  };

  // Quick preset loader
  const handlePresetSelect = (preset: string, color: string) => {
    setThemePreset(preset);
    setAccentColor(color);
  };

  const presets = [
    { name: 'Dark Violet (Claude)', id: 'dark-violet', color: '#8b5cf6' },
    { name: 'Amber Sunset', id: 'dark-amber', color: '#f59e0b' },
    { name: 'Teal Matrix', id: 'dark-teal', color: '#14b8a6' },
    { name: 'Deep Rose', id: 'dark-rose', color: '#f43f5e' },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div>
        <h1 className="font-display font-extrabold text-3xl tracking-tight text-white flex items-center gap-3">
          <Palette className="text-amber-500 shrink-0" size={28} />
          Branding Customization
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Customize the console look and feel: update site name titles, primary color theme settings, and contact links.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* Configuration Panel */}
        <div className="lg:col-span-3 glass-card rounded-2xl p-6 border border-zinc-800/80 space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-850 pb-3">
            <Settings size={18} className="text-zinc-400" />
            <h3 className="font-display font-bold text-lg text-white">Theme Details</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {success && (
              <div className="flex items-center gap-2.5 p-3 rounded-lg border border-green-500/20 bg-green-500/10 text-green-400 text-xs">
                <Check size={16} />
                <span>{success}</span>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2.5 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">
                  Platform Name
                </label>
                <input
                  type="text"
                  required
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  placeholder="e.g. My API Platform"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-850 bg-zinc-950 text-sm focus:outline-none focus:border-brand transition-all text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">
                  Support Contact Email
                </label>
                <input
                  type="email"
                  required
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="support@company.com"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-850 bg-zinc-950 text-sm focus:outline-none focus:border-brand transition-all text-white"
                />
              </div>
            </div>

            {/* Presets Grid */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Quick Preset Themes
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetSelect(preset.id, preset.color)}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold flex flex-col justify-between h-18 transition-all hover:bg-zinc-900 ${
                      themePreset === preset.id
                        ? 'border-zinc-400 bg-zinc-900'
                        : 'border-zinc-850 bg-zinc-950/40'
                    }`}
                  >
                    <span className="text-zinc-400 text-[10px]">{preset.name}</span>
                    <div className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: preset.color }}></div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Hex Color Picker */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">
                Custom Theme Accent Color (Hex)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    required
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    placeholder="#8b5cf6"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-850 bg-zinc-950 text-sm focus:outline-none focus:border-brand transition-all text-white font-mono"
                  />
                  <div 
                    className="absolute right-3 top-2.5 w-4 h-4 rounded-full border border-zinc-850" 
                    style={{ backgroundColor: accentColor }}
                  ></div>
                </div>
                
                {/* Standard color input color picker */}
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-10 h-9 p-0.5 rounded-lg border border-zinc-800 bg-zinc-950 cursor-pointer"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-brand-foreground text-xs font-semibold rounded-lg transition-all disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving branding...' : 'Apply Theme'}
            </button>
          </form>
        </div>

        {/* Live Mockup Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 text-zinc-400 font-semibold text-sm">
            <Eye size={16} />
            <span>Theme Live Preview</span>
          </div>

          {/* Interactive mockup card */}
          <div className="border border-zinc-850 bg-zinc-950 rounded-2xl overflow-hidden shadow-2xl relative">
            
            {/* Topbar Mock */}
            <div className="bg-zinc-900/40 border-b border-zinc-850 px-4 py-2.5 flex items-center justify-between text-[10px]">
              <span className="font-mono text-zinc-500 uppercase tracking-widest font-bold">Preview Environment</span>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }}></div>
            </div>

            {/* Inner Dashboard Mock */}
            <div className="p-4 flex gap-4 min-h-60 bg-zinc-950">
              
              {/* Mock Sidebar */}
              <div className="w-28 bg-zinc-900 rounded-lg p-2 flex flex-col justify-between text-[8px] font-semibold border border-zinc-850 shrink-0">
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 p-1 border-b border-zinc-800">
                    <div className="w-4 h-4 rounded bg-zinc-950 flex items-center justify-center text-[7px]" style={{ color: accentColor }}>
                      {platformName.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-white block truncate">{platformName}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 p-1 rounded bg-zinc-800/40" style={{ color: accentColor }}>
                      <LayoutDashboard size={8} />
                      <span>Dashboard</span>
                    </div>
                    <div className="flex items-center gap-1.5 p-1 rounded text-zinc-500">
                      <Key size={8} />
                      <span>API Keys</span>
                    </div>
                  </div>
                </div>

                <div className="p-1 border-t border-zinc-800 text-zinc-600 truncate">
                  {supportEmail}
                </div>
              </div>

              {/* Mock Content */}
              <div className="flex-1 space-y-3">
                <div className="space-y-0.5">
                  <div className="h-2 w-16 bg-zinc-800 rounded"></div>
                  <div className="h-3 w-28 bg-zinc-800 rounded mt-1"></div>
                </div>

                {/* Mock Card */}
                <div className="p-3 bg-zinc-900 border border-zinc-850 rounded-lg flex flex-col justify-between h-20">
                  <div className="flex justify-between items-center">
                    <div className="h-1.5 w-12 bg-zinc-800 rounded"></div>
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: `${accentColor}20` }}></div>
                  </div>
                  <div className="space-y-1 mt-2">
                    <div className="h-3 w-10 bg-zinc-800 rounded" style={{ backgroundColor: accentColor }}></div>
                    <div className="h-1 w-16 bg-zinc-800 rounded"></div>
                  </div>
                </div>

                {/* Mock Button */}
                <button
                  type="button"
                  className="w-full py-1 text-[8px] font-bold rounded flex items-center justify-center"
                  style={{ backgroundColor: accentColor, color: '#ffffff' }}
                >
                  Action Button Demo
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
