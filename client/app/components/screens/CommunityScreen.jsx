import React from 'react';

export default function CommunityScreen({ onBack, framePresets }) {
  // Generate some dummy community frames with real random images
  const dummyFrames = [
    { id: 'c1', title: 'Summer Vibe', author: '@sunny', img: 'https://picsum.photos/seed/summer/400/600' },
    { id: 'c2', title: 'Retro Tokyo', author: '@pixel', img: 'https://picsum.photos/seed/tokyo/400/500' },
    { id: 'c3', title: 'Cute Cat', author: '@miau', img: 'https://picsum.photos/seed/cat/400/400' },
    { id: 'c4', title: 'Minimalist', author: '@zen', img: 'https://picsum.photos/seed/zen/400/700' },
    { id: 'c5', title: 'Space Night', author: '@astro', img: 'https://picsum.photos/seed/space/400/550' },
    { id: 'c6', title: 'Flower Garden', author: '@bloom', img: 'https://picsum.photos/seed/flower/400/650' },
    { id: 'c7', title: 'Old School', author: '@retro', img: 'https://picsum.photos/seed/old/400/480' },
    { id: 'c8', title: 'Vibrant Pop', author: '@art', img: 'https://picsum.photos/seed/pop/400/520' },
    { id: 'c9', title: 'Coffee Time', author: '@brew', img: 'https://picsum.photos/seed/coffee/400/600' },
    { id: 'c10', title: 'Beach Day', author: '@wave', img: 'https://picsum.photos/seed/beach/400/450' },
  ];

  return (
    <section className="page active" id="page-community">
      <div className="comm-mobile-nav">
        <button className="btn-primary" onClick={onBack} style={{ width: '100%', borderRadius: '15px' }}>
          ← Back to Home
        </button>
      </div>

      <div className="comm-header">
        <h1 className="comm-title">Community <span className="outline">Frames</span></h1>
        <p className="comm-subtitle">Find your perfect frame style 🎨</p>
      </div>

      <div className="comm-search-bar">
        <span className="comm-search-icon">🔍</span>
        <input 
          type="text" 
          className="comm-search-input" 
          placeholder="Search frames..."
        />
      </div>

      <div className="comm-grid">
        {dummyFrames.map((frame) => (
          <div key={frame.id} className="comm-item">
            <div className="comm-item-img-wrapper">
              <img src={frame.img} alt={frame.title} loading="lazy" />
              <div className="comm-item-overlay">
                <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '14px' }}>Use Frame</button>
              </div>
            </div>
            <div className="comm-item-info">
              <div>
                <div className="comm-item-title">{frame.title}</div>
                <div className="comm-item-author">by {frame.author}</div>
              </div>
              <div className="comm-item-like">❤️</div>
            </div>
          </div>
        ))}
        {/* Real frames integration (optional teaser) */}
        {framePresets?.slice(0, 3).map((fp) => (
          <div key={`real-${fp.id}`} className="comm-item">
            <div className="comm-item-img-wrapper">
              <img src={fp.src} alt={fp.label} style={{ height: '350px', objectFit: 'cover' }} />
              <div className="comm-item-overlay">
                <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '14px' }}>Use Frame</button>
              </div>
            </div>
            <div className="comm-item-info">
              <div>
                <div className="comm-item-title">{fp.label}</div>
                <div className="comm-item-author">by Official</div>
              </div>
              <div className="comm-item-like">🤍</div>
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ textAlign: 'center', marginTop: '60px', paddingBottom: '40px' }}>
        <p className="comm-subtitle">Want to share your own design?</p>
        <button 
          className="btn-primary" 
          style={{ marginTop: '16px' }}
          onClick={() => alert('Creator Portal is coming soon! 🚀')}
        >
          Submit Your Frame ✦
        </button>
      </div>
    </section>
  );
}
