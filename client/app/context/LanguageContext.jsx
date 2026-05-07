'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { TRANSLATIONS, LANGUAGES } from '../constants/translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('id'); // Default to Indonesian
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Read from localStorage on client mount
    try {
      const stored = localStorage.getItem('ldr_language');
      if (stored && TRANSLATIONS[stored]) {
        setLanguageState(stored);
      } else {
        const browserLang = (navigator.language || '').toLowerCase();
        if (browserLang.startsWith('ko')) {
          setLanguageState('ko');
        } else if (browserLang.startsWith('ja')) {
          setLanguageState('ja');
        } else if (browserLang.startsWith('id')) {
          setLanguageState('id');
        } else {
          setLanguageState('en');
        }
      }
    } catch (e) {
      console.warn('LocalStorage not accessible', e);
    }
    setIsLoaded(true);
  }, []);

  const changeLanguage = (lang) => {
    if (TRANSLATIONS[lang]) {
      setLanguageState(lang);
      try {
        localStorage.setItem('ldr_language', lang);
      } catch (e) {
        console.warn('Could not save language to localStorage', e);
      }
    }
  };

  const t = (key, replacements = {}) => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS['id'];
    let val = dict[key] || TRANSLATIONS['en']?.[key] || key;

    // Apply replacements if any
    Object.entries(replacements).forEach(([k, v]) => {
      val = val.replace(`{${k}}`, v);
    });

    return val;
  };

  const currentLangObj = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t, languages: LANGUAGES, currentLanguage: currentLangObj, isLoaded }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
