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
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lang-picker-btn"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          border: '1px solid #e5e7eb',
          borderRadius: '999px',
          background: '#ffffff',
          fontSize: '13px',
          fontWeight: '600',
          color: '#111827',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#111827';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#e5e7eb';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04)';
        }}
      >
        <span style={{ fontSize: '14px' }}>{currentLanguage.flag}</span>
        <span className="lang-label-full" style={{ fontSize: '13px', letterSpacing: '-0.2px' }}>{currentLanguage.label}</span>
        <span style={{ 
          fontSize: '9px', 
          color: '#64748b',
          transition: 'transform 0.2s',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'inline-block',
          marginLeft: '2px',
        }}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div
          className="lang-picker-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: '0',
            background: '#ffffff',
            border: '1px solid #f0f0f0',
            borderRadius: '16px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.1)',
            padding: '6px',
            minWidth: '180px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            zIndex: 999,
            animation: 'langDropdownPop 0.15s ease forwards',
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
                  padding: '9px 12px',
                  border: 'none',
                  borderRadius: '10px',
                  background: isSelected ? '#f1f5f9' : 'transparent',
                  color: isSelected ? '#0f172a' : '#475569',
                  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                  fontSize: '13px',
                  fontWeight: isSelected ? '700' : '500',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.12s ease',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span style={{ fontSize: '15px' }}>{lang.flag}</span>
                <span style={{ flex: 1 }}>{lang.label}</span>
                {isSelected && (
                  <span style={{ color: '#047857', fontWeight: '800', fontSize: '13px' }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <style jsx global>{`
        @keyframes langDropdownPop {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-4px);
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
