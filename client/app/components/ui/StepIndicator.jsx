import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function StepIndicator({ steps, currentStep }) {
  const { t } = useLanguage();
  const currentIndex = steps.findIndex(step => step.id === currentStep);

  return (
    <nav className="stepper" id="stepper">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          {index > 0 && (
            <div 
              className={`step-connector ${index <= currentIndex ? 'done' : ''}`} 
              id={`conn-${index}`} 
            />
          )}
          <div 
            className={`step-item ${index === currentIndex ? 'active' : index < currentIndex ? 'done' : ''}`} 
            id={`step-${index}`}
          >
            <div className="step-pill">
              <span style={{ fontSize: '11px', opacity: 0.6, fontFamily: "'Caveat', cursive" }}>
                0{index + 1}
              </span>
              <span>{t(`step.${step.id}`) || step.label}</span>
            </div>
          </div>
        </React.Fragment>
      ))}
    </nav>
  );
}

