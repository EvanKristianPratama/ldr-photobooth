// worker/src/constants.js

export const MAX_PARTICIPANTS = 2;

export const ROOM_STATES = {
    IDLE: 'IDLE',
    SESSION: 'SESSION'
};

export const EVENTS = {
    ROOM: {
        JOIN: 'room:join',
        JOINED: 'room:joined',
        READY: 'room:ready',
        ERROR: 'room:error',
        LEAVE: 'room:leave'
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
