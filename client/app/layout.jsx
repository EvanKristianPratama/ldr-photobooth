import './globals.css';
import { LanguageProvider } from './context/LanguageContext';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ldrphotobooth.web.id';

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'LDR Photobooth — The Original Online Photo Booth for Long Distance Couples | by Pico',
    template: '%s | LDR Photobooth by Pico',
  },
  description:
    'The original & first real-time online photo booth for long distance couples in the world. Pose together live in one photo strip across any distance — free, no app, no download required.',
  keywords: [
    'ldr photo booth',
    'ldr photobooth',
    'online photobooth for long distance couples',
    'long distance couples photobooth',
    'the original ldr photobooth',
    'the original ldr photo booth',
    'the first ldr photobooth in the world',
    'the first ldr photo booth in the world',
    'ldr photobooth by pico',
    'online photo booth',
    'real-time online photobooth',
    'virtual photo booth for couples',
    'long distance relationship photobooth',
    'pico photobooth',
    'free online photobooth no app',
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
    title: 'LDR Photobooth — The Original Online Photo Booth for Long Distance Couples',
    description:
      'The original and first online photo booth for long distance couples in the world. Capture real-time photobooth memories across any distance. Free, no app needed.',
    url: '/',
    siteName: 'LDR Photobooth by Pico',
    images: [
      {
        url: '/Ldr_photobooth.png',
        width: 1200,
        height: 630,
        alt: 'LDR Photobooth — The Original Online Photo Booth for Long Distance Couples',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LDR Photobooth — The Original Online Photo Booth for Long Distance Couples',
    description:
      'The original & first real-time online photo booth for long distance couples in the world. Pose together live in one photo strip.',
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
  '@graph': [
    {
      '@type': 'WebApplication',
      '@id': `${siteUrl}/#app`,
      name: 'LDR Photobooth by Pico',
      alternateName: [
        'The Original LDR Photobooth',
        'The Original LDR Photo Booth',
        'Online Photobooth for Long Distance Couples',
        'The First LDR Photobooth in the World',
        'Pico LDR Photobooth',
      ],
      url: siteUrl,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'All',
      description:
        'The original and first real-time online photo booth for long distance couples in the world. Connect with your partner anywhere and take instant photo strips together.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '192',
        bestRating: '5',
        worstRating: '1',
      },
      browserRequirements: 'Requires JavaScript and WebRTC support.',
    },
    {
      '@type': 'FAQPage',
      '@id': `${siteUrl}/#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is LDR Photobooth by Pico?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'LDR Photobooth by Pico is the original and first real-time online photo booth in the world created specifically for long distance couples and friends. It lets you capture synchronized photos together in cute photo strips across any distance.',
          },
        },
        {
          '@type': 'Question',
          name: 'How does the online photobooth for long distance couples work?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'One partner creates a room and shares the room code or link. Both cameras connect in real time, you pose together with synchronized countdowns, pick custom frames, and download your high-quality photo strip.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is LDR Photobooth free and does it require an app download?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes, LDR Photobooth is 100% free and works directly in any modern mobile or desktop web browser — no app installation or account registration is required.',
          },
        },
      ],
    },
  ],
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
