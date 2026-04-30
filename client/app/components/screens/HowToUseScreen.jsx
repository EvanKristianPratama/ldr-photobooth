import React from 'react';

export default function HowToUseScreen({ onClose }) {
  const steps = [
    {
      icon: '🏠',
      title: 'Buat Ruangan',
      desc: 'Klik "Create Room" untuk dapet kode unik kamu.',
      color: 'var(--pink-lt)'
    },
    {
      icon: '🔗',
      title: 'Ajak Partner',
      desc: 'Copy kodenya dan kirim ke orang tersayang buat join!',
      color: 'var(--yellow-lt)'
    },
    {
      icon: '📐',
      title: 'Pilih Layout',
      desc: 'Tentukan jumlah foto dan susunan strip yang kalian mau.',
      color: 'var(--teal-lt)'
    },
    {
      icon: '📸',
      title: 'Pose Bareng',
      desc: 'Klik shutter dan tunjukkan pose terbaik kalian!',
      color: 'var(--teal-lt)'
    },
    {
      icon: '🎨',
      title: 'Hias & Simpan',
      desc: 'Pilih frame favorit, kasih sticker, lalu download deh!',
      color: 'var(--purple-lt)'
    }
  ];

  return (
    <div className="how-to-modal">
      <div className="how-to-backdrop" onClick={onClose} />
      <div className="how-to-content squiggle">
        <div className="how-to-header">
          <h2 className="how-to-title">Cara Pakai ✦</h2>
          <button className="how-to-close" onClick={onClose}>×</button>
        </div>

        <div className="how-to-grid">
          {steps.map((step, i) => (
            <div key={i} className="how-to-card" style={{ background: step.color }}>
              <div className="how-to-icon">{step.icon}</div>
              <div className="how-to-info">
                <h4 className="how-to-step-title">{step.title}</h4>
                <p className="how-to-step-desc">{step.desc}</p>
              </div>
              <div className="how-to-num">0{i + 1}</div>
            </div>
          ))}
        </div>

        <div className="how-to-footer">
          <p>Gampang banget kan? Yuk langsung mulai! ✨</p>
          <button className="btn-primary" onClick={onClose} style={{ width: 'auto', padding: '10px 30px' }}>
            Oke, Paham!
          </button>
        </div>
      </div>
    </div>
  );
}
