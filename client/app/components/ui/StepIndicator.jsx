import React from 'react';

export default function StepIndicator({ steps, currentStep }) {
  const currentIndex = steps.findIndex(step => step.id === currentStep);

  const visibleSteps = steps.map((step, index) => ({
    ...step,
    index,
    isActive: index === currentIndex,
    isDone: index < currentIndex,
    isFuture: index > currentIndex,
  }));

  return (
    <nav className="si" aria-label="Progress">
      {/* Mobile: compact breadcrumb (prev › current › next) */}
      <div className="si__mobile">
        {visibleSteps
          .filter(s => Math.abs(s.index - currentIndex) <= 1)
          .map((s, i, arr) => (
            <React.Fragment key={s.id}>
              <div className={`si__chip ${s.isActive ? 'si__chip--active' : ''} ${s.isDone ? 'si__chip--done' : ''}`}>
                <span className="si__chip-icon">{s.icon}</span>
                <span className="si__chip-label">{s.label}</span>
              </div>
              {i < arr.length - 1 && <span className="si__chevron">›</span>}
            </React.Fragment>
          ))}
      </div>

      {/* Desktop: full step bar */}
      <div className="si__desktop">
        {visibleSteps.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className={`si__step ${s.isActive ? 'si__step--active' : ''} ${s.isDone ? 'si__step--done' : ''}`}>
              <div className="si__dot">
                {s.isDone ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span className="si__dot-icon">{s.icon}</span>
                )}
              </div>
              <span className="si__label">{s.label}</span>
            </div>
            {i < visibleSteps.length - 1 && (
              <div className={`si__line ${s.isDone ? 'si__line--done' : ''}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
}
