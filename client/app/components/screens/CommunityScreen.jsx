import React, { useState, useRef, useEffect } from 'react';

export default function CommunityScreen({ onBack }) {
  const [activeTab, setActiveTab] = useState('photos');
  const [showUpload, setShowUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const fileInputRef = useRef(null);

  const [communityFrames, setCommunityFrames] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
      if (res.ok) { fetchData(); }
    } catch (err) { console.error('Like failed'); }
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
      const response = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', body: formData });
      if (response.ok) {
        alert('Published successfully! 🚀');
        setShowUpload(false);
        setFile(null); setTitle('');
        fetchData();
      }
    } catch (err) { alert('Error during upload.'); }
    finally { setIsUploading(false); }
  };

  // Icon Paths
  const iconBase = "/doodle icons/SVG/interface";

  return (
    <section className="page active comm-pin-root" id="page-community">
      
      {/* ── EXPANDABLE SIDEBAR WITH LOCAL DOODLE ICONS ── */}
      <aside className="comm-pin-sidebar expandable">
        <div className="pin-sidebar-top">
          <div className="pin-logo" onClick={onBack}>
             <img src={`${iconBase}/camera.svg`} className="logo-img" alt="logo" />
             <span className="logo-text">LDR Gallery</span>
          </div>
          <nav className="pin-nav">
            <button className={`pin-nav-item ${activeTab === 'photos' ? 'active' : ''}`} onClick={() => setActiveTab('photos')}>
               <span className="nav-icon"><img src={`${iconBase}/home.svg`} alt="home" /></span>
               <span className="nav-label">Showcase</span>
            </button>
            <button className={`pin-nav-item ${activeTab === 'frames' ? 'active' : ''}`} onClick={() => setActiveTab('frames')}>
               <span className="nav-icon"><img src={`${iconBase}/grid.svg`} alt="frames" /></span>
               <span className="nav-label">Frames</span>
            </button>
            <button className="pin-nav-item" onClick={() => setShowUpload(true)}>
               <span className="nav-icon"><img src={`${iconBase}/upload.svg`} alt="upload" /></span>
               <span className="nav-label">Create</span>
            </button>
          </nav>
        </div>
        <div className="pin-sidebar-bottom">
           <button className="pin-nav-item" onClick={onBack}>
              <span className="nav-icon"><img src={`${iconBase}/logout.svg`} alt="back" /></span>
              <span className="nav-label">Back Home</span>
           </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="comm-pin-main">
        <header className="comm-pin-header">
           <div className="pin-search-container">
              <img src={`${iconBase}/search.svg`} className="search-icon-img" alt="search" />
              <input type="text" placeholder="Cari karya seru..." className="pin-search-input" />
           </div>
           <div className="pin-user-circle">E</div>
        </header>

        <div className="pin-scroll-area">
          <div className="pin-grid">
             {isLoading ? (
                <div className="pin-loading">
                   <div className="room-dot" />
                   <p>Menyiapkan inspirasi...</p>
                </div>
             ) : (
                (activeTab === 'frames' ? communityFrames : communityPosts).map((item) => (
                  <div key={item.id} className="pin-item" onClick={() => setSelectedItem(item)}>
                    <div className="pin-item-inner">
                      <img src={item.url} alt="Inspiration" loading="lazy" />
                      <div className="pin-item-hover">
                         <button className="pin-save-btn" onClick={(e) => handleLike(e, item)}>
                            ❤️ {item.likes || item.usage_count || 0}
                         </button>
                      </div>
                    </div>
                  </div>
                ))
             )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showUpload && (
        <div className="comm-modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="comm-modal" onClick={e => e.stopPropagation()} style={{ borderRadius: '32px' }}>
            <button className="comm-modal-close" onClick={() => setShowUpload(false)}>×</button>
            <h2 className="comm-modal-title" style={{ textAlign: 'center' }}>Share Inspiration ✨</h2>
            <form onSubmit={handleUpload}>
              <div className="comm-form-group">
                <label>Your Name</label>
                <input type="text" className="comm-form-input" value={author} onChange={(e) => setAuthor(e.target.value)} required />
              </div>
              <div className="comm-form-group">
                <label>Title / Caption</label>
                <input type="text" className="comm-form-input" value={title} onChange={(e) => setTitle(e.target.value)} required={activeTab === 'frames'} />
              </div>
              <div className="comm-form-group">
                <label>Select File</label>
                <div className="comm-file-drop" onClick={() => fileInputRef.current.click()}>
                   <input type="file" ref={fileInputRef} onChange={(e) => setFile(e.target.files[0])} accept="image/*" hidden />
                   {file ? <span>✓ {file.name}</span> : <span>Pilih gambar atau frame 📤</span>}
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', borderRadius: '20px' }} disabled={isUploading}>
                {isUploading ? 'Uploading...' : 'Publish ✨'}
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="comm-modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="comm-modal full-view" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', display: 'flex', flexDirection: 'row', padding: '0', overflow: 'hidden', borderRadius: '32px' }}>
             <div className="full-view-img" style={{ flex: 1, background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={selectedItem.url} alt="Full View" style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain' }} />
             </div>
             <div className="full-view-sidebar" style={{ width: '320px', padding: '40px', display: 'flex', flexDirection: 'column' }}>
                <button className="comm-modal-close" onClick={() => setSelectedItem(null)} style={{ position: 'relative', top: '0', right: '0', alignSelf: 'flex-end' }}>×</button>
                <h2 className="comm-modal-title" style={{ textAlign: 'left', fontSize: '28px' }}>{selectedItem.title || (activeTab === 'photos' ? 'Photo Strip' : 'Frame')}</h2>
                <p style={{ fontFamily: 'Gaegu', fontSize: '18px' }}>by <b>{selectedItem.author}</b></p>
                <button className="btn-primary" style={{ width: '100%', borderRadius: '24px', marginTop: 'auto' }} onClick={(e) => handleLike(e, selectedItem)}>
                   ❤️ Beri Like
                </button>
             </div>
          </div>
        </div>
      )}
    </section>
  );
}
