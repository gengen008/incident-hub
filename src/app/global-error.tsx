'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('Global error:', error) }, [error])

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', margin: 0, background: '#eef4fb' }}>
        <div style={{ textAlign: 'center', padding: '2rem', maxWidth: 420 }}>
          <div style={{ width: 56, height: 56, margin: '0 auto 16px', borderRadius: 12, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #e2e8f0' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/labianca-logo.jpg" alt="Labianca" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 12 }} />
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Labianca Desk hit a snag</h1>
          <p style={{ fontSize: '0.9rem', color: '#475569', margin: '0 0 20px' }}>Please reload the app. If it keeps happening, close and reopen the tab.</p>
          <button onClick={() => { if ('serviceWorker' in navigator) { navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).finally(() => window.location.reload()) } else { reset(); window.location.reload() } }}
            style={{ background: '#015198', color: 'white', border: 'none', borderRadius: 9, padding: '10px 20px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
