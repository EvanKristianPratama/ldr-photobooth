import React, { useState, useRef, useEffect } from 'react';

export default function CommunityScreen({ onBack, framePresets }) {
  const [activeTab, setActiveTab] = useState('frames'); // 'frames' or 'photos'
  const [showUpload, setShowUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

  const dummyFrames = [
    { id: 'df1', title: 'Summer Vibe', author: '@sunny', url: 'https://picsum.photos/seed/summer/400/600' },
    { id: 'df2', title: 'Retro Tokyo', author: '@pixel', url: 'https://picsum.photos/seed/tokyo/400/500' },
  ];

  const dummyPosts = [
    { id: 'dp1', author: '@evan', url: 'https://picsum.photos/seed/pic1/400/700', type: 'solo' },
    { id: 'dp2', author: '@kristian', url: 'https://picsum.photos/seed/pic2/400/600', type: 'duo' },
  ];

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

  const currentItems = activeTab === 'frames' 
    ? [...communityFrames, ...dummyFrames] 
    : [...communityPosts, ...dummyPosts];

  return (
    <section className="page active" id="page-community">
      <div className="comm-mobile-nav">
        <button className="btn-primary" onClick={onBack} style={{ width: '100%', borderRadius: '15px' }}>
          ← Back to Home
        </button>
      </div>

      <div className="comm-header">
        <h1 className="comm-title">Community <span className="outline">Gallery</span></h1>
        
        {/* TAB TOGGLE */}
        <div className="comm-tabs" style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
          <button 
            className={activeTab === 'frames' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setActiveTab('frames')}
            style={{ borderRadius: '20px', padding: '8px 24px' }}
          >
            🎨 Frames
          </button>
          <button 
            className={activeTab === 'photos' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setActiveTab('photos')}
            style={{ borderRadius: '20px', padding: '8px 24px' }}
          >
            📸 Showcase
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="room-dot" style={{ margin: '0 auto 20px' }}></div>
          <p className="comm-subtitle">Fetching latest {activeTab}...</p>
        </div>
      ) : (
        <div className="comm-grid">
          {currentItems.map((item) => (
            <div key={item.id} className="comm-item">
              <div className="comm-item-img-wrapper">
                <img src={item.url} alt={item.title || 'Result'} loading="lazy" />
                <div className="comm-item-overlay">
                  <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '14px' }}>
                    {activeTab === 'frames' ? 'Use Frame' : 'View Full'}
                  </button>
                </div>
              </div>
              <div className="comm-item-info">
                <div>
                  <div className="comm-item-title">{item.title || (item.type === 'solo' ? 'Solo Strip' : 'Duo Strip')}</div>
                  <div className="comm-item-author">by {item.author}</div>
                </div>
                <div className="comm-item-like">❤️</div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div style={{ textAlign: 'center', marginTop: '60px', paddingBottom: '40px' }}>
        <p className="comm-subtitle">Want to share your {activeTab === 'frames' ? 'frame' : 'photo'}?</p>
        <button 
          className="btn-primary" 
          style={{ marginTop: '16px' }}
          onClick={() => setShowUpload(true)}
        >
          {activeTab === 'frames' ? 'Submit Frame ✦' : 'Post Result ✦'}
        </button>
      </div>

      {showUpload && (
        <div className="comm-modal-overlay">
          <div className="comm-modal">
            <button className="comm-modal-close" onClick={() => setShowUpload(false)}>×</button>
            <h2 className="comm-modal-title">Share your <span className="outline">{activeTab === 'frames' ? 'Frame' : 'Photo'}</span></h2>
            
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
    </section>
  );
}
