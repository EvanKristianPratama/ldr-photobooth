'use client';

import React, { useState, useEffect, useCallback } from 'react';
import './cms-orders.css';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://ldr-photobooth.if2372047.workers.dev';

const ALL_STATUSES = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'CANCELLED'];

const STATUS_LABELS = {
  PENDING:    '⏳ Menunggu Bayar',
  PAID:       '✅ Lunas',
  PROCESSING: '🔨 Diproses',
  SHIPPED:    '🚚 Dikirim',
  CANCELLED:  '❌ Dibatalkan',
};

function parseAddr(raw) {
  try { return JSON.parse(raw); } catch { return {}; }
}

function fmt(n) { return `Rp${Number(n).toLocaleString('id-ID')}`; }

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

export default function CmsOrdersPage() {
  // Reset body background/overflow for dashboard
  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    document.body.style.backgroundColor = '#0f0f14';
    return () => {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
      document.body.style.backgroundColor = '';
    };
  }, []);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState('');

  const fetchOrders = useCallback(() => {
    setLoading(true);
    const url = filterStatus
      ? `${API_BASE}/api/orders?status=${filterStatus}`
      : `${API_BASE}/api/orders`;
    fetch(url)
      .then(r => r.json())
      .then(data => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setError('Gagal memuat data order.'))
      .finally(() => setLoading(false));
  }, [filterStatus]);

  useEffect(() => { findAndApplyFonts(); fetchOrders(); }, [fetchOrders]);

  const findAndApplyFonts = () => {
    // Add premium Google Font Inter if not loaded
    if (!document.getElementById('google-font-inter')) {
      const link = document.createElement('link');
      link.id = 'google-font-inter';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
      document.head.appendChild(link);
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      } else {
        alert('Gagal update status: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setUpdating(null);
    }
  };

  const counts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = orders.filter(o => o.status === s).length;
    return acc;
  }, {});

  return (
    <div className="cms-orders-root">

      {/* TOPBAR */}
      <header className="cms-orders-header">
        <div className="cms-orders-header__left">
          <a href="/cms" className="cms-logo">LDR Photobooth <span style={{ color: 'var(--cms-accent)' }}>CMS</span></a>
          <span style={{ color: 'var(--cms-border)' }}>|</span>
          <span className="cms-badge">Orders & Payments</span>
        </div>
        <button onClick={fetchOrders} className="cms-btn-secondary">
          🔄 Refresh
        </button>
      </header>

      <main className="cms-orders-container">

        {/* STATS ROW */}
        <div className="cms-filters-row">
          {ALL_STATUSES.map(s => (
            <button key={s}
              onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
              className={`cms-filter-pill ${filterStatus === s ? 'active' : ''}`}>
              {STATUS_LABELS[s]} <span>({counts[s] || 0})</span>
            </button>
          ))}
          {filterStatus && (
            <button onClick={() => setFilterStatus('')} className="cms-filter-pill" style={{ borderStyle: 'dashed' }}>
              × Reset Filter
            </button>
          )}
        </div>

        {/* ERROR */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--cms-danger)', borderRadius: '8px', padding: '16px', marginBottom: '24px', fontSize: '14px', color: 'var(--cms-danger)' }}>
            ⚠️ {error}
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <div className="cms-loading">
            <div style={{ fontSize: '40px', marginBottom: '12px', animation: 'pulse 1.5s infinite' }}>📦</div>
            <div>Memuat data order cetak...</div>
            <style>{`
              @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
            `}</style>
          </div>
        ) : orders.length === 0 ? (
          <div className="cms-empty">
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🈳</div>
            <div>Belum ada pesanan cetak {filterStatus && `dengan status ${filterStatus}`}</div>
          </div>
        ) : (
          /* ORDER LIST */
          <div>
            {orders.map(order => {
              const addr1 = parseAddr(order.shipping_address_1);
              const addr2 = parseAddr(order.shipping_address_2);
              const isOpen = expanded === order.id;
              const photoSrc = order.photo_url ? `${API_BASE}${order.photo_url}` : null;

              return (
                <div key={order.id} className="cms-order-card">

                  {/* HEADER ROW */}
                  <div onClick={() => setExpanded(isOpen ? null : order.id)} className="cms-order-card__header">

                    {/* Photo thumb */}
                    <div className="cms-order-thumb">
                      {photoSrc ? (
                        <img src={photoSrc} alt="Foto" />
                      ) : (
                        <span style={{ fontSize: '24px' }}>📷</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="cms-order-info">
                      <div className="cms-order-id">#{order.id}</div>
                      <div className="cms-order-names">
                        <span>{addr1.fullName || '?'}</span>
                        {order.session_mode !== 'solo' && (
                          <>
                            <span style={{ opacity: 0.4, fontSize: '13px' }}>+</span>
                            <span>{addr2.fullName || '?'}</span>
                          </>
                        )}
                      </div>
                      <div className="cms-order-meta">
                        {timeAgo(order.created_at)} · {order.session_mode === 'solo' ? 'Solo' : 'Duo'}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="cms-order-price">
                      {fmt(order.total_price)}
                    </div>

                    {/* Status badge */}
                    <div className={`cms-order-badge status-${order.status.toLowerCase()}`}>
                      {STATUS_LABELS[order.status]}
                    </div>

                    {/* Expand icon */}
                    <div style={{
                      color: 'var(--cms-text-dim)',
                      fontSize: '14px',
                      transition: 'transform 0.2s',
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                      marginLeft: '12px'
                    }}>▼</div>
                  </div>

                  {/* EXPANDED DETAIL */}
                  {isOpen && (
                    <div className="cms-order-details">
                      <div className="cms-details-grid">

                        {/* Address 1 */}
                        <div className="cms-address-card">
                          <div className="cms-address-card__title addr-1">
                            🏠 Alamat Kamu (1)
                          </div>
                          {[
                            ['Jumlah Cetak', `${addr1.qty || 1} lembar`],
                            ['Nama', addr1.fullName],
                            ['HP/WA', addr1.phone],
                            ['Kota', addr1.cityName],
                            ['Provinsi', addr1.provinceName],
                            ['Kode Pos', addr1.postalCode],
                            ['Alamat', addr1.details],
                          ].map(([k, v]) => v && (
                            <div key={k} className="cms-field-row">
                              <span className="cms-field-label">{k}</span>
                              <span className="cms-field-value">{v}</span>
                            </div>
                          ))}
                        </div>

                        {/* Address 2 */}
                        {order.session_mode !== 'solo' && (
                          <div className="cms-address-card">
                            <div className="cms-address-card__title addr-2">
                              💌 Alamat Pasangan (2)
                            </div>
                            {[
                              ['Jumlah Cetak', `${addr2.qty || 1} lembar`],
                              ['Nama', addr2.fullName],
                              ['HP/WA', addr2.phone],
                              ['Kota', addr2.cityName],
                              ['Provinsi', addr2.provinceName],
                              ['Kode Pos', addr2.postalCode],
                              ['Alamat', addr2.details],
                            ].map(([k, v]) => v && (
                              <div key={k} className="cms-field-row">
                                <span className="cms-field-label">{k}</span>
                                <span className="cms-field-value">{v}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Pricing summary */}
                        <div className="cms-invoice-card">
                          <div className="cms-invoice-card__title">
                            🧾 Rincian Harga
                          </div>
                          {[
                            ['Base Package', 50000],
                            ['Ongkir 1', order.shipping_cost_1],
                            order.session_mode !== 'solo' && ['Ongkir 2', order.shipping_cost_2],
                            ['Admin Fee', order.admin_fee],
                          ].filter(Boolean).map(([k, v]) => (
                            <div key={k} className="cms-invoice-row">
                              <span style={{ color: 'var(--cms-text-dim)' }}>{k}</span>
                              <span style={{ fontWeight: '600' }}>{fmt(v)}</span>
                            </div>
                          ))}
                          <div className="cms-invoice-row__total">
                            <span>Total</span>
                            <span style={{ color: '#10b981' }}>{fmt(order.total_price)}</span>
                          </div>
                        </div>
                      </div>

                      {/* STATUS UPDATE */}
                      <div className="cms-update-actions">
                        <span className="cms-update-title">Update Status:</span>
                        {ALL_STATUSES.map(s => {
                          const isCurrent = order.status === s;
                          return (
                            <button key={s}
                              disabled={isCurrent || updating === order.id}
                              onClick={() => updateStatus(order.id, s)}
                              className={`cms-update-btn ${isCurrent ? 'active' : ''}`}>
                              {updating === order.id && !isCurrent ? '...' : STATUS_LABELS[s]}
                            </button>
                          );
                        })}
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
