'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import LanguagePicker from '../ui/LanguagePicker';
import { useLanguage } from '../../context/LanguageContext';

interface HomeScreenProps {
  onEnterBooth: () => void;
  onSelectMode: (mode: 'solo' | 'duo' | 'live' | 'community', sizeId?: number) => void;
}

interface GalleryPost {
  id: string;
  title: string;
  author: string;
  url: string;
  type?: string;
  likes?: number;
}

// Fallback photo strips to ensure continuous, instant visual marquee without waiting for network
const FALLBACK_STRIPS = [
  { id: 'fb-1', url: 'https://ldr-photobooth.if2372047.workers.dev/posts/248cbef7-c87b-4358-9f15-3b0e04583e6c.png', title: 'Khanza & Fara' },
  { id: 'fb-2', url: '/Ldr_photobooth.png', title: 'Pico Classic' },
  { id: 'fb-3', url: 'https://ldr-photobooth.if2372047.workers.dev/posts/63bc198b-8d21-4e63-9bcc-334cc1f08edf.png', title: 'Date Night' },
  { id: 'fb-4', url: '/Ldr_photobooth.png', title: 'LDR Memories' },
];

export default function HomeScreen({ onEnterBooth, onSelectMode }: HomeScreenProps) {
  const { t } = useLanguage();
  const [posts, setPosts] = useState<GalleryPost[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Fetch real gallery posts from Cloudflare Workers
  useEffect(() => {
    let isMounted = true;
    const fetchGallery = async () => {
      try {
        const res = await fetch('https://ldr-photobooth.if2372047.workers.dev/api/community/posts?sort=hot');
        if (res.ok) {
          const json = await res.json();
          const items: GalleryPost[] = Array.isArray(json) ? json : (json.data || []);
          if (isMounted && items.length > 0) {
            setPosts(items.slice(0, 10));
          }
        }
      } catch (e) {
        console.warn('Gallery fetch fallback used:', e);
      }
    };
    fetchGallery();
    return () => { isMounted = false; };
  }, []);

  // Display items: combine fetched posts with fallbacks, duplicated for seamless infinite loop
  const displayPhotos = useMemo(() => {
    const list = posts.length > 0
      ? posts.map(p => ({
          id: p.id,
          url: p.url.startsWith('http') ? p.url : `https://ldr-photobooth.if2372047.workers.dev${p.url}`,
          title: p.author || p.title || 'Couple Photo'
        }))
      : FALLBACK_STRIPS;
    // Duplicate to ensure seamless continuous CSS marquee
    return [...list, ...list, ...list];
  }, [posts]);

  // 3 Lanes for desktop with natural offsets
  const column1 = useMemo(() => {
    return [...displayPhotos];
  }, [displayPhotos]);

  const column2 = useMemo(() => {
    if (displayPhotos.length <= 1) return [...displayPhotos];
    const offset = Math.floor(displayPhotos.length / 3);
    return [...displayPhotos.slice(offset), ...displayPhotos.slice(0, offset)];
  }, [displayPhotos]);

  const column3 = useMemo(() => {
    if (displayPhotos.length <= 2) return [...displayPhotos];
    const offset = Math.floor((displayPhotos.length * 2) / 3);
    return [...displayPhotos.slice(offset), ...displayPhotos.slice(0, offset)];
  }, [displayPhotos]);

  const faqs = [
    {
      q: 'Is LDR Photobooth really 100% free with no sign up?',
      a: 'Yes, completely free. No credit cards, no subscriptions, no email registration, and no paywalls. All customized photo strips download watermark-free.'
    },
    {
      q: 'Why enter a 16-digit code when you can start in 1 click with Pico?',
      a: 'Unlike apps like Lensbooth that make couples transcribe complex 16-digit codes, Pico launches your session in 1 click or via a simple direct link.'
    },
    {
      q: 'How does real-time camera sync work across distance?',
      a: 'We use ultra-low latency WebRTC peer-to-peer streaming. You and your partner share a screen with synchronized countdown timers so you pose together at the exact same millisecond.'
    },
    {
      q: 'Do we need to download an app or extension?',
      a: 'No app download is needed. It runs smoothly directly inside Safari, Chrome, Edge, and all mobile browsers on iOS, Android, macOS, and Windows.'
    },
    {
      q: 'Are our photos and webcams private?',
      a: 'Yes. Live video is transmitted directly between you and your partner. Photos are merged right on your device and are never stored on public servers unless you voluntarily publish them to the community gallery.'
    }
  ];

  return (
    <div className="home-container">
      {/* ── CLEAN TOPBAR ── */}
      <header className="home-topbar">
        <div className="home-logo" onClick={onEnterBooth}>
          <img src="/Ldr_photobooth.png" alt="LDR Photobooth" className="home-logo-img" />
          <span className="home-logo-title">LDR PHOTOBOOTH</span>
        </div>

        {/* Navigation links */}
        <nav className="home-nav">
          <a href="#activities" className="home-nav-link">Activities</a>
          <a href="#articles" className="home-nav-link">Articles</a>
          <a href="#faq" className="home-nav-link">FAQ</a>
        </nav>

        {/* Actions */}
        <div className="home-top-actions">
          <LanguagePicker />
          <button onClick={onEnterBooth} className="home-topbar-lime-btn">
            try it now... ↗
          </button>
        </div>
      </header>

      {/* ── HERO SECTION (Pico Aesthetic) ── */}
      <section className="home-hero">
        <div className="home-hero-content">
          {/* Left Column: Bold Typography & CTAs */}
          <div className="home-hero-left">
            <h1 className="home-headline">
              The<br />
              Original LDR<br />
              <span className="home-highlight-wrap">
                Photobooth
                <span className="home-lime-underline" />
              </span><br />
              online...
            </h1>

            {/* CTAs: Bright Lime Green Button */}
            <div className="home-cta-row">
              <button onClick={onEnterBooth} className="home-try-lime-btn">
                try it now... ↗
              </button>
            </div>
          </div>

          {/* Right Column: 3 Lines of High-Performance Slow Vertical Scrolling Marquee on Desktop */}
          <div className="home-hero-right">
            <div className="home-marquee-stage">
              {/* Line 1 (All Devices) */}
              <div className="home-marquee-col col-1">
                <div className="home-marquee-track slow-1">
                  {column1.map((item, idx) => (
                    <div key={`c1-${item.id}-${idx}`} className="home-strip-card">
                      <img
                        src={item.url}
                        alt={item.title}
                        loading="lazy"
                        className="home-strip-img"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/Ldr_photobooth.png';
                        }}
                      />
                      <div className="home-strip-label">{item.title}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Line 2 (Desktop Only) */}
              <div className="home-marquee-col col-2 desktop-only-col">
                <div className="home-marquee-track slow-2">
                  {column2.map((item, idx) => (
                    <div key={`c2-${item.id}-${idx}`} className="home-strip-card">
                      <img
                        src={item.url}
                        alt={item.title}
                        loading="lazy"
                        className="home-strip-img"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/Ldr_photobooth.png';
                        }}
                      />
                      <div className="home-strip-label">{item.title}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Line 3 (Desktop Only) */}
              <div className="home-marquee-col col-3 desktop-only-col">
                <div className="home-marquee-track slow-3">
                  {column3.map((item, idx) => (
                    <div key={`c3-${item.id}-${idx}`} className="home-strip-card">
                      <img
                        src={item.url}
                        alt={item.title}
                        loading="lazy"
                        className="home-strip-img"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/Ldr_photobooth.png';
                        }}
                      />
                      <div className="home-strip-label">{item.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ACTIVITIES / MODES SECTION ── */}
      <section id="activities" className="home-section">
        <div className="home-section-header">
          <div className="home-section-tag">✦ ACTIVITIES</div>
          <h2 className="home-section-title">Choose Your Session</h2>
          <p className="home-section-desc">Instant real-time photobooth sessions engineered for long-distance pairs & individuals.</p>
        </div>

        <div className="home-activities-grid">
          {/* Duo Live Mode */}
          <div className="home-act-card popular" onClick={() => onSelectMode('live', 2)}>
            <div className="home-act-top">
              <span className="home-act-icon">⚡</span>
              <span className="home-act-badge lime">POPULAR • LIVE</span>
            </div>
            <h3 className="home-act-title">Duo Live Mode</h3>
            <p className="home-act-desc">Pair 2 cameras live in real time with synchronized countdowns. Smile together across any distance.</p>
            <div className="home-act-action">Start Live Booth ↗</div>
          </div>

          {/* Solo Mode */}
          <div className="home-act-card" onClick={() => onSelectMode('solo')}>
            <div className="home-act-top">
              <span className="home-act-icon">👤</span>
              <span className="home-act-badge">PORTRAIT</span>
            </div>
            <h3 className="home-act-title">Solo Mode</h3>
            <p className="home-act-desc">Individual photo shoot with authentic Korean Life4Cuts (인생네컷) minimalist frame styles.</p>
            <div className="home-act-action">Take Solo Photos ↗</div>
          </div>

          {/* LDR Surprise Mode */}
          <div className="home-act-card" onClick={onEnterBooth}>
            <div className="home-act-top">
              <span className="home-act-icon">👥</span>
              <span className="home-act-badge">TURN-BASED</span>
            </div>
            <h3 className="home-act-title">LDR Surprise Mode</h3>
            <p className="home-act-desc">Take turns secretly posing for each frame, then reveal the combined photo strip together at the end.</p>
            <div className="home-act-action">Play Surprise Mode ↗</div>
          </div>

          {/* Community Showcase */}
          <div className="home-act-card" onClick={() => onSelectMode('community')}>
            <div className="home-act-top">
              <span className="home-act-icon">✨</span>
              <span className="home-act-badge">GALLERY</span>
            </div>
            <h3 className="home-act-title">LDR Gallery & Frames</h3>
            <p className="home-act-desc">Discover cute photo strips created by couples worldwide and explore custom community frames.</p>
            <div className="home-act-action">Explore Gallery ↗</div>
          </div>
        </div>
      </section>

      {/* ── ARTICLES SECTION ── */}
      <section id="articles" className="home-section">
        <div className="home-section-header">
          <div className="home-section-tag">✦ ARTICLES & COMPARISONS</div>
          <h2 className="home-section-title">The Better Way to Photobooth</h2>
          <p className="home-section-desc">See why long-distance couples prefer Pico over traditional photobooth apps.</p>
        </div>

        <div className="home-articles-grid">
          {/* Article 1: Lensbooth */}
          <Link href="/alternative/lensbooth" className="home-article-card">
            <div className="home-art-badge">LENSBOOTH ALTERNATIVE</div>
            <h3 className="home-art-title">Why enter a 16-digit code when you can start in 1 click with Pico?</h3>
            <p className="home-art-desc">
              Lensbooth requires entering a 16-digit code just to pair devices. Learn why LDR Photobooth by Pico is 100% free with zero registration.
            </p>
            <div className="home-art-link">Read Full Comparison →</div>
          </Link>

          {/* Article 2: getAngie */}
          <Link href="/alternative/getangie" className="home-article-card">
            <div className="home-art-badge">GETANGIE ALTERNATIVE</div>
            <h3 className="home-art-title">The #1 Free getAngie Alternative for Long Distance Couples (Zero Paywalls)</h3>
            <p className="home-art-desc">
              Tired of subscription paywalls and mini-game bloat? LDR Photobooth by Pico delivers a pure, authentic Korean photo booth experience.
            </p>
            <div className="home-art-link">Read Full Comparison →</div>
          </Link>
        </div>
      </section>

      {/* ── FAQ SECTION ── */}
      <section id="faq" className="home-section">
        <div className="home-section-header">
          <div className="home-section-tag">✦ FAQ</div>
          <h2 className="home-section-title">Frequently Asked Questions</h2>
          <p className="home-section-desc">Everything you need to know about taking photos together from distance.</p>
        </div>

        <div className="home-faq-list">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div 
                key={index} 
                className={`home-faq-item ${isOpen ? 'open' : ''}`}
                onClick={() => setOpenFaq(isOpen ? null : index)}
              >
                <div className="home-faq-question">
                  <span>{faq.q}</span>
                  <span className="home-faq-arrow">{isOpen ? '−' : '+'}</span>
                </div>
                {isOpen && <div className="home-faq-answer">{faq.a}</div>}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── BOTTOM CTA BANNER ── */}
      <section className="home-bottom-cta">
        <h2 className="home-bottom-title">Ready to take photos together?</h2>
        <p className="home-bottom-desc">Join thousands of long-distance couples making cute memories today.</p>
        <button onClick={onEnterBooth} className="home-bottom-btn">
          Start Photobooth Now (100% Free) →
        </button>
      </section>

      {/* ── MINIMALIST FOOTER ── */}
      <footer className="home-footer">
        <div className="home-footer-inner">
          <div className="home-footer-brand">
            <strong>LDR PHOTOBOOTH</strong>
            <span>The Original LDR Photobooth in the World</span>
          </div>
          <div className="home-footer-links">
            <a href="https://picobooth.web.id/" target="_blank" rel="noopener noreferrer">picobooth.web.id ↗</a>
            <Link href="/alternative/lensbooth">Lensbooth Alternative</Link>
            <Link href="/alternative/getangie">getAngie Alternative</Link>
          </div>
        </div>
        <div className="home-footer-copy">
          © {new Date().getFullYear()} LDR Photobooth by Pico. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
