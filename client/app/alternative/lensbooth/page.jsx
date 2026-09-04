import React from 'react';
import Link from 'next/link';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ldrphotobooth.web.id';

export const metadata = {
  title: 'Best Lensbooth Alternative: Created for Full Customization & 100% Free | LDR Photobooth by Pico',
  description:
    'Why enter a 16-digit code or be trapped in rigid frames? LDR Photobooth by Pico is 100% free with no sign-up. Created for full customization and embracing creativity—kami membuat LDR Photobooth tanpa batasan style atau frame bawaan yang kaku agar kalian semua bisa berekspresi sebebas mungkin.',
  keywords: [
    'lensbooth alternative',
    'created for full customization and embrace creativity',
    'photobooth tanpa batasan frame kaku',
    'bebas berekspresi photobooth',
    'customizable photobooth online',
    'why enter a 16-digit code when you can start in 1 click with pico',
    'free lensbooth alternative',
    'sites like lensbooth',
    'lensbooth online free',
    '100% free no sign up photobooth',
    'online photobooth free no app',
    'ldr photo booth',
    'ldr photobooth',
    'virtual photobooth for couples',
    'korean photobooth online free',
    'life4cuts online',
    'unlimited photobooth frame styles',
  ],
  alternates: {
    canonical: `${siteUrl}/alternative/lensbooth`,
  },
  openGraph: {
    title: 'Best Lensbooth Alternative: Created for Full Customization & 100% Free',
    description:
      'Why enter a 16-digit code or settle for rigid presets? LDR Photobooth is 100% free with no sign up, zero paywalls, and created for full customization to embrace creativity.',
    url: `${siteUrl}/alternative/lensbooth`,
    siteName: 'LDR Photobooth by Pico',
    images: [
      {
        url: '/Ldr_photobooth.png',
        width: 1200,
        height: 630,
        alt: 'Lensbooth Alternative - Created for Full Customization | LDR Photobooth by Pico',
      },
    ],
    locale: 'en_US',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best Lensbooth Alternative: Created for Full Customization & 100% Free',
    description:
      'Why enter a 16-digit code? LDR Photobooth is created for full customization and embracing creativity—tanpa batasan frame kaku agar kalian bisa berekspresi sebebas mungkin.',
    images: ['/Ldr_photobooth.png'],
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'Best Lensbooth Alternative: Created for Full Customization & Embracing Creativity',
      description:
        'A comprehensive guide to why LDR Photobooth by Pico is the premier free Lensbooth alternative. Featuring instant 1-click start, no sign-up, real-time dual camera pairing, and complete creative freedom without rigid frame restrictions.',
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
          name: 'How does LDR Photobooth support full customization and creative freedom?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Kami membuat LDR Photobooth tanpa batasan style atau frame bawaan yang kaku agar kalian semua bisa berekspresi sebebas mungkin. Anda dapat menyesuaikan layout, warna, filter kamera live, serta strip foto tanpa terkunci template kaku atau paywall.',
          },
        },
        {
          '@type': 'Question',
          name: 'What makes LDR Photobooth the best alternative to Lensbooth?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'While Lensbooth is built primarily for single devices or requires complex code sharing with locked templates, LDR Photobooth by Pico connects two separate devices live across any distance in real time with total aesthetic freedom. Plus, it is 100% free with absolutely no sign up needed.',
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
            text: 'No. LDR Photobooth is 100% free with no sign up required. All layouts, frames, and high-resolution photo strips are free to download without watermarks.',
          },
        },
      ],
    },
  ],
};

export default function LensboothAlternativePage() {
  return (
    <div className="lb-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* Embedded Clean Studio Styling */}
      <style>{`
        .lb-page {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          background: #ffffff;
          color: #0f172a;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          -webkit-font-smoothing: antialiased;
        }

        /* Topbar */
        .lb-topbar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: #ffffff;
          border-bottom: 1px solid #eaeaea;
          height: 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          box-sizing: border-box;
        }
        .lb-logo-link {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: #0f172a;
        }
        .lb-logo-img {
          height: 30px;
          width: auto;
          border-radius: 6px;
        }
        .lb-logo-title {
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 1.2px;
          color: #111827;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .lb-topbar-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 20px;
          background: #111827;
          color: #ffffff;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s ease;
          border: 1px solid #111827;
        }
        .lb-topbar-cta:hover {
          background: #1f2937;
          transform: translateY(-1px);
        }

        /* Hero */
        .lb-hero {
          text-align: center;
          padding: 72px 24px 44px;
          max-width: 900px;
          margin: 0 auto;
          box-sizing: border-box;
        }
        .lb-pill-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 24px;
        }
        .lb-pill-badge .sparkle {
          color: #0f172a;
        }
        .lb-hero-title {
          font-size: 46px;
          line-height: 1.15;
          font-weight: 900;
          color: #0f172a;
          margin: 0 0 20px 0;
          letter-spacing: -1px;
        }
        .lb-highlight-wrap {
          position: relative;
          display: inline-block;
          white-space: nowrap;
        }
        .lb-lime-underline {
          position: absolute;
          left: 0;
          bottom: 4px;
          width: 100%;
          height: 12px;
          background: #ccff00;
          z-index: -1;
          border-radius: 3px;
          transform: rotate(-0.5deg);
        }
        .lb-hero-sub {
          font-size: 18px;
          line-height: 1.65;
          color: #475569;
          margin: 0 auto 28px;
          max-width: 740px;
        }
        .lb-rating-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 6px 18px;
          background: #fffbeb;
          border: 1px solid #fef3c7;
          border-radius: 9999px;
          font-size: 13px;
          color: #92400e;
          margin-bottom: 32px;
        }
        .lb-stars {
          color: #f59e0b;
          letter-spacing: 2px;
          font-size: 14px;
        }
        .lb-hero-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .lb-cta-lime-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 16px 36px;
          background: #ccff00;
          color: #0f172a;
          font-size: 17px;
          font-weight: 800;
          border-radius: 9999px;
          text-decoration: none;
          box-shadow: 0 4px 18px rgba(204, 255, 0, 0.45);
          transition: all 0.2s ease;
          border: 1px solid #bbf000;
        }
        .lb-cta-lime-btn:hover {
          transform: translateY(-2px);
          background: #bbf000;
          box-shadow: 0 8px 26px rgba(204, 255, 0, 0.55);
        }
        .lb-hero-hint {
          font-size: 13px;
          color: #64748b;
        }

        /* Content Container */
        .lb-content {
          max-width: 1000px;
          width: 100%;
          margin: 0 auto;
          padding: 0 24px 80px;
          box-sizing: border-box;
        }

        /* Double Feature Advantage Callout */
        .lb-advantage-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin: 20px 0 60px;
        }
        .lb-adv-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 32px 28px;
          display: flex;
          flex-direction: column;
          position: relative;
          box-shadow: 0 4px 20px -2px rgba(0,0,0,0.03);
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .lb-adv-card:hover {
          border-color: #cbd5e1;
          transform: translateY(-2px);
        }
        .lb-adv-card.highlight {
          background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%);
          border-color: #bbf7d0;
        }
        .lb-adv-card.highlight-blue {
          background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
          border-color: #bfdbfe;
        }
        .lb-adv-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          width: fit-content;
          margin-bottom: 16px;
        }
        .lb-adv-tag.green {
          background: #dcfce7;
          color: #15803d;
        }
        .lb-adv-tag.blue {
          background: #dbeafe;
          color: #1d4ed8;
        }
        .lb-adv-quote {
          font-size: 22px;
          line-height: 1.35;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 14px 0;
          letter-spacing: -0.3px;
        }
        .lb-adv-desc {
          font-size: 14px;
          line-height: 1.65;
          color: #475569;
          margin: 0;
        }

        /* Section Headings */
        .lb-section {
          margin: 64px 0;
        }
        .lb-section-header {
          text-align: center;
          margin-bottom: 36px;
        }
        .lb-section-pill {
          display: inline-block;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 8px;
        }
        .lb-section-title {
          font-size: 32px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.5px;
          margin: 0;
        }
        .lb-section-sub {
          font-size: 16px;
          color: #64748b;
          margin-top: 10px;
          max-width: 640px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.5;
        }

        /* Comparison Table */
        .lb-table-card {
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          background: #ffffff;
          box-shadow: 0 8px 30px -4px rgba(0,0,0,0.04);
        }
        .lb-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 14px;
        }
        .lb-th-feature {
          padding: 18px 24px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          font-weight: 700;
          color: #475569;
          width: 28%;
        }
        .lb-th-pico {
          padding: 18px 24px;
          background: #f0fdf4;
          border-bottom: 1px solid #e2e8f0;
          font-weight: 800;
          color: #166534;
          width: 42%;
        }
        .lb-th-comp {
          padding: 18px 24px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          font-weight: 600;
          color: #64748b;
          width: 30%;
        }
        .lb-td-feature {
          padding: 18px 24px;
          border-bottom: 1px solid #f1f5f9;
          font-weight: 600;
          color: #1e293b;
          vertical-align: middle;
        }
        .lb-td-pico {
          padding: 18px 24px;
          border-bottom: 1px solid #f1f5f9;
          background: #fcfdfc;
          color: #14532d;
          font-weight: 600;
          vertical-align: middle;
        }
        .lb-td-comp {
          padding: 18px 24px;
          border-bottom: 1px solid #f1f5f9;
          color: #64748b;
          vertical-align: middle;
        }
        .lb-badge-check {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #15803d;
          font-weight: 700;
        }
        .lb-badge-cross {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #94a3b8;
        }

        /* Editorial Essay Block: Full Customization Manifesto */
        .lb-manifesto-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 44px 40px;
          box-shadow: 0 10px 32px -4px rgba(0,0,0,0.04);
          margin-bottom: 60px;
        }
        .lb-manifesto-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 14px;
          background: #fef3c7;
          border: 1px solid #fde68a;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 800;
          color: #92400e;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 16px;
        }
        .lb-manifesto-quote-box {
          background: #f8fafc;
          border-left: 4px solid #0f172a;
          border-radius: 0 16px 16px 0;
          padding: 24px 28px;
          margin: 24px 0 32px;
        }
        .lb-manifesto-quote-text {
          font-size: 20px;
          line-height: 1.55;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 10px 0;
        }
        .lb-manifesto-quote-sub {
          font-size: 14px;
          color: #64748b;
          margin: 0;
          font-style: italic;
        }
        .lb-manifesto-body {
          font-size: 16px;
          line-height: 1.75;
          color: #334155;
        }
        .lb-manifesto-body p {
          margin: 0 0 20px 0;
        }
        .lb-creative-pillars {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 32px;
        }
        .lb-pillar-item {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px 18px;
        }
        .lb-pillar-num {
          font-size: 12px;
          font-weight: 800;
          color: #0f172a;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }
        .lb-pillar-title {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 8px 0;
        }
        .lb-pillar-desc {
          font-size: 13px;
          line-height: 1.55;
          color: #64748b;
          margin: 0;
        }

        /* 4 Core Value Cards */
        .lb-features-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        .lb-feature-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 30px;
          box-shadow: 0 4px 16px -2px rgba(0,0,0,0.03);
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .lb-feature-card:hover {
          border-color: #cbd5e1;
          transform: translateY(-2px);
        }
        .lb-feature-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #f1f5f9;
          color: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
        }
        .lb-feature-title {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 10px 0;
        }
        .lb-feature-text {
          font-size: 14px;
          line-height: 1.6;
          color: #64748b;
          margin: 0;
        }

        /* FAQ */
        .lb-faq-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
          max-width: 860px;
          margin: 0 auto;
        }
        .lb-faq-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px 28px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }
        .lb-faq-q {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 10px 0;
        }
        .lb-faq-a {
          font-size: 14px;
          line-height: 1.65;
          color: #475569;
          margin: 0;
        }

        /* Bottom Hero CTA */
        .lb-bottom-cta {
          text-align: center;
          padding: 64px 24px;
          background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
          border: 1px solid #e2e8f0;
          border-radius: 28px;
          margin: 60px 0 20px;
          box-shadow: 0 12px 36px -6px rgba(0,0,0,0.04);
        }
        .lb-bottom-cta-title {
          font-size: 34px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.5px;
          margin: 0 0 14px 0;
        }
        .lb-bottom-cta-sub {
          font-size: 16px;
          color: #64748b;
          max-width: 580px;
          margin: 0 auto 30px;
          line-height: 1.6;
        }

        /* Minimalist Footer */
        .lb-footer {
          border-top: 1px solid #eaeaea;
          background: #ffffff;
          padding: 40px 40px 30px;
          margin-top: auto;
        }
        .lb-footer-inner {
          max-width: 1200px;
          margin: 0 auto 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }
        .lb-footer-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          user-select: none;
        }
        .lb-footer-logo-img {
          height: 26px;
          width: auto;
          border-radius: 6px;
          object-fit: contain;
          display: block;
        }
        .lb-footer-title {
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.8px;
          color: #0f172a;
        }
        .lb-footer-links {
          display: flex;
          align-items: center;
        }
        .lb-footer-pico-link {
          text-decoration: none;
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 9999px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
        }
        .lb-footer-pico-link:hover {
          color: #0f172a;
          background: #f1f5f9;
          border-color: #cbd5e1;
        }
        .lb-footer-copy {
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
          border-top: 1px solid #f1f5f9;
          padding-top: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Responsiveness */
        @media (max-width: 768px) {
          .lb-topbar {
            padding: 0 20px;
            height: 60px;
          }
          .lb-hero {
            padding: 44px 16px 30px;
          }
          .lb-hero-title {
            font-size: 30px;
            line-height: 1.25;
          }
          .lb-hero-sub {
            font-size: 15px;
          }
          .lb-advantage-grid {
            grid-template-columns: 1fr;
          }
          .lb-creative-pillars {
            grid-template-columns: 1fr;
          }
          .lb-features-grid {
            grid-template-columns: 1fr;
          }
          .lb-manifesto-card {
            padding: 28px 20px;
          }
          .lb-manifesto-quote-text {
            font-size: 17px;
          }
          .lb-bottom-cta {
            padding: 44px 20px;
          }
          .lb-bottom-cta-title {
            font-size: 26px;
          }
          .lb-footer {
            padding: 30px 20px 24px;
          }
        }
      `}</style>

      {/* ── TOPBAR NAVIGATION ── */}
      <header className="lb-topbar">
        <Link href="/" className="lb-logo-link">
          <img src="/Ldr_photobooth.png" alt="LDR Photobooth Logo" className="lb-logo-img" />
          <span className="lb-logo-title">LDR PHOTOBOOTH</span>
        </Link>
        <Link href="/" className="lb-topbar-cta">
          <span>Launch Booth Free</span>
          <span>→</span>
        </Link>
      </header>

      {/* ── HERO HEADER ── */}
      <section className="lb-hero">
        <div className="lb-pill-badge">
          <span className="sparkle">✦</span> 100% Free • No Sign-Up • Created for Creative Freedom
        </div>

        <h1 className="lb-hero-title">
          The Best Free <span className="lb-highlight-wrap">Lensbooth<span className="lb-lime-underline"></span></span> Alternative for Couples & Friends
        </h1>

        <p className="lb-hero-sub">
          Looking for a web photobooth that does not force you through sign-up walls, never locks you into rigid preset frames, and lets you take photos with your long-distance partner live in real-time? 
          <strong> LDR Photobooth by Pico</strong> was engineered for instant connection and total creative customization.
        </p>

        <div className="lb-rating-badge">
          <span className="lb-stars">★★★★★</span>
          <span><strong>4.9 / 5</strong> rating from 170+ long-distance couples</span>
        </div>

        <div className="lb-hero-actions">
          <Link href="/" className="lb-cta-lime-btn">
            Start Photobooth Now (100% Free) →
          </Link>
          <span className="lb-hero-hint">1-Click Instant Start • Zero Registration • No App Download Required</span>
        </div>
      </section>

      {/* ── MAIN EDITORIAL & VALUE CONTENT ── */}
      <main className="lb-content">
        {/* Double Core Advantages: Frictionless Connection & Unbounded Creativity */}
        <div className="lb-advantage-grid">
          {/* Card 1: 1-Click vs 16-Digit */}
          <div className="lb-adv-card highlight">
            <span className="lb-adv-tag green">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Zero Friction
            </span>
            <h2 className="lb-adv-quote">
              “Why enter a 16-digit code when you can start in 1 click with Pico?”
            </h2>
            <p className="lb-adv-desc">
              Lensbooth forces couples to manually copy and transcribe long 16-digit codes between apps—often dropping camera feeds. With LDR Photobooth by Pico, you start instantly in 1 click without passwords or verification delays.
            </p>
          </div>

          {/* Card 2: Created for Full Customization & Embracing Creativity */}
          <div className="lb-adv-card highlight-blue">
            <span className="lb-adv-tag blue">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Creative Freedom
            </span>
            <h2 className="lb-adv-quote">
              Created for Full Customization & Embracing True Creativity
            </h2>
            <p className="lb-adv-desc">
              Kami membuat LDR Photobooth tanpa batasan style atau frame bawaan yang kaku agar kalian semua bisa berekspresi sebebas mungkin. Abadikan momen kalian tanpa terkunci template sempit.
            </p>
          </div>
        </div>

        {/* ── MANIFESTO ARTICLE SECTION ── */}
        <section className="lb-manifesto-card">
          <span className="lb-manifesto-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Philosophy & Creative Vision
          </span>

          <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', margin: '0 0 12px 0', letterSpacing: '-0.5px' }}>
            Created for Full Customization: Bebas Berekspresi Tanpa Frame Kaku
          </h2>

          <div className="lb-manifesto-quote-box">
            <p className="lb-manifesto-quote-text">
              “Kami membuat LDR Photobooth tanpa batasan style / frame bawaan yang kaku agar kalian semua bisa berekspresi sebebas mungkin.”
            </p>
            <p className="lb-manifesto-quote-sub">
              — LDR Photobooth by Pico Philosophy: Built to eliminate artistic restrictions and celebrate genuine love across distance.
            </p>
          </div>

          <div className="lb-manifesto-body">
            <p>
              Saat Anda dan orang tersayang meluangkan waktu berharga di tengah padatnya rutinitas atau perbedaan zona waktu untuk melakukan sesi foto bersama, 
              hal terakhir yang Anda inginkan adalah rasa frustrasi karena <strong>pilihan template yang kaku dan membosankan</strong>.
            </p>
            <p>
              Banyak platform photobooth online, termasuk Lensbooth dan aplikasi bilik foto konvensional, memperlakukan pengguna seperti cetakan pabrik: 
              Anda dipaksa memilih dari segelintir frame bawaan yang statis, rasio foto yang tidak bisa disesuaikan, atau opsi kustomisasi warna dan stiker yang dikunci di balik akun berbayar (paywall). 
              Hal tersebut justru membelenggu kreativitas dan membuat foto setiap pasangan tampak seragam.
            </p>
            <p>
              Di <strong>LDR Photobooth by Pico</strong>, kami percaya bahwa bilik foto digital seharusnya berfungsi sebagai <em>kanvas tanpa batas</em>. 
              Setiap hubungan memiliki bahasa cinta, humor, dan dinamika estetika yang unik—ada yang menyukai gaya minimalis Life4Cuts monokrom Korea, 
              ada yang gemar warna-warna pastel cerah, dan ada yang ingin mengeksplorasi pose konyol spontan dengan layout grid yang leluasa.
            </p>
          </div>

          {/* 3 Pillars of Creative Freedom */}
          <div className="lb-creative-pillars">
            <div className="lb-pillar-item">
              <span className="lb-pillar-num">1</span>
              <h3 className="lb-pillar-title">Zero Rigid Boundaries</h3>
              <p className="lb-pillar-desc">
                Tata letak dan proporsi yang adaptif. Bebas memilih kombinasi strip, ukuran slot seimbang, dan estetika tanpa batasan frame kaku bawaan.
              </p>
            </div>
            <div className="lb-pillar-item">
              <span className="lb-pillar-num">2</span>
              <h3 className="lb-pillar-title">Live Synchronized Framing</h3>
              <p className="lb-pillar-desc">
                Tampilan kamera ganda real-time berlatensi ultra-rendah memungkinkan Anda dan pasangan mengarahkan pose kreatif bersama sebelum shutter berbunyi.
              </p>
            </div>
            <div className="lb-pillar-item">
              <span className="lb-pillar-num">3</span>
              <h3 className="lb-pillar-title">Zero Creative Paywalls</h3>
              <p className="lb-pillar-desc">
                Semua hasil foto strip dapat diunduh dalam kualitas Full HD jernih tanpa watermark, tanpa biaya langganan, dan tanpa perlu membuat akun.
              </p>
            </div>
          </div>
        </section>

        {/* ── SIDE-BY-SIDE COMPARISON TABLE ── */}
        <section className="lb-section">
          <div className="lb-section-header">
            <span className="lb-section-pill">Direct Breakdown</span>
            <h2 className="lb-section-title">LDR Photobooth vs Lensbooth: Side-by-Side Comparison</h2>
            <p className="lb-section-sub">
              See why couples and long-distance besties choose LDR Photobooth by Pico over traditional alternatives.
            </p>
          </div>

          <div className="lb-table-card">
            <table className="lb-table">
              <thead>
                <tr>
                  <th className="lb-th-feature">Feature</th>
                  <th className="lb-th-pico">LDR Photobooth by Pico</th>
                  <th className="lb-th-comp">Lensbooth</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="lb-td-feature">Room Setup & Pairing</td>
                  <td className="lb-td-pico">
                    <div className="lb-badge-check">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      1-Click Instant Start (Zero friction)
                    </div>
                  </td>
                  <td className="lb-td-comp">
                    <div className="lb-badge-cross">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      Tedious 16-digit code transcription
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="lb-td-feature">Creative Freedom & Framing</td>
                  <td className="lb-td-pico">
                    <div className="lb-badge-check">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      Tanpa batasan frame kaku bawaan
                    </div>
                  </td>
                  <td className="lb-td-comp">
                    <div className="lb-badge-cross">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      Rigid preset templates & locked themes
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="lb-td-feature">Pricing & Paywalls</td>
                  <td className="lb-td-pico">
                    <div className="lb-badge-check">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      100% Free Forever (All features unlocked)
                    </div>
                  </td>
                  <td className="lb-td-comp">
                    <div className="lb-badge-cross">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      Freemium / Paid upgrades for extras
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="lb-td-feature">Account / Sign-Up Requirement</td>
                  <td className="lb-td-pico">
                    <div className="lb-badge-check">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      No Sign-Up (Zero accounts or emails)
                    </div>
                  </td>
                  <td className="lb-td-comp">
                    <div className="lb-badge-cross">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      Prompts for login and registrations
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="lb-td-feature">True LDR Live Dual Camera</td>
                  <td className="lb-td-pico">
                    <div className="lb-badge-check">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      Real-time WebRTC live video sync
                    </div>
                  </td>
                  <td className="lb-td-comp">
                    <div className="lb-badge-cross">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      Single device or manual upload collage
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="lb-td-feature">Synchronized Shutter Timer</td>
                  <td className="lb-td-pico">
                    <div className="lb-badge-check">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      Millisecond-accurate dual countdown
                    </div>
                  </td>
                  <td className="lb-td-comp">
                    <div className="lb-badge-cross">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      Single timer or desynchronized
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="lb-td-feature">Watermarks & Strip Quality</td>
                  <td className="lb-td-pico">
                    <div className="lb-badge-check">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      Clean Full HD strips (100% watermark-free)
                    </div>
                  </td>
                  <td className="lb-td-comp">
                    <div className="lb-badge-cross">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      Watermarked on free tier
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── CORE PILLARS GRID ── */}
        <section className="lb-section">
          <div className="lb-section-header">
            <span className="lb-section-pill">Why Switch</span>
            <h2 className="lb-section-title">Engineered for Moments, Not Technical Hurdles</h2>
          </div>

          <div className="lb-features-grid">
            <div className="lb-feature-card">
              <div className="lb-feature-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h3 className="lb-feature-title">1. Instant 1-Click Launch</h3>
              <p className="lb-feature-text">
                Why enter a 16-digit code when you can start in 1 click with Pico? Open the room, send your partner the instant link, and start snapping memories immediately.
              </p>
            </div>

            <div className="lb-feature-card">
              <div className="lb-feature-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <h3 className="lb-feature-title">2. Unrestricted Creative Customization</h3>
              <p className="lb-feature-text">
                Kami membuat LDR Photobooth tanpa batasan style atau frame bawaan yang kaku agar kalian semua bisa berekspresi sebebas mungkin dengan fleksibilitas layout dan visual.
              </p>
            </div>

            <div className="lb-feature-card">
              <div className="lb-feature-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <h3 className="lb-feature-title">3. True Dual-Camera WebRTC Sync</h3>
              <p className="lb-feature-text">
                Low-latency video streaming connects you face-to-face across any country or timezone. See each other live and count down to the exact millisecond.
              </p>
            </div>

            <div className="lb-feature-card">
              <div className="lb-feature-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <h3 className="lb-feature-title">4. 100% Free & No Watermarks</h3>
              <p className="lb-feature-text">
                Download your photo strips in crisp, high-resolution Full HD. Perfect for sharing directly to Instagram stories, TikTok, or printing for your physical scrapbooks.
              </p>
            </div>
          </div>
        </section>

        {/* ── FAQ SECTION ── */}
        <section className="lb-section">
          <div className="lb-section-header">
            <span className="lb-section-pill">Got Questions?</span>
            <h2 className="lb-section-title">Frequently Asked Questions</h2>
          </div>

          <div className="lb-faq-list">
            <div className="lb-faq-card">
              <h3 className="lb-faq-q">Why enter a 16-digit code when you can start in 1 click with Pico?</h3>
              <p className="lb-faq-a">
                In Lensbooth, setting up a room requires manually typing or copying an unwieldy 16-character code, which frequently causes typos or reloads on mobile browsers. LDR Photobooth by Pico provides instant 1-click room generation with zero friction.
              </p>
            </div>

            <div className="lb-faq-card">
              <h3 className="lb-faq-q">Bagaimana LDR Photobooth memberikan kebebasan kustomisasi bagi pengguna?</h3>
              <p className="lb-faq-a">
                Kami merancang LDR Photobooth tanpa batasan style atau frame bawaan yang kaku agar kalian semua bisa berekspresi sebebas mungkin. Anda dapat memilih beragam layout, mengatur nuansa foto secara mandiri, dan menciptakan strip foto yang benar-benar mencerminkan karakter Anda berdua tanpa harus terkunci di template monoton.
              </p>
            </div>

            <div className="lb-faq-card">
              <h3 className="lb-faq-q">Is LDR Photobooth really 100% free with no sign-up?</h3>
              <p className="lb-faq-a">
                Yes! We never ask for your email, credit card, or social login. All strip layouts, real-time duo camera synchronizations, and high-definition downloads are completely free forever.
              </p>
            </div>

            <div className="lb-faq-card">
              <h3 className="lb-faq-q">Can we use it if one partner is on iPhone and the other is on PC or Android?</h3>
              <p className="lb-faq-a">
                Absolutely. LDR Photobooth runs directly in modern browsers (Safari, Chrome, Edge) across iOS, Android, macOS, and Windows with zero app downloads necessary.
              </p>
            </div>
          </div>
        </section>

        {/* ── BOTTOM HERO CTA ── */}
        <section className="lb-bottom-cta">
          <h2 className="lb-bottom-cta-title">Ready to Capture Memories Together?</h2>
          <p className="lb-bottom-cta-sub">
            Join thousands of long-distance couples and best friends making cute memories right now. 
            No sign-up, no 16-digit codes, and no rigid frame limits.
          </p>
          <Link href="/" className="lb-cta-lime-btn">
            Start LDR Photobooth in 1 Click →
          </Link>
          <div style={{ marginTop: '16px', fontSize: '13px', color: '#64748b' }}>
            Instant room setup • 100% Free Forever • Works seamlessly on any phone or laptop
          </div>
        </section>
      </main>

      {/* ── MINIMALIST FOOTER (Standardized with Home Page) ── */}
      <footer className="lb-footer">
        <div className="lb-footer-inner">
          <div className="lb-footer-brand">
            <img src="/Ldr_photobooth.png" alt="Pico" className="lb-footer-logo-img" />
            <span className="lb-footer-title">LDR PHOTOBOOTH</span>
          </div>
          <div className="lb-footer-links">
            <a
              href="https://picobooth.web.id/"
              target="_blank"
              rel="noopener noreferrer"
              className="lb-footer-pico-link"
            >
              part of PICOBOOTH ↗
            </a>
          </div>
        </div>
        <div className="lb-footer-copy">
          © {new Date().getFullYear()} LDR Photobooth by Pico. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
