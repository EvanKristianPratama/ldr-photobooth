'use client';

import React, { useEffect } from 'react';

const SOLO_BASE_PRICE = 35000;
const DUO_BASE_PRICE = 50000;
const EXTRA_PRINT_PRICE = 15000;
const ADMIN_FEE = 1000;

export default function InvoiceScreen({
  orderId,
  photoData,
  orderTotal,
  pricing,
  addr1,
  addr2,
  isSolo,
  onHome,
}) {
  // Allow body scroll for print capability but restrict on-screen scroll for single page dashboard
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    return () => {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
    };
  }, []);

  const fmt = (n) => `Rp${Number(n || 0).toLocaleString('id-ID')}`;

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const invoiceDate = new Date().toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div style={styles.container} className="no-scrollbar">
      {/* Dynamic Style Tag for Print Media */}
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />

      <div style={styles.invoiceWrapper} id="printable-invoice">
        {/* Header */}
        <header style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/Ldr_photobooth.png" alt="LDR Photobooth Logo" style={{ height: '36px', width: 'auto', display: 'block', borderRadius: '4px' }} />
            <div>
              <h1 style={styles.brandTitle}>LDR Photobooth</h1>
              <p style={styles.brandSubtitle}>Photobooth Jarak Jauh • Cetak & Kirim</p>
            </div>
          </div>
          <div style={styles.statusBadge}>
            PAID / LUNAS
          </div>
        </header>

        {/* Invoice Info Grid - Compact Horizontal Bar */}
        <div style={styles.infoGrid}>
          <div>
            <span style={styles.label}>Nomor Invoice</span>
            <div style={styles.valueBold}>{orderId || 'INV-XXXXX'}</div>
          </div>
          <div>
            <span style={styles.label}>Tanggal Transaksi</span>
            <div style={styles.value}>{invoiceDate}</div>
          </div>
          <div>
            <span style={styles.label}>Metode Pembayaran</span>
            <div style={styles.value}>Midtrans (Automatic)</div>
          </div>
          <div>
            <span style={styles.label}>Status</span>
            <div style={{ ...styles.valueBold, color: '#27ae60' }}>Berhasil</div>
          </div>
        </div>

        {/* Main Content Layout - Sleek Side-by-Side Panels */}
        <div style={styles.mainLayout}>
          {/* Left Column: Breakdown + Shipping */}
          <div style={styles.leftCol}>
            {/* Payment Details Section */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Rincian Pembayaran</h3>
              <div style={styles.table}>
                {/* Base package */}
                <div style={styles.tableRow}>
                  <span>Paket Base ({isSolo ? 'Solo - 1 Print' : 'Duo - 2 Prints'})</span>
                  <span>{fmt(isSolo ? SOLO_BASE_PRICE : DUO_BASE_PRICE)}</span>
                </div>

                {/* Additional prints */}
                {pricing?.qty1 > 1 && (
                  <div style={styles.tableRow}>
                    <span>Tambahan Cetak Penerima 1 (+{pricing.qty1 - 1} lembar)</span>
                    <span>{fmt((pricing.qty1 - 1) * EXTRA_PRINT_PRICE)}</span>
                  </div>
                )}
                {!isSolo && pricing?.qty2 > 1 && (
                  <div style={styles.tableRow}>
                    <span>Tambahan Cetak Penerima 2 (+{pricing.qty2 - 1} lembar)</span>
                    <span>{fmt((pricing.qty2 - 1) * EXTRA_PRINT_PRICE)}</span>
                  </div>
                )}

                {/* Shipping cost 1 */}
                <div style={styles.tableRow}>
                  <span>Ongkir Penerima 1 ({addr1?.cityName || 'Tujuan'})</span>
                  <span>{fmt(pricing?.shippingCost1 || 0)}</span>
                </div>

                {/* Shipping cost 2 */}
                {!isSolo && (
                  <div style={styles.tableRow}>
                    <span>Ongkir Penerima 2 ({addr2?.cityName || 'Tujuan'})</span>
                    <span>{fmt(pricing?.shippingCost2 || 0)}</span>
                  </div>
                )}

                {/* Admin Fee */}
                <div style={styles.tableRow}>
                  <span>Biaya Admin</span>
                  <span>{fmt(pricing?.adminFee || ADMIN_FEE)}</span>
                </div>

                {/* Grand Total */}
                <div style={styles.totalRow}>
                  <span>Total Pembayaran</span>
                  <span>{fmt(orderTotal)}</span>
                </div>
              </div>
            </div>

            {/* Shipping Addresses Section */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Alamat Pengiriman</h3>
              
              <div style={styles.addressBox}>
                <div style={styles.addressSubTitle}>Penerima 1: {addr1?.fullName}</div>
                <div style={styles.addressText}>
                  {addr1?.phone} • {addr1?.details || addr1?.streetAddress}, {addr1?.cityName}, {addr1?.provinceName} - {addr1?.postalCode}
                </div>
              </div>

              {!isSolo && addr2?.fullName && (
                <div style={{ ...styles.addressBox, marginTop: '8px' }}>
                  <div style={styles.addressSubTitle}>Penerima 2: {addr2?.fullName}</div>
                  <div style={styles.addressText}>
                    {addr2?.phone} • {addr2?.details || addr2?.streetAddress}, {addr2?.cityName}, {addr2?.provinceName} - {addr2?.postalCode}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Captured Photo Strip Preview */}
          <div style={styles.rightCol}>
            <div style={styles.photoSection}>
              <div style={styles.photoContainer}>
                {photoData ? (
                  <img src={photoData} alt="Foto Cetak Photobooth" style={styles.photoImg} />
                ) : (
                  <div style={styles.photoPlaceholder}>Foto tidak tersedia</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <footer style={styles.footerNote}>
          <p>Terima kasih telah menggunakan FUTU LDR Photobooth! 📸❤️</p>
        </footer>
      </div>

      {/* Control Buttons (Hidden when printing) */}
      <div style={styles.actionRow} className="no-print">
        <button style={styles.btnPrint} onClick={handlePrint}>
          🖨️ Cetak / Simpan PDF
        </button>
        <button style={styles.btnHome} onClick={onHome}>
          🏠 Kembali ke Beranda
        </button>
      </div>
    </div>
  );
}

// Media Query CSS specifically for print layout
const printStyles = `
  @media print {
    body, html {
      background: #fff !important;
      color: #000 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      height: auto !important;
    }
    .no-print {
      display: none !important;
    }
    #printable-invoice {
      box-shadow: none !important;
      border: none !important;
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: transparent !important;
    }
  }
`;

const styles = {
  container: {
    minHeight: '100vh',
    width: '100%',
    background: 'linear-gradient(135deg, #120c1f 0%, #1e1135 100%)',
    color: '#ffffff',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    boxSizing: 'border-box',
  },
  invoiceWrapper: {
    background: '#ffffff',
    color: '#2d3748',
    borderRadius: '16px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
    width: '100%',
    maxWidth: '850px',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '2px solid #edf2f7',
    paddingBottom: '8px',
    marginBottom: '12px',
  },
  brandTitle: {
    margin: 0,
    fontSize: '22px',
    fontWeight: '800',
    background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '0.5px',
  },
  brandSubtitle: {
    margin: '2px 0 0 0',
    fontSize: '11px',
    color: '#718096',
  },
  statusBadge: {
    background: '#d4edda',
    color: '#155724',
    padding: '6px 14px',
    borderRadius: '30px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.5px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    background: '#f8fafc',
    padding: '10px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #e2e8f0',
  },
  label: {
    display: 'block',
    fontSize: '10px',
    fontWeight: '600',
    color: '#a0aec0',
    textTransform: 'uppercase',
    marginBottom: '2px',
    letterSpacing: '0.5px',
  },
  value: {
    fontSize: '12px',
    color: '#2d3748',
    fontWeight: '500',
  },
  valueBold: {
    fontSize: '12px',
    color: '#1a202c',
    fontWeight: '700',
  },
  mainLayout: {
    display: 'flex',
    gap: '24px',
    flexDirection: 'row',
  },
  leftCol: {
    flex: '1.2',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minWidth: '0',
  },
  rightCol: {
    flex: '0.8',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: '0',
  },
  section: {
    border: '1px solid #edf2f7',
    borderRadius: '10px',
    padding: '12px 14px',
  },
  sectionTitle: {
    margin: '0 0 8px 0',
    fontSize: '13px',
    fontWeight: '700',
    color: '#1a202c',
    borderBottom: '1px solid #edf2f7',
    paddingBottom: '4px',
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  tableRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#4a5568',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    fontWeight: '800',
    color: '#1a202c',
    borderTop: '2px solid #edf2f7',
    paddingTop: '8px',
    marginTop: '4px',
  },
  addressBox: {
    background: '#f8fafc',
    borderRadius: '6px',
    padding: '8px 10px',
    border: '1px solid #e2e8f0',
  },
  addressSubTitle: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: '2px',
  },
  addressText: {
    fontSize: '11px',
    color: '#4a5568',
    lineHeight: '1.4',
  },
  photoSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
  },
  photoContainer: {
    background: '#1a202c',
    padding: '8px',
    borderRadius: '8px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
    display: 'inline-block',
  },
  photoImg: {
    maxHeight: '230px',
    width: 'auto',
    borderRadius: '4px',
    display: 'block',
  },
  photoPlaceholder: {
    width: '100px',
    height: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#a0aec0',
    fontSize: '12px',
  },
  footerNote: {
    borderTop: '2px solid #edf2f7',
    paddingTop: '10px',
    marginTop: '14px',
    textAlign: 'center',
    color: '#718096',
    fontSize: '11px',
  },
  actionRow: {
    marginTop: '16px',
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  btnPrint: {
    background: 'linear-gradient(90deg, #ec4899, #db2777)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '30px',
    padding: '10px 24px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)',
    transition: 'transform 0.2s, opacity 0.2s',
  },
  btnHome: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '30px',
    padding: '10px 24px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
};
