import React, { useState, useRef } from 'react';

export default function CommunityScreen({ onBack, framePresets }) {
  const [showUpload, setShowUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Form states
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState(null);

  // Restore dummy community frames with real random images
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

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title || !author) return alert('Please fill all required fields!');

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('author', author);
    formData.append('tags', tags);

    try {
      // Deteksi URL API: Gunakan localhost:8787 jika sedang development
      const API_BASE = window.location.hostname === 'localhost' 
        ? 'http://localhost:8787' 
        : ''; // Kosongkan jika sudah di-deploy (menggunakan proxy atau domain yang sama)
        
      const response = await fetch(`${API_BASE}/api/community/frames`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('Frame uploaded successfully! 🚀');
        setShowUpload(false);
        // Reset form
        setTitle(''); setAuthor(''); setTags(''); setFile(null);
      } else {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const err = await response.json();
          alert(`Upload failed: ${err.error || 'Unknown error'}`);
        } else {
          const text = await response.text();
          console.error('Server returned non-JSON:', text);
          alert(`Upload failed: Server error (Status ${response.status})`);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
      alert('Network error while uploading. Please check if the backend is running.');
    } finally {
      setIsUploading(false);
    }
  };

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
          onClick={() => setShowUpload(true)}
        >
          Submit Your Frame ✦
        </button>
      </div>

      {/* ── UPLOAD MODAL ── */}
      {showUpload && (
        <div className="comm-modal-overlay">
          <div className="comm-modal">
            <button className="comm-modal-close" onClick={() => setShowUpload(false)}>×</button>
            <h2 className="comm-modal-title">Upload New <span className="outline">Frame</span></h2>
            
            <form onSubmit={handleUpload}>
              <div className="comm-form-group">
                <label>Frame Title</label>
                <input 
                  type="text" 
                  className="comm-form-input" 
                  placeholder="e.g. Summer Flowers"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required 
                />
              </div>

              <div className="comm-form-group">
                <label>Author Name</label>
                <input 
                  type="text" 
                  className="comm-form-input" 
                  placeholder="e.g. @creative_user"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  required 
                />
              </div>

              <div className="comm-form-group">
                <label>Select PNG Frame (Transparent)</label>
                <div className="comm-file-drop" onClick={() => fileInputRef.current.click()}>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={(e) => setFile(e.target.files[0])}
                    accept="image/png"
                    hidden 
                  />
                  {file ? (
                    <span style={{ color: 'var(--pink)' }}>📄 {file.name}</span>
                  ) : (
                    <span>Click to select file ✨</span>
                  )}
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: '100%', marginTop: '12px' }}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Publish to Gallery 🚀'}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
