// server/src/config/constants.js

// --- Server Configuration ---
const PORT = process.env.PORT || 3000;

// --- Room Logic Constants ---
const MAX_PARTICIPANTS = 2;
const ROOM_STATES = {
    IDLE: 'IDLE',
    SESSION: 'SESSION'
};

// --- Socket.IO Configuration ---
const SOCKET_OPTIONS = {
    cors: {
        origin: "*", // Allow all (restrict in production)
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
};

// --- Event Names ---
const EVENTS = {
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',
    ROOM: {
        JOIN: 'room:join',
        JOINED: 'room:joined',
        READY: 'room:ready',
        ERROR: 'room:error'
    },
    SESSION: {
        START: 'session:start',
        LAYOUT: 'session:layout',
        RESET: 'session:reset'
    },
    WEBRTC: {
        OFFER: 'webrtc:offer',
        ANSWER: 'webrtc:answer',
        CANDIDATE: 'webrtc:candidate'
    },
    PHOTO: {
        SEND: 'photo:send',
        RECEIVE: 'photo:receive',
        META: 'photo:meta',
        TRANSFER_COMPLETE: 'photo:transfer-complete',
        TRANSFERRED: 'photo:transferred'
    },
    LOCATION: {
        UPDATE: 'location:update'
    }
};

module.exports = {
    PORT,
    MAX_PARTICIPANTS,
    ROOM_STATES,
    SOCKET_OPTIONS,
    EVENTS
};
