import React from 'react';
import Link from 'next/link';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ldrphotobooth.web.id';

export const metadata = {
  title: 'Best Lensbooth Alternative: 100% Free No Sign Up Online Photobooth | LDR Photobooth by Pico',
  description:
    'Why enter a 16-digit code when you can start in 1 click with Pico? LDR Photobooth by Pico is 100% free with no sign up, zero paywalls, and real-time dual camera sync for long distance couples.',
  keywords: [
    'lensbooth alternative',
    'why enter a 16-digit code when you can start in 1 click with pico',
    'free lensbooth alternative',
    'sites like lensbooth',
    'lensbooth online free',
    '100% free no sign photobooth',
    'online photobooth free no app',
    'ldr photo booth',
    'ldr photobooth',
    'virtual photobooth for couples',
    'korean photobooth online free',
    'life4cuts online',
  ],
  alternates: {
    canonical: `${siteUrl}/alternative/lensbooth`,
  },
  openGraph: {
    title: 'Best Lensbooth Alternative: 100% Free No Sign Up Online Photobooth',
    description:
      'Why enter a 16-digit code when you can start in 1 click with Pico? 100% free, no sign up required, real-time dual camera sync for long-distance couples.',
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
      'Why enter a 16-digit code when you can start in 1 click with Pico? 100% free no sign up photobooth for couples.',
    images: ['/Ldr_photobooth.png'],
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'Best Lensbooth Alternative: Why enter a 16-digit code when you can start in 1 click with Pico?',
      description:
        'A comprehensive guide to why LDR Photobooth by Pico is the premier free Lensbooth alternative. Why enter a 16-digit code when you can start in 1 click with Pico? Featuring zero registration and true real-time dual camera pairing.',
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
        reviewCount: '178',
        bestRating: '5',
        worstRating: '1',
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Why enter a 16-digit code when you can start in 1 click with Pico?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Lensbooth requires entering a tedious 16-digit code just to pair devices, creating friction and connection errors during date night. With LDR Photobooth by Pico, you start in 1 click with zero registration and instant room pairing.',
          },
        },
        {
          '@type': 'Question',
          name: 'What makes LDR Photobooth the best alternative to Lensbooth?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'While Lensbooth is built primarily for single devices or requires complex code sharing, LDR Photobooth by Pico connects two separate devices live across any distance in real time. Plus, it is 100% free with absolutely no sign up needed.',
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
            text: 'No. LDR Photobooth is 100% free with no sign up required. All frames and high-resolution photo strips are free to download without watermarks.',
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

        {/* Rating Social Proof */}
        <div style={styles.ratingBadge}>
          <span style={styles.stars}>★★★★★</span>
          <span style={styles.ratingText}>
            <strong>4.9 / 5</strong> rating from 170+ long-distance couples
          </span>
        </div>

        <div style={styles.heroActions}>
          <Link href="/" style={styles.primaryBtn}>
            Start Photobooth Now (100% Free)
          </Link>
          <span style={styles.heroHint}>Instant room setup • No email or registration required</span>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.content}>
        {/* Spotlight Quote Banner */}
        <div style={styles.quoteBox}>
          <div style={styles.quoteHeader}>
            <span style={styles.quotePill}>⚡ THE PICO ADVANTAGE</span>
            <span style={styles.quoteSub}>Zero Friction • Instant Connect</span>
          </div>
          <blockquote style={styles.quoteText}>
            “Why enter a 16-digit code when you can start in 1 click with Pico?”
          </blockquote>
          <p style={styles.quoteDescription}>
            Lensbooth requires couples to squint at phone screens, copying and transcribing a tedious <strong>16-digit alphanumeric code</strong> just to sync cameras. One wrong character and the connection fails. 
            With <strong>LDR Photobooth by Pico</strong>, you connect effortlessly in <strong>1 single click</strong>. No passwords, no 16-character hurdles, and no buzzkill during your date night.
          </p>
        </div>

        {/* Comparison Table */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>LDR Photobooth vs Lensbooth: Side-by-Side Comparison</h2>
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
                  <td style={styles.tdFeature}>Room Setup & Pairing</td>
                  <td style={styles.tdPrimary}>
                    <strong>⚡ 1-Click Instant Start</strong>
                    <div style={styles.tdQuoteHint}>
                      “Why enter a 16-digit code when you can start in 1 click with Pico?”
                    </div>
                  </td>
                  <td style={styles.tdCompetitor}>
                    ❌ Tedious 16-digit room code required
                  </td>
                </tr>
                <tr>
                  <td style={styles.tdFeature}>Pricing & Paywalls</td>
                  <td style={styles.tdPrimary}>
                    <strong>100% Free Forever</strong> (No hidden fees, no tiers)
                  </td>
                  <td style={styles.tdCompetitor}>Freemium / Paid upgrades</td>
                </tr>
                <tr>
                  <td style={styles.tdFeature}>Account / Sign Up</td>
                  <td style={styles.tdPrimary}>
                    <strong>No Sign-Up</strong> (Open link & start immediately)
                  </td>
                  <td style={styles.tdCompetitor}>Prompts for login / accounts</td>
                </tr>
                <tr>
                  <td style={styles.tdFeature}>True LDR Live Dual Camera</td>
                  <td style={styles.tdPrimary}>
                    <strong>Real-time WebRTC Sync</strong> (Live 2 cameras simultaneously)
                  </td>
                  <td style={styles.tdCompetitor}>Single device / manual upload collage</td>
                </tr>
                <tr>
                  <td style={styles.tdFeature}>Synchronized Countdown</td>
                  <td style={styles.tdPrimary}>
                    <strong>Yes</strong> (Both screens shoot at the exact same millisecond)
                  </td>
                  <td style={styles.tdCompetitor}>Single timer or desynced</td>
                </tr>
                <tr>
                  <td style={styles.tdFeature}>Frame Styles & Aesthetics</td>
                  <td style={styles.tdPrimary}>
                    Korean Life4Cuts (인생네컷), pastel themes, cute stickers
                  </td>
                  <td style={styles.tdCompetitor}>Standard photobooth frames</td>
                </tr>
                <tr>
                  <td style={styles.tdFeature}>Watermarks & Quality</td>
                  <td style={styles.tdPrimary}>
                    <strong>Clean Full HD strips</strong> (100% watermark-free)
                  </td>
                  <td style={styles.tdCompetitor}>Watermarked on free tier</td>
                </tr>
                <tr>
                  <td style={styles.tdFeature}>Languages Supported</td>
                  <td style={styles.tdPrimary}>
                    English, Indonesian, Japanese, Korean
                  </td>
                  <td style={styles.tdCompetitor}>English only</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Deep Dive: 16-Digit Code vs 1-Click */}
        <section style={styles.editorialSection}>
          <h2 style={styles.editorialTitle}>The 16-Digit Problem: Why Friction Kills the Moment</h2>
          <div style={styles.editorialBody}>
            <p>
              When you and your long-distance partner finally find time between busy work schedules and time zone differences for a virtual date, 
              the last thing you want is technological friction. 
            </p>
            <p>
              Many photobooth apps like Lensbooth generate unwieldy <strong>16-digit alphanumeric codes</strong> that must be manually texted, copied, and pasted into an input field. On mobile devices, switching apps to copy a 16-digit string often causes webcams to disconnect, browsers to refresh, or users to mistake an uppercase letter for a lowercase number.
            </p>
            <div style={styles.highlightCallout}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '17px', color: '#0f172a' }}>
                💡 That is why our motto is simple:
              </p>
              <p style={{ margin: '6px 0 0 0', fontSize: '20px', fontWeight: 800, color: '#047857' }}>
                “Why enter a 16-digit code when you can start in 1 click with Pico?”
              </p>
            </div>
            <p>
              With <strong>LDR Photobooth by Pico</strong>, everything is engineered for zero friction:
            </p>
            <ul style={styles.bulletList}>
              <li><strong>1-Click Room Creation:</strong> Tap one button, copy the instant link or short code, and send it to your partner.</li>
              <li><strong>Zero App Downloads:</strong> Operates 100% inside Safari, Chrome, Edge, and mobile browsers.</li>
              <li><strong>100% Free with No Sign-Up:</strong> No email verification, no passwords, no hidden credit card prompts.</li>
              <li><strong>Sub-second WebRTC Pairing:</strong> Low-latency video streams ensure you smile and pose at the exact same instant.</li>
            </ul>
          </div>
        </section>

        {/* Core Advantages */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Why Couples Choose LDR Photobooth over Lensbooth</h2>
          
          <div style={styles.grid}>
            <div style={styles.card}>
              <div style={styles.cardIcon}>⚡</div>
              <h3 style={styles.cardTitle}>1. Instant 1-Click Start</h3>
              <p style={styles.cardText}>
                Why enter a 16-digit code when you can start in 1 click with Pico? No complicated codes, zero registration, and zero delays.
              </p>
            </div>

            <div style={styles.card}>
              <div style={styles.cardIcon}>🌍</div>
              <h3 style={styles.cardTitle}>2. True Long-Distance Sync</h3>
              <p style={styles.cardText}>
                Standard photobooths only work when both people share the same webcam. LDR Photobooth pairs two separate devices across oceans into one cute strip.
              </p>
            </div>

            <div style={styles.card}>
              <div style={styles.cardIcon}>🌸</div>
              <h3 style={styles.cardTitle}>3. Korean Life4Cuts (인생네컷)</h3>
              <p style={styles.cardText}>
                Get trendy Korean-style 4-cut strips with charming pastel colors, cute doodle borders, and customizable photo layouts.
              </p>
            </div>

            <div style={styles.card}>
              <div style={styles.cardIcon}>💎</div>
              <h3 style={styles.cardTitle}>4. 100% Free & No Watermarks</h3>
              <p style={styles.cardText}>
                Download crisp, high-definition photo strips ready for Instagram, TikTok, or your memory scrapbooks without paying a single cent.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Frequently Asked Questions</h2>
          <div style={styles.faqList}>
            <div style={styles.faqItem}>
              <h3 style={styles.faqQ}>Why enter a 16-digit code when you can start in 1 click with Pico?</h3>
              <p style={styles.faqA}>
                Exactly! In Lensbooth, setting up a room requires typing or pasting a long 16-digit code, which frequently causes typos on phones. LDR Photobooth by Pico eliminates all code friction by letting you start in 1 click or via a simple direct link.
              </p>
            </div>
            <div style={styles.faqItem}>
              <h3 style={styles.faqQ}>Is LDR Photobooth really 100% free with no sign-up?</h3>
              <p style={styles.faqA}>
                Yes! There are no hidden paywalls, credit cards, or account requirements. All frames and high-resolution photo strip downloads are free forever.
              </p>
            </div>
            <div style={styles.faqItem}>
              <h3 style={styles.faqQ}>Can we use it if one is on iPhone and the other is on laptop?</h3>
              <p style={styles.faqA}>
                Absolutely. LDR Photobooth works seamlessly across all devices — iPhone, Android, MacBook, and Windows PC. It runs directly inside your web browser.
              </p>
            </div>
            <div style={styles.faqItem}>
              <h3 style={styles.faqQ}>Are our camera feeds and photos private?</h3>
              <p style={styles.faqA}>
                Yes. Video feeds are transmitted directly peer-to-peer using secure WebRTC technology. Photos are merged right in your browser and are not saved on external servers.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section style={styles.bottomCta}>
          <h2 style={styles.bottomCtaTitle}>Ready to Take Cute Photos Together?</h2>
          <p style={styles.bottomCtaSub}>
            Join thousands of long-distance couples making cute memories today. 100% free, no sign-up, no 16-digit codes.
          </p>
          <Link href="/" style={styles.primaryBtnLg}>
            Start LDR Photobooth in 1 Click →
          </Link>
          <div style={{ marginTop: '14px', fontSize: '13px', color: '#475569' }}>
            No download • No sign-up • Works instantly on any phone or PC
          </div>
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
    padding: '50px 20px 30px',
    maxWidth: '840px',
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
    fontSize: '40px',
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
    margin: '0 0 20px 0',
  },
  ratingBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 16px',
    background: '#fef3c7',
    border: '1px solid #fde68a',
    borderRadius: '999px',
    marginBottom: '24px',
  },
  stars: {
    color: '#f59e0b',
    fontSize: '15px',
    letterSpacing: '2px',
  },
  ratingText: {
    fontSize: '13px',
    color: '#92400e',
  },
  heroActions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  },
  primaryBtn: {
    padding: '16px 34px',
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
    padding: '18px 38px',
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
  quoteBox: {
    margin: '30px 0 50px',
    background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)',
    border: '2.5px solid #0f172a',
    borderRadius: '20px',
    padding: '32px 28px',
    boxShadow: '6px 6px 0 #0f172a',
  },
  quoteHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  quotePill: {
    display: 'inline-block',
    background: '#047857',
    color: '#fff',
    padding: '4px 12px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: '800',
    letterSpacing: '1px',
  },
  quoteSub: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#0369a1',
  },
  quoteText: {
    margin: '0 0 16px 0',
    fontSize: '26px',
    fontWeight: '900',
    lineHeight: 1.35,
    color: '#0f172a',
    letterSpacing: '-0.5px',
  },
  quoteDescription: {
    margin: 0,
    fontSize: '15px',
    lineHeight: 1.65,
    color: '#334155',
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
    width: '28%',
  },
  thPrimary: {
    padding: '16px 20px',
    background: '#ecfdf5',
    borderBottom: '2px solid #0f172a',
    fontWeight: '800',
    color: '#047857',
    width: '42%',
  },
  thCompetitor: {
    padding: '16px 20px',
    background: '#f8fafc',
    borderBottom: '2px solid #0f172a',
    fontWeight: '600',
    color: '#64748b',
    width: '30%',
  },
  tdFeature: {
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
    fontWeight: '600',
    color: '#334155',
    verticalAlign: 'top',
  },
  tdPrimary: {
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
    background: '#f0fdf4',
    color: '#065f46',
    verticalAlign: 'top',
  },
  tdCompetitor: {
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
    color: '#64748b',
    verticalAlign: 'top',
  },
  tdQuoteHint: {
    fontSize: '13px',
    fontStyle: 'italic',
    color: '#047857',
    marginTop: '6px',
    fontWeight: '600',
  },
  editorialSection: {
    margin: '60px 0',
    background: '#fff',
    borderRadius: '18px',
    border: '2px solid #0f172a',
    boxShadow: '5px 5px 0 #0f172a',
    padding: '36px 30px',
  },
  editorialTitle: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#111827',
    margin: '0 0 18px 0',
  },
  editorialBody: {
    fontSize: '15px',
    lineHeight: 1.7,
    color: '#374151',
  },
  highlightCallout: {
    background: '#f0fdf4',
    borderLeft: '4px solid #047857',
    padding: '16px 20px',
    borderRadius: '8px',
    margin: '20px 0',
  },
  bulletList: {
    paddingLeft: '22px',
    lineHeight: 1.8,
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
    maxWidth: '820px',
    margin: '0 auto',
  },
  faqItem: {
    background: '#fff',
    padding: '22px 26px',
    borderRadius: '14px',
    border: '1.5px solid #e5e7eb',
  },
  faqQ: {
    margin: '0 0 8px 0',
    fontSize: '17px',
    fontWeight: '700',
    color: '#111827',
  },
  faqA: {
    margin: 0,
    fontSize: '14px',
    lineHeight: 1.6,
    color: '#4b5563',
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
  bottomCtaTitle: {
    fontSize: '30px',
    fontWeight: '800',
    margin: '0 0 12px 0',
    color: '#0f172a',
  },
  bottomCtaSub: {
    fontSize: '16px',
    color: '#334155',
    maxWidth: '560px',
    margin: '0 auto',
    lineHeight: 1.5,
  },
  footer: {
    borderTop: '1px solid #e5e7eb',
    textAlign: 'center',
    padding: '30px 20px',
    color: '#6b7280',
    marginTop: 'auto',
  },
};
