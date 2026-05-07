'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function LanguagePicker() {
  const { language, changeLanguage, languages, currentLanguage, isLoaded } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isLoaded) return null;

  return (
    <div 
      className="lang-picker-container" 
      ref={dropdownRef}
      style={{
        position: 'relative',
        zIndex: 200,
        fontFamily: "'Gaegu', cursive",
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lang-picker-btn"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 10px',
          border: '2px solid var(--ink)',
          borderRadius: '20px 18px 22px 18px / 18px 22px 18px 20px',
          background: 'white',
          fontSize: '14px',
          fontWeight: '700',
          color: 'var(--ink)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          boxShadow: '3px 3px 0 var(--ink)',
          transform: 'rotate(0.5deg)',
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translate(-1px, -1px) scale(1.03) rotate(-1deg)';
          e.currentTarget.style.boxShadow = '4px 4px 0 var(--ink)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'rotate(0.5deg)';
          e.currentTarget.style.boxShadow = '3px 3px 0 var(--ink)';
        }}
      >
        <span style={{ fontSize: '15px' }}>{currentLanguage.flag}</span>
        <span className="lang-label-full" style={{ fontSize: '13px' }}>{currentLanguage.label}</span>
        <span style={{ 
          fontSize: '10px', 
          transition: 'transform 0.2s',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'inline-block'
        }}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div
          className="lang-picker-dropdown squiggle"
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: '0',
            background: 'var(--cream)',
            border: '2.5px solid var(--ink)',
            borderRadius: '12px 10px 14px 10px / 10px 14px 10px 12px',
            boxShadow: '5px 5px 0 var(--ink)',
            padding: '6px',
            minWidth: '170px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            animation: 'langDropdownPop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          }}
        >
          {languages.map((lang) => {
            const isSelected = lang.code === language;
            return (
              <button
                key={lang.code}
                onClick={() => {
                  changeLanguage(lang.code);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '8px',
                  background: isSelected ? 'var(--yellow)' : 'transparent',
                  textAlign: 'left',
                  fontSize: '16px',
                  fontWeight: isSelected ? '700' : '600',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  transition: 'background 0.1s, transform 0.1s',
                  fontFamily: "'Gaegu', cursive",
                  outline: 'none',
                  border: isSelected ? '2px solid var(--ink)' : '2px solid transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isSelected ? 'var(--yellow)' : 'var(--pink-lt)';
                  if (!isSelected) {
                    e.currentTarget.style.transform = 'translateX(2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isSelected ? 'var(--yellow)' : 'transparent';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <span style={{ fontSize: '20px' }}>{lang.flag}</span>
                <span style={{ fontSize: '15px' }}>{lang.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <style jsx global>{`
        @keyframes langDropdownPop {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-6px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @media (max-width: 576px) {
          .lang-label-full {
            display: none !important;
          }
          .lang-picker-btn {
            padding: 6px 10px !important;
            gap: 4px !important;
          }
        }
      `}</style>
    </div>
  );
}
