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
      // Ganti URL dengan URL Worker kamu saat deploy
      const response = await fetch('/api/community/frames', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('Frame uploaded successfully! 🚀');
        setShowUpload(false);
        // Reset form
        setTitle(''); setAuthor(''); setTags(''); setFile(null);
      } else {
        const err = await response.json();
        alert(`Upload failed: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while uploading. Is your backend ready?');
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
