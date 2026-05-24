'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';

const VC_TRACK_NAME = 'ldr-live-vc';

const buildRemoteStream = (track) => {
  if (!track?.mediaStreamTrack) return null;
  return new MediaStream([track.mediaStreamTrack]);
};

export default function useLiveKit({
  serverUrl,
  roomName,
  participantIdentity,
  participantName,
  setStatus
}) {
  const roomRef = useRef(null);
  const publishedTrackRef = useRef(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const disconnect = useCallback(async () => {
    const room = roomRef.current;
    const publishedTrack = publishedTrackRef.current;

    if (room && publishedTrack) {
      try {
        await room.localParticipant.unpublishTrack(publishedTrack);
      } catch (err) {
        console.warn('[LiveKit] Failed to unpublish local track:', err);
      }
    }

    publishedTrackRef.current = null;
    setRemoteStream(null);

    if (room) {
      try {
        room.disconnect();
      } catch (err) {
        console.warn('[LiveKit] Failed to disconnect room:', err);
      }
      roomRef.current = null;
    }
  }, []);

  const ensureConnectedRoom = useCallback(async () => {
    if (!serverUrl) {
      throw new Error('API server URL is missing');
    }

    if (!roomName || !participantIdentity) {
      throw new Error('Missing room or participant identity for LiveKit');
    }

    if (roomRef.current) {
      return roomRef.current;
    }

    const response = await fetch(`${serverUrl}/api/livekit/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        room_name: roomName,
        participant_identity: participantIdentity,
        participant_name: participantName || participantIdentity
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.error || 'Failed to create LiveKit token');
    }

    const room = new Room({
      adaptiveStream: true,
      dynacast: true
    });

    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (participant.identity === participantIdentity || track.kind !== 'video') return;

      console.log(`[LiveKit] Remote video subscribed from ${participant.identity}`);
      setRemoteStream(buildRemoteStream(track));
    });

    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (track.kind !== 'video') return;
      setRemoteStream(null);
    });

    room.on(RoomEvent.ParticipantDisconnected, () => {
      setRemoteStream(null);
    });

    room.on(RoomEvent.Disconnected, () => {
      setRemoteStream(null);
      roomRef.current = null;
      publishedTrackRef.current = null;
    });

    await room.connect(payload.server_url, payload.participant_token, {
      autoSubscribe: true
    });

    roomRef.current = room;
    setStatus?.(`Live VC ready: ${roomName}`);
    return room;
  }, [participantIdentity, participantName, roomName, serverUrl, setStatus]);

  const syncLocalStream = useCallback(async (stream) => {
    if (!stream) {
      await disconnect();
      return;
    }

    const nextTrack = stream.getVideoTracks?.()[0] || null;
    if (!nextTrack) {
      throw new Error('No video track available for LiveKit');
    }

    const room = await ensureConnectedRoom();
    const publishedTrack = publishedTrackRef.current;

    if (publishedTrack && publishedTrack.id === nextTrack.id) {
      return;
    }

    if (publishedTrack) {
      try {
        await room.localParticipant.unpublishTrack(publishedTrack);
      } catch (err) {
        console.warn('[LiveKit] Failed to swap local track:', err);
      }
    }

    await room.localParticipant.publishTrack(nextTrack, {
      name: VC_TRACK_NAME,
      source: Track.Source.Camera,
      simulcast: false
    });

    publishedTrackRef.current = nextTrack;
  }, [disconnect, ensureConnectedRoom]);

  useEffect(() => {
    return () => {
      void disconnect();
    };
  }, [disconnect]);

  return {
    remoteStream,
    syncLocalStream,
    disconnect
  };
}
