import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function HowToUseScreen({ onClose }) {
  const { t } = useLanguage();

  const steps = [
    {
      icon: '✨',
      title: t('howto.step1.title'),
      desc: t('howto.step1.desc'),
      color: 'var(--yellow-lt)'
    },
    {
      icon: '🏠',
      title: t('howto.step2.title'),
      desc: t('howto.step2.desc'),
      color: 'var(--pink-lt)'
    },
    {
      icon: '📐',
      title: t('howto.step3.title'),
      desc: t('howto.step3.desc'),
      color: 'var(--teal-lt)'
    },
    {
      icon: '📸',
      title: t('howto.step4.title'),
      desc: t('howto.step4.desc'),
      color: 'var(--teal-lt)'
    },
    {
      icon: '🎨',
      title: t('howto.step5.title'),
      desc: t('howto.step5.desc'),
      color: 'var(--purple-lt)'
    }
  ];

  return (
    <div className="how-to-modal">
      <div className="how-to-backdrop" onClick={onClose} />
      <div className="how-to-content squiggle">
        <div className="how-to-header">
          <h2 className="how-to-title">{t('howto.title')}</h2>
          <button className="how-to-close" onClick={onClose}>×</button>
        </div>

        <div className="how-to-grid">
          {steps.map((step, i) => (
            <div key={i} className="how-to-card" style={{ background: step.color }}>
              <div className="how-to-icon">{step.icon}</div>
              <div className="how-to-info">
                <h4 className="how-to-step-title">{step.title}</h4>
                <p className="how-to-step-desc">{step.desc}</p>
              </div>
              <div className="how-to-num">0{i + 1}</div>
            </div>
          ))}
        </div>

        <div className="how-to-footer">
          <p>{t('howto.footer')}</p>
          <button className="btn-primary" onClick={onClose} style={{ width: 'auto', padding: '10px 30px' }}>
            {t('howto.understand')}
          </button>
        </div>
      </div>
    </div>
  );
}

