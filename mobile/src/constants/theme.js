export const COLORS = {
  primary: '#ECEC75',
  primaryDark: '#d4d44a',
  black: '#0f172a',
  white: '#ffffff',
  gray50: '#f8fafc',
  gray100: '#f1f5f9',
  gray200: '#e2e8f0',
  gray300: '#cbd5e1',
  gray400: '#94a3b8',
  gray500: '#64748b',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1e293b',
  gray900: '#0f172a',
  red: '#ef4444',
  green: '#22c55e',
  greenDark: '#16a34a',
  amber: '#f59e0b',
  orange: '#f97316',
  blue: '#3b82f6',
};

export const FONTS = {
  regular: { fontSize: 14, color: COLORS.gray700 },
  medium: { fontSize: 14, fontWeight: '500', color: COLORS.gray800 },
  bold: { fontSize: 14, fontWeight: '700', color: COLORS.gray900 },
  h1: { fontSize: 28, fontWeight: '700', color: COLORS.gray900 },
  h2: { fontSize: 22, fontWeight: '700', color: COLORS.gray900 },
  h3: { fontSize: 18, fontWeight: '600', color: COLORS.gray900 },
  body: { fontSize: 14, color: COLORS.gray600, lineHeight: 20 },
  caption: { fontSize: 12, color: COLORS.gray400 },
};

export const SIZES = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  radius: 12,
  radiusSm: 8,
  radiusLg: 16,
  radiusFull: 999,
};

export const API_URL = 'http://192.168.29.128:8000/api';
