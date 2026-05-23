'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import InvoiceScreen from './InvoiceScreen';


const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://ldr-photobooth.if2372047.workers.dev';
const ADMIN_FEE = 1000;
const EXTRA_PRINT_PRICE = 15000;
const SOLO_BASE_PRICE = 35000;
const DUO_BASE_PRICE = 50000;

const MIDTRANS_SNAP_URL = process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL || 'https://app.sandbox.midtrans.com/snap/snap.js';
const MIDTRANS_CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || 'SB-Mid-client-yU2x1q12v5y8WnS3';

const emptyAddr = () => ({
  fullName: '', phone: '', provinceId: '', provinceName: '',
  cityId: '', cityName: '', postalCode: '', details: '',
});

const addressSchema = z.object({
  fullName: z.string().trim().min(1, 'Nama penerima wajib diisi'),
  phone: z
    .string()
    .trim()
    .min(1, 'No. HP / WA wajib diisi')
    .regex(/^08[0-9]{8,11}$/, 'No. HP harus dimulai dengan 08 dan 10-13 digit'),
  provinceId: z.string().min(1, 'Provinsi wajib dipilih'),
  provinceName: z.string().optional(),
  cityId: z.string().min(1, 'Kota / Kabupaten wajib dipilih'),
  cityName: z.string().optional(),
  postalCode: z.string().trim().min(1, 'Kode pos wajib diisi'),
  details: z.string().trim().min(1, 'Alamat lengkap wajib diisi'),
});

const getCheckoutSchema = (isSolo) => {
  if (isSolo) {
    return z.object({
      address1: addressSchema,
    });
  }
  return z.object({
    address1: addressSchema,
    address2: addressSchema,
  });
};

function useAddressForm(apiBase, { provinces, setValue, watch, prefix, onProvinceChange, onCityChange }) {
  const addr = watch(prefix) || emptyAddr();
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!addr.provinceId) {
      setCities([]);
      return;
    }
    setLoading(true);
    fetch(`${apiBase}/api/rajaongkir/cities?provinceId=${addr.provinceId}`)
      .then(r => r.json())
      .then(d => setCities(d.cities || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [addr.provinceId, apiBase]);

  const handleChange = (field, value) => {
    setValue(`${prefix}.${field}`, value, { shouldValidate: true });

    if (field === 'provinceId') {
      const p = provinces.find(p => p.province_id === value);
      setValue(`${prefix}.provinceName`, p?.province || '', { shouldValidate: true });
      setValue(`${prefix}.cityId`, '', { shouldValidate: true });
      setValue(`${prefix}.cityName`, '', { shouldValidate: true });
      setValue(`${prefix}.postalCode`, '', { shouldValidate: true });
      if (onProvinceChange) onProvinceChange();
    }

    if (field === 'cityId') {
      const c = cities.find(c => c.city_id === value);
      setValue(`${prefix}.cityName`, c ? `${c.type} ${c.city_name}` : '', { shouldValidate: true });
      setValue(`${prefix}.postalCode`, c?.postal_code || '', { shouldValidate: true });
      if (onCityChange) onCityChange(value);
    }
  };

  return { addr, cities, loading, handleChange };
}

export default function CheckoutScreen({ photoData, frameId, sessionMode, onBack, onHome }) {
  // Allow body scroll for checkout form and restore on unmount
  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    return () => {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
    };
  }, []);

  // Load Midtrans Snap.js dynamically
  useEffect(() => {
    const script = document.createElement('script');
    script.src = MIDTRANS_SNAP_URL;
    script.setAttribute('data-client-key', MIDTRANS_CLIENT_KEY);
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
      delete window.snap;
    };
  }, []);

  const isSolo = sessionMode === 'solo';

  // React Hook Form
  const {
    register,
    handleSubmit: handleFormSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(getCheckoutSchema(isSolo)),
    defaultValues: {
      address1: emptyAddr(),
      address2: emptyAddr(),
    },
  });

  // Print Quantities
  const [quantities, setQuantities] = useState({ 1: 1, 2: 1 });

  const updateQty = (num, delta) => {
    setQuantities(prev => {
      const currentQty = prev[num] || 1;
      const nextQty = currentQty + delta;
      if (nextQty < 1) return prev;
      return { ...prev, [num]: nextQty };
    });
  };

  // Dropdown data
  const [provinces, setProvinces] = useState([]);
  const [loadingProv, setLoadingProv] = useState(false);

  // Shipping & order
  const [shippingCost1, setShippingCost1] = useState(null);
  const [shippingCost2, setShippingCost2] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [orderTotal, setOrderTotal] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState('form'); // 'form' | 'summary' | 'success'
  const [snapToken, setSnapToken] = useState(null);
  const [snapUrl, setSnapUrl] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // useAddressForm hooks
  const { addr: addr1, cities: cities1, loading: loadingCity1, handleChange: handleChange1 } = useAddressForm(API_BASE, {
    provinces,
    setValue,
    watch,
    prefix: 'address1',
    onProvinceChange: () => setShippingCost1(null),
    onCityChange: (val) => setShippingCost1(val ? '?' : null),
  });

  const { addr: addr2, cities: cities2, loading: loadingCity2, handleChange: handleChange2 } = useAddressForm(API_BASE, {
    provinces,
    setValue,
    watch,
    prefix: 'address2',
    onProvinceChange: () => setShippingCost2(null),
    onCityChange: (val) => setShippingCost2(val ? '?' : null),
  });

  // Load provinces once
  useEffect(() => {
    setLoadingProv(true);
    fetch(`${API_BASE}/api/rajaongkir/provinces`)
      .then(r => r.json())
      .then(d => setProvinces(d.provinces || []))
      .catch(() => setError('Gagal memuat data provinsi.'))
      .finally(() => setLoadingProv(false));
  }, []);

  const onSubmit = async (data) => {
    if (!photoData) return setError('Tidak ada foto. Selesaikan sesi foto dulu ya! 📷');
    setError('');
    setIsSubmitting(true);

    try {
      // Convert data URL → Blob
      const res = await fetch(photoData);
      const blob = await res.blob();
      const photoFile = new File([blob], 'photostrip.jpg', { type: 'image/jpeg' });

      const form = new FormData();
      form.append('photo', photoFile);
      form.append('address1', JSON.stringify(data.address1));
      form.append('address2', isSolo ? '{}' : JSON.stringify(data.address2));
      form.append('frameId', frameId || '');
      form.append('sessionMode', sessionMode || 'duo');
      form.append('cityId1', data.address1.cityId);
      form.append('cityId2', isSolo ? '' : data.address2.cityId);
      form.append('qty1', String(quantities[1]));
      form.append('qty2', isSolo ? '0' : String(quantities[2]));
      if (typeof window !== 'undefined') {
        form.append('finishUrl', window.location.origin);
      }

      const resp = await fetch(`${API_BASE}/api/orders`, { method: 'POST', body: form });
      const respData = await resp.json();

      if (!respData.success) throw new Error(respData.error || 'Gagal membuat order');

      setOrderId(respData.orderId);
      setOrderTotal(respData.totalPrice);
      setPricing(respData.pricing);
      setSnapToken(respData.snapToken);
      setSnapUrl(respData.snapUrl);
      
      setStep('summary');
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan. Coba lagi ya!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayMidtrans = () => {
    if (window.snap && snapToken) {
      window.snap.pay(snapToken, {
        onSuccess: function () {
          setStep('success');
        },
        onPending: function () {
          setStep('success');
        },
        onError: function () {
          setError('Pembayaran gagal. Silakan coba kembali.');
        },
        onClose: function () {
          setError('Pembayaran ditutup. Silakan klik tombol bayar lagi untuk melanjutkan.');
        }
      });
    } else if (snapUrl) {
      window.open(snapUrl, '_blank');
      setStep('success');
    }
  };

  const handleCancelOrder = () => {
    if (!orderId) return;
    setShowCancelModal(true);
  };

  const confirmCancelOrder = async () => {
    setIsCancelling(true);
    try {
      const resp = await fetch(`${API_BASE}/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' })
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || 'Gagal membatalkan pesanan');
      
      setShowCancelModal(false);
      if (onHome) onHome();
    } catch (err) {
      setError(`Gagal membatalkan pesanan: ${err.message}`);
      setShowCancelModal(false);
    } finally {
      setIsCancelling(false);
    }
  };

  const fmt = (n) => `Rp${Number(n).toLocaleString('id-ID')}`;

  if (step === 'success') {
    return (
      <InvoiceScreen
        orderId={orderId}
        photoData={photoData}
        orderTotal={orderTotal}
        pricing={pricing}
        addr1={getValues('address1')}
        addr2={getValues('address2')}
        isSolo={isSolo}
        onHome={onHome}
      />
    );
  }

  return (
    <div style={styles.container}>
      <main style={styles.main}>
        {step === 'form' && onBack && (
          <button 
            type="button" 
            onClick={onBack} 
            style={styles.backBtn}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translate(-2px, -2px)';
              e.currentTarget.style.boxShadow = '5px 5px 0 var(--ink)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '3px 3px 0 var(--ink)';
            }}
          >
            ← Kembali ke Hasil Foto
          </button>
        )}

        {step === 'success' || step === 'summary' ? (
          /* ── SUCCESS / SUMMARY STATE ── */
          <div style={styles.stateContainer}>
            <div style={styles.stateIcon}>{step === 'success' ? '🎉' : '💳'}</div>
            <h2 style={styles.stateTitle}>
              {step === 'success' ? 'Pesanan Masuk!' : 'Pilih Pembayaran'}
            </h2>
            <p style={styles.stateSubtitle}>
              {step === 'success'
                ? (isSolo ? 'Foto kamu segera kami cetak dan dikirimkan ke alamat tujuan 💌' : 'Foto kalian segera kami cetak dan dikirimkan ke dua tempat 💌')
                : 'Pilih metode pembayaran Midtrans untuk mencetak foto kamu.'}
            </p>

            {/* ORDER CARD */}
            <div style={styles.orderCard}>
              <div style={styles.cardLabel}>ID Pesanan</div>
              <div style={styles.cardValueMonospace}>{orderId}</div>

              <div style={styles.cardDetailsList}>
                {[
                  [`Base Package (${isSolo ? '1 Print' : '2 Prints'})`, fmt(isSolo ? SOLO_BASE_PRICE : DUO_BASE_PRICE)],
                  pricing?.qty1 > 1 && [`Tambahan Kamu (+${pricing.qty1 - 1} Lembar)`, fmt((pricing.qty1 - 1) * EXTRA_PRINT_PRICE)],
                  !isSolo && pricing?.qty2 > 1 && [`Tambahan Pasangan (+${pricing.qty2 - 1} Lembar)`, fmt((pricing.qty2 - 1) * EXTRA_PRINT_PRICE)],
                  [`Ongkir ke ${addr1.cityName}`, fmt(pricing?.shippingCost1 || 0)],
                  !isSolo && [`Ongkir ke ${addr2.cityName}`, fmt(pricing?.shippingCost2 || 0)],
                  ['Admin Fee', fmt(pricing?.adminFee || ADMIN_FEE)],
                ].filter(Boolean).map(([label, val], idx) => (
                  <div key={`${label}-${idx}`} style={styles.listRow}>
                    <span style={styles.opacity07}>{label}</span>
                    <span style={styles.fontWeight700}>{val}</span>
                  </div>
                ))}
                <div style={styles.totalRow}>
                  <span>Total</span>
                  <span style={{ color: 'var(--pink)' }}>{fmt(orderTotal)}</span>
                </div>
              </div>

              {step === 'success' ? (
                <div style={styles.statusAlert('var(--yellow-lt, #fffbe6)', 'var(--yellow)')}>
                  <div style={styles.statusAlertHeader}>
                    <span>✅</span>
                    <span>Status: <strong>PEMBAYARAN BERHASIL / DIPROSES</strong></span>
                  </div>
                  <div style={styles.statusAlertBody}>
                    Pesananmu telah masuk ke sistem dan akan segera kami proses.
                  </div>
                </div>
              ) : (
                <div style={styles.statusAlert('var(--pink-lt, #ffe6eb)', 'var(--pink)')}>
                  <div style={styles.statusAlertHeader}>
                    <span>⚠️</span>
                    <span>Status: <strong>MENUNGGU PEMBAYARAN</strong></span>
                  </div>
                </div>
              )}
            </div>

            {step === 'summary' ? (
              <div style={styles.btnColumn}>
                <button className="btn-primary" onClick={handlePayMidtrans} style={styles.payBtn}>
                  💳 Pilih Pembayaran (Midtrans)
                </button>
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  disabled={isCancelling}
                  style={styles.cancelBtn(isCancelling)}
                >
                  {isCancelling ? '⏳ Membatalkan...' : '❌ Batalkan Pemesanan'}
                </button>
              </div>
            ) : (
              <button className="btn-primary" onClick={onHome} style={styles.homeBtn}>
                🏠 Kembali ke Beranda
              </button>
            )}
          </div>
        ) : (
          /* ── FORM STATE ── */
          <form onSubmit={handleFormSubmit(onSubmit)}>
            <div style={styles.formGrid}>
              {/* LEFT: photo preview + order summary */}
              <div style={styles.formColumn}>
                {/* Photo Preview */}
                <div style={styles.box}>
                  <div style={styles.boxHeader('var(--pink)')}>
                    📸 Foto Cetak Kamu
                  </div>
                  <div style={styles.previewContainer}>
                    {photoData ? (
                      <img src={photoData} alt="Foto Photobooth" style={styles.previewImg} />
                    ) : (
                      <div style={styles.previewPlaceholder}>
                        <div style={{ fontSize: '48px' }}>📷</div>
                        <div>Tidak ada foto</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Summary */}
                <div style={styles.summaryBox}>
                  <div style={styles.summaryTitle}>
                    🧾 Ringkasan Harga
                  </div>
                  {(() => {
                    const basePackage = isSolo ? SOLO_BASE_PRICE : DUO_BASE_PRICE;
                    const extraQty = isSolo ? (quantities[1] - 1) : ((quantities[1] - 1) + (quantities[2] - 1));
                    const extraCost = extraQty * EXTRA_PRINT_PRICE;
                    const estimatedTotal = basePackage + extraCost + ADMIN_FEE;

                    return (
                      <>
                        {[
                          [`Base Package (${isSolo ? '1 Print' : '2 Prints'})`, fmt(basePackage)],
                          extraCost > 0 && [`Tambahan Cetak (${extraQty} lembar)`, fmt(extraCost)],
                          [`Ongkir ke ${addr1.cityName || '...'}`, addr1.cityId ? '🔄 Dihitung saat pesan' : '--'],
                          !isSolo && [`Ongkir ke ${addr2.cityName || '...'}`, addr2.cityId ? '🔄 Dihitung saat pesan' : '--'],
                          ['Admin Fee', fmt(ADMIN_FEE)],
                        ].filter(Boolean).map(([label, val], idx) => (
                          <div key={`${label}-${idx}`} style={styles.summaryRow}>
                            <span style={styles.opacity07}>{label}</span>
                            <span style={styles.fontWeight700}>{val}</span>
                          </div>
                        ))}
                        <div style={styles.estimatedTotalRow}>
                          <span>Estimasi Total</span>
                          <span style={{ color: 'var(--pink)' }}>≥ {fmt(estimatedTotal)}</span>
                        </div>
                      </>
                    );
                  })()}
                  <div style={styles.summaryFooter}>
                    *Ongkir final dihitung otomatis dari Workshop Bandung
                  </div>
                </div>
              </div>

              {/* RIGHT: Address forms */}
              <div style={styles.formColumn}>
                {[
                  { num: 1, label: 'Alamat Kamu', emoji: '🏠', addr: addr1, cities: cities1, loadingCity: loadingCity1, handleChange: handleChange1, prefix: 'address1', accent: 'var(--teal)' },
                  !isSolo && { num: 2, label: 'Alamat Pasangan', emoji: '💌', addr: addr2, cities: cities2, loadingCity: loadingCity2, handleChange: handleChange2, prefix: 'address2', accent: 'var(--pink)' },
                ].filter(Boolean).map(({ num, label, emoji, addr, cities, loadingCity, handleChange, prefix, accent }) => (
                  <div key={num} style={styles.box}>
                    <div style={styles.boxHeader(accent)}>
                      <span>{emoji}</span>
                      <span>Alamat Pengiriman {num}</span>
                      <span style={styles.headerSubtitle}>({label})</span>
                    </div>
                    <div style={styles.boxBody}>
                      {/* Name & Phone */}
                      <div style={styles.inputRow}>
                        <div className="form-group" style={styles.formGroupNoMargin}>
                          <label className="form-label" style={styles.formLabelSmall}>Nama Penerima</label>
                          <input
                            className="form-input"
                            style={styles.formInputLarge}
                            placeholder="Nama lengkap"
                            value={addr.fullName}
                            {...register(`${prefix}.fullName`)}
                            onChange={(e) => handleChange('fullName', e.target.value)}
                          />
                          {errors[prefix]?.fullName && (
                            <span style={styles.errorText}>{errors[prefix].fullName.message}</span>
                          )}
                        </div>
                        <div className="form-group" style={styles.formGroupNoMargin}>
                          <label className="form-label" style={styles.formLabelSmall}>No. HP / WA</label>
                          <input
                            className="form-input"
                            style={styles.formInputLarge}
                            placeholder="08xxxxxxxxxx"
                            type="tel"
                            value={addr.phone}
                            {...register(`${prefix}.phone`)}
                            onChange={(e) => handleChange('phone', e.target.value)}
                          />
                          {errors[prefix]?.phone && (
                            <span style={styles.errorText}>{errors[prefix].phone.message}</span>
                          )}
                        </div>
                      </div>

                      {/* Province */}
                      <div className="form-group" style={styles.formGroupNoMargin}>
                        <label className="form-label" style={styles.formLabelSmall}>Provinsi</label>
                        <div style={styles.relativeContainer}>
                          <select
                            className="form-input"
                            style={styles.formSelect}
                            value={addr.provinceId}
                            {...register(`${prefix}.provinceId`)}
                            disabled={loadingProv}
                            onChange={(e) => handleChange('provinceId', e.target.value)}
                          >
                            <option value="">{loadingProv ? 'Memuat...' : '-- Pilih Provinsi --'}</option>
                            {provinces.map(p => (
                              <option key={`p${num}-${p.province_id}`} value={p.province_id}>{p.province}</option>
                            ))}
                          </select>
                          {loadingProv && (
                            <div style={styles.spinner} />
                          )}
                        </div>
                        {errors[prefix]?.provinceId && (
                          <span style={styles.errorText}>{errors[prefix].provinceId.message}</span>
                        )}
                      </div>

                      {/* City */}
                      <div className="form-group" style={styles.formGroupNoMargin}>
                        <label className="form-label" style={styles.formLabelSmall}>Kota / Kabupaten</label>
                        <div style={styles.relativeContainer}>
                          <select
                            className="form-input"
                            style={styles.formSelect}
                            value={addr.cityId}
                            {...register(`${prefix}.cityId`)}
                            disabled={!addr.provinceId || loadingCity}
                            onChange={(e) => handleChange('cityId', e.target.value)}
                          >
                            <option value="">{loadingCity ? 'Memuat...' : '-- Pilih Kota --'}</option>
                            {cities.map(c => (
                              <option key={`c${num}-${c.city_id}`} value={c.city_id}>{c.type} {c.city_name}</option>
                            ))}
                          </select>
                          {loadingCity && (
                            <div style={styles.spinner} />
                          )}
                        </div>
                        {errors[prefix]?.cityId && (
                          <span style={styles.errorText}>{errors[prefix].cityId.message}</span>
                        )}
                      </div>

                      {/* Postal code */}
                      <div className="form-group" style={styles.formGroupNoMargin}>
                        <label className="form-label" style={styles.formLabelSmall}>Kode Pos</label>
                        <input
                          className="form-input"
                          style={styles.formInputLarge}
                          placeholder="Otomatis terisi"
                          value={addr.postalCode}
                          {...register(`${prefix}.postalCode`)}
                          onChange={(e) => handleChange('postalCode', e.target.value)}
                        />
                        {errors[prefix]?.postalCode && (
                          <span style={styles.errorText}>{errors[prefix].postalCode.message}</span>
                        )}
                      </div>

                      {/* Full address */}
                      <div className="form-group" style={styles.formGroupMargin8}>
                        <label className="form-label" style={styles.formLabelSmall}>Alamat Lengkap</label>
                        <textarea
                          className="form-input"
                          style={styles.formTextarea}
                          placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan..."
                          value={addr.details}
                          {...register(`${prefix}.details`)}
                          onChange={(e) => handleChange('details', e.target.value)}
                        />
                        {errors[prefix]?.details && (
                          <span style={styles.errorText}>{errors[prefix].details.message}</span>
                        )}
                      </div>

                      {/* Quantity Selector */}
                      <div style={styles.qtyContainer}>
                        <div style={styles.flexColumn}>
                          <span style={styles.qtyLabel}>Jumlah Cetak</span>
                          <span style={styles.qtySublabel}>
                            {num === 1 
                              ? (isSolo ? 'Bawaan Paket: 1 lembar (Rp35k)' : 'Bawaan Paket: 1 lembar') 
                              : 'Bawaan Paket: 1 lembar'}
                          </span>
                        </div>
                        <div style={styles.qtyControl}>
                          <button
                            type="button" 
                            onClick={() => updateQty(num, -1)}
                            style={styles.qtyBtn}
                          >
                            -
                          </button>
                          <span style={styles.qtyText}>
                            {quantities[num]}
                          </span>
                          <button
                            type="button" 
                            onClick={() => updateQty(num, 1)}
                            style={styles.qtyBtn}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Error */}
                {error && (
                  <div style={styles.errorBox}>
                    <span>⚠️</span><span>{error}</span>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting}
                  style={styles.submitBtn(isSubmitting)}
                >
                  {isSubmitting ? '⏳ Mengirim Pesanan...' : '📦 Pesan Cetak Sekarang!'}
                </button>
              </div>
            </div>
          </form>
        )}
      </main>

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{ fontFamily: "'Gaegu', cursive", fontSize: '32px', color: 'var(--ink)', margin: '0 0 12px 0' }}>
              Batalkan Pesanan?
            </h3>
            <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: '16px', color: '#555', margin: '0 0 24px 0', lineHeight: '1.5' }}>
              Apakah Anda yakin ingin membatalkan pesanan ini? Aksi ini tidak dapat dibatalkan.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                style={styles.modalCancelBtn}
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={confirmCancelOrder}
                disabled={isCancelling}
                style={styles.modalConfirmBtn}
              >
                {isCancelling ? '⏳ Membatalkan...' : 'Ya, Batalkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        select.form-input option { background: white; color: var(--ink); }
        @media (max-width: 640px) {
          form > div { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  backBtn: {
    background: 'white',
    border: '2px solid var(--ink)',
    borderRadius: '10px',
    padding: '8px 16px',
    fontFamily: "'Gaegu', cursive",
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    color: 'var(--ink)',
    boxShadow: '3px 3px 0 var(--ink)',
    marginBottom: '20px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  container: {
    minHeight: '100vh',
    width: '100%',
    background: 'var(--cream)',
    fontFamily: "'Nunito', sans-serif",
    paddingBottom: '60px',
    overflowY: 'auto',
  },
  main: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '32px 16px',
  },
  stateContainer: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  stateIcon: {
    fontSize: '72px',
    marginBottom: '16px',
  },
  stateTitle: {
    fontFamily: "'Gaegu', cursive",
    fontSize: '48px',
    color: 'var(--ink)',
    transform: 'rotate(-1deg)',
    display: 'inline-block',
    marginBottom: '8px',
  },
  stateSubtitle: {
    fontFamily: "'Gaegu', cursive",
    fontSize: '22px',
    opacity: 0.7,
    marginBottom: '32px',
  },
  orderCard: {
    background: 'white',
    border: '3px solid var(--ink)',
    borderRadius: '12px 8px 14px 8px / 8px 14px 8px 12px',
    boxShadow: '6px 6px 0 var(--ink)',
    padding: '24px',
    maxWidth: '480px',
    margin: '0 auto 32px',
    textAlign: 'left',
  },
  cardLabel: {
    fontFamily: "'Gaegu', cursive",
    fontSize: '14px',
    color: '#888',
    marginBottom: '4px',
  },
  cardValueMonospace: {
    fontFamily: 'monospace',
    fontSize: '14px',
    color: 'var(--ink)',
    fontWeight: '700',
    marginBottom: '20px',
    wordBreak: 'break-all',
  },
  cardDetailsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    borderTop: '2px dashed var(--ink)',
    paddingTop: '16px',
  },
  listRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontFamily: "'Gaegu', cursive",
    fontSize: '18px',
  },
  opacity07: {
    opacity: 0.7,
  },
  fontWeight700: {
    fontWeight: '700',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    borderTop: '2px solid var(--ink)',
    paddingTop: '12px',
    fontFamily: "'Gaegu', cursive",
    fontSize: '22px',
    fontWeight: '700',
  },
  statusAlert: (bg, border) => ({
    marginTop: '16px',
    padding: '12px',
    background: bg,
    border: `2px solid ${border}`,
    borderRadius: '10px',
  }),
  statusAlertHeader: {
    fontFamily: "'Gaegu', cursive",
    fontSize: '16px',
    color: 'var(--ink)',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  statusAlertBody: {
    fontFamily: "'Gaegu', cursive",
    fontSize: '14px',
    opacity: 0.7,
    marginTop: '4px',
  },
  btnColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxWidth: '350px',
    width: '100%',
    margin: '0 auto',
  },
  payBtn: {
    fontSize: '20px',
    padding: '16px',
    background: '#00A1E0',
    borderColor: '#007AA8',
  },
  cancelBtn: (isCancelling) => ({
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
  }),
  homeBtn: {
    maxWidth: '300px',
    margin: '0 auto',
    fontSize: '20px',
    padding: '16px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
    gap: '32px',
  },
  formColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  box: {
    background: 'white',
    border: '3px solid var(--ink)',
    borderRadius: '12px 8px 14px 8px / 8px 14px 8px 12px',
    boxShadow: '4px 4px 0 var(--ink)',
    overflow: 'hidden',
  },
  boxHeader: (background) => ({
    padding: '12px 16px',
    borderBottom: '2px solid var(--ink)',
    background,
    fontFamily: "'Gaegu', cursive",
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--ink)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }),
  headerSubtitle: {
    fontSize: '14px',
    fontWeight: '400',
    opacity: 0.8,
  },
  previewContainer: {
    padding: '16px',
    background: '#1a1a2e',
    display: 'flex',
    justifyContent: 'center',
    minHeight: '200px',
    alignItems: 'center',
  },
  previewImg: {
    maxWidth: '100%',
    maxHeight: '320px',
    borderRadius: '8px',
    objectFit: 'contain',
  },
  previewPlaceholder: {
    color: 'rgba(255,255,255,0.3)',
    fontFamily: "'Gaegu', cursive",
    fontSize: '18px',
    textAlign: 'center',
  },
  summaryBox: {
    background: 'white',
    border: '3px solid var(--ink)',
    borderRadius: '12px 8px 14px 8px / 8px 14px 8px 12px',
    boxShadow: '4px 4px 0 var(--ink)',
    padding: '20px',
  },
  summaryTitle: {
    fontFamily: "'Gaegu', cursive",
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '16px',
    transform: 'rotate(-1deg)',
    display: 'inline-block',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px dashed #ddd',
    fontFamily: "'Gaegu', cursive",
    fontSize: '16px',
  },
  estimatedTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingTop: '14px',
    fontFamily: "'Gaegu', cursive",
    fontSize: '20px',
    fontWeight: '700',
  },
  summaryFooter: {
    marginTop: '10px',
    fontSize: '13px',
    fontFamily: "'Gaegu', cursive",
    opacity: 0.6,
  },
  boxBody: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  inputRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  formGroupNoMargin: {
    marginBottom: 0,
  },
  formLabelSmall: {
    fontSize: '14px',
  },
  formInputLarge: {
    fontSize: '16px',
    padding: '10px 12px',
  },
  relativeContainer: {
    position: 'relative',
  },
  formSelect: {
    fontSize: '16px',
    padding: '10px 12px',
    appearance: 'none',
  },
  formTextarea: {
    fontSize: '15px',
    padding: '10px 12px',
    height: '80px',
    resize: 'vertical',
  },
  formGroupMargin8: {
    marginBottom: 8,
  },
  qtyContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#fafafa',
    border: '2px solid var(--ink)',
    borderRadius: '10px',
    padding: '10px 16px',
    marginTop: '4px',
  },
  flexColumn: {
    display: 'flex',
    flexDirection: 'column',
  },
  qtyLabel: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--ink)',
  },
  qtySublabel: {
    fontSize: '12px',
    opacity: 0.6,
  },
  qtyControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  qtyBtn: {
    width: '32px',
    height: '32px',
    border: '2px solid var(--ink)',
    borderRadius: '6px',
    background: 'white',
    fontWeight: '800',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
  },
  qtyText: {
    fontSize: '18px',
    fontWeight: '800',
    fontFamily: 'monospace',
    minWidth: '20px',
    textAlign: 'center',
  },
  errorBox: {
    background: '#fff0f0',
    border: '2px solid #e24b4a',
    borderRadius: '10px',
    padding: '12px 16px',
    fontFamily: "'Gaegu', cursive",
    fontSize: '17px',
    color: '#a32d2d',
    display: 'flex',
    gap: '8px',
  },
  submitBtn: (isSubmitting) => ({
    fontSize: '22px',
    padding: '18px',
    opacity: isSubmitting ? 0.7 : 1,
    cursor: isSubmitting ? 'wait' : 'pointer',
  }),
  spinner: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '16px',
    height: '16px',
    border: '2px solid var(--ink)',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: '16px',
    backdropFilter: 'blur(4px)',
  },
  modalContent: {
    background: 'var(--cream)',
    border: '3px solid var(--ink)',
    borderRadius: '12px 8px 14px 8px / 8px 14px 8px 12px',
    boxShadow: '6px 6px 0 var(--ink)',
    padding: '32px 24px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
    animation: 'modalFadeIn 0.3s ease-out',
  },
  modalCancelBtn: {
    fontFamily: "'Gaegu', cursive",
    fontSize: '18px',
    padding: '10px 20px',
    background: 'white',
    color: 'var(--ink)',
    border: '2px solid var(--ink)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    boxShadow: '2px 2px 0 var(--ink)',
  },
  modalConfirmBtn: {
    fontFamily: "'Gaegu', cursive",
    fontSize: '18px',
    padding: '10px 20px',
    background: '#ff4d4f',
    color: 'white',
    border: '2px solid var(--ink)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    boxShadow: '2px 2px 0 var(--ink)',
  },
  errorText: {
    color: '#e24b4a',
    fontSize: '13px',
    marginTop: '4px',
    display: 'block',
    fontFamily: "'Nunito', sans-serif",
    fontWeight: '600',
  },
};
