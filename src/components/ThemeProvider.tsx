import { useEffect, type ReactNode } from 'react';
import { useStore } from '@/store/useStore';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { settings } = useStore();
  const { theme, fontFamily, fontSize } = settings;

  useEffect(() => {
    const root = document.documentElement;
    
    // Apply theme
    const themeMap: Record<string, Record<string, string>> = {
      dark: {
        '--bg-base': '#020617',
        '--bg-surface': '#0F172A',
        '--bg-elevated': '#1E293B',
        '--bg-glass': 'rgba(15, 23, 42, 0.7)',
        '--text-primary': '#F1F5F9',
        '--text-secondary': '#94A3B8',
        '--text-muted': '#475569',
        '--text-inverse': '#0F172A',
        '--accent-blue': '#3B82F6',
        '--accent-blue-glow': 'rgba(59, 130, 246, 0.3)',
        '--accent-amber': '#F59E0B',
        '--accent-amber-dim': 'rgba(245, 158, 11, 0.15)',
        '--accent-emerald': '#10B981',
        '--accent-rose': '#F43F5E',
      },
      light: {
        '--bg-base': '#F8FAFC',
        '--bg-surface': '#FFFFFF',
        '--bg-elevated': '#F1F5F9',
        '--bg-glass': 'rgba(255, 255, 255, 0.7)',
        '--text-primary': '#0F172A',
        '--text-secondary': '#64748B',
        '--text-muted': '#94A3B8',
        '--text-inverse': '#FFFFFF',
        '--accent-blue': '#3B82F6',
        '--accent-blue-glow': 'rgba(59, 130, 246, 0.2)',
        '--accent-amber': '#F59E0B',
        '--accent-amber-dim': 'rgba(245, 158, 11, 0.1)',
        '--accent-emerald': '#10B981',
        '--accent-rose': '#F43F5E',
      },
      sepia: {
        '--bg-base': '#F5E6D3',
        '--bg-surface': '#FAF0E6',
        '--bg-elevated': '#EDE0D0',
        '--bg-glass': 'rgba(250, 240, 230, 0.7)',
        '--text-primary': '#433422',
        '--text-secondary': '#6B5B4F',
        '--text-muted': '#A09080',
        '--text-inverse': '#FAF0E6',
        '--accent-blue': '#5B8DB8',
        '--accent-blue-glow': 'rgba(91, 141, 184, 0.2)',
        '--accent-amber': '#B8860B',
        '--accent-amber-dim': 'rgba(184, 134, 11, 0.1)',
        '--accent-emerald': '#2E8B57',
        '--accent-rose': '#B22222',
      },
      'high-contrast': {
        '--bg-base': '#000000',
        '--bg-surface': '#000000',
        '--bg-elevated': '#1A1A1A',
        '--bg-glass': 'rgba(0, 0, 0, 0.9)',
        '--text-primary': '#FFFFFF',
        '--text-secondary': '#FFFF00',
        '--text-muted': '#00FFFF',
        '--text-inverse': '#000000',
        '--accent-blue': '#FFFF00',
        '--accent-blue-glow': 'rgba(255, 255, 0, 0.3)',
        '--accent-amber': '#FF00FF',
        '--accent-amber-dim': 'rgba(255, 0, 255, 0.2)',
        '--accent-emerald': '#00FF00',
        '--accent-rose': '#FF0000',
      },
      'pure-black': {
        '--bg-base': '#000000',
        '--bg-surface': '#0A0A0A',
        '--bg-elevated': '#141414',
        '--bg-glass': 'rgba(10, 10, 10, 0.8)',
        '--text-primary': '#E5E5E5',
        '--text-secondary': '#A0A0A0',
        '--text-muted': '#666666',
        '--text-inverse': '#0A0A0A',
        '--accent-blue': '#60A5FA',
        '--accent-blue-glow': 'rgba(96, 165, 250, 0.2)',
        '--accent-amber': '#FBBF24',
        '--accent-amber-dim': 'rgba(251, 191, 36, 0.1)',
        '--accent-emerald': '#34D399',
        '--accent-rose': '#FB7185',
      },
    };

    const colors = themeMap[theme] ?? themeMap.dark;
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Apply font family
    const fontMap: Record<string, string> = {
      sans: 'Inter, sans-serif',
      serif: 'Georgia, serif',
      dyslexic: 'OpenDyslexic3, sans-serif',
    };
    root.style.setProperty('--font-heading', `Space Grotesk, ${fontMap[fontFamily] ?? fontMap.sans}`);
    root.style.setProperty('--font-body', fontMap[fontFamily] ?? fontMap.sans);

    // Apply font size
    const sizeMap: Record<string, string> = {
      small: '14px',
      medium: '16px',
      large: '18px',
    };
    root.style.setProperty('--passage-font-size', sizeMap[fontSize] ?? '16px');
    root.style.setProperty('--question-font-size', sizeMap[fontSize] ?? '16px');
  }, [theme, fontFamily, fontSize]);

  return <>{children}</>;
}
