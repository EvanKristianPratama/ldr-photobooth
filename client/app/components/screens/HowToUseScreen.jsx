import React, { useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function HowToUseScreen({ onClose }) {
  const { t } = useLanguage();

  // Close on Escape key for accessibility
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const steps = [
    {
      step: '01',
      title: t('howto.step1.title'),
      desc: t('howto.step1.desc')
    },
    {
      step: '02',
      title: t('howto.step2.title'),
      desc: t('howto.step2.desc')
    },
    {
      step: '03',
      title: t('howto.step3.title'),
      desc: t('howto.step3.desc')
    },
    {
      step: '04',
      title: t('howto.step4.title'),
      desc: t('howto.step4.desc')
    },
    {
      step: '05',
      title: t('howto.step5.title'),
      desc: t('howto.step5.desc')
    }
  ];

  return (
    <div className="how-to-modal" role="dialog" aria-modal="true" aria-labelledby="how-to-modal-title">
      <div className="how-to-backdrop" onClick={onClose} />
      <div className="how-to-content">
        <div className="how-to-header">
          <h2 id="how-to-modal-title" className="how-to-title">{t('howto.title')}</h2>
          <button 
            type="button" 
            className="how-to-close" 
            onClick={onClose} 
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="how-to-grid">
          {steps.map((item) => (
            <div key={item.step} className="how-to-card">
              <span className="how-to-step-badge">{item.step}</span>
              <div className="how-to-info">
                <h4 className="how-to-step-title">{item.title}</h4>
                <p className="how-to-step-desc">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="how-to-footer">
          <p className="how-to-footer-text">{t('howto.footer')}</p>
          <button type="button" className="how-to-btn-primary" onClick={onClose}>
            {t('howto.understand')}
          </button>
        </div>
      </div>
    </div>
  );
}


