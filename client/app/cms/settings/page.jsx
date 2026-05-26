'use client';

import React, { useState, useEffect } from 'react';

const API_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_BASE || 'https://ldr-photobooth.if2372047.workers.dev')
  : '';

export default function AndroidSettingsPage() {
  const [photoChoices, setPhotoChoices] = useState({ 1: true, 3: true, 4: true });
  const [receiptTitle, setReceiptTitle] = useState('LDR THERMAL BOOTH');
  const [receiptSubtitle, setReceiptSubtitle] = useState('STORE #9821 // ZURICH CO-OP STUDIO');
  const [receiptSlogan, setReceiptSlogan] = useState('THANK YOU FOR YOUR VISIT!');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch(`${API_BASE}/api/cms/settings`);
        if (res.ok) {
          const data = await res.json();
          if (data.android_photo_choices) {
            const choices = data.android_photo_choices.split(',').map(Number);
            setPhotoChoices({
              1: choices.includes(1),
              3: choices.includes(3),
              4: choices.includes(4),
            });
          }
          if (data.receipt_title) setReceiptTitle(data.receipt_title);
          if (data.receipt_subtitle) setReceiptSubtitle(data.receipt_subtitle);
          if (data.receipt_slogan) setReceiptSlogan(data.receipt_slogan);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    // Collect selected photo choices
    const choices = [];
    if (photoChoices[1]) choices.push(1);
    if (photoChoices[3]) choices.push(3);
    if (photoChoices[4]) choices.push(4);

    if (choices.length === 0) {
      showToast('⚠️ Pilih minimal satu jumlah foto!');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/cms/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          android_photo_choices: choices.join(','),
          receipt_title: receiptTitle,
          receipt_subtitle: receiptSubtitle,
          receipt_slogan: receiptSlogan
        })
      });

      if (res.ok) {
        showToast('✅ Pengaturan berhasil disimpan!');
      } else {
        showToast('❌ Gagal menyimpan pengaturan.');
      }
    } catch (err) {
      showToast(`❌ Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const toggleChoice = (num) => {
    setPhotoChoices(prev => ({ ...prev, [num]: !prev[num] }));
  };

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        backgroundColor: '#0f0f14',
        color: '#e8e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ fontSize: '18px', fontWeight: '500', color: '#8888a0' }}>Memuat Pengaturan...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f0f14',
      color: '#e8e8f0',
      fontFamily: 'Inter, sans-serif',
      padding: '40px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '30px',
          backgroundColor: '#1a1a24',
          border: '1px solid #333346',
          borderRadius: '12px',
          padding: '16px 24px',
          color: '#fff',
          fontWeight: '600',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          zIndex: 1000,
          animation: 'slideDown 0.3s ease'
        }}>
          {toast}
        </div>
      )}

      <div style={{ width: '100%', maxWidth: '700px' }}>
        {/* Back Link */}
        <a href="/cms" style={{
          color: '#8888a0',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '500',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '24px',
          transition: 'color 0.2s'
        }} onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
           onMouseLeave={(e) => e.currentTarget.style.color = '#8888a0'}>
          ← Kembali ke Dashboard
        </a>

        {/* Title */}
        <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>
          Android <span style={{ color: '#6366f1' }}>Receipt Settings</span>
        </h1>
        <p style={{ color: '#8888a0', marginBottom: '32px' }}>
          Kelola format default receipt 80mm dan pilihan jumlah foto untuk aplikasi Android.
        </p>

        {/* Card */}
        <div style={{
          background: '#1a1a24',
          border: '1px solid #333346',
          borderRadius: '20px',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
        }}>
          {/* Section 1: Photo Layout Counts */}
          <div>
            <label style={{ fontSize: '15px', fontWeight: '700', color: '#6366f1', display: 'block', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pilihan Jumlah Foto Android
            </label>
            <p style={{ fontSize: '13px', color: '#8888a0', marginBottom: '16px', marginTop: '-4px' }}>
              Tentukan jumlah foto yang bisa dipilih user di aplikasi Android.
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              {[1, 3, 4].map((num) => (
                <button
                  key={num}
                  onClick={() => toggleChoice(num)}
                  style={{
                    flex: 1,
                    padding: '16px 20px',
                    borderRadius: '12px',
                    background: photoChoices[num] ? '#6366f1' : '#111116',
                    border: photoChoices[num] ? '1px solid #6366f1' : '1px solid #333346',
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '20px' }}>📸</span>
                  <span>{num} Foto</span>
                  <span style={{ fontSize: '11px', fontWeight: '400', opacity: 0.8 }}>
                    {photoChoices[num] ? 'Aktif' : 'Nonaktif'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <hr style={{ border: 'none', height: '1px', backgroundColor: '#333346' }} />

          {/* Section 2: Receipt Typography Customizations */}
          <div>
            <label style={{ fontSize: '15px', fontWeight: '700', color: '#6366f1', display: 'block', marginBottom: '18px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Header & Footer Cetak Struk (80mm)
            </label>

            {/* Input 1 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#b2b2c2', display: 'block', marginBottom: '8px' }}>
                Receipt Header Title
              </label>
              <input
                type="text"
                value={receiptTitle}
                onChange={(e) => setReceiptTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: '#111116',
                  border: '1px solid #333346',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Input 2 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#b2b2c2', display: 'block', marginBottom: '8px' }}>
                Receipt Subtitle
              </label>
              <input
                type="text"
                value={receiptSubtitle}
                onChange={(e) => setReceiptSubtitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: '#111116',
                  border: '1px solid #333346',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Input 3 */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#b2b2c2', display: 'block', marginBottom: '8px' }}>
                Receipt Slogan / Footer
              </label>
              <input
                type="text"
                value={receiptSlogan}
                onChange={(e) => setReceiptSlogan(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: '#111116',
                  border: '1px solid #333346',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <hr style={{ border: 'none', height: '1px', backgroundColor: '#333346' }} />

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: '#6366f1',
              color: '#fff',
              border: 'none',
              fontWeight: '700',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#4f46e5'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#6366f1'}
          >
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </div>
    </div>
  );
}
