import { create } from 'zustand';
import axios from 'axios';

interface BrandingSettings {
  platformName: string;
  accentColor: string;
  logoUrl: string;
  themePreset: string;
  supportEmail: string;
}

interface BrandingState {
  settings: BrandingSettings;
  isLoading: boolean;
  fetchBranding: () => Promise<void>;
  updateBranding: (newSettings: Partial<BrandingSettings>) => void;
}

const defaultSettings: BrandingSettings = {
  platformName: 'APIaaS',
  accentColor: '#8b5cf6',
  logoUrl: '',
  themePreset: 'dark-violet',
  supportEmail: 'support@example.com',
};

// Helper to apply branding settings to document
export const applyBrandingToDOM = (branding: BrandingSettings) => {
  document.title = branding.platformName + ' | Console';
  
  // Set primary color
  document.documentElement.style.setProperty('--brand-color', branding.accentColor);
  
  // Compute hover color (approximate by adding a CSS filter, or hex computation)
  // For simplicity, we write a quick helper to darken the hex color
  const darkenHex = (hex: string, percent: number) => {
    let num = parseInt(hex.replace('#', ''), 16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) - amt,
      G = ((num >> 8) & 0x00ff) - amt,
      B = (num & 0x0000ff) - amt;
    return (
      '#' +
      (
        0x1000000 +
        (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 0 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  };
  
  try {
    const hoverColor = darkenHex(branding.accentColor, 12);
    document.documentElement.style.setProperty('--brand-color-hover', hoverColor);
  } catch (e) {
    document.documentElement.style.setProperty('--brand-color-hover', branding.accentColor);
  }

  // Clear existing theme classes
  const classesToRemove = Array.from(document.documentElement.classList).filter((c) =>
    c.startsWith('theme-'),
  );
  classesToRemove.forEach((c) => document.documentElement.classList.remove(c));

  // Add new theme class
  document.documentElement.classList.add(`theme-${branding.themePreset}`);
};

export const useBrandingStore = create<BrandingState>((set, get) => ({
  settings: defaultSettings,
  isLoading: false,
  fetchBranding: async () => {
    set({ isLoading: true });
    try {
      // Fetch public branding endpoint
      const res = await axios.get('/api/branding');
      const settings = res.data;
      set({ settings, isLoading: false });
      applyBrandingToDOM(settings);
    } catch (e) {
      console.error('Failed to fetch branding settings, using defaults.', e);
      set({ isLoading: false });
      applyBrandingToDOM(get().settings);
    }
  },
  updateBranding: (newSettings) => {
    set((state) => {
      const settings = { ...state.settings, ...newSettings };
      applyBrandingToDOM(settings);
      return { settings };
    });
  },
}));
