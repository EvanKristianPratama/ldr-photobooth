import React, { useState, useRef, useEffect } from 'react';

export default function CommunityScreen({ onBack }) {
  const [activeTab, setActiveTab] = useState('photos'); // 'photos' or 'frames'
  const [showUpload, setShowUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); // For Full View Modal
  const fileInputRef = useRef(null);

  // Data states
  const [communityFrames, setCommunityFrames] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [file, setFile] = useState(null);

  const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8787' 
    : '';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const endpoint = activeTab === 'frames' ? '/api/community/frames' : '/api/community/posts';
      const response = await fetch(`${API_BASE}${endpoint}`);
      if (response.ok) {
        const data = await response.json();
        if (activeTab === 'frames') setCommunityFrames(data);
        else setCommunityPosts(data);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleLike = async (e, item) => {
    e.stopPropagation();
    try {
      const type = activeTab === 'frames' ? 'frames' : 'posts';
      const res = await fetch(`${API_BASE}/api/community/${type}/${item.id}/like`, { method: 'POST' });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Like failed');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !author || (activeTab === 'frames' && !title)) return alert('Fill all fields!');

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (activeTab === 'frames') formData.append('title', title);
    formData.append('author', author);

    try {
      const endpoint = activeTab === 'frames' ? '/api/community/frames' : '/api/community/posts';
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('Published successfully! 🚀');
        setShowUpload(false);
        setFile(null); setTitle('');
        fetchData();
      }
    } catch (err) {
      alert('Error during upload.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="page active comm-layout-root" id="page-community">
      
      {/* ── SIDEBAR (INSTAGRAM STYLE) ── */}
      <aside className="comm-sidebar">
        <div className="comm-sidebar-top">
          <div className="comm-sidebar-logo" onClick={onBack}>
            <span className="outline">LDR</span> Community
          </div>
          
          <nav className="comm-sidebar-nav">
            <button 
              className={`comm-nav-item ${activeTab === 'photos' ? 'active' : ''}`}
              onClick={() => setActiveTab('photos')}
            >
              <span className="nav-icon">📸</span>
              <span className="nav-label">Showcase</span>
            </button>
            <button 
              className={`comm-nav-item ${activeTab === 'frames' ? 'active' : ''}`}
              onClick={() => setActiveTab('frames')}
            >
              <span className="nav-icon">🎨</span>
              <span className="nav-label">Frames</span>
            </button>
            <button 
              className="comm-nav-item upload-trigger"
              onClick={() => setShowUpload(true)}
            >
              <span className="nav-icon">➕</span>
              <span className="nav-label">Upload</span>
            </button>
          </nav>
        </div>

        <div className="comm-sidebar-bottom">
          <button className="comm-nav-item back-btn" onClick={onBack}>
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Home</span>
          </button>
          
          <div className="comm-sidebar-credits">
             By Evan Kristian<br/>
             <a href="https://instagram.com/evankristiannn" target="_blank" rel="noopener noreferrer">@evankristiannn</a>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT (PINTEREST STYLE) ── */}
      <main className="comm-main-content">
        <header className="comm-mobile-header">
           <button className="back-circle" onClick={onBack}>←</button>
           <h1 className="comm-title-mini">{activeTab === 'photos' ? 'Showcase' : 'Frames'}</h1>
        </header>

        <div className="comm-scroll-area">
          <div className="comm-grid-container">
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '100px' }}>
                <div className="room-dot" style={{ margin: '0 auto 20px' }} />
                <p style={{ fontFamily: 'Gaegu', fontSize: '24px' }}>Loading magic...</p>
              </div>
            ) : (
              <div className="comm-grid">
                {(activeTab === 'frames' ? communityFrames : communityPosts).map((item) => (
                  <div 
                    key={item.id} 
                    className="comm-item"
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="comm-item-img-wrapper">
                      <img src={item.url} alt={item.title || 'Result'} loading="lazy" />
                      <div className="comm-item-overlay">
                        <div className="btn-primary" style={{ padding: '8px 16px', fontSize: '14px', pointerEvents: 'none' }}>
                          View ✨
                        </div>
                      </div>
                    </div>
                    <div className="comm-item-info">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="comm-item-title">{item.title || (activeTab === 'photos' ? 'Photo Strip' : 'Untitled')}</span>
                        <div className="comm-item-stats">
                          <span onClick={(e) => handleLike(e, item)} style={{ cursor: 'pointer' }}>❤️ {item.likes || item.usage_count || 0}</span>
                        </div>
                      </div>
                      <span className="comm-item-author">by {item.author}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── UPLOAD MODAL ── */}
      {showUpload && (
        <div className="comm-modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="comm-modal" onClick={e => e.stopPropagation()}>
            <button className="comm-modal-close" onClick={() => setShowUpload(false)}>×</button>
            <h2 className="comm-modal-title">Share to <span className="outline">Community</span></h2>
            
            <form onSubmit={handleUpload}>
              {activeTab === 'frames' && (
                <div className="comm-form-group">
                  <label>Title</label>
                  <input 
                    type="text" 
                    className="comm-form-input" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required 
                  />
                </div>
              )}

              <div className="comm-form-group">
                <label>Author</label>
                <input 
                  type="text" 
                  className="comm-form-input" 
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  required 
                />
              </div>

              <div className="comm-form-group">
                <label>Select File</label>
                <div className="comm-file-drop" onClick={() => fileInputRef.current.click()}>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={(e) => setFile(e.target.files[0])}
                    accept="image/png,image/jpeg"
                    hidden 
                  />
                  {file ? <span>📄 {file.name}</span> : <span>Click to select ✨</span>}
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: '100%', marginTop: '12px' }}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Publish now 🚀'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── FULL VIEW MODAL ── */}
      {selectedItem && (
        <div className="comm-modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="comm-modal full-view" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', display: 'flex', flexDirection: 'row', padding: '0', overflow: 'hidden' }}>
             <div className="full-view-img" style={{ flex: 1, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
                <img src={selectedItem.url} alt="Full View" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} />
             </div>
             <div className="full-view-sidebar" style={{ width: '300px', padding: '30px', display: 'flex', flexDirection: 'column' }}>
                <button className="comm-modal-close" onClick={() => setSelectedItem(null)} style={{ position: 'relative', top: '0', right: '0', alignSelf: 'flex-end' }}>×</button>
                <h2 className="comm-modal-title" style={{ textAlign: 'left', marginTop: '20px' }}>{selectedItem.title || (activeTab === 'photos' ? 'Photo Strip' : 'Untitled Frame')}</h2>
                <p className="comm-item-author">Shared by <b>{selectedItem.author}</b></p>
                <div style={{ flex: 1, marginTop: '20px' }}>
                   <p style={{ fontSize: '14px', opacity: 0.7 }}>A beautiful creation shared with the community.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                   <button className="btn-secondary" style={{ flex: 1 }} onClick={(e) => handleLike(e, selectedItem)}>
                      {activeTab === 'frames' ? '✨ Like Frame' : '❤️ Like Photo'}
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </section>
  );
}
