'use client';

import React, { useState } from 'react';

interface WelcomeScreenProps {
  onContinue: () => void;
}

export default function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  const [leaving, setLeaving] = useState(false);

  const handleClick = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(onContinue, 500);
  };

  return (
    <div
      className={`welcome-wrap${leaving ? ' leaving' : ''}`}
      style={styles.container}
      onClick={handleClick}
    >
      <style>{`
        @font-face {
          font-family: 'PanellosPen';
          src: url('/PanellosPenOk2-Regular.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: scale(1); }
          to   { opacity: 0; transform: scale(1.03); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50%      { opacity: 1; }
        }

        .welcome-wrap  { cursor: pointer; }
        .welcome-wrap.leaving { animation: fadeOut 0.45s cubic-bezier(0.4,0,1,1) both; pointer-events: none; }
        .welcome-img   { animation: scaleIn 0.8s cubic-bezier(0.16,1,0.3,1) both; }
        .welcome-title { animation: fadeUp 0.6s 0.2s cubic-bezier(0.16,1,0.3,1) both; }
        .welcome-by    { animation: fadeUp 0.6s 0.28s cubic-bezier(0.16,1,0.3,1) both; }
        .welcome-sub   { animation: fadeUp 0.6s 0.38s cubic-bezier(0.16,1,0.3,1) both; }
        .welcome-tap   { animation: fadeUp 0.6s 0.5s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      {/* Image */}
      <div className="welcome-img" style={styles.imgWrapper}>
        <img
          src="/hi_im_pico.png"
          alt="Pico — LDR Photobooth by Pico | The Original LDR Photobooth & The First in the World"
          style={styles.image}
        />
      </div>

      {/* Title & Byline */}
      <h1 className="welcome-title" style={styles.title}>ldr photobooth</h1>
      <p className="welcome-by" style={styles.byText}>by pico</p>

      {/* Subtitle / Tagline */}
      <p className="welcome-sub" style={styles.subtitle}>the original LDR photobooth</p>

      {/* Tap hint */}
      <span className="welcome-tap" style={styles.tapHint}>tap anywhere to start</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100vh',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fff',
    gap: '0',
    userSelect: 'none',
  },
  imgWrapper: {
    marginBottom: '28px',
    borderRadius: '28px',
    overflow: 'hidden',
    border: '2px solid #e8e8e8',
  },
  image: {
    width: '260px',
    height: '260px',
    objectFit: 'cover',
    display: 'block',
  },
  title: {
    margin: '0 0 2px 0',
    fontSize: '44px',
    fontFamily: "'PanellosPen', cursive",
    fontWeight: 'normal',
    color: '#111',
    letterSpacing: '2px',
    lineHeight: 1.1,
    textAlign: 'center',
  },
  byText: {
    margin: '0 0 10px 0',
    fontSize: '13px',
    fontWeight: '500',
    color: '#aaa',
    letterSpacing: '2px',
    textTransform: 'lowercase',
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  subtitle: {
    margin: '0 0 48px 0',
    fontSize: '13px',
    fontWeight: '500',
    color: '#888',
    letterSpacing: '2.5px',
    textTransform: 'uppercase',
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  tapHint: {
    fontSize: '13px',
    color: '#bbb',
    letterSpacing: '1px',
    animation: 'pulse 2.5s ease-in-out infinite',
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
};
