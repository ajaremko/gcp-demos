export const theme = {
  colors: {
    background: '#0f1115',
    surface: '#181b21',
    surfaceAlt: '#20242c',
    border: '#2a2f39',
    text: '#f4f5f7',
    textMuted: '#a3a9b5',
    primary: '#6366f1',
    primaryHover: '#818cf8',
    danger: '#f87171',
    success: '#4ade80',
  },
  radii: {
    sm: '6px',
    md: '10px',
    lg: '16px',
  },
  spacing: (multiplier: number) => `${multiplier * 8}px`,
} as const

export type Theme = typeof theme
