import { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { io } from '../../lib/SocketAdapter';

export default function useRoom({
  serverUrl,
  socketOnly,
  step,
  setStep,
  onLocationUpdate,
  onPartnerPause,
  onPartnerResume
}) {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [selfId, setSelfId] = useState('');
  const [status, setStatus] = useState('Disconnected');
  const [roomCode, setRoomCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showToast, setShowToast] = useState(false);
  const stepRef = useRef(step);
  const onLocationUpdateRef = useRef(onLocationUpdate);
  const onPartnerPauseRef = useRef(onPartnerPause);
  const onPartnerResumeRef = useRef(onPartnerResume);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    onLocationUpdateRef.current = onLocationUpdate;
  }, [onLocationUpdate]);

  useEffect(() => {
    onPartnerPauseRef.current = onPartnerPause;
  }, [onPartnerPause]);

  useEffect(() => {
    onPartnerResumeRef.current = onPartnerResume;
  }, [onPartnerResume]);

  useEffect(() => {
    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    socketRef.current = socket;
    setSocket(socket);

    if (socketOnly) {
      setStatus('Socket-only ready');
    }

    socket.on('connect', () => {
      setStatus('Connected');
      setSelfId(socket.id || '');
    });

    socket.on('connect_error', (error) => {
      setStatus('Connection Error: ' + error.message);
    });

    socket.on('room:error', (error) => {
      Swal.fire({
        icon: 'error',
        title: 'Oops!',
        text: 'Sooryy room is fulll :( maybe try another one?',
        confirmButtonColor: '#9b87f5'
      });
      setStatus('Room Error: ' + error.message);
      setStep('join');
    });

    socket.on('disconnect', (reason) => {
      setStatus('Disconnected: ' + reason);
    });

    socket.on('room:joined', ({ participants: joined }) => {
      setParticipants(joined || []);

      if (typeof onPartnerPauseRef.current === 'function' && joined?.length < 2 && (stepRef.current === 'countdown' || stepRef.current === 'processing')) {
        onPartnerPauseRef.current();
      } else if (typeof onPartnerResumeRef.current === 'function' && joined?.length >= 2) {
        onPartnerResumeRef.current();
      }
    });

    socket.on('location:update', (payload) => {
      if (typeof onLocationUpdateRef.current === 'function') {
        onLocationUpdateRef.current(payload);
      }
    });

    return () => {
      socket.off('room:joined');
      socket.off('room:error');
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.off('location:update');
      socket.disconnect();
    };
  }, [serverUrl]);

  const joinRoom = () => {
    if (!displayName || !displayName.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Oops...',
        text: 'Please enter your name!',
        confirmButtonColor: '#9b87f5'
      });
      return false;
    }
    if (!roomCode) return false;

    const newUrl = `${window.location.origin}${window.location.pathname}?code=${roomCode}`;
    window.history.pushState({ path: newUrl }, '', newUrl);

    socketRef.current.emit('room:join', { code: roomCode, displayName });
    setStep('room');
    return true;
  };

  const leaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.emit('room:leave');
    }

    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.pushState({ path: baseUrl }, '', baseUrl);
  };

  const emitLayout = (layout) => {
    socketRef.current.emit('session:layout', layout);
  };

  const emitSessionStart = (layout) => {
    socketRef.current.emit('session:start', { layout });
  };

  const generateRoomCode = (uuidv4) => {
    const code = uuidv4().split('-')[0].toUpperCase();
    setRoomCode(code);
    try {
      if (navigator?.clipboard) navigator.clipboard.writeText(code);
    } catch {
      // ignore
    }
  };

  const copyRoomCode = async () => {
    if (!roomCode) return;
    try {
      const url = `${window.location.origin}?code=${roomCode}`;
      const textToCopy = `Join my LDR Photobooth!\nRoom Code: ${roomCode}\nLink: ${url}`;
      await navigator.clipboard.writeText(textToCopy);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch {
      // ignore
    }
  };

  const requestAndSendLocation = async () => {
    try {
      if (!navigator?.geolocation) return;
      if (!socketRef.current?.id) return;

      const reverseGeocode = async (lat, lng) => {
        try {
          const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&localityLanguage=en`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            const city = (data.city || data.locality || data.principalSubdivision || '').toString().trim();
            const country = (data.countryName || '').toString().trim();
            if (city || country) return { city: city || undefined, country: country || undefined };
          }
        } catch {
          // ignore
        }

        try {
          const url = `https://geocode.maps.co/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            const addr = data?.address || {};
            const city = (addr.city || addr.town || addr.village || addr.county || addr.state || '').toString().trim();
            const country = (addr.country || '').toString().trim();
            if (city || country) return { city: city || undefined, country: country || undefined };
          }
        } catch {
          // ignore
        }

        return { city: undefined, country: undefined };
      };

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos?.coords?.latitude);
          const lng = Number(pos?.coords?.longitude);
          const accuracy = Number(pos?.coords?.accuracy);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

          (async () => {
            const { city, country } = await reverseGeocode(lat, lng);
            socketRef.current.emit('location:update', { lat, lng, accuracy, city, country });
          })();
        },
        () => {},
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 5 * 60 * 1000
        }
      );
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    if (codeParam) {
      setRoomCode(codeParam.toUpperCase());
    }
  }, []);

  return {
    socket,
    socketRef,
    participants,
    setParticipants,
    selfId,
    status,
    setStatus,
    roomCode,
    setRoomCode,
    displayName,
    setDisplayName,
    showToast,
    joinRoom,
    leaveRoom,
    emitLayout,
    emitSessionStart,
    generateRoomCode,
    copyRoomCode,
    requestAndSendLocation
  };
}
