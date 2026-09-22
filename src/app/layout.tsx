import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'IncidentHub', template: '%s · IncidentHub' },
  description: 'Corporate Incident Management System — Report, track, and resolve workplace incidents across departments.',
}

export const viewport: Viewport = {
  themeColor: '#0f1c42',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: 'var(--font-ibm-plex-sans)',
              fontSize: '0.875rem',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--border-default)',
              boxShadow: 'var(--shadow-elevated)',
            },
            success: { iconTheme: { primary: 'var(--color-success)', secondary: 'white' } },
            error:   { iconTheme: { primary: 'var(--color-danger)',  secondary: 'white' } },
          }}
        />
      </body>
    </html>
  )
}
