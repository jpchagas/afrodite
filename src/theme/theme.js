import { createTheme } from '@mui/material/styles'

// Paleta principal do CRM Afrodite
export const brand = {
  wine: '#6a3b4f',     // cor primária — profunda, transmite seriedade clínica
  rose: '#8f536d',     // cor secundária — mais suave, usada em acentos e hover
  wineDark: '#4d2a39', // variação escura, usada em textos sobre fundo claro / status bar
  roseLight: '#c98ba3',// variação clara, usada em fundos suaves e estados desabilitados
  cream: '#faf6f7',    // fundo neutro claro
  ink: '#2b1b21'       // texto principal
}

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
    background: {
      default: brand.cream,
      paper: '#ffffff'
    },
    text: {
      primary: brand.ink,
      secondary: '#6b5a60'
    }
  },
  shape: {
    borderRadius: 14
  },
  typography: {
    fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
    h1: { fontWeight: 600 },
    h2: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingTop: 10,
          paddingBottom: 10
        }
      }
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          height: 68
        }
      }
    }
  }
})

export default theme
