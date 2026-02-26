import { Platform } from 'react-native';

function hexToTranslucent(hex: string, opacity = 0.94): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

function getContrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#111111' : '#ffffff';
}

export type BrandKey = (typeof BRAND_ORDER)[number];

export interface BrandTheme {
  key: BrandKey;
  colors: {
    background: string;
    backgroundTranslucent: string;
    backgroundSecondary: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    accent: string;
    accentText: string;
    accentSecondary: string;
    border: string;
    borderHover: string;
    card: string;
    cardBorder: string;
    // Semantic (shared across brands)
    success: string;
    danger: string;
    warning: string;
  };
  typography: {
    fontFamily: string;
    sizes: {
      xs: number;
      sm: number;
      base: number;
      lg: number;
      xl: number;
      '2xl': number;
      '3xl': number;
      '4xl': number;
    };
    weights: {
      normal: '400';
      medium: '500';
      semibold: '600';
      bold: '700';
    };
  };
  borderRadius: {
    none: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
    full: number;
  };
  statusBarStyle: 'light' | 'dark';
}

const SHARED_SIZES = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

const SHARED_WEIGHTS = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

const SHARED_SEMANTIC = {
  success: '#22c55e',
  danger: '#dc2626',
  warning: '#f59e0b',
};

// ── juice: Terminal hacker ──
const juice: BrandTheme = {
  key: 'juice',
  colors: {
    background: '#1a1a1a',
    backgroundTranslucent: hexToTranslucent('#1a1a1a'),
    backgroundSecondary: '#2a2a2a',
    text: '#ffffff',
    textSecondary: '#9ca3af',
    textMuted: '#6b7280',
    accent: '#5CEBDF',
    accentText: getContrastText('#5CEBDF'),
    accentSecondary: '#F5A623',
    border: 'rgba(255, 255, 255, 0.1)',
    borderHover: 'rgba(255, 255, 255, 0.2)',
    card: '#2a2a2a',
    cardBorder: 'rgba(255, 255, 255, 0.1)',
    ...SHARED_SEMANTIC,
  },
  typography: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })!,
    sizes: SHARED_SIZES,
    weights: SHARED_WEIGHTS,
  },
  borderRadius: { none: 0, sm: 0, md: 0, lg: 0, xl: 0, '2xl': 0, full: 0 },
  statusBarStyle: 'light',
};

// ── vans: Skate punk — checkerboard energy, zine aesthetic ──
const vans: BrandTheme = {
  key: 'vans',
  colors: {
    background: '#0d0d0d',
    backgroundTranslucent: hexToTranslucent('#0d0d0d'),
    backgroundSecondary: '#1a1a1a',
    text: '#ffffff',
    textSecondary: '#b0b0b0',
    textMuted: '#707070',
    accent: '#ffffff',
    accentText: getContrastText('#ffffff'),
    accentSecondary: '#e63946',
    border: 'rgba(255, 255, 255, 0.1)',
    borderHover: 'rgba(255, 255, 255, 0.2)',
    card: '#1a1a1a',
    cardBorder: 'rgba(255, 255, 255, 0.1)',
    ...SHARED_SEMANTIC,
  },
  typography: {
    fontFamily: Platform.select({ ios: 'AvenirNext-Bold', android: 'sans-serif-medium', default: 'system-ui, sans-serif' })!,
    sizes: SHARED_SIZES,
    weights: SHARED_WEIGHTS,
  },
  borderRadius: { none: 0, sm: 0, md: 0, lg: 0, xl: 0, '2xl': 0, full: 0 },
  statusBarStyle: 'light',
};

// ── nike: Athletic minimal ──
const nike: BrandTheme = {
  key: 'nike',
  colors: {
    background: '#ffffff',
    backgroundTranslucent: hexToTranslucent('#ffffff'),
    backgroundSecondary: '#f5f5f5',
    text: '#111111',
    textSecondary: '#707070',
    textMuted: '#999999',
    accent: '#CDFF00',
    accentText: getContrastText('#CDFF00'),
    accentSecondary: '#FF6B35',
    border: '#e5e5e5',
    borderHover: '#cccccc',
    card: '#f5f5f5',
    cardBorder: '#e5e5e5',
    ...SHARED_SEMANTIC,
  },
  typography: {
    fontFamily: Platform.select({ ios: 'AvenirNextCondensed-Bold', android: 'sans-serif-condensed', default: 'sans-serif' })!,
    sizes: SHARED_SIZES,
    weights: SHARED_WEIGHTS,
  },
  borderRadius: { none: 0, sm: 4, md: 8, lg: 12, xl: 16, '2xl': 20, full: 9999 },
  statusBarStyle: 'dark',
};

// ── ibm: Corporate blue ──
const ibm: BrandTheme = {
  key: 'ibm',
  colors: {
    background: '#f4f4f4',
    backgroundTranslucent: hexToTranslucent('#f4f4f4'),
    backgroundSecondary: '#ffffff',
    text: '#161616',
    textSecondary: '#525252',
    textMuted: '#8d8d8d',
    accent: '#0043CE',
    accentText: getContrastText('#0043CE'),
    accentSecondary: '#da1e28',
    border: '#e0e0e0',
    borderHover: '#c6c6c6',
    card: '#ffffff',
    cardBorder: '#e0e0e0',
    ...SHARED_SEMANTIC,
  },
  typography: {
    fontFamily: Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: "'Helvetica Neue', Helvetica, Arial, sans-serif" })!,
    sizes: SHARED_SIZES,
    weights: SHARED_WEIGHTS,
  },
  borderRadius: { none: 0, sm: 0, md: 0, lg: 0, xl: 0, '2xl': 0, full: 0 },
  statusBarStyle: 'dark',
};

// ── apple: Ultra-minimal ──
const apple: BrandTheme = {
  key: 'apple',
  colors: {
    background: '#ffffff',
    backgroundTranslucent: hexToTranslucent('#ffffff'),
    backgroundSecondary: '#f5f5f7',
    text: '#1d1d1f',
    textSecondary: '#6e6e73',
    textMuted: '#86868b',
    accent: '#0071E3',
    accentText: getContrastText('#0071E3'),
    accentSecondary: '#86868b',
    border: '#d2d2d7',
    borderHover: '#b0b0b5',
    card: '#f5f5f7',
    cardBorder: '#d2d2d7',
    ...SHARED_SEMANTIC,
  },
  typography: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif" })!,
    sizes: SHARED_SIZES,
    weights: SHARED_WEIGHTS,
  },
  borderRadius: { none: 0, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, full: 9999 },
  statusBarStyle: 'dark',
};

// ── aarp: Big text, high contrast, easy on the eyes ──
const BIG_SIZES = {
  xs: 16,
  sm: 18,
  base: 20,
  lg: 24,
  xl: 28,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;

const aarp: BrandTheme = {
  key: 'aarp',
  colors: {
    background: '#fff8f0',
    backgroundTranslucent: hexToTranslucent('#fff8f0'),
    backgroundSecondary: '#ffffff',
    text: '#1a1a1a',
    textSecondary: '#4a4a4a',
    textMuted: '#777777',
    accent: '#1565c0',
    accentText: getContrastText('#1565c0'),
    accentSecondary: '#c62828',
    border: '#d4c5b5',
    borderHover: '#b8a898',
    card: '#ffffff',
    cardBorder: '#d4c5b5',
    ...SHARED_SEMANTIC,
  },
  typography: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' })!,
    sizes: BIG_SIZES,
    weights: SHARED_WEIGHTS,
  },
  borderRadius: { none: 0, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, full: 9999 },
  statusBarStyle: 'dark',
};

export const BRANDS: Record<BrandKey, BrandTheme> = {
  juice,
  vans,
  nike,
  ibm,
  apple,
  aarp,
};

export const BRAND_ORDER = ['juice', 'vans', 'nike', 'ibm', 'apple', 'aarp'] as const;

export const BRAND_LABELS: Record<BrandKey, string> = {
  juice: '⚡',
  vans: '☠',
  nike: '◆',
  ibm: '▦',
  apple: '○',
  aarp: '👓',
};
