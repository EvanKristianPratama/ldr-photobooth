import React, { useState, useEffect, useRef } from 'react';

/**
 * LivePhotoViewer - Premium, highly interactive Live Photo preview player.
 * Displays a pulsating live badge and plays a flipbook animation of the complete
 * styled photo strip when hovered on desktop or long-pressed/touched on mobile.
 */
export default function LivePhotoViewer({
  mergedImage,
  isMerging,
  count,
  participants,
  localBlobs,
  remoteBlobsByPeer,
  locationsById,
  localLiveFrames,
  remoteLiveFrames,
  mergePhotos,
  livePhotoPlayback = true
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const [frameUrls, setFrameUrls] = useState([]);
  const [isLoadingFrames, setIsLoadingFrames] = useState(false);
  const intervalRef = useRef(null);

  // Pre-generate and cache styled frame URLs on hover
  useEffect(() => {
    let active = true;
    if (isPlaying && localLiveFrames?.length > 0 && frameUrls.length === 0) {
      setIsLoadingFrames(true);
      const renderAllFrames = async () => {
        const urls = [];
        for (let f = 0; f < 10; f++) {
          try {
            const dataUrl = await mergePhotos({
              count,
              participants,
              localBlobs,
              remoteBlobsByPeer,
              locationsById,
              frameIndex: f,
              localLiveFrames,
              remoteLiveFrames
            });
            if (dataUrl) {
              urls.push(dataUrl);
            }
          } catch (err) {
            console.error('[LivePhoto] Error pre-rendering frame:', err);
          }
        }
        if (active) {
          setFrameUrls(urls);
          setIsLoadingFrames(false);
        }
      };
      renderAllFrames();
    }
    return () => {
      active = false;
    };
  }, [isPlaying, localLiveFrames, remoteLiveFrames, count, participants, localBlobs, remoteBlobsByPeer, locationsById, mergePhotos, frameUrls]);

  // Handle flipbook playback loop
  useEffect(() => {
    if (isPlaying && frameUrls.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentFrameIdx(prev => (prev + 1) % frameUrls.length);
      }, 150);
    } else {
      clearInterval(intervalRef.current);
      setCurrentFrameIdx(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, frameUrls]);

  // Reset frame cache when mergedImage changes (e.g., changing filters or styles)
  useEffect(() => {
    setFrameUrls([]);
    setCurrentFrameIdx(0);
  }, [mergedImage]);

  if (isMerging) {
    return (
      <div className="rendering-placeholder" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <div className="room-dot" />
        <span style={{ fontFamily: 'Gaegu', fontSize: '20px' }}>Rendering...</span>
      </div>
    );
  }

  return (
    <div 
      className="live-photo-viewer"
      onMouseEnter={() => livePhotoPlayback && setIsPlaying(true)}
      onMouseLeave={() => setIsPlaying(false)}
      onTouchStart={() => livePhotoPlayback && setIsPlaying(true)}
      onTouchEnd={() => setIsPlaying(false)}
      style={{ 
        position: 'relative', 
        cursor: 'pointer', 
        width: '100%', 
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >


      <img 
        src={isPlaying && frameUrls[currentFrameIdx] ? frameUrls[currentFrameIdx] : mergedImage} 
        alt="Strip Preview" 
        className="preview-img"
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          borderRadius: '16px',
          border: '3px solid var(--ink)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
          transition: 'all 0.3s ease'
        }}
      />

      <style jsx>{`
        @keyframes pulse {
          from { transform: scale(0.85); opacity: 0.7; }
          to { transform: scale(1.15); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
