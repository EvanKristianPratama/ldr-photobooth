'use client';

import React, { useEffect } from 'react';

export default function AlternativeLayout({ children }) {
  useEffect(() => {
    // Ensure document and body allow normal scrolling on article pages
    document.documentElement.style.overflowY = 'auto';
    document.documentElement.style.height = 'auto';
    document.body.style.overflowY = 'auto';
    document.body.style.height = 'auto';
    document.body.classList.add('article-mode');
    document.documentElement.classList.add('article-mode');

    return () => {
      document.documentElement.style.overflowY = '';
      document.documentElement.style.height = '';
      document.body.style.overflowY = '';
      document.body.style.height = '';
      document.body.classList.remove('article-mode');
      document.documentElement.classList.remove('article-mode');
    };
  }, []);

  return <div className="article-page-wrapper">{children}</div>;
}
