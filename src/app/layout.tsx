import type { Metadata } from 'next';
import './globals.css';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { Navbar } from '@/shared/components/Navbar';

export const metadata: Metadata = {
  title: 'Il Barbiere OS',
  description: 'Sistema de reservas Il Barbiere Arroyo Seco',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Il Barbiere',
  },
  icons: {
    icon: '/assets/logo/logo-official.jpg',
    apple: '/assets/logo/logo-official.jpg',
  },
  openGraph: {
    title: 'Il Barbiere OS',
    description: 'Sistema de reservas · Arroyo Seco',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Il Barbiere OS',
    description: 'Sistema de reservas · Arroyo Seco',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='es' className='dark'>
      <body className='bg-[#0a0a0a] text-white antialiased selection:bg-neon-cyan selection:text-black'>
        <Navbar />
        <main className='pt-20'>
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </body>
    </html>
  );
}
