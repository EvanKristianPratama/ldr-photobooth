import { useCallback, useEffect, useRef } from 'react';

const descriptionHasMediaSections = (description) => {
  const sdp = description?.sdp || '';
  return /\nm=(audio|video)\s/.test(sdp);
};

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
    const pcs = pcsRef.current;
    const dcs = dcsRef.current;

    return () => {
      pcs.forEach(pc => {
        try {
          pc.close();
        } catch {
          // Ignore cleanup close errors.
        }
      });
      pcs.clear();
      dcs.clear();
    };
  }, []);

  const handleDataChannelMessage = useCallback((peerId, e) => {
    const data = e.data;
    if (typeof data === 'string') {
      const msg = JSON.parse(data);
      if (msg.type === 'meta' || msg.type === 'live-meta') {
        incomingFilesRef.current.set(peerId, {
          chunks: [],
          meta: msg
        });
      } else if (msg.type === 'done' || msg.type === 'live-done') {
        const fileData = incomingFilesRef.current.get(peerId);
        if (!fileData) return;
        
        const resultBlob = new Blob(fileData.chunks, { type: fileData.meta.mime });
        const isLive = fileData.meta.type === 'live-meta';
        const idx = isLive ? (fileData.meta.shotIndex || 0) : (fileData.meta.index || 0);
        const frameIndex = isLive ? (fileData.meta.frameIndex || 0) : null;
        
        if (typeof onDataChannelMessageRef.current === 'function') {
          onDataChannelMessageRef.current({ 
            from: peerId, 
            index: idx, 
            blob: resultBlob,
            isLive,
            frameIndex
          });
        }
        incomingFilesRef.current.delete(peerId);
      }
    } else {
      const fileData = incomingFilesRef.current.get(peerId);
      if (fileData) {
        fileData.chunks.push(data);
      }
    }
  }, []);

  const setupDataChannel = useCallback((peerId, dc) => {
    dcsRef.current.set(peerId, dc);
    dc.binaryType = 'arraybuffer';
    dc.onmessage = (e) => handleDataChannelMessage(peerId, e);
    dc.onclose = () => dcsRef.current.delete(peerId);
  }, [handleDataChannelMessage]);

  const closePeerConnection = useCallback((peerId) => {
    const pc = pcsRef.current.get(peerId);
    if (pc) {
      try {
        pc.close();
      } catch {
        // Ignore close errors during cleanup/recreate.
      }
    }

    pcsRef.current.delete(peerId);
    dcsRef.current.delete(peerId);
    candidatesQueuesRef.current.delete(peerId);
    ignoreOffersRef.current.delete(peerId);
    makingOffersRef.current.delete(peerId);
  }, []);

  const resetPeerConnectionIfMediaShapeMismatches = useCallback((peerId, { dataOnly = false, remoteDescription } = {}) => {
    const pc = pcsRef.current.get(peerId);
    if (!pc) return;

    const incomingHasMedia = remoteDescription ? descriptionHasMediaSections(remoteDescription) : false;
    const existingHasMedia =
      pc.getTransceivers().some(transceiver => !transceiver.stopped) ||
      descriptionHasMediaSections(pc.localDescription) ||
      descriptionHasMediaSections(pc.remoteDescription);

    if ((dataOnly || !incomingHasMedia) && existingHasMedia) {
      console.log(`[WebRTC] Resetting stale media peer connection for ${peerId}`);
      closePeerConnection(peerId);
    }
  }, [closePeerConnection]);

  const getOrCreatePC = useCallback((remoteId) => {
    if (pcsRef.current.has(remoteId)) return pcsRef.current.get(remoteId);

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = e => {
      if (e.candidate) socketRef.current.emit('webrtc:candidate', { to: remoteId, candidate: e.candidate });
    };

    pc.ondatachannel = e => setupDataChannel(remoteId, e.channel);

    pc.onnegotiationneeded = async () => {
      // Only renegotiate when the signaling state is stable to avoid m-line order conflicts
      if (pc.signalingState !== 'stable' || makingOffersRef.current.get(remoteId)) {
        console.log(`[WebRTC] Skipping negotiation for ${remoteId} (state: ${pc.signalingState})`);
        return;
      }
      try {
        console.log(`[WebRTC] Negotiation needed for ${remoteId}`);
        makingOffersRef.current.set(remoteId, true);
        const offer = await pc.createOffer();
        if (pc.signalingState !== 'stable') {
          // State changed while we were creating the offer — abort
          makingOffersRef.current.set(remoteId, false);
          return;
        }
        await pc.setLocalDescription(offer);
        makingOffersRef.current.set(remoteId, false);
        socketRef.current.emit('webrtc:offer', { to: remoteId, sdp: offer });
      } catch (err) {
        makingOffersRef.current.set(remoteId, false);
        console.error(`[WebRTC] Renegotiation error for peer ${remoteId}:`, err);
      }
    };

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
        if (dc.readyState !== 'open') {
          console.warn(`[WebRTC] Channel to ${peerId} not open (state: ${dc.readyState})`);
          return;
        }

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
          if (dc.readyState !== 'open') throw new Error('Channel closed during transfer');
          dc.send(chunk);
          offset += chunk.byteLength;
        }
        dc.send(JSON.stringify({ type: 'done', id: fileId }));
        webrtcSentCount++;
        console.log(`[WebRTC] Sent photo index ${index} to ${peerId.slice(0,8)}`);
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
  }, []);

  const sendLiveFramesToPeer = useCallback(async (shotIndex, blobs) => {
    if (!blobs || blobs.length === 0) return;
    
    if (socketOnlyRef.current) {
      return;
    }

    for (let f = 0; f < blobs.length; f++) {
      const blob = blobs[f];
      const buffer = await blob.arrayBuffer();
      const fileId = `live-${shotIndex}-${f}-${crypto.randomUUID ? crypto.randomUUID() : Math.random()}`;

      const sendPromises = Array.from(dcsRef.current.entries()).map(async ([peerId, dc]) => {
        if (dc.readyState !== 'open') return;
        try {
          dc.send(JSON.stringify({
            type: 'live-meta',
            id: fileId,
            size: blob.size,
            mime: blob.type,
            shotIndex,
            frameIndex: f
          }));

          let offset = 0;
          const chunkSize = 16384; // 16KB chunks
          while (offset < buffer.byteLength) {
            const chunk = buffer.slice(offset, offset + chunkSize);
            while (dc.bufferedAmount > 10 * 1024 * 1024) {
              await new Promise(r => setTimeout(r, 50));
            }
            if (dc.readyState !== 'open') throw new Error('Channel closed during transfer');
            dc.send(chunk);
            offset += chunk.byteLength;
          }
          dc.send(JSON.stringify({ type: 'live-done', id: fileId }));
        } catch (err) {
          console.warn(`[WebRTC] Failed to send live frame ${f} to ${peerId}`, err);
        }
      });
      await Promise.all(sendPromises);
    }
    console.log(`[WebRTC] Finished sending all ${blobs.length} live frames for shot ${shotIndex}`);
  }, []);

  const enableSocketFallback = useCallback((reason) => {
    socketOnlyRef.current = true;
    setStatus(`Socket fallback: ${reason}`);
    pcsRef.current.forEach(pc => pc.close());
    pcsRef.current.clear();
    dcsRef.current.clear();

    if (typeof onEnableSocketFallbackRef.current === 'function') {
      onEnableSocketFallbackRef.current(reason);
    }
  }, [setStatus]);

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
      if (descriptionHasMediaSections(sdp)) {
        console.warn(`[WebRTC] Ignoring legacy media offer from ${from}; media now uses LiveKit only.`);
        closePeerConnection(from);
        return;
      }

      resetPeerConnectionIfMediaShapeMismatches(from, { remoteDescription: sdp });
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
  }, [closePeerConnection, getOrCreatePC, socketRef, processCandidatesQueue, resetPeerConnectionIfMediaShapeMismatches]);

  const handleAnswer = useCallback(async ({ sdp, from }) => {
    try {
      if (descriptionHasMediaSections(sdp)) {
        console.warn(`[WebRTC] Ignoring legacy media answer from ${from}; media now uses LiveKit only.`);
        closePeerConnection(from);
        return;
      }

      const pc = pcsRef.current.get(from);
      if (pc && !ignoreOffersRef.current.get(from)) {
        if (pc.signalingState === 'stable') return;
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await processCandidatesQueue(from);
      }
    } catch (err) {
      console.error(`Error handling answer from ${from}:`, err);
    }
  }, [closePeerConnection, processCandidatesQueue]);

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
      resetPeerConnectionIfMediaShapeMismatches(peer.id, { dataOnly: true });
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
    sendLiveFramesToPeer,
    enableSocketFallback
  };
}
