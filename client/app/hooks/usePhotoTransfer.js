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

  const sendPhotoViaSocket = useCallback(async (blob, index) => {
    try {
      if (!socketRef.current) return false;
      const base64 = await blobToBase64(blob);
      socketRef.current.emit('photo:send', {
        index,
        mime: blob.type || 'image/jpeg',
        base64
      });
      return true;
    } catch {
      return false;
    }
  }, [blobToBase64, socketRef]);

  const handleSocketReceive = useCallback(async ({ index, mime, base64 }) => {
    const blob = await base64ToBlob(base64, mime || 'image/jpeg');
    return { index: index || 0, blob };
  }, [base64ToBlob]);

  return {
    sendPhotoViaSocket,
    handleSocketReceive
  };
}
