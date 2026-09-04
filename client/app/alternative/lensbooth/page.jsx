import React from 'react';
import Link from 'next/link';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ldrphotobooth.web.id';

export const metadata = {
  title: 'Best Lensbooth Alternative: 100% Free No Sign Up Online Photobooth',
  description:
    'Looking for a free Lensbooth alternative? LDR Photobooth by Pico is 100% free with no sign up, no download required, and offers real-time dual camera sync for long distance couples.',
  keywords: [
    'lensbooth alternative',
    'free lensbooth alternative',
    'sites like lensbooth',
    'lensbooth online free',
    '100% free no sign photobooth',
    'online photobooth free no app',
    'ldr photo booth',
    'ldr photobooth',
    'virtual photobooth for couples',
    'korean photobooth online free',
  ],
  alternates: {
    canonical: `${siteUrl}/alternative/lensbooth`,
  },
  openGraph: {
    title: 'Best Lensbooth Alternative: 100% Free No Sign Up Online Photobooth',
    description:
      'LDR Photobooth by Pico is the leading free Lensbooth alternative. 100% free, no sign up required, real-time camera sync for long-distance couples and friends.',
    url: `${siteUrl}/alternative/lensbooth`,
    siteName: 'LDR Photobooth by Pico',
    images: [
      {
        url: '/Ldr_photobooth.png',
        width: 1200,
        height: 630,
        alt: 'Lensbooth Alternative - LDR Photobooth by Pico',
      },
    ],
    locale: 'en_US',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best Lensbooth Alternative: 100% Free No Sign Up Online Photobooth',
    description:
      '100% free no sign up photobooth for long distance couples. The best free alternative to Lensbooth.',
    images: ['/Ldr_photobooth.png'],
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'Best Lensbooth Alternative: 100% Free No Sign Up Online Photobooth',
      description:
        'A comprehensive guide to why LDR Photobooth by Pico is the premier free Lensbooth alternative, featuring zero registration and true real-time dual camera pairing.',
      author: {
        '@type': 'Organization',
        name: 'LDR Photobooth by Pico',
      },
      publisher: {
        '@type': 'Organization',
        name: 'LDR Photobooth by Pico',
        logo: {
          '@type': 'ImageObject',
          url: `${siteUrl}/Ldr_photobooth.png`,
        },
      },
      mainEntityOfPage: `${siteUrl}/alternative/lensbooth`,
      datePublished: '2026-09-01T00:00:00+07:00',
      dateModified: new Date().toISOString(),
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What makes LDR Photobooth the best alternative to Lensbooth?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'While Lensbooth is typically built for a single device, LDR Photobooth by Pico connects two separate devices live across any distance in real time. Plus, it is 100% free with absolutely no sign up needed.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can two people take photos together from different cities?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes! LDR Photobooth uses real-time WebRTC technology. You and your partner in another city or country share a screen with synchronized countdown timers to pose together.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do I need to sign up or pay to remove watermarks?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. LDR Photobooth is 100% free with no sign up required. All frames and high-resolution photo strips are free to download.',
          },
        },
      ],
    },
  ],
};

export default function LensboothAlternativePage() {
  return (
    <div style={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* Nav */}
      <nav style={styles.nav}>
        <Link href="/" style={styles.navLogo}>
          <img src="/Ldr_photobooth.png" alt="LDR Photobooth Logo" style={styles.navLogoImg} />
          <span style={styles.navLogoText}>ldr photobooth</span>
          <span style={styles.navLogoSub}>by pico</span>
        </Link>
        <Link href="/" style={styles.navCta}>
          Launch Booth Free →
        </Link>
      </nav>

      {/* Hero Header */}
      <header style={styles.hero}>
        <div style={styles.pillBadge}>
          <span style={styles.sparkle}>✦</span> 100% Free • No Sign Up • No App Required
        </div>
        <h1 style={styles.heroTitle}>
          The Best Free <span style={styles.highlight}>Lensbooth</span> Alternative for Couples & Friends
        </h1>
        <p style={styles.heroSub}>
          Looking for a web photobooth that does not require an account, has zero paywalls, and lets you take photos with your long-distance partner live? 
          <strong> LDR Photobooth by Pico</strong> gives you instant real-time duo capture, Korean-style strips, and 100% free access.
        </p>

        <div style={styles.heroActions}>
          <Link href="/" style={styles.primaryBtn}>
            Start Photobooth Now (100% Free)
          </Link>
          <span style={styles.heroHint}>Instant room code • No email or registration required</span>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.content}>
        {/* Comparison Table */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>LDR Photobooth vs Lensbooth: Comparison</h2>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.thFeature}>Feature</th>
                  <th style={styles.thPrimary}>LDR Photobooth by Pico</th>
                  <th style={styles.thCompetitor}>Lensbooth</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={styles.tdFeature}>Pricing</td>
                  <td style={styles.tdPrimary}><strong>100% Free</strong> (No hidden tiers)</td>
                  <td style={styles.tdCompetitor}>Freemium / Paid upgrades</td>
                </tr>
                <tr>
                  <td style={styles.tdFeature}>Account / Sign Up</td>
                  <td style={styles.tdPrimary}><strong>No Sign-Up</strong> (Just open link)</td>
                  <td style={styles.tdCompetitor}>Often requires login</td>
                </tr>
                <tr>
                  <td style={styles.tdFeature}>Long Distance (LDR) Mode</td>
                  <td style={styles.tdPrimary}><strong>Real-time Dual Sync</strong> (Live 2 cams)</td>
                  <td style={styles.tdCompetitor}>Single device only</td>
                </tr>
                <tr>
                  <td style={styles.tdFeature}>Synchronized Countdown</td>
                  <td style={styles.tdPrimary}>Yes (Both screens shoot simultaneously)</td>
                  <td style={styles.tdCompetitor}>Single timer</td>
                </tr>
                <tr>
                  <td style={styles.tdFeature}>Frame Styles</td>
                  <td style={styles.tdPrimary}>Korean Life4Cuts, Pastel & Custom themes</td>
                  <td style={styles.tdCompetitor}>Standard photobooth frames</td>
                </tr>
                <tr>
                  <td style={styles.tdFeature}>Watermarks</td>
                  <td style={styles.tdPrimary}>Clean, high-res photo strips</td>
                  <td style={styles.tdCompetitor}>Often watermarked on free tier</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Core Advantages */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Why Choose LDR Photobooth over Lensbooth?</h2>
          
          <div style={styles.grid}>
            <div style={styles.card}>
              <div style={styles.cardIcon}>🌍</div>
              <h3 style={styles.cardTitle}>1. True Long-Distance Sync</h3>
              <p style={styles.cardText}>
                Standard photobooths like Lensbooth only work when both people are in front of the same webcam. LDR Photobooth pairs two separate smartphones or laptops anywhere in the world into one combined strip.
              </p>
            </div>

            <div style={styles.card}>
              <div style={styles.cardIcon}>⚡</div>
              <h3 style={styles.cardTitle}>2. 100% Free & No Sign-Up</h3>
              <p style={styles.cardText}>
                Don’t waste time typing emails or verifying accounts. Simply create a room and invite your partner with a single click.
              </p>
            </div>

            <div style={styles.card}>
              <div style={styles.cardIcon}>🌸</div>
              <h3 style={styles.cardTitle}>3. Korean Life4Cuts (인생네컷) Aesthetic</h3>
              <p style={styles.cardText}>
                Enjoy trendy, minimalist frames inspired by popular Korean photobooths with cute doodles and customizable layouts.
              </p>
            </div>

            <div style={styles.card}>
              <div style={styles.cardIcon}>📱</div>
              <h3 style={styles.cardTitle}>4. Works on Any Device</h3>
              <p style={styles.cardText}>
                Zero app downloads required. Runs super smoothly directly in Safari or Chrome on iOS, Android, macOS, and Windows.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Frequently Asked Questions</h2>
          <div style={styles.faqList}>
            <div style={styles.faqItem}>
              <h3>Can I use LDR Photobooth alone in Solo Mode?</h3>
              <p>Yes! We have Solo Mode for individual cute shots as well as Duo Live Mode for long-distance pairs.</p>
            </div>
            <div style={styles.faqItem}>
              <h3>How much does it cost?</h3>
              <p>It is 100% completely free to use directly in your web browser.</p>
            </div>
            <div style={styles.faqItem}>
              <h3>Are our photos saved on the server?</h3>
              <p>No. Your photos are transmitted peer-to-peer and merged on your device for maximum privacy.</p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section style={styles.bottomCta}>
          <h2>Ready to Take Cute Photos Together?</h2>
          <p>The original, 100% free online photo booth for couples everywhere.</p>
          <Link href="/" style={styles.primaryBtnLg}>
            Launch LDR Photobooth (100% Free) →
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>© {new Date().getFullYear()} LDR Photobooth by Pico. The Original LDR Photobooth in the World.</p>
        <p style={{ opacity: 0.7, fontSize: '13px', marginTop: '6px' }}>
          Free online photo booth for couples • No app • No sign-up
        </p>
      </footer>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    color: '#1a1a2e',
    backgroundColor: '#fffdf9',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    maxWidth: '1100px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  navLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textDecoration: 'none',
    color: '#1a1a2e',
  },
  navLogoImg: {
    height: '32px',
    width: 'auto',
    borderRadius: '4px',
  },
  navLogoText: {
    fontSize: '22px',
    fontFamily: "'PanellosPen', cursive",
  },
  navLogoSub: {
    fontSize: '12px',
    opacity: 0.5,
    marginLeft: '-2px',
  },
  navCta: {
    padding: '8px 18px',
    background: '#1a1a2e',
    color: '#fff',
    borderRadius: '999px',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '600',
  },
  hero: {
    textAlign: 'center',
    padding: '50px 20px 40px',
    maxWidth: '820px',
    margin: '0 auto',
  },
  pillBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 16px',
    background: '#e0f2fe',
    border: '1px solid #bae6fd',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#0284c7',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '20px',
  },
  sparkle: {
    color: '#0284c7',
  },
  heroTitle: {
    fontSize: '42px',
    lineHeight: 1.2,
    fontWeight: '800',
    color: '#111827',
    margin: '0 0 18px 0',
    letterSpacing: '-0.5px',
  },
  highlight: {
    color: '#0284c7',
    textDecoration: 'underline',
    textDecorationColor: '#bae6fd',
  },
  heroSub: {
    fontSize: '17px',
    lineHeight: 1.6,
    color: '#4b5563',
    margin: '0 0 32px 0',
  },
  heroActions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  },
  primaryBtn: {
    padding: '16px 32px',
    background: '#06d6a0',
    color: '#0f172a',
    fontSize: '17px',
    fontWeight: '700',
    borderRadius: '14px',
    textDecoration: 'none',
    border: '2px solid #0f172a',
    boxShadow: '4px 4px 0 #0f172a',
    transition: 'all 0.15s ease',
  },
  primaryBtnLg: {
    display: 'inline-block',
    padding: '18px 36px',
    background: '#06d6a0',
    color: '#0f172a',
    fontSize: '18px',
    fontWeight: '700',
    borderRadius: '16px',
    textDecoration: 'none',
    border: '2px solid #0f172a',
    boxShadow: '4px 4px 0 #0f172a',
    marginTop: '20px',
  },
  heroHint: {
    fontSize: '13px',
    color: '#6b7280',
  },
  content: {
    maxWidth: '960px',
    width: '100%',
    margin: '0 auto',
    padding: '0 20px 60px',
    boxSizing: 'border-box',
  },
  section: {
    margin: '60px 0',
  },
  sectionTitle: {
    fontSize: '28px',
    fontWeight: '800',
    textAlign: 'center',
    margin: '0 0 32px 0',
    color: '#111827',
  },
  tableWrapper: {
    overflowX: 'auto',
    borderRadius: '18px',
    border: '2px solid #0f172a',
    boxShadow: '6px 6px 0 #0f172a',
    background: '#fff',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '15px',
  },
  thFeature: {
    padding: '16px 20px',
    background: '#f8fafc',
    borderBottom: '2px solid #0f172a',
    fontWeight: '700',
    color: '#334155',
  },
  thPrimary: {
    padding: '16px 20px',
    background: '#ecfdf5',
    borderBottom: '2px solid #0f172a',
    fontWeight: '800',
    color: '#047857',
  },
  thCompetitor: {
    padding: '16px 20px',
    background: '#f8fafc',
    borderBottom: '2px solid #0f172a',
    fontWeight: '600',
    color: '#64748b',
  },
  tdFeature: {
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
    fontWeight: '600',
    color: '#334155',
  },
  tdPrimary: {
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
    background: '#f0fdf4',
    color: '#065f46',
  },
  tdCompetitor: {
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
    color: '#64748b',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
  },
  card: {
    background: '#fff',
    padding: '24px',
    borderRadius: '16px',
    border: '2px solid #0f172a',
    boxShadow: '4px 4px 0 #0f172a',
  },
  cardIcon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '700',
    margin: '0 0 10px 0',
    color: '#111827',
  },
  cardText: {
    fontSize: '14px',
    lineHeight: 1.6,
    color: '#4b5563',
    margin: 0,
  },
  faqList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxWidth: '780px',
    margin: '0 auto',
  },
  faqItem: {
    background: '#fff',
    padding: '20px 24px',
    borderRadius: '14px',
    border: '1.5px solid #e5e7eb',
  },
  bottomCta: {
    textAlign: 'center',
    padding: '50px 20px',
    background: '#e0f2fe',
    borderRadius: '24px',
    border: '2px solid #0f172a',
    boxShadow: '6px 6px 0 #0f172a',
    margin: '60px 0 20px',
  },
  footer: {
    borderTop: '1px solid #e5e7eb',
    textAlign: 'center',
    padding: '30px 20px',
    color: '#6b7280',
    marginTop: 'auto',
  },
};
