import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
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
  title: { default: 'Labianca Desk', template: '%s · Labianca Desk' },
  description: 'Centralized inter-departmental request and messaging platform for Labianca Company Limited.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Labianca Desk',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Labianca Desk' },
  icons: {
    icon: [{ url: '/favicon-32.png', sizes: '32x32', type: 'image/png' }, { url: '/favicon.png', sizes: '64x64', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#015198',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
      <body>
        {children}
        <ServiceWorkerRegister />
        <Toaster
          position="top-center"
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
