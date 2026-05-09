import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CHAOS/USD — Logistic Map Market',
  description: 'A market maker powered by the chaos of mathematics',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
