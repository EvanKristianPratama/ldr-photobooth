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

// Helper function to thoroughly shuffle an array (Fisher-Yates algorithm)
function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Fallback photo strips to ensure continuous, instant visual marquee without waiting for network
const FALLBACK_STRIPS = [
  { id: 'fb-1', url: 'https://ldr-photobooth.if2372047.workers.dev/posts/248cbef7-c87b-4358-9f15-3b0e04583e6c.png', title: 'Khanza & Fara' },
  { id: 'fb-2', url: 'https://ldr-photobooth.if2372047.workers.dev/posts/41e1496c-f8ad-4c3d-98f3-aa0b22445eb3.png', title: 'Din & Pina' },
  { id: 'fb-3', url: 'https://ldr-photobooth.if2372047.workers.dev/posts/63bc198b-8d21-4e63-9bcc-334cc1f08edf.png', title: 'Date Night' },
  { id: 'fb-4', url: 'https://ldr-photobooth.if2372047.workers.dev/posts/46b134b7-1450-4d82-8d78-02abeafd0612.png', title: 'With Bestie' },
  { id: 'fb-5', url: 'https://ldr-photobooth.if2372047.workers.dev/posts/25ee775c-4996-436a-90d5-b6938da6f558.png', title: 'Couple Moment' },
  { id: 'fb-6', url: 'https://ldr-photobooth.if2372047.workers.dev/posts/025bf559-92b1-4212-ba85-e17a66ac46ce.png', title: 'Sweet Memories' },
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
        const res = await fetch('https://ldr-photobooth.if2372047.workers.dev/api/community/posts?sort=new');
        if (res.ok) {
          const json = await res.json();
          const items: GalleryPost[] = Array.isArray(json) ? json : (json.data || []);
          if (isMounted && items.length > 0) {
            // Keep all valid posts in the pool for true rich randomization
            setPosts(items.filter(p => p && p.url));
          }
        }
      } catch (e) {
        console.warn('Gallery fetch fallback used:', e);
      }
    };
    fetchGallery();
    return () => { isMounted = false; };
  }, []);

  // 3 Lanes for desktop with completely distinct, randomized photostrip distribution
  const { column1, column2, column3, scatterPhotos } = useMemo(() => {
    const rawList = posts.length > 0
      ? posts.map(p => ({
          id: p.id,
          url: p.url.startsWith('http') ? p.url : `https://ldr-photobooth.if2372047.workers.dev${p.url}`,
          title: (p.author || p.title || 'Couple Photo').trim()
        }))
      : FALLBACK_STRIPS;

    // Fully randomized pool
    const pool = shuffleArray(rawList);

    const c1: typeof rawList = [];
    const c2: typeof rawList = [];
    const c3: typeof rawList = [];

    if (pool.length >= 6) {
      // Distribute round-robin across columns so no two columns share the same photo in any row
      pool.forEach((item, idx) => {
        if (idx % 3 === 0) c1.push(item);
        else if (idx % 3 === 1) c2.push(item);
        else c3.push(item);
      });
      // Ensure each column has at least 6 items for a smooth scroll track
      while (c1.length < 6) c1.push(...shuffleArray(c1));
      while (c2.length < 6) c2.push(...shuffleArray(c2));
      while (c3.length < 6) c3.push(...shuffleArray(c3));
    } else {
      c1.push(...shuffleArray(pool));
      c2.push(...shuffleArray(pool));
      c3.push(...shuffleArray(pool));
    }

    // Duplicate once ([...items, ...items]) so the -50% CSS keyframe loops seamlessly with zero jump
    const col1 = [...c1, ...c1];
    const col2 = [...c2, ...c2];
    const col3 = [...c3, ...c3];

    // Scatter photos for the bottom collage: distinct random shuffle
    const scatter = shuffleArray(rawList).slice(0, 12);
    while (scatter.length < 12 && rawList.length > 0) {
      scatter.push(...shuffleArray(rawList));
    }

    return {
      column1: col1,
      column2: col2,
      column3: col3,
      scatterPhotos: scatter.slice(0, 12)
    };
  }, [posts]);

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
          <button 
            type="button" 
            onClick={() => onSelectMode('community')} 
            className="home-nav-link"
          >
            {t('home.nav.gallery')}
          </button>
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

      {/* ── SCATTERED PHOTO CTA SECTION ── */}
      <section className="home-scatter-section">
        <div className="home-scatter-stage">
          {scatterPhotos.map((item, idx) => {
            const scClass = `sc-${(idx % 12) + 1}`;
            return (
              <div key={`sc-${item.id}-${idx}`} className={`home-scatter-card ${scClass}`}>
                <div className="home-scatter-paper">
                  <img
                    src={item.url}
                    alt={item.title}
                    loading="lazy"
                    className="home-scatter-img"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/Ldr_photobooth.png';
                    }}
                  />
                  <div className="home-scatter-label">{item.title}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Center Floating Lime CTA Button */}
        <div className="home-scatter-center">
          <button onClick={onEnterBooth} className="home-scatter-lime-btn">
            {t('home.hero.cta')}
          </button>
        </div>
      </section>

      {/* ── MINIMALIST FOOTER ── */}
      <footer className="home-footer">
        <div className="home-footer-inner">
          <div className="home-footer-brand">
            <img src="/Ldr_photobooth.png" alt="Pico" className="home-footer-logo-img" />
            <span className="home-footer-title">LDR PHOTOBOOTH</span>
          </div>
          <div className="home-footer-links">
            <a
              href="https://picobooth.web.id/"
              target="_blank"
              rel="noopener noreferrer"
              className="home-footer-pico-link"
            >
              part of PICOBOOTH ↗
            </a>
          </div>
        </div>
        <div className="home-footer-copy">
          {t('home.footer.rights')}
        </div>
      </footer>
    </div>
  );
}
