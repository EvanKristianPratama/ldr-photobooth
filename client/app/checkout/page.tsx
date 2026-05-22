'use client';

import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://ldr-photobooth.if2372047.workers.dev';
const BASE_PRICE = 50000;
const ADMIN_FEE = 1000;

const emptyAddr = () => ({
  fullName: '', phone: '', provinceId: '', provinceName: '',
  cityId: '', cityName: '', postalCode: '', details: '',
});

const STATUS_COLOR = {
  PENDING: 'var(--yellow)',
  PAID: 'var(--teal)',
  PROCESSING: 'var(--blue)',
  SHIPPED: 'var(--purple)',
  CANCELLED: '#e24b4a',
};

export default function CheckoutPage() {
  // Fix body overflow from globals.css
  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    return () => {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
    };
  }, []);

  // Photo from sessionStorage
  const [photoData, setPhotoData] = useState('');
  const [frameId, setFrameId] = useState('');
  const [sessionMode, setSessionMode] = useState('duo');

  useEffect(() => {
    setPhotoData(sessionStorage.getItem('checkout_photo') || '');
    setFrameId(sessionStorage.getItem('checkout_frame_id') || '');
    setSessionMode(sessionStorage.getItem('checkout_session_mode') || 'duo');
  }, []);

  // Address state
  const [addr1, setAddr1] = useState(emptyAddr());
  const [addr2, setAddr2] = useState(emptyAddr());

  // Dropdown data
  const [provinces, setProvinces] = useState([]);
  const [cities1, setCities1] = useState([]);
  const [cities2, setCities2] = useState([]);
  const [loadingProv, setLoadingProv] = useState(false);
  const [loadingCity1, setLoadingCity1] = useState(false);
  const [loadingCity2, setLoadingCity2] = useState(false);

  // Shipping & order
  const [shippingCost1, setShippingCost1] = useState(null);
  const [shippingCost2, setShippingCost2] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [orderTotal, setOrderTotal] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState('form'); // 'form' | 'success'
  const [isCancelling, setIsCancelling] = useState(false);

  // Load provinces once
  useEffect(() => {
    setLoadingProv(true);
    fetch(`${API_BASE}/api/rajaongkir/provinces`)
      .then(r => r.json())
      .then(d => setProvinces(d.provinces || []))
      .catch(() => setError('Gagal memuat data provinsi.'))
      .finally(() => setLoadingProv(false));
  }, []);

  // Load cities on province change
  useEffect(() => {
    if (!addr1.provinceId) return setCities1([]);
    setLoadingCity1(true);
    fetch(`${API_BASE}/api/rajaongkir/cities?provinceId=${addr1.provinceId}`)
      .then(r => r.json())
      .then(d => setCities1(d.cities || []))
      .finally(() => setLoadingCity1(false));
  }, [addr1.provinceId]);

  useEffect(() => {
    if (!addr2.provinceId) return setCities2([]);
    setLoadingCity2(true);
    fetch(`${API_BASE}/api/rajaongkir/cities?provinceId=${addr2.provinceId}`)
      .then(r => r.json())
      .then(d => setCities2(d.cities || []))
      .finally(() => setLoadingCity2(false));
  }, [addr2.provinceId]);

  const handleAddrChange = (num, field, value) => {
    const setter = num === 1 ? setAddr1 : setAddr2;
    const cities = num === 1 ? cities1 : cities2;
    setter(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'provinceId') {
        const p = provinces.find(p => p.province_id === value);
        next.provinceName = p?.province || '';
        next.cityId = ''; next.cityName = ''; next.postalCode = '';
        if (num === 1) { setShippingCost1(null); } else { setShippingCost2(null); }
      }
      if (field === 'cityId') {
        const c = cities.find(c => c.city_id === value);
        next.cityName = c ? `${c.type} ${c.city_name}` : '';
        next.postalCode = c?.postal_code || '';
        // Shipping cost is calculated server-side on submit
        if (num === 1) setShippingCost1('?');
        else setShippingCost2('?');
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photoData) return setError('Tidak ada foto. Kembali dan selesaikan sesi foto dulu ya! 📷');
    const isSolo = sessionMode === 'solo';
    if (!addr1.cityId || (!isSolo && !addr2.cityId)) {
      return setError(isSolo ? 'Lengkapi alamat pengiriman dulu ya! 💌' : 'Lengkapi kedua alamat pengiriman dulu ya! 💌');
    }
    setError('');
    setIsSubmitting(true);

    try {
      // Convert data URL → Blob
      const res = await fetch(photoData);
      const blob = await res.blob();
      const photoFile = new File([blob], 'photostrip.jpg', { type: 'image/jpeg' });

      const form = new FormData();
      form.append('photo', photoFile);
      form.append('address1', JSON.stringify(addr1));
      form.append('address2', isSolo ? '{}' : JSON.stringify(addr2));
      form.append('frameId', frameId);
      form.append('sessionMode', sessionMode);
      form.append('cityId1', addr1.cityId);
      form.append('cityId2', isSolo ? '' : addr2.cityId);

      const resp = await fetch(`${API_BASE}/api/orders`, { method: 'POST', body: form });
      const data = await resp.json();

      if (!data.success) throw new Error(data.error || 'Gagal membuat order');

      setOrderId(data.orderId);
      setOrderTotal(data.totalPrice);
      setPricing(data.pricing);
      setStep('success');
      sessionStorage.removeItem('checkout_photo');
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan. Coba lagi ya!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!orderId) return;
    if (!window.confirm('Apakah Anda yakin ingin membatalkan pesanan ini?')) return;
    setIsCancelling(true);
    try {
      const resp = await fetch(`${API_BASE}/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' })
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || 'Gagal membatalkan pesanan');
      
      // Go back to home
      window.location.href = '/';
    } catch (err) {
      setError(`Gagal membatalkan pesanan: ${err.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

  const fmt = (n) => `Rp${Number(n).toLocaleString('id-ID')}`;

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', fontFamily: "'Nunito', sans-serif", paddingBottom: '60px' }}>

      {/* TOPBAR */}
      <header className="topbar" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" className="logo">LDR <span>📦</span></a>
        <div style={{ fontFamily: "'Gaegu', cursive", fontSize: '18px', color: 'var(--ink)', opacity: 0.7 }}>
          Checkout & Kirim Foto
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 16px' }}>

        {step === 'success' ? (
          /* ── SUCCESS STATE ── */
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '72px', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ fontFamily: "'Gaegu', cursive", fontSize: '48px', color: 'var(--ink)', transform: 'rotate(-1deg)', display: 'inline-block', marginBottom: '8px' }}>
              Pesanan Masuk!
            </h2>
            <p style={{ fontFamily: "'Gaegu', cursive", fontSize: '22px', opacity: 0.7, marginBottom: '32px' }}>
              {sessionMode === 'solo'
                ? 'Foto kamu segera kami cetak dan dikirimkan ke alamat tujuan 💌'
                : 'Foto kalian segera kami cetak dan dikirimkan ke dua tempat 💌'}
            </p>

            {/* ORDER CARD */}
            <div style={{ background: 'white', border: '3px solid var(--ink)', borderRadius: '12px 8px 14px 8px / 8px 14px 8px 12px', boxShadow: '6px 6px 0 var(--ink)', padding: '24px', maxWidth: '480px', margin: '0 auto 32px', textAlign: 'left' }}>
              <div style={{ fontFamily: "'Gaegu', cursive", fontSize: '14px', color: '#888', marginBottom: '4px' }}>ID Pesanan</div>
              <div style={{ fontFamily: 'monospace', fontSize: '14px', color: 'var(--ink)', fontWeight: '700', marginBottom: '20px', wordBreak: 'break-all' }}>{orderId}</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '2px dashed var(--ink)', paddingTop: '16px' }}>
                {[
                  ['Base Package (2 Prints)', fmt(pricing?.basePrice || 50000)],
                  [`Ongkir ${addr1.cityName}`, fmt(pricing?.shippingCost1 || 0)],
                  sessionMode !== 'solo' && [`Ongkir ${addr2.cityName}`, fmt(pricing?.shippingCost2 || 0)],
                  ['Admin Fee', fmt(pricing?.adminFee || 1000)],
                ].filter(Boolean).map(([label, val], idx) => (
                  <div key={`${label}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Gaegu', cursive", fontSize: '18px' }}>
                    <span style={{ opacity: 0.7 }}>{label}</span>
                    <span style={{ fontWeight: '700' }}>{val}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--ink)', paddingTop: '12px', fontFamily: "'Gaegu', cursive", fontSize: '22px', fontWeight: '700' }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--pink)' }}>{fmt(orderTotal)}</span>
                </div>
              </div>

              <div style={{ marginTop: '16px', padding: '12px', background: 'var(--yellow-lt, #fffbe6)', border: '2px solid var(--yellow)', borderRadius: '10px' }}>
                <div style={{ fontFamily: "'Gaegu', cursive", fontSize: '16px', color: 'var(--ink)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span>⚠️</span>
                  <span>Status: <strong>MENUNGGU PEMBAYARAN</strong></span>
                </div>
                <div style={{ fontFamily: "'Gaegu', cursive", fontSize: '14px', opacity: 0.7, marginTop: '4px' }}>
                  Kami akan hubungi kamu untuk konfirmasi pembayaran via WhatsApp
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '350px', width: '100%', margin: '0 auto' }}>
              <button className="btn-primary" onClick={() => window.location.href = '/'} style={{ fontSize: '20px', padding: '16px' }}>
                🏠 Selesai & Kembali ke Beranda
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={isCancelling}
                style={{
                  fontFamily: "'Gaegu', cursive",
                  fontSize: '18px',
                  padding: '12px',
                  background: '#f8d7da',
                  color: '#721c24',
                  border: '2px solid #f5c6cb',
                  borderRadius: '10px',
                  cursor: isCancelling ? 'wait' : 'pointer',
                  boxShadow: '2px 2px 0 var(--ink)',
                  fontWeight: '700',
                  transition: 'all 0.2s',
                }}
              >
                {isCancelling ? '⏳ Membatalkan...' : '❌ Batalkan Pemesanan'}
              </button>
            </div>
          </div>

        ) : (
          /* ── FORM STATE ── */
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '32px' }}>

              {/* LEFT: photo preview + order summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Photo Preview */}
                <div style={{ background: 'white', border: '3px solid var(--ink)', borderRadius: '12px 8px 14px 8px / 8px 14px 8px 12px', boxShadow: '4px 4px 0 var(--ink)', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '2px solid var(--ink)', background: 'var(--pink)', fontFamily: "'Gaegu', cursive", fontSize: '18px', fontWeight: '700', color: 'var(--ink)' }}>
                    📸 Foto Kamu
                  </div>
                  <div style={{ padding: '16px', background: '#1a1a2e', display: 'flex', justifyContent: 'center', minHeight: '200px', alignItems: 'center' }}>
                    {photoData ? (
                      <img src={photoData} alt="Foto Photobooth" style={{ maxWidth: '100%', maxHeight: '320px', borderRadius: '8px', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Gaegu', cursive", fontSize: '18px', textAlign: 'center' }}>
                        <div style={{ fontSize: '48px' }}>📷</div>
                        <div>Tidak ada foto</div>
                        <a href="/" style={{ color: 'var(--yellow)', fontSize: '14px' }}>Kembali dan ambil foto dulu</a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Summary */}
                <div style={{ background: 'white', border: '3px solid var(--ink)', borderRadius: '12px 8px 14px 8px / 8px 14px 8px 12px', boxShadow: '4px 4px 0 var(--ink)', padding: '20px' }}>
                  <div style={{ fontFamily: "'Gaegu', cursive", fontSize: '24px', fontWeight: '700', marginBottom: '16px', transform: 'rotate(-1deg)', display: 'inline-block' }}>
                    🧾 Ringkasan Harga
                  </div>
                  {[
                    ['Base Package (2 Prints)', fmt(BASE_PRICE)],
                    [`Ongkir ke ${addr1.cityName || '...'}`, addr1.cityId ? '🔄 Dihitung saat pesan' : '--'],
                    sessionMode !== 'solo' && [`Ongkir ke ${addr2.cityName || '...'}`, addr2.cityId ? '🔄 Dihitung saat pesan' : '--'],
                    ['Admin Fee', fmt(ADMIN_FEE)],
                  ].filter(Boolean).map(([label, val], idx) => (
                    <div key={`${label}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed #ddd', fontFamily: "'Gaegu', cursive", fontSize: '16px' }}>
                      <span style={{ opacity: 0.7 }}>{label}</span>
                      <span style={{ fontWeight: '700' }}>{val}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '14px', fontFamily: "'Gaegu', cursive", fontSize: '20px', fontWeight: '700' }}>
                    <span>Estimasi Total</span>
                    <span style={{ color: 'var(--pink)' }}>≥ {fmt(BASE_PRICE + ADMIN_FEE)}</span>
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '13px', fontFamily: "'Gaegu', cursive", opacity: 0.6 }}>
                    *Ongkir final dihitung otomatis dari Workshop Bandung
                  </div>
                </div>

              </div>

              {/* RIGHT: Two address forms */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {[
                  { num: 1, label: 'Alamat Kamu', emoji: '🏠', addr: addr1, cities: cities1, loadingCity: loadingCity1, accent: 'var(--teal)' },
                  sessionMode !== 'solo' && { num: 2, label: 'Alamat Pasangan', emoji: '💌', addr: addr2, cities: cities2, loadingCity: loadingCity2, accent: 'var(--pink)' },
                ].filter(Boolean).map(({ num, label, emoji, addr, cities, loadingCity, accent }) => (
                  <div key={num} style={{ background: 'white', border: `3px solid var(--ink)`, borderRadius: '12px 8px 14px 8px / 8px 14px 8px 12px', boxShadow: '4px 4px 0 var(--ink)', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '2px solid var(--ink)', background: accent, fontFamily: "'Gaegu', cursive", fontSize: '20px', fontWeight: '700', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{emoji}</span>
                      <span>Alamat Pengiriman {num}</span>
                      <span style={{ fontSize: '14px', fontWeight: '400', opacity: 0.8 }}>({label})</span>
                    </div>
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                      {/* Name & Phone */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '14px' }}>Nama Penerima</label>
                          <input className="form-input" style={{ fontSize: '16px', padding: '10px 12px' }}
                            required placeholder="Nama lengkap"
                            value={addr.fullName}
                            onChange={e => handleAddrChange(num, 'fullName', e.target.value)} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '14px' }}>No. HP / WA</label>
                          <input className="form-input" style={{ fontSize: '16px', padding: '10px 12px' }}
                            required placeholder="08xxxxxxxxxx" type="tel"
                            value={addr.phone}
                            onChange={e => handleAddrChange(num, 'phone', e.target.value)} />
                        </div>
                      </div>

                      {/* Province */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '14px' }}>Provinsi</label>
                        <div style={{ position: 'relative' }}>
                          <select className="form-input" style={{ fontSize: '16px', padding: '10px 12px', appearance: 'none' }}
                            required value={addr.provinceId} disabled={loadingProv}
                            onChange={e => handleAddrChange(num, 'provinceId', e.target.value)}>
                            <option value="">{loadingProv ? 'Memuat...' : '-- Pilih Provinsi --'}</option>
                            {provinces.map(p => (
                              <option key={`p${num}-${p.province_id}`} value={p.province_id}>{p.province}</option>
                            ))}
                          </select>
                          {loadingProv && (
                            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', border: '2px solid var(--ink)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                          )}
                        </div>
                      </div>

                      {/* City */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '14px' }}>Kota / Kabupaten</label>
                        <div style={{ position: 'relative' }}>
                          <select className="form-input" style={{ fontSize: '16px', padding: '10px 12px', appearance: 'none' }}
                            required value={addr.cityId} disabled={!addr.provinceId || loadingCity}
                            onChange={e => handleAddrChange(num, 'cityId', e.target.value)}>
                            <option value="">{loadingCity ? 'Memuat...' : '-- Pilih Kota --'}</option>
                            {cities.map(c => (
                              <option key={`c${num}-${c.city_id}`} value={c.city_id}>{c.type} {c.city_name}</option>
                            ))}
                          </select>
                          {loadingCity && (
                            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', border: '2px solid var(--ink)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                          )}
                        </div>
                      </div>

                      {/* Postal code (auto-filled) */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '14px' }}>Kode Pos</label>
                        <input className="form-input" style={{ fontSize: '16px', padding: '10px 12px' }}
                          required placeholder="Otomatis terisi"
                          value={addr.postalCode}
                          onChange={e => handleAddrChange(num, 'postalCode', e.target.value)} />
                      </div>

                      {/* Full address */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '14px' }}>Alamat Lengkap</label>
                        <textarea className="form-input" style={{ fontSize: '15px', padding: '10px 12px', height: '80px', resize: 'vertical' }}
                          required placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan..."
                          value={addr.details}
                          onChange={e => handleAddrChange(num, 'details', e.target.value)} />
                      </div>

                    </div>
                  </div>
                ))}

                {/* Error */}
                {error && (
                  <div style={{ background: '#fff0f0', border: '2px solid #e24b4a', borderRadius: '10px', padding: '12px 16px', fontFamily: "'Gaegu', cursive", fontSize: '17px', color: '#a32d2d', display: 'flex', gap: '8px' }}>
                    <span>⚠️</span><span>{error}</span>
                  </div>
                )}

                {/* Submit */}
                <button type="submit" className="btn-primary"
                  disabled={isSubmitting}
                  style={{ fontSize: '22px', padding: '18px', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'wait' : 'pointer' }}>
                  {isSubmitting ? '⏳ Mengirim Pesanan...' : '📦 Pesan Cetak Sekarang!'}
                </button>
              </div>

            </div>
          </form>
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }
        select.form-input option { background: white; color: var(--ink); }
        @media (max-width: 640px) {
          form > div { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
