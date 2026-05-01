import React from 'react';

export default function HowToUseScreen({ onClose }) {
  const steps = [
    {
      icon: '✨',
      title: 'Pilih Mode',
      desc: 'Pilih "Solo" kalau sendiri, atau "Duo" buat foto bareng ayang/bestie secara real-time.',
      color: 'var(--yellow-lt)'
    },
    {
      icon: '🏠',
      title: 'Buat Ruangan',
      desc: '(Khusus Duo) Klik "Create Room", copy kodenya, dan kirim ke partner kamu buat join!',
      color: 'var(--pink-lt)'
    },
    {
      icon: '📐',
      title: 'Pilih Layout',
      desc: 'Tentukan jumlah foto dan susunan strip yang kalian inginkan.',
      color: 'var(--teal-lt)'
    },
    {
      icon: '📸',
      title: 'Pose Bareng',
      desc: 'Tunggu countdown dan tunjukkan pose terbaik kalian di depan kamera!',
      color: 'var(--teal-lt)'
    },
    {
      icon: '🎨',
      title: 'Hias & Simpan',
      desc: 'Pilih frame favorit, tambahkan sticker lucu, lalu download hasilnya!',
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
