import { createTheme, alpha } from '@mui/material/styles'

// Paleta principal do CRM Afrodite
export const brand = {
  wine: '#6a3b4f',      // cor primária — profunda, transmite seriedade clínica
  rose: '#8f536d',      // cor secundária — mais suave, usada em acentos e hover
  wineDark: '#4a2736',  // variação escura, usada em textos sobre fundo claro / status bar
  roseLight: '#d9b3c2', // variação clara, usada em fundos suaves e estados desabilitados
  blush: '#f4e9ed',     // fundo de destaque suave (ícones, avatares)
  gold: '#b08d57',      // acento champanhe — detalhes premium, com moderação
  cream: '#f8f4f2',     // fundo neutro claro (marfim)
  surface: '#ffffff',
  ink: '#24161c',       // texto principal
  muted: '#7b6a71',     // texto secundário
  line: 'rgba(74, 39, 54, 0.08)' // bordas e divisores
}

export const gradients = {
  wine: `linear-gradient(140deg, ${brand.wineDark} 0%, ${brand.wine} 52%, ${brand.rose} 100%)`,
  soft: `linear-gradient(160deg, #fbf7f5 0%, ${brand.blush} 100%)`
}

export const shadows = {
  card: '0 1px 2px rgba(36, 22, 28, 0.04), 0 6px 20px -10px rgba(36, 22, 28, 0.12)',
  raised: '0 2px 6px rgba(36, 22, 28, 0.06), 0 18px 40px -16px rgba(74, 39, 54, 0.28)',
  nav: '0 10px 40px -10px rgba(36, 22, 28, 0.25), 0 2px 8px rgba(36, 22, 28, 0.06)'
}

export const fonts = {
  display: "'Cormorant Garamond', 'Times New Roman', serif",
  body: "'Inter Variable', 'Inter', 'Segoe UI', Roboto, sans-serif"
}

// Topo seguro para telas sem cabeçalho fixo (notch / status bar do PWA)
export const safeTop = 'calc(env(safe-area-inset-top, 0px) + 20px)'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: brand.wine,
      dark: brand.wineDark,
      light: brand.rose,
      contrastText: '#ffffff'
    },
    secondary: {
      main: brand.rose,
      contrastText: '#ffffff'
    },
    success: { main: '#2f7a51' },
    warning: { main: '#b07a1f' },
    error: { main: '#b3364a' },
    background: {
      default: brand.cream,
      paper: brand.surface
    },
    text: {
      primary: brand.ink,
      secondary: brand.muted
    },
    divider: brand.line
  },
  shape: {
    borderRadius: 14
  },
  typography: {
    fontFamily: fonts.body,
    h1: { fontFamily: fonts.display, fontWeight: 600 },
    h2: { fontFamily: fonts.display, fontWeight: 600 },
    h3: { fontFamily: fonts.display, fontWeight: 600, letterSpacing: '-0.01em' },
    h4: { fontFamily: fonts.display, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.1 },
    h5: { fontFamily: fonts.display, fontWeight: 600, lineHeight: 1.15 },
    h6: { fontWeight: 650, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 600, letterSpacing: '-0.005em' },
    subtitle2: { fontWeight: 600, letterSpacing: '-0.005em' },
    body2: { lineHeight: 1.55 },
    caption: { letterSpacing: '0.005em' },
    overline: { fontWeight: 600, letterSpacing: '0.14em', fontSize: '0.68rem', lineHeight: 1.6 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.005em' }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: brand.cream,
          WebkitFontSmoothing: 'antialiased',
          WebkitTapHighlightColor: 'transparent',
          fontFeatureSettings: "'cv11', 'ss01'"
        },
        '@keyframes afFadeUp': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'none' }
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            transitionDuration: '0.01ms !important'
          }
        }
      }
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: `1px solid ${brand.line}`,
          boxShadow: shadows.card,
          backgroundColor: brand.surface
        }
      }
    },
    MuiCardActionArea: {
      styleOverrides: {
        root: {
          transition: 'transform 160ms ease, background-color 160ms ease',
          '&:active': { transform: 'scale(0.985)' }
        },
        focusHighlight: { backgroundColor: brand.wine }
      }
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 14,
          minHeight: 44,
          paddingInline: 20,
          transition: 'transform 140ms ease, box-shadow 160ms ease, background-color 160ms ease',
          '&:active': { transform: 'scale(0.98)' }
        },
        sizeLarge: { minHeight: 52, fontSize: '0.98rem' },
        sizeSmall: { minHeight: 34, paddingInline: 14, borderRadius: 11 },
        containedPrimary: {
          backgroundImage: `linear-gradient(135deg, ${brand.wine} 0%, ${brand.rose} 100%)`,
          boxShadow: `0 8px 20px -10px ${alpha(brand.wine, 0.7)}`,
          '&:hover': {
            backgroundImage: `linear-gradient(135deg, ${brand.wineDark} 0%, ${brand.wine} 100%)`
          },
          '&.Mui-disabled': { backgroundImage: 'none' }
        },
        outlined: {
          borderColor: alpha(brand.wine, 0.22),
          backgroundColor: brand.surface,
          '&:hover': { borderColor: brand.wine, backgroundColor: alpha(brand.wine, 0.04) }
        },
        text: { '&:hover': { backgroundColor: alpha(brand.wine, 0.06) } }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: { '&:active': { transform: 'scale(0.94)' }, transition: 'transform 140ms ease' }
      }
    },
    MuiFab: {
      styleOverrides: {
        root: { boxShadow: shadows.raised },
        primary: {
          backgroundImage: `linear-gradient(135deg, ${brand.wine} 0%, ${brand.rose} 100%)`
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundColor: brand.surface,
          transition: 'box-shadow 160ms ease',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(brand.wine, 0.14) },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(brand.wine, 0.3) },
          '&.Mui-focused': { boxShadow: `0 0 0 4px ${alpha(brand.wine, 0.08)}` },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: 1.5 }
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 999 },
        sizeSmall: { height: 24, fontSize: '0.72rem' }
      }
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 44 },
        indicator: { height: 2.5, borderRadius: 2 }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 44,
          minWidth: 'auto',
          paddingInline: 14,
          color: brand.muted,
          '&.Mui-selected': { color: brand.wine }
        }
      }
    },
    MuiSkeleton: {
      defaultProps: { animation: 'wave' },
      styleOverrides: {
        root: { backgroundColor: alpha(brand.wine, 0.06) },
        rounded: { borderRadius: 20 }
      }
    },
    MuiAvatar: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: '0.95rem', letterSpacing: '0.02em' }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paperAnchorBottom: {
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)'
        }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 14, alignItems: 'center' },
        filled: { boxShadow: shadows.raised }
      }
    },
    MuiListItemButton: {
      styleOverrides: { root: { '&:active': { backgroundColor: alpha(brand.wine, 0.06) } } }
    },
    MuiCheckbox: {
      styleOverrides: { root: { color: alpha(brand.wine, 0.35) } }
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: { height: 64, backgroundColor: 'transparent' }
      }
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          minWidth: 0,
          paddingInline: 0,
          color: brand.muted,
          '&.Mui-selected': { color: brand.wine }
        },
        label: {
          fontSize: '0.68rem',
          fontWeight: 600,
          marginTop: 2,
          '&.Mui-selected': { fontSize: '0.68rem' }
        }
      }
    }
  }
})

export default theme
