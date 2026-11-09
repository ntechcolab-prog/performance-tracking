import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import './globals.css'

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Performance Tracking — Dashboard',
  icons: { icon: '/favicon.svg', apple: '/apple-touch-icon.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={roboto.variable}>
      {/* Injects window.configuration before the app runs (runtime, not build).
          It lives in <head> as a plain blocking script: React 19 refuses to hoist
          a sync script rendered outside the document head, and next/script's
          beforeInteractive tripped that check on every page. */}
      <head>
        <script src="/runtime-config.js" />
      </head>
      <body>{children}</body>
    </html>
  )
}
