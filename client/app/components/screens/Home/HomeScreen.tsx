'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import LanguagePicker from '../../ui/LanguagePicker';
import { useLanguage } from '../../../context/LanguageContext';
import './HomeScreen.css';

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
      q: t('home.faq.q1'),
      a: t('home.faq.a1')
    },
    {
      q: t('home.faq.q2'),
      a: t('home.faq.a2')
    },
    {
      q: t('home.faq.q3'),
      a: t('home.faq.a3')
    },
    {
      q: t('home.faq.q4'),
      a: t('home.faq.a4')
    },
    {
      q: t('home.faq.q5'),
      a: t('home.faq.a5')
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
          <a href="#activities" className="home-nav-link">{t('home.nav.activities')}</a>
          <a href="#articles" className="home-nav-link">{t('home.nav.articles')}</a>
          <a href="#faq" className="home-nav-link">{t('home.nav.faq')}</a>
        </nav>

        {/* Actions (LanguagePicker only) */}
        <div className="home-top-actions">
          <LanguagePicker />
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="home-hero">
        <div className="home-hero-content">
          {/* Left Column: Bold Typography & Primary Lime CTA */}
          <div className="home-hero-left">
            <h1 className="home-headline">
              {t('home.hero.title1')}<br />
              {t('home.hero.title2')}<br />
              <span className="home-highlight-wrap">
                {t('home.hero.titleHighlight')}
                <span className="home-lime-underline" />
              </span><br />
              {t('home.hero.title3')}
            </h1>

            {/* CTAs: Bright Lime Green Button */}
            <div className="home-cta-row">
              <button onClick={onEnterBooth} className="home-try-lime-btn">
                {t('home.hero.cta')}
              </button>
            </div>
          </div>

          {/* Right Column: 3 Lines of Slow Vertical Scrolling Marquee on Desktop */}
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
          <h2 className="home-section-title">{t('home.activities.title')}</h2>
        </div>

        <div className="home-activities-grid">
          {/* Duo Live Mode */}
          <div className="home-act-card popular" onClick={() => onSelectMode('live', 2)}>
            <div className="home-act-top">
              <span className="home-act-icon live-icon">⚡</span>
              <span className="home-act-badge lime">{t('home.mode.live.badge')}</span>
            </div>
            <h3 className="home-act-title">{t('home.mode.live.title')}</h3>
            <p className="home-act-desc">{t('home.mode.live.desc')}</p>
            <div className="home-act-action">
              <span>{t('home.mode.live.cta')}</span>
            </div>
          </div>

          {/* Solo Mode */}
          <div className="home-act-card" onClick={() => onSelectMode('solo')}>
            <div className="home-act-top">
              <span className="home-act-icon solo-icon">👤</span>
              <span className="home-act-badge solo-badge">{t('home.mode.solo.badge')}</span>
            </div>
            <h3 className="home-act-title">{t('home.mode.solo.title')}</h3>
            <p className="home-act-desc">{t('home.mode.solo.desc')}</p>
            <div className="home-act-action">
              <span>{t('home.mode.solo.cta')}</span>
            </div>
          </div>

          {/* LDR Surprise Mode */}
          <div className="home-act-card" onClick={onEnterBooth}>
            <div className="home-act-top">
              <span className="home-act-icon surprise-icon">👥</span>
              <span className="home-act-badge surprise-badge">{t('home.mode.group.badge')}</span>
            </div>
            <h3 className="home-act-title">{t('home.mode.group.title')}</h3>
            <p className="home-act-desc">{t('home.mode.group.desc')}</p>
            <div className="home-act-action">
              <span>{t('home.mode.group.cta')}</span>
            </div>
          </div>

          {/* Community Showcase */}
          <div className="home-act-card" onClick={() => onSelectMode('community')}>
            <div className="home-act-top">
              <span className="home-act-icon gallery-icon">✨</span>
              <span className="home-act-badge gallery-badge">{t('home.mode.community.badge')}</span>
            </div>
            <h3 className="home-act-title">{t('home.mode.community.title')}</h3>
            <p className="home-act-desc">{t('home.mode.community.desc')}</p>
            <div className="home-act-action">
              <span>{t('home.mode.community.cta')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── ARTICLES SECTION ── */}
      <section id="articles" className="home-section">
        <div className="home-section-header">
          <h2 className="home-section-title">{t('home.articles.title')}</h2>
        </div>

        <div className="home-articles-grid">
          {/* Article 1: Lensbooth */}
          <Link href="/alternative/lensbooth" className="home-article-card">
            <div className="home-art-badge">{t('home.articles.lensbooth.badge')}</div>
            <h3 className="home-art-title">{t('home.articles.lensbooth.title')}</h3>
            <p className="home-art-desc">{t('home.articles.lensbooth.desc')}</p>
            <div className="home-art-link">{t('home.articles.readMore')}</div>
          </Link>

          {/* Article 2: getAngie */}
          <Link href="/alternative/getangie" className="home-article-card">
            <div className="home-art-badge purple">{t('home.articles.getangie.badge')}</div>
            <h3 className="home-art-title">{t('home.articles.getangie.title')}</h3>
            <p className="home-art-desc">{t('home.articles.getangie.desc')}</p>
            <div className="home-art-link">{t('home.articles.readMore')}</div>
          </Link>
        </div>
      </section>

      {/* ── FAQ SECTION ── */}
      <section id="faq" className="home-section">
        <div className="home-section-header">
          <h2 className="home-section-title">{t('home.faq.title')}</h2>
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
                  <span className="home-faq-toggle">{isOpen ? '−' : '+'}</span>
                </div>
                {isOpen && <div className="home-faq-answer">{faq.a}</div>}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── BOTTOM CTA BANNER ── */}
      <section className="home-bottom-cta">
        <div className="home-bottom-box">
          <h2 className="home-bottom-title">{t('home.bottom.title')}</h2>
          <button onClick={onEnterBooth} className="home-bottom-lime-btn">
            {t('home.hero.cta')}
          </button>
        </div>
      </section>

      {/* ── MINIMALIST FOOTER ── */}
      <footer className="home-footer">
        <div className="home-footer-inner">
          <div className="home-footer-brand">
            <strong>LDR PHOTOBOOTH</strong>
            <span>{t('home.footer.tagline')}</span>
          </div>
          <div className="home-footer-links">
            <a href="https://picobooth.web.id/" target="_blank" rel="noopener noreferrer">picobooth.web.id ↗</a>
            <Link href="/alternative/lensbooth">Lensbooth Alternative</Link>
            <Link href="/alternative/getangie">getAngie Alternative</Link>
          </div>
        </div>
        <div className="home-footer-copy">
          {t('home.footer.rights')}
        </div>
      </footer>
    </div>
  );
}
