// Juicy Vision Color Palette
export const colors = {
  // Brand colors
  juiceOrange: '#F5A623',
  juiceCyan: '#5CEBDF',

  // Dark theme
  juiceDark: '#1a1a1a',
  juiceDarkLighter: '#2a2a2a',

  // Light theme
  lightBg: '#f5f5f5',
  lightDarker: '#e5e5e5',

  // Semantic
  success: '#22c55e',
  danger: '#dc2626',
  warning: '#f59e0b',

  // Text colors
  white: '#ffffff',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',

  // Transparency helpers
  whiteAlpha10: 'rgba(255, 255, 255, 0.1)',
  whiteAlpha20: 'rgba(255, 255, 255, 0.2)',
  whiteAlpha50: 'rgba(255, 255, 255, 0.5)',
  whiteAlpha80: 'rgba(255, 255, 255, 0.8)',
  blackAlpha10: 'rgba(0, 0, 0, 0.1)',
  blackAlpha20: 'rgba(0, 0, 0, 0.2)',
  blackAlpha50: 'rgba(0, 0, 0, 0.5)',

  // Juice gradients (for reference)
  orangeGlow: 'rgba(245, 166, 35, 0.3)',
  cyanGlow: 'rgba(92, 235, 223, 0.3)',
};

// Typography
export const typography = {
  fontFamily: 'SpaceMono_400Regular',

  // Font sizes (matching Tailwind scale)
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

// Spacing (matching Tailwind scale, in pixels)
export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
};

// Border radius - all squared off
export const borderRadius = {
  none: 0,
  sm: 0,
  md: 0,
  lg: 0,
  xl: 0,
  '2xl': 0,
  full: 0,
};

// Dark theme (default)
export const darkTheme = {
  background: colors.juiceDark,
  backgroundSecondary: colors.juiceDarkLighter,
  text: colors.white,
  textSecondary: colors.gray400,
  textMuted: colors.gray500,
  border: colors.whiteAlpha10,
  borderHover: colors.whiteAlpha20,
  accent: colors.juiceCyan,
  accentSecondary: colors.juiceOrange,
  card: colors.juiceDarkLighter,
  cardBorder: colors.whiteAlpha10,
};

// Light theme
export const lightTheme = {
  background: colors.lightBg,
  backgroundSecondary: colors.white,
  text: colors.gray900,
  textSecondary: colors.gray600,
  textMuted: colors.gray500,
  border: colors.gray200,
  borderHover: colors.gray300,
  accent: colors.juiceCyan,
  accentSecondary: colors.juiceOrange,
  card: colors.white,
  cardBorder: colors.gray200,
};

// Button variants
export const buttonVariants = {
  primary: {
    background: colors.juiceCyan,
    text: colors.juiceDark,
    border: 'transparent',
  },
  secondary: {
    background: colors.juiceDarkLighter,
    text: colors.white,
    border: colors.whiteAlpha10,
  },
  outline: {
    background: 'transparent',
    text: colors.white,
    border: colors.whiteAlpha20,
  },
  ghost: {
    background: 'transparent',
    text: colors.gray400,
    border: 'transparent',
  },
  danger: {
    background: colors.danger,
    text: colors.white,
    border: 'transparent',
  },
};

// Common shadow styles
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  glow: {
    shadowColor: colors.juiceCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  glowOrange: {
    shadowColor: colors.juiceOrange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
};

// Glass effect helper
export const glass = {
  background: colors.whiteAlpha10,
  borderColor: colors.whiteAlpha10,
  borderWidth: 1,
};

// Layout constraints
export const layout = {
  maxWidth: 900,
  contentWidth: '100%' as const,
};

// Brand theming system
export { useTheme } from './useTheme';
export { BRANDS, BRAND_ORDER, BRAND_LABELS } from './brands';
export type { BrandTheme, BrandKey } from './brands';

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  darkTheme,
  lightTheme,
  buttonVariants,
  shadows,
  glass,
  layout,
};
