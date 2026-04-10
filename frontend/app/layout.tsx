import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { BGMProvider } from '@/contexts/BGMContext'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Golden Casino | Premium Gaming Experience',
  description: 'Experience the thrill of casino gaming with our premium mini-games platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <BGMProvider>
            {children}
          </BGMProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid #D4AF37',
              },
              success: {
                iconTheme: {
                  primary: '#16A34A',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#DC2626',
                  secondary: '#fff',
                },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
