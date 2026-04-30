import React, { useState, useRef, useEffect } from 'react';

export default function CommunityScreen({ onBack, framePresets }) {
  const [showUpload, setShowUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Community frames from BE
  const [communityFrames, setCommunityFrames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState(null);

  // API Configuration
  const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8787' 
    : '';

  // Dummy community frames for filler
  const dummyFrames = [
    { id: 'c1', title: 'Summer Vibe', author: '@sunny', img: 'https://picsum.photos/seed/summer/400/600' },
    { id: 'c2', title: 'Retro Tokyo', author: '@pixel', img: 'https://picsum.photos/seed/tokyo/400/500' },
    { id: 'c3', title: 'Cute Cat', author: '@miau', img: 'https://picsum.photos/seed/cat/400/400' },
    { id: 'c4', title: 'Minimalist', author: '@zen', img: 'https://picsum.photos/seed/zen/400/700' },
    { id: 'c5', title: 'Space Night', author: '@astro', img: 'https://picsum.photos/seed/space/400/550' },
  ];

  const fetchFrames = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/community/frames`);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched community frames:', data);
        setCommunityFrames(data);
      }
    } catch (err) {
      console.error('Failed to fetch community frames:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFrames();
  }, []);

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
      const response = await fetch(`${API_BASE}/api/community/frames`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('Frame uploaded successfully! 🚀');
        setShowUpload(false);
        setTitle(''); setAuthor(''); setTags(''); setFile(null);
        fetchFrames(); // Refresh list after upload
      } else {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const err = await response.json();
          alert(`Upload failed: ${err.error}${err.details ? '\nDetail: ' + err.details : ''}`);
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

  const combinedFrames = [...communityFrames, ...dummyFrames];

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

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="room-dot" style={{ margin: '0 auto 20px' }}></div>
          <p className="comm-subtitle">Loading gallery...</p>
        </div>
      ) : (
        <div className="comm-grid">
          {combinedFrames.map((frame) => (
            <div key={frame.id} className="comm-item">
              <div className="comm-item-img-wrapper">
                <img src={frame.url || frame.img} alt={frame.title} loading="lazy" />
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
      )}
      
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
