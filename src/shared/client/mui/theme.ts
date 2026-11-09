'use client'

import { createTheme, alpha } from '@mui/material/styles'
import type { Shadows } from '@mui/material/styles'

// Values aligned with the Techco.lab DS (src/ds/tokens.css) on 2026-11-09.
// IRIS / Digital Reports design tokens, mapped from app/globals.css @theme so the
// MUI v2 app reads as the same product as the Tailwind v0/v1 versions — not
// "Material out of the box". Keep these in sync with the CSS tokens.
const tokens = {
  header: '#4c4d57',
  sidebar: '#5c5f62',
  page: '#f6f6f6',
  card: '#ffffff',

  primary: '#007167', // DS accent
  primary700: '#005f57', // DS accent-hover
  primarySoft: '#e2f0ed',

  ink: '#4c4d57', // DS text
  inkSoft: '#5c5f62', // DS text-muted
  muted: '#7d7f84', // DS text-subtle
  faint: '#c3c5c7',
  line: '#e8e8e8', // DS border
  lineSoft: '#f0f1f2',

  up: '#007167', // DS success
  down: '#c12907',
  warning: '#e7b547', // DS warning

  irisBlue: '#6ca8c9',
  irisBlue700: '#5b97b8',
  irisTopbar: '#41414a',
} as const

export const chartPalette = ['#46aa9f', '#6bb7b0', '#f19909', '#f89984', '#a2a6ac']

// Exposed so components can reach IRIS-specific colors that don't map onto a
// standard MUI palette slot (sidebar/header chrome, iris blue accents).
export const iris = tokens

// Flat, soft, brand-tinted elevation ladder — replaces Material's grey drop
// shadows. Tinted toward the ink hue so surfaces read as an industrial product,
// not stock Material. 25 entries as MUI requires.
const shadowInk = '38, 40, 52'
const shadows = Array.from({ length: 25 }, (_, i) => {
  if (i === 0) return 'none'
  const y = Math.min(1 + i, 14)
  const blur = Math.min(3 + i * 2, 44)
  const a = Math.min(0.05 + i * 0.006, 0.16)
  return `0 ${y}px ${blur}px rgba(${shadowInk}, ${a})`
}) as unknown as Shadows

const cardShadow = `0 1px 2px rgba(${shadowInk}, 0.04), 0 2px 10px rgba(${shadowInk}, 0.05)`

const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: 'light',
    primary: { main: tokens.primary, dark: tokens.primary700, light: tokens.primarySoft, contrastText: '#ffffff' },
    secondary: { main: tokens.irisBlue, dark: tokens.irisBlue700, contrastText: '#ffffff' },
    success: { main: tokens.up },
    error: { main: tokens.down },
    warning: { main: tokens.warning },
    background: { default: tokens.page, paper: tokens.card },
    text: { primary: tokens.ink, secondary: tokens.muted, disabled: tokens.faint },
    divider: tokens.line,
  },
  shape: { borderRadius: 8 },
  shadows,
  typography: {
    fontFamily: '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif', // Techco.lab DS --font-sans
    // Hierarchy through scale + weight contrast, tighter than Material default.
    h4: { fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.01em', lineHeight: 1.2 },
    h5: { fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.01em', lineHeight: 1.25 },
    h6: { fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.005em', lineHeight: 1.3 },
    subtitle1: { fontWeight: 600, fontSize: '0.9375rem' },
    subtitle2: { fontWeight: 600, fontSize: '0.8125rem' },
    body1: { fontSize: '0.9375rem', lineHeight: 1.55 },
    body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
    caption: { fontSize: '0.75rem', lineHeight: 1.4 },
    // Section eyebrows across the product — uppercase, tracked, small.
    overline: { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', lineHeight: 1.6 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*::-webkit-scrollbar': { width: 8, height: 8 },
        '*::-webkit-scrollbar-thumb': { background: tokens.faint, borderRadius: 8 },
        '*': { scrollbarWidth: 'thin', scrollbarColor: `${tokens.faint} transparent` },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: tokens.line },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { boxShadow: cardShadow, border: `1px solid ${tokens.line}`, borderRadius: 12 },
      },
    },
    MuiAppBar: { defaultProps: { elevation: 0 } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, paddingInline: 14 },
        sizeSmall: { paddingInline: 10, paddingBlock: 4 },
        outlined: {
          borderColor: tokens.line,
          color: tokens.inkSoft,
          '&:hover': { borderColor: tokens.primary, backgroundColor: alpha(tokens.primary, 0.06) },
          '&.MuiButton-colorPrimary': {
            borderColor: alpha(tokens.primary, 0.5),
            color: tokens.primary,
            '&:hover': { borderColor: tokens.primary, backgroundColor: alpha(tokens.primary, 0.08) },
          },
        },
        contained: { '&.MuiButton-colorPrimary:hover': { backgroundColor: tokens.primary700 } },
        text: { '&:hover': { backgroundColor: alpha(tokens.primary, 0.08) } },
      },
    },
    // Segmented-pill tabs (the IRIS / v1 look) instead of Material's underline.
    MuiTabs: {
      styleOverrides: {
        // Pill track works for standard and scrollable variants alike; width is
        // left flexible so scrollable Tabs (Settings, batch editor) don't fight
        // the layout. Screens that want the control to hug its tabs set
        // sx={{ width: 'fit-content' }} locally.
        root: {
          minHeight: 40,
          backgroundColor: tokens.page,
          borderRadius: 10,
          padding: 4,
          border: `1px solid ${tokens.line}`,
        },
        indicator: {
          height: '100%',
          bottom: 0,
          borderRadius: 7,
          backgroundColor: tokens.card,
          boxShadow: cardShadow,
          zIndex: 0,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 32,
          padding: '6px 18px',
          borderRadius: 7,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.8125rem',
          color: tokens.muted,
          zIndex: 1,
          transition: 'color 0.2s',
          '&:hover': { color: tokens.inkSoft },
          '&.Mui-selected': { color: tokens.primary },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: { backgroundColor: tokens.page, borderRadius: 9, padding: 3, gap: 3, border: `1px solid ${tokens.line}` },
        grouped: { border: 'none !important', borderRadius: '7px !important' },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.8125rem',
          color: tokens.muted,
          padding: '5px 14px',
          '&:hover': { backgroundColor: alpha(tokens.ink, 0.04) },
          '&.Mui-selected': {
            backgroundColor: tokens.card,
            color: tokens.primary,
            boxShadow: cardShadow,
            '&:hover': { backgroundColor: tokens.card },
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: tokens.card,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.line },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: tokens.faint },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: tokens.primary, borderWidth: 1 },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: '0.75rem' },
        outlined: { borderColor: tokens.line },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: tokens.irisTopbar,
          fontSize: '0.75rem',
          fontWeight: 500,
          padding: '6px 10px',
          borderRadius: 7,
        },
        arrow: { color: tokens.irisTopbar },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: tokens.lineSoft, padding: '10px 14px', fontSize: '0.8125rem' },
        head: {
          fontWeight: 700,
          fontSize: '0.6875rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: tokens.muted,
          backgroundColor: tokens.page,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { '&:hover': { backgroundColor: alpha(tokens.primary, 0.03) } },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { border: `1px solid ${tokens.line}`, borderRadius: 10, boxShadow: shadows[6] },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: tokens.line } },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { borderColor: tokens.line },
      },
    },
  },
})

export default theme
