'use client';

import React, { useState, useEffect, useCallback } from 'react';
import './cms-posts.css';

const API_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_BASE || 'https://ldr-photobooth.if2372047.workers.dev')
  : '';

export default function CmsPostsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/community/posts?sort=new`);
      if (res.ok) {
        const data = await res.json();
        setPosts(Array.isArray(data) ? data : []);
      } else {
        setError('Gagal mengambil data postingan');
      }
    } catch (err) {
      console.error('Fetch failed:', err);
      setError('Terjadi kesalahan jaringan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus postingan ini? Tindakan ini tidak dapat dibatalkan.')) return;

    try {
      const res = await fetch(`${API_BASE}/api/community/posts/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setPosts(prev => prev.filter(p => p.id !== id));
        setSelectedPost(null); // Close modal after delete
      } else {
        alert('Gagal menghapus postingan');
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Terjadi kesalahan saat menghapus');
    }
  };

  return (
    <div className="cms-posts-root">
      <header className="cms-posts-header">
        <div className="cms-posts-header__left">
          <a href="/" className="cms-logo">LDR Photobooth</a>
          <span className="cms-badge">CMS</span>
          <span className="cms-title" style={{ marginLeft: '10px', fontSize: '14px', color: '#8888a0' }}>Post Management</span>
        </div>
        <div className="cms-posts-header__right">
          <a href="/cms/frames" className="cms-btn" style={{ textDecoration: 'none', marginRight: '10px' }}>Manage Frames</a>
          <button className="cms-btn" onClick={fetchPosts}>Refresh</button>
        </div>
      </header>

      <main className="cms-posts-container">
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Gallery Postingan</h1>
          <p style={{ color: '#8888a0', fontSize: '14px' }}>Kelola hasil foto dari photobooth yang dipublish ke komunitas. Klik untuk memperbesar.</p>
        </div>

        {loading ? (
          <div className="cms-loading">
            <div className="loader"></div>
            <p>Memuat postingan...</p>
          </div>
        ) : error ? (
          <div className="cms-empty">
            <p>{error}</p>
            <button className="cms-btn" onClick={fetchPosts} style={{ marginTop: '16px' }}>Coba Lagi</button>
          </div>
        ) : posts.length === 0 ? (
          <div className="cms-empty">
            <p>Belum ada postingan komunitas.</p>
          </div>
        ) : (
          <div className="cms-posts-grid">
            {posts.map(post => (
              <div 
                key={post.id} 
                className="cms-post-card" 
                onClick={() => setSelectedPost(post)}
                style={{ cursor: 'pointer' }}
              >
                <div className="cms-post-card__media">
                  <img 
                    src={post.url.startsWith('http') ? post.url : `${API_BASE}${post.url}`} 
                    alt={post.title || 'Post'} 
                    loading="lazy"
                  />
                  <div className="cms-post-card__overlay">
                    <span className="cms-btn">Lihat Detail</span>
                  </div>
                </div>
                <div className="cms-post-card__content">
                  <div className="cms-post-card__title">{post.title || 'Untitled Post'}</div>
                  <div className="cms-post-card__meta">
                    <span>By {post.author}</span>
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Preview */}
      {selectedPost && (
        <div className="cms-modal-overlay" onClick={() => setSelectedPost(null)}>
          <div className="cms-modal" onClick={e => e.stopPropagation()}>
            <div className="cms-modal__header">
              <span style={{ fontWeight: '700' }}>Post Detail</span>
              <button className="cms-btn cms-btn--xs" onClick={() => setSelectedPost(null)}>✕ Tutup</button>
            </div>
            <div className="cms-modal__body">
              <img 
                src={selectedPost.url.startsWith('http') ? selectedPost.url : `${API_BASE}${selectedPost.url}`} 
                alt="Full Preview" 
              />
            </div>
            <div className="cms-modal__footer">
              <div className="cms-modal__info">
                <div className="cms-modal__title">{selectedPost.title || 'Untitled Post'}</div>
                <div className="cms-modal__meta">
                  Diposting oleh <strong>{selectedPost.author}</strong> pada {new Date(selectedPost.created_at).toLocaleString()}
                  <br />
                  {selectedPost.likes} Likes · {selectedPost.type === 'duo' ? '👫 Duo' : '🧑 Solo'}
                </div>
              </div>
              <div className="cms-modal__actions">
                <button 
                  className="cms-btn cms-btn--danger"
                  onClick={() => handleDelete(selectedPost.id)}
                >
                  Hapus Postingan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .loader {
          border: 3px solid var(--cms-surface-2);
          border-top: 3px solid var(--cms-accent);
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
