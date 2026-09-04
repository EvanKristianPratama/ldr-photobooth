import React from 'react';
import Link from 'next/link';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ldrphotobooth.web.id';

export const metadata = {
  title: 'Best Free getAngie Alternative: 100% Free No Sign Up Photobooth for Couples',
  description:
    'Looking for a free getAngie alternative? LDR Photobooth by Pico is 100% free with no sign up, no download, and no paywalls. Capture real-time photobooth memories together across any distance.',
  keywords: [
    'getangie alternative',
    'free getangie alternative',
    'sites like getangie',
    'getangie photobooth free',
    '100% free no sign photobooth',
    'online photobooth for long distance couples',
    'ldr photo booth',
    'ldr photobooth',
    'korean photobooth online',
    'life4cuts online free',
  ],
  alternates: {
    canonical: `${siteUrl}/alternative/getangie`,
  },
  openGraph: {
    title: 'Best Free getAngie Alternative: 100% Free No Sign Up Photobooth',
    description:
      'LDR Photobooth by Pico is the #1 free getAngie alternative. 100% free, no sign up required, no apps, no paywalls. Pose together in real time.',
    url: `${siteUrl}/alternative/getangie`,
    siteName: 'LDR Photobooth by Pico',
    images: [
      {
        url: '/Ldr_photobooth.png',
        width: 1200,
        height: 630,
        alt: 'getAngie Alternative - LDR Photobooth by Pico',
      },
    ],
    locale: 'en_US',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best Free getAngie Alternative: 100% Free No Sign Up Photobooth',
    description:
      '100% free no sign up photobooth for long distance couples. The best free alternative to getAngie.',
    images: ['/Ldr_photobooth.png'],
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'The Best Free getAngie Alternative: 100% Free No Sign Up Photobooth for Couples',
      description:
        'A complete breakdown of why LDR Photobooth by Pico is the leading free getAngie alternative for long distance couples, featuring zero paywalls and no registration required.',
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
      mainEntityOfPage: `${siteUrl}/alternative/getangie`,
      datePublished: '2026-09-01T00:00:00+07:00',
      dateModified: new Date().toISOString(),
    },
    {
      '@type': 'WebApplication',
      name: 'LDR Photobooth by Pico',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'All',
      url: siteUrl,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        reviewCount: '184',
        bestRating: '5',
        worstRating: '1',
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is there a 100% free alternative to getAngie photobooth?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes! LDR Photobooth by Pico is a 100% free alternative to getAngie. There are no paywalls, no limits, no sign-ups, and no app downloads required.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do I need an account or sign up to use LDR Photobooth?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. Unlike platforms that force you to register an email or password, LDR Photobooth lets you generate an instant room code and start taking photos in 5 seconds.',
          },
        },
        {
          '@type': 'Question',
          name: 'How is LDR Photobooth different from getAngie?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'getAngie is a bloated mini-game hub with paid subscriptions. LDR Photobooth by Pico is dedicated 100% to delivering the best Korean-style photobooth experience for long-distance relationships with custom cute frames and peer-to-peer real-time camera synchronization.',
          },
        },
      ],
    },
  ],
};

export default function GetAngieAlternativePage() {
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
          <span style={styles.sparkle}>✦</span> 100% Free • No Sign Up • No App Needed
        </div>
        <h1 style={styles.heroTitle}>
          The #1 Free <span style={styles.highlight}>getAngie</span> Alternative for Long Distance Couples
        </h1>
        <p style={styles.heroSub}>
          Love taking photobooth pictures with your partner across the miles, but tired of paywalls, sign-up forms, and app downloads? 
          Meet <strong>LDR Photobooth by Pico</strong> — built purely for couples who want instant, real-time, Korean-style photostrips without the fuss.
        </p>

        <div style={styles.heroActions}>
          <Link href="/" style={styles.primaryBtn}>
            Start Photobooth Now (100% Free)
          </Link>
          <span style={styles.heroHint}>No registration required • Works directly in your browser</span>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.content}>
        {/* Comparison Table */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>LDR Photobooth vs getAngie: Quick Comparison</h2>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.thFeature}>Feature</th>
                  <th style={styles.thPrimary}>LDR Photobooth by Pico</th>
                  <th style={styles.thCompetitor}>getAngie</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={styles.tdFeature}>Price</td>
                  <td style={styles.tdPrimary}><strong>100% Free</strong> (No subscriptions)</td>
                  <td style={styles.tdCompetitor}>Freemium / Paid Upgrades</td>
                </tr>
                <tr>
                  <td style={styles.tdFeature}>Sign Up Required?</td>
                  <td style={styles.tdPrimary}><strong>No Sign-Up</strong> (Instant room code)</td>
                  <td style={styles.tdCompetitor}>Account prompt</td>
                </tr>
                <tr>
                  <td style={styles.tdFeature}>App Download?</td>
                  <td style={styles.tdPrimary}><strong>No Download</strong> (100% Web browser)</td>
                  <td style={styles.tdCompetitor}>Web + App promos</td>
                </tr>
                <tr>
                  <td style={styles.tdFeature}>Focus</td>
                  <td style={styles.tdPrimary}><strong>Dedicated Photobooth</strong></td>
                  <td style={styles.tdCompetitor}>Multi-game hub (14+ games)</td>
                </tr>
                <tr>
                  <td style={styles.tdFeature}>Duo Live Cam Sync</td>
                  <td style={styles.tdPrimary}>Yes (Real-time P2P canvas)</td>
                  <td style={styles.tdCompetitor}>Yes</td>
                </tr>
                <tr>
                  <td style={styles.tdFeature}>Korean Life4Cuts (인생네컷) Frames</td>
                  <td style={styles.tdPrimary}>Cute curated frames & stickers</td>
                  <td style={styles.tdCompetitor}>Standard strips</td>
                </tr>
                <tr>
                  <td style={styles.tdFeature}>Solo & Multi-mode Support</td>
                  <td style={styles.tdPrimary}>Solo, Duo & Group options</td>
                  <td style={styles.tdCompetitor}>Primarily 2-player</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Why Switch */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Why Long Distance Couples Are Switching from getAngie</h2>
          
          <div style={styles.grid}>
            <div style={styles.card}>
              <div style={styles.cardIcon}>⚡</div>
              <h3 style={styles.cardTitle}>1. Instant 5-Second Start (Zero Sign Up)</h3>
              <p style={styles.cardText}>
                No email verification, no passwords, and no onboarding questionnaires. Just open the website, share a 6-character room code with your partner, and both of your cameras link up in real time.
              </p>
            </div>

            <div style={styles.card}>
              <div style={styles.cardIcon}>💰</div>
              <h3 style={styles.cardTitle}>2. Truly 100% Free Forever</h3>
              <p style={styles.cardText}>
                While getAngie gates premium question decks and extra features behind monthly subscriptions, LDR Photobooth is committed to being an open, heartwarming gift for long distance couples everywhere.
              </p>
            </div>

            <div style={styles.card}>
              <div style={styles.cardIcon}>🎨</div>
              <h3 style={styles.cardTitle}>3. Aesthetic Korean Photostrips</h3>
              <p style={styles.cardText}>
                Designed around the iconic Korean <em>Life4Cuts (인생네컷)</em> aesthetic. Pick sweet pastel palettes, cute stickers, and custom frame borders that look stunning on your Instagram and TikTok feeds.
              </p>
            </div>

            <div style={styles.card}>
              <div style={styles.cardIcon}>🔒</div>
              <h3 style={styles.cardTitle}>4. P2P Privacy First</h3>
              <p style={styles.cardText}>
                Your romantic moments are private. Videos and camera frames are streamed directly peer-to-peer between your devices using encrypted WebRTC without being stored on our servers.
              </p>
            </div>
          </div>
        </section>

        {/* How to use */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>How to Start in 3 Easy Steps</h2>
          <div style={styles.stepsGrid}>
            <div style={styles.stepBox}>
              <div style={styles.stepNumber}>1</div>
              <h4>Create Room</h4>
              <p>Click start on the homepage to generate your secure photobooth room.</p>
            </div>
            <div style={styles.stepBox}>
              <div style={styles.stepNumber}>2</div>
              <h4>Share Code</h4>
              <p>Send the link or room code to your partner anywhere in the world.</p>
            </div>
            <div style={styles.stepBox}>
              <div style={styles.stepNumber}>3</div>
              <h4>Strike a Pose & Download</h4>
              <p>Smile together during the synchronized countdown and save your cute photo strip!</p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Frequently Asked Questions</h2>
          <div style={styles.faqList}>
            <div style={styles.faqItem}>
              <h3>Is LDR Photobooth really completely free?</h3>
              <p>Yes, 100% free with no hidden charges, trial periods, or forced upgrades.</p>
            </div>
            <div style={styles.faqItem}>
              <h3>Do we need to be on laptops or can we use smartphones?</h3>
              <p>It works seamlessly on iPhone, Android, tablets, and laptops directly in Safari, Chrome, or any modern mobile browser.</p>
            </div>
            <div style={styles.faqItem}>
              <h3>Can we print the downloaded photo strip?</h3>
              <p>Yes! The downloaded image is high-resolution, perfectly proportioned for 4R photo paper or mini photo printers.</p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section style={styles.bottomCta}>
          <h2>Ready for Your Cute LDR Date?</h2>
          <p>Join thousands of couples capturing timeless memories across the miles.</p>
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
    background: '#fff0f3',
    border: '1px solid #ffd1dc',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#e63946',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '20px',
  },
  sparkle: {
    color: '#f59e0b',
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
    color: '#e63946',
    textDecoration: 'underline',
    textDecorationColor: '#ffccd5',
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
  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
    textAlign: 'center',
  },
  stepBox: {
    background: '#fff',
    padding: '26px 20px',
    borderRadius: '16px',
    border: '2px solid #0f172a',
    boxShadow: '4px 4px 0 #0f172a',
  },
  stepNumber: {
    width: '40px',
    height: '40px',
    lineHeight: '40px',
    borderRadius: '50%',
    background: '#ffd166',
    border: '2px solid #0f172a',
    margin: '0 auto 14px',
    fontWeight: '800',
    fontSize: '18px',
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
    background: '#fff0f3',
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
