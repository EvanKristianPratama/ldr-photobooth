import { useCallback } from 'react';

export default function usePhotoTransfer({ socketRef }) {
  const blobToBase64 = useCallback((blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  }), []);

  const base64ToBlob = useCallback(async (base64, mime = 'image/jpeg') => {
    const res = await fetch(`data:${mime};base64,${base64}`);
    return await res.blob();
  }, []);

  const compressForSocket = useCallback((blob) => {
    return new Promise((resolve) => {
      // If blob is already small enough (< 700KB), don't compress
      if (blob.size < 700000) return resolve(blob);

      const img = new Image();
      img.src = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const canvas = document.createElement('canvas');
        // Reduce resolution slightly for socket fallback if needed
        const scale = 0.8; 
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // Use lower quality for socket to stay under 1MB base64 limit
        canvas.toBlob((result) => resolve(result || blob), 'image/jpeg', 0.6);
      };
      img.onerror = () => resolve(blob);
    });
  }, []);

  const sendPhotoViaSocket = useCallback(async (blob, index) => {
    try {
      if (!socketRef.current) return false;
      
      // Ensure the photo is small enough for WebSocket 1MB limit
      const optimizedBlob = await compressForSocket(blob);
      const base64 = await blobToBase64(optimizedBlob);
      
      socketRef.current.emit('photo:send', {
        index,
        mime: 'image/jpeg',
        base64
      });
      return true;
    } catch (err) {
      console.error('[Socket] Send photo failed:', err);
      return false;
    }
  }, [blobToBase64, compressForSocket, socketRef]);

  const handleSocketReceive = useCallback(async ({ index, mime, base64, from }) => {
    const blob = await base64ToBlob(base64, mime || 'image/jpeg');
    return { index: index || 0, blob, from };
  }, [base64ToBlob]);

  return {
    sendPhotoViaSocket,
    handleSocketReceive
  };
}
