import type { Metadata } from 'next'
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import Navbar from '@/components/NavBar'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Echogallery',
  description: 'Your personal art curator.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="theme-modern">
        <head>
          <link
            href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;800&family=Inter:wght@400;500;700&family=JetBrains+Mono:wght@400;700&family=Playfair+Display:wght@400;600&family=Quicksand:wght@400;600&family=IBM+Plex+Mono:wght@400;700&family=Bebas+Neue&family=Inter+Tight:wght@400;600&family=Cormorant+Garamond:wght@400;600&family=Alegreya+Sans:wght@400;600&family=EB+Garamond:wght@400;600&family=Lora:wght@400;600&family=Noto+Serif+JP:wght@400;600&family=Noto+Sans:wght@400;600&family=Oswald:wght@400;600&family=Source+Sans+3:wght@400;600&family=Roboto+Mono:wght@400;700&family=Sen:wght@400;700&family=Mulish:wght@400;700&family=Fira+Code:wght@400;700&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <Navbar />
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
