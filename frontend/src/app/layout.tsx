import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OpenClawFactory — Mission Control',
  description: 'Multi-agent AI factory floor dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="crt">{children}</body>
    </html>
  )
}
