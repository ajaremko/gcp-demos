export const theme = {
  colors: {
    background: '#f7f8fa',
    surface: '#ffffff',
    surfaceAlt: '#f1f3f6',
    border: '#e3e6eb',
    text: '#16181d',
    textMuted: '#666b76',
    primary: '#4f46e5',
    primaryHover: '#4338ca',
    danger: '#dc2626',
    success: '#16a34a',
  },
  radii: {
    sm: '8px',
    md: '12px',
    lg: '20px',
    pill: '999px',
  },
  spacing: (multiplier: number) => `${multiplier * 8}px`,
} as const

export type Theme = typeof theme
