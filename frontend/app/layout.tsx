import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'SQL Trail',
    template: '%s | SQL Trail',
  },
  description:
    'O seu guia interativo para aprender SQL com trilhas de exercícios.',
  keywords: [
    'SQL',
    'aprendizado de SQL',
    'trilhas de exercícios',
    'bancos de dados',
    'consultas SQL',
    'educação em tecnologia',
  ],
  openGraph: {
    title: 'SQL Trail',
    description:
      'O seu guia interativo para aprender SQL com trilhas de exercícios.',
    url: '',
    siteName: 'SQL Trail',
    images: [
      {
        url: '',
        width: 1200,
        height: 630,
        alt: 'SQL Trail',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  icons: {
    icon: '@/app/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
