import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { getEtablissementNom } from '@/lib/etablissement'
import { Analytics } from '@vercel/analytics/next'
import { SessionProvider } from 'next-auth/react'
import { AuthProvider } from '@/contexts/auth-context'
import { EtablissementProvider } from '@/contexts/etablissement-context'
import { NotificationProvider } from '@/contexts/notification-context'
import { Toaster } from 'sonner'
import { Toaster as RadixToaster } from '@/components/ui/toaster'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const nom = await getEtablissementNom()
  return {
    title: `${nom} - Système RH`,
    description: `Système de gestion des ressources humaines ${nom}`,
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
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased">
        <SessionProvider>
          <EtablissementProvider>
            <AuthProvider>
              <NotificationProvider>
              {children}
              <Toaster position="top-right" richColors duration={4000} closeButton />
              <RadixToaster />
              <Analytics />
              </NotificationProvider>
            </AuthProvider>
          </EtablissementProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
