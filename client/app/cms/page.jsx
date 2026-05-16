'use client';

import React from 'react';

export default function CmsDashboard() {
  return (
    <div style={{
      height: '100vh',
      overflowY: 'auto',
      backgroundColor: '#0f0f14',
      color: '#e8e8f0',
      fontFamily: 'Inter, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '10px' }}>
        LDR Photobooth <span style={{ color: '#6366f1' }}>CMS</span>
      </h1>
      <p style={{ color: '#8888a0', marginBottom: '40px', textAlign: 'center' }}>
        Pilih modul yang ingin dikelola untuk sistem photobooth.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        width: '100%',
        maxWidth: '700px'
      }}>
        <a href="/cms/frames" style={{
          background: '#1a1a24',
          border: '1px solid #333346',
          borderRadius: '16px',
          padding: '32px',
          textDecoration: 'none',
          color: 'inherit',
          transition: 'all 0.2s',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }} onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#6366f1';
          e.currentTarget.style.transform = 'translateY(-5px)';
        }} onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#333346';
          e.currentTarget.style.transform = 'translateY(0)';
        }}>
          <span style={{ fontSize: '40px', marginBottom: '16px' }}>🖼️</span>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Frame Editor</h2>
          <p style={{ fontSize: '14px', color: '#8888a0', textAlign: 'center' }}>
            Kelola template frame, slot foto, dan dekorasi sticker.
          </p>
        </a>

        <a href="/cms/posts" style={{
          background: '#1a1a24',
          border: '1px solid #333346',
          borderRadius: '16px',
          padding: '32px',
          textDecoration: 'none',
          color: 'inherit',
          transition: 'all 0.2s',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }} onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#6366f1';
          e.currentTarget.style.transform = 'translateY(-5px)';
        }} onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#333346';
          e.currentTarget.style.transform = 'translateY(0)';
        }}>
          <span style={{ fontSize: '40px', marginBottom: '16px' }}>📸</span>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Post Management</h2>
          <p style={{ fontSize: '14px', color: '#8888a0', textAlign: 'center' }}>
            Pantau dan hapus hasil foto yang diposting oleh user.
          </p>
        </a>
      </div>

      <a href="/" style={{
        marginTop: '60px',
        color: '#8888a0',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: '500'
      }}>
        ← Kembali ke App Utama
      </a>
    </div>
  );
}
