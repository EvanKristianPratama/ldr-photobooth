import { useCallback, useEffect, useRef } from 'react';

export default function useWebRTC({
  socketRef,
  setStatus,
  onDataChannelMessage,
  onSocketPhotoReceive,
  onEnableSocketFallback
}) {
  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const socketOnlyRef = useRef(false);
  const incomingFileRef = useRef({ id: null, chunks: [], receivedSize: 0, meta: null });

  useEffect(() => {
    return () => {
      try {
        if (pcRef.current) pcRef.current.close();
      } catch {
        // ignore
      }
    };
  }, []);

  const handleDataChannelMessage = useCallback((e) => {
    const data = e.data;
    if (typeof data === 'string') {
      const msg = JSON.parse(data);
      if (msg.type === 'meta') {
        incomingFileRef.current = {
          chunks: [],
          meta: msg,
          received: 0
        };
      } else if (msg.type === 'done') {
        const blobs = incomingFileRef.current.chunks;
        const meta = incomingFileRef.current.meta;
        const resultBlob = new Blob(blobs, { type: meta.mime });
        const idx = meta.index || 0;
        if (typeof onDataChannelMessage === 'function') {
          onDataChannelMessage({ index: idx, blob: resultBlob });
        }
      }
    } else {
      incomingFileRef.current.chunks.push(data);
    }
  }, [onDataChannelMessage]);

  const setupDataChannel = useCallback((dc) => {
    dcRef.current = dc;
    dc.binaryType = 'arraybuffer';
    dc.onmessage = handleDataChannelMessage;
  }, [handleDataChannelMessage]);

  const getOrCreatePC = useCallback((socket, remoteId) => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = e => {
      if (e.candidate) socket.emit('webrtc:candidate', { to: remoteId, candidate: e.candidate });
    };

    pc.ondatachannel = e => setupDataChannel(e.channel);

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setStatus('P2P Ready');
      } else if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        enableSocketFallback(pc.connectionState);
      }
    };

    pcRef.current = pc;
    return pc;
  }, [setStatus, setupDataChannel]);

  const sendPhotoToPeer = useCallback(async (blob, index, chunkSize) => {
    if (!socketOnlyRef.current && dcRef.current && dcRef.current.readyState === 'open') {
      const buffer = await blob.arrayBuffer();
      const fileId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

      dcRef.current.send(JSON.stringify({
        type: 'meta',
        id: fileId,
        size: blob.size,
        mime: blob.type,
        index
      }));

      let offset = 0;
      while (offset < buffer.byteLength) {
        const chunk = buffer.slice(offset, offset + chunkSize);
        while (dcRef.current.bufferedAmount > 10 * 1024 * 1024) {
          await new Promise(r => setTimeout(r, 50));
        }
        dcRef.current.send(chunk);
        offset += chunk.byteLength;
      }
      dcRef.current.send(JSON.stringify({ type: 'done', id: fileId }));
      return true;
    }

    if (typeof onSocketPhotoReceive === 'function') {
      return onSocketPhotoReceive(blob, index);
    }
    return false;
  }, [onSocketPhotoReceive]);

  const enableSocketFallback = useCallback((reason) => {
    socketOnlyRef.current = true;
    setStatus(`Fallback (socket-only): ${reason}`);
    try {
      if (pcRef.current) pcRef.current.close();
    } catch {
      // ignore
    }
    pcRef.current = null;
    dcRef.current = null;

    if (typeof onEnableSocketFallback === 'function') {
      onEnableSocketFallback(reason);
    }
  }, [onEnableSocketFallback, setStatus]);

  const handleOffer = useCallback(async ({ sdp, from }) => {
    try {
      const pc = getOrCreatePC(socketRef.current, from);
      const isPolite = socketRef.current.id > from;
      const offerCollision = pc.signalingState !== 'stable' || makingOfferRef.current;

      ignoreOfferRef.current = !isPolite && offerCollision;
      if (ignoreOfferRef.current) return;

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit('webrtc:answer', { to: from, sdp: answer });
    } catch (err) {
      console.error('Error handling offer:', err);
    }
  }, [getOrCreatePC, socketRef]);

  const handleAnswer = useCallback(async ({ sdp }) => {
    try {
      if (pcRef.current && !ignoreOfferRef.current) {
        if (pcRef.current.signalingState === 'stable') return;
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    } catch (err) {
      console.error('Error handling answer:', err);
      enableSocketFallback('answer-error');
    }
  }, [enableSocketFallback]);

  const handleCandidate = useCallback(async ({ candidate }) => {
    if (pcRef.current) {
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('ICE candidate error:', err);
        enableSocketFallback('candidate-error');
      }
    }
  }, [enableSocketFallback]);

  const connectPeers = useCallback(async (participants, socketOnly) => {
    if (socketOnly) {
      enableSocketFallback('socket-only-mode');
      return;
    }

    const peer = participants.find(p => p.id !== socketRef.current.id);
    if (!peer) return;

    try {
      const pc = getOrCreatePC(socketRef.current, peer.id);
      const dc = pc.createDataChannel('ldr-channel');
      setupDataChannel(dc);

      makingOfferRef.current = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      makingOfferRef.current = false;

      socketRef.current.emit('webrtc:offer', { to: peer.id, sdp: offer });
    } catch (err) {
      makingOfferRef.current = false;
      console.error('Error creating offer:', err);
    }
  }, [enableSocketFallback, getOrCreatePC, setupDataChannel, socketRef]);

  return {
    pcRef,
    dcRef,
    socketOnlyRef,
    handleOffer,
    handleAnswer,
    handleCandidate,
    connectPeers,
    sendPhotoToPeer,
    enableSocketFallback
  };
}
