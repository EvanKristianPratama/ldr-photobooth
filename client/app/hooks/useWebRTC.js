import { useCallback, useEffect, useRef } from 'react';

export default function useWebRTC({
  socketRef,
  setStatus,
  onDataChannelMessage,
  onSocketPhotoReceive,
  onEnableSocketFallback
}) {
  const pcsRef = useRef(new Map()); // Map<peerId, RTCPeerConnection>
  const dcsRef = useRef(new Map()); // Map<peerId, RTCDataChannel>
  const makingOffersRef = useRef(new Map()); // Map<peerId, boolean>
  const ignoreOffersRef = useRef(new Map()); // Map<peerId, boolean>
  const socketOnlyRef = useRef(false);
  
  // incomingFilesRef: Map<peerId, { chunks: [], meta: null }>
  const incomingFilesRef = useRef(new Map());
  const candidatesQueuesRef = useRef(new Map()); // Map<peerId, candidate[]>

  // Use refs for callbacks to avoid stale closures in event handlers
  const onDataChannelMessageRef = useRef(onDataChannelMessage);
  const onSocketPhotoReceiveRef = useRef(onSocketPhotoReceive);
  const onEnableSocketFallbackRef = useRef(onEnableSocketFallback);

  useEffect(() => {
    onDataChannelMessageRef.current = onDataChannelMessage;
    onSocketPhotoReceiveRef.current = onSocketPhotoReceive;
    onEnableSocketFallbackRef.current = onEnableSocketFallback;
  }, [onDataChannelMessage, onSocketPhotoReceive, onEnableSocketFallback]);

  useEffect(() => {
    return () => {
      pcsRef.current.forEach(pc => {
        try { pc.close(); } catch (e) {}
      });
      pcsRef.current.clear();
      dcsRef.current.clear();
    };
  }, []);

  const handleDataChannelMessage = useCallback((peerId, e) => {
    const data = e.data;
    if (typeof data === 'string') {
      const msg = JSON.parse(data);
      if (msg.type === 'meta') {
        incomingFilesRef.current.set(peerId, {
          chunks: [],
          meta: msg
        });
      } else if (msg.type === 'done') {
        const fileData = incomingFilesRef.current.get(peerId);
        if (!fileData) return;
        
        const resultBlob = new Blob(fileData.chunks, { type: fileData.meta.mime });
        const idx = fileData.meta.index || 0;
        
        if (typeof onDataChannelMessageRef.current === 'function') {
          onDataChannelMessageRef.current({ from: peerId, index: idx, blob: resultBlob });
        }
        incomingFilesRef.current.delete(peerId);
      }
    } else {
      const fileData = incomingFilesRef.current.get(peerId);
      if (fileData) {
        fileData.chunks.push(data);
      }
    }
  }, [onDataChannelMessage]);

  const setupDataChannel = useCallback((peerId, dc) => {
    dcsRef.current.set(peerId, dc);
    dc.binaryType = 'arraybuffer';
    dc.onmessage = (e) => handleDataChannelMessage(peerId, e);
    dc.onclose = () => dcsRef.current.delete(peerId);
  }, [handleDataChannelMessage]);

  const getOrCreatePC = useCallback((remoteId) => {
    if (pcsRef.current.has(remoteId)) return pcsRef.current.get(remoteId);

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = e => {
      if (e.candidate) socketRef.current.emit('webrtc:candidate', { to: remoteId, candidate: e.candidate });
    };

    pc.ondatachannel = e => setupDataChannel(remoteId, e.channel);

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setStatus(`Connected to ${remoteId.slice(0, 4)}`);
      } else if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        pcsRef.current.delete(remoteId);
        dcsRef.current.delete(remoteId);
      }
    };

    pcsRef.current.set(remoteId, pc);
    return pc;
  }, [setStatus, setupDataChannel, socketRef]);

  const sendPhotoToPeer = useCallback(async (blob, index, chunkSize, expectedPeersCount = 1) => {
    // If forced socket-only mode, send everything via socket
    if (socketOnlyRef.current) {
      if (typeof onSocketPhotoReceiveRef.current === 'function') {
        return onSocketPhotoReceiveRef.current(blob, index);
      }
      return false;
    }

    const buffer = await blob.arrayBuffer();
    const fileId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

    // Count how many peers we can reach via WebRTC
    let webrtcSentCount = 0;

    // Send to all connected data channels via WebRTC
    const sendPromises = Array.from(dcsRef.current.entries()).map(async ([peerId, dc]) => {
      if (dc.readyState !== 'open') return;

      try {
        dc.send(JSON.stringify({
          type: 'meta',
          id: fileId,
          size: blob.size,
          mime: blob.type,
          index
        }));

        let offset = 0;
        while (offset < buffer.byteLength) {
          const chunk = buffer.slice(offset, offset + chunkSize);
          while (dc.bufferedAmount > 10 * 1024 * 1024) {
            await new Promise(r => setTimeout(r, 50));
          }
          dc.send(chunk);
          offset += chunk.byteLength;
        }
        dc.send(JSON.stringify({ type: 'done', id: fileId }));
        webrtcSentCount++;
      } catch (err) {
        console.warn(`[WebRTC] Failed to send to ${peerId}, will use socket fallback`, err);
      }
    });

    await Promise.all(sendPromises);

    // If we couldn't reach all expected peers via WebRTC, also send via socket
    // so the server can broadcast to anyone we missed
    if (webrtcSentCount < expectedPeersCount) {
      if (typeof onSocketPhotoReceiveRef.current === 'function') {
        await onSocketPhotoReceiveRef.current(blob, index);
      }
    }

    return true;
  }, [onSocketPhotoReceive]);

  const enableSocketFallback = useCallback((reason) => {
    socketOnlyRef.current = true;
    setStatus(`Socket fallback: ${reason}`);
    pcsRef.current.forEach(pc => pc.close());
    pcsRef.current.clear();
    dcsRef.current.clear();

    if (typeof onEnableSocketFallbackRef.current === 'function') {
      onEnableSocketFallbackRef.current(reason);
    }
  }, [onEnableSocketFallback, setStatus]);

  const processCandidatesQueue = useCallback(async (peerId) => {
    const pc = pcsRef.current.get(peerId);
    if (!pc || !pc.remoteDescription) return;
    
    const queue = candidatesQueuesRef.current.get(peerId) || [];
    while (queue.length > 0) {
      const candidate = queue.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error(`Error adding queued candidate for ${peerId}:`, err);
      }
    }
  }, []);

  const handleOffer = useCallback(async ({ sdp, from }) => {
    try {
      const pc = getOrCreatePC(from);
      const isPolite = socketRef.current.id > from;
      const offerCollision = pc.signalingState !== 'stable' || makingOffersRef.current.get(from);

      ignoreOffersRef.current.set(from, !isPolite && offerCollision);
      if (ignoreOffersRef.current.get(from)) return;

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      await processCandidatesQueue(from);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit('webrtc:answer', { to: from, sdp: answer });
    } catch (err) {
      console.error(`Error handling offer from ${from}:`, err);
    }
  }, [getOrCreatePC, socketRef, processCandidatesQueue]);

  const handleAnswer = useCallback(async ({ sdp, from }) => {
    try {
      const pc = pcsRef.current.get(from);
      if (pc && !ignoreOffersRef.current.get(from)) {
        if (pc.signalingState === 'stable') return;
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await processCandidatesQueue(from);
      }
    } catch (err) {
      console.error(`Error handling answer from ${from}:`, err);
    }
  }, [processCandidatesQueue]);

  const handleCandidate = useCallback(async ({ candidate, from }) => {
    const pc = pcsRef.current.get(from);
    if (pc) {
      try {
        if (!pc.remoteDescription) {
          if (!candidatesQueuesRef.current.has(from)) candidatesQueuesRef.current.set(from, []);
          candidatesQueuesRef.current.get(from).push(candidate);
          return;
        }
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error(`ICE candidate error from ${from}:`, err);
      }
    }
  }, []);

  const connectPeers = useCallback(async (participants, socketOnly) => {
    if (socketOnly) {
      enableSocketFallback('socket-only-mode');
      return;
    }

    const myId = socketRef.current?.id;
    if (!myId) {
      console.warn('[WebRTC] Cannot connect peers: socket ID not yet assigned');
      return;
    }

    const others = participants.filter(p => p.id !== myId);
    console.log(`[WebRTC] connectPeers: myId=${myId}, total=${participants.length}, others=${others.length}`);
    
    for (const peer of others) {
      if (pcsRef.current.has(peer.id)) continue;

      try {
        const pc = getOrCreatePC(peer.id);
        const dc = pc.createDataChannel('ldr-channel');
        setupDataChannel(peer.id, dc);

        makingOffersRef.current.set(peer.id, true);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        makingOffersRef.current.set(peer.id, false);

        socketRef.current.emit('webrtc:offer', { to: peer.id, sdp: offer });
        console.log(`[WebRTC] Sent offer to ${peer.id.slice(0, 8)}`);
      } catch (err) {
        makingOffersRef.current.set(peer.id, false);
        console.error(`Error creating offer to ${peer.id}:`, err);
      }
    }
  }, [enableSocketFallback, getOrCreatePC, setupDataChannel, socketRef]);

  return {
    pcsRef,
    dcsRef,
    socketOnlyRef,
    handleOffer,
    handleAnswer,
    handleCandidate,
    connectPeers,
    sendPhotoToPeer,
    enableSocketFallback
  };
}
