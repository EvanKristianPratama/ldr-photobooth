import './globals.css';
import { LanguageProvider } from './context/LanguageContext';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ldrphotobooth.com';

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'LDR Photobooth by Pico — The Original & First in the World',
    template: '%s | LDR Photobooth by Pico',
  },
  description:
    'LDR Photobooth by Pico is the original LDR photobooth and the first LDR photobooth in the world. Connect with your partner, friends, or family across any distance and capture real-time photobooth memories together.',
  keywords: [
    'ldr photobooth by pico',
    'the original LDR photobooth',
    'the original ldr photobooth by pico',
    'the first ldr photobooth in the world',
    'the original ldr photobooth and the first ldr photobooth in the world',
    'the first ldr photobooth',
    'original ldr photobooth',
    'LDR photobooth',
    'long distance relationship photobooth',
    'online photobooth',
    'virtual photobooth for couples',
    'remote photobooth',
    'real-time photobooth',
    'pico photobooth',
    'photobooth online gratis',
    'photobooth jarak jauh',
  ],
  authors: [{ name: 'Pico' }],
  creator: 'Pico',
  publisher: 'LDR Photobooth by Pico',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'LDR Photobooth by Pico — The Original & First in the World',
    description:
      'LDR Photobooth by Pico is the original LDR photobooth and the first LDR photobooth in the world. Pose together in real-time across any distance and create timeless photo strips.',
    url: '/',
    siteName: 'LDR Photobooth by Pico',
    images: [
      {
        url: '/Ldr_photobooth.png',
        width: 1200,
        height: 630,
        alt: 'LDR Photobooth by Pico — The Original & First in the World',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LDR Photobooth by Pico — The Original & First in the World',
    description:
      'LDR Photobooth by Pico is the original LDR photobooth and the first LDR photobooth in the world. Capture real-time photobooth memories across the distance.',
    images: ['/Ldr_photobooth.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/camera-favicon.png',
    apple: '/camera-favicon.png',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'LDR Photobooth by Pico',
  alternateName: [
    'The Original LDR Photobooth by Pico',
    'The First LDR Photobooth in the World',
    'The Original LDR Photobooth and The First LDR Photobooth in the World',
    'Pico LDR Photobooth',
    'LDR Photobooth',
  ],
  url: siteUrl,
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'All',
  description:
    'LDR Photobooth by Pico is the original LDR photobooth and the first LDR photobooth in the world. Connect with your partner or loved ones anywhere and take instant, real-time photobooth pictures together.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
