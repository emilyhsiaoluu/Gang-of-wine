import type { Metadata } from 'next'
import { Playfair_Display, Source_Sans_3 } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { PostHogProvider } from '@/components/posthog-provider'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: '--font-serif'
});
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: '--font-sans'
});

export const metadata: Metadata = {
  title: 'Gang of Wine Moms Book Club',
  description: 'Where book lovers and wine enthusiasts unite',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${sourceSans.variable} font-sans antialiased`}>
        <PostHogProvider />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
