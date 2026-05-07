import './globals.css';
import { LanguageProvider } from './context/LanguageContext';

export const metadata = {
  title: 'LDR Photobooth',
  description: 'Long Distance Relationship Photobooth',
  icons: {
    icon: '/camera-favicon.png',
    apple: '/camera-favicon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}

