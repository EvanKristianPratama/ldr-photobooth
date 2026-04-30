import React, { useState, useRef, useEffect } from 'react';

export default function CommunityScreen({ onBack, activeTab, setActiveTab, showUpload, setShowUpload }) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const fileInputRef = useRef(null);

  const [communityFrames, setCommunityFrames] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [file, setFile] = useState(null);

  const API_BASE = 'https://ldr-photobooth.if2372047.workers.dev';

  const [sortBy, setSortBy] = useState('hot'); // 'hot', 'new', 'top'

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const endpoint = activeTab === 'frames' ? '/api/community/frames' : '/api/community/posts';
      const response = await fetch(`${API_BASE}${endpoint}?sort=${sortBy}`);
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
  }, [activeTab, sortBy]);

  const handleLike = async (e, item) => {
    e.stopPropagation();
    try {
      const type = activeTab === 'frames' ? 'frames' : 'posts';
      const res = await fetch(`${API_BASE}/api/community/${type}/${item.id}/like`, { method: 'POST' });
      if (res.ok) { fetchData(); }
    } catch (err) { console.error('Like failed'); }
  };

  const compressImage = (file, maxWidth = 800, quality = 0.6) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
        };
      };
    });
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !author || (activeTab === 'frames' && !title)) return alert('Fill all fields!');
    setIsUploading(true);
    
    try {
      // Industry Standard: Compress before upload
      const compressedBlob = await compressImage(file, 800, 0.6);
      const finalFile = new File([compressedBlob], 'upload.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('file', finalFile);
      if (activeTab === 'frames') formData.append('title', title);
      formData.append('author', author);

      const endpoint = activeTab === 'frames' ? '/api/community/frames' : '/api/community/posts';
      const response = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', body: formData });
      if (response.ok) {
        alert('Published successfully! 🚀');
        setShowUpload(false);
        setFile(null); setTitle('');
        fetchData();
      }
    } catch (err) { 
      alert('Error during upload.'); 
      console.error(err);
    } finally { 
      setIsUploading(false); 
    }
  };
  // Icon Paths
  const iconBase = "/doodle icons/SVG/interface";

  // URL Resolver to handle relative and full URLs
  const resolveUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) {
      // If we are local and the URL is from an external domain, rewrite it to use our local API_BASE
      if (API_BASE && !url.includes('localhost') && !url.includes('127.0.0.1')) {
        try {
          const path = new URL(url).pathname;
          return `${API_BASE}${path}`;
        } catch (e) { return url; }
      }
      return url;
    }
    return `${API_BASE}${url}`;
  };

  const handleImageError = (e) => {
    e.target.src = 'https://placehold.co/400x600?text=Image+Not+Found';
    e.target.style.opacity = '0.5';
  };

  return (
    <>
      {/* ── MAIN CONTENT AREA ── */}
      <div className="comm-pin-main">
        <header className="comm-pin-header">
          <div className="comm-sort-tabs">
            <button className={`sort-tab ${sortBy === 'hot' ? 'active' : ''}`} onClick={() => setSortBy('hot')}>
              <img src="/doodle icons/SVG/misc/fire.svg" className="tab-icon" alt="hot" />
              Hot
            </button>
            <button className={`sort-tab ${sortBy === 'new' ? 'active' : ''}`} onClick={() => setSortBy('new')}>
              <img src="/doodle icons/SVG/misc/rocket.svg" className="tab-icon" alt="new" />
              New
            </button>
            <button className={`sort-tab ${sortBy === 'top' ? 'active' : ''}`} onClick={() => setSortBy('top')}>
              <img src="/doodle icons/SVG/misc/trophy.svg" className="tab-icon" alt="top" />
              Top
            </button>
          </div>
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
                      <img 
                        src={resolveUrl(item.url)} 
                        alt="Inspiration" 
                        loading="lazy" 
                        onLoad={(e) => e.target.classList.add('loaded')}
                        onError={handleImageError}
                      />
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
          <div className="comm-modal-card" onClick={e => e.stopPropagation()}>
             <button className="comm-modal-close" onClick={() => setSelectedItem(null)}>×</button>
             <div className="comm-modal-body">
               <div className="comm-modal-img-wrap">
                  <img 
                    src={resolveUrl(selectedItem.url)} 
                    alt="Full View" 
                    onError={handleImageError}
                  />
               </div>
               <div className="comm-modal-info">
                  <h2 className="comm-modal-title">{selectedItem.title || (activeTab === 'photos' ? 'Photo Strip' : 'Frame')}</h2>
                  <p className="comm-modal-author">by <b>{selectedItem.author}</b></p>
                  
                  <div style={{ marginTop: 'auto' }}>
                    <button className="comm-like-big" onClick={(e) => handleLike(e, selectedItem)}>
                       ❤️ Beri Like
                    </button>
                  </div>
               </div>
             </div>
          </div>
        </div>
      )}
    </>
  );
}
