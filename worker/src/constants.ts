export const MAX_FREE_PARTICIPANTS = 4 as const;

export const ROOM_STATES = {
  IDLE: 'IDLE',
  SESSION: 'SESSION'
} as const;

export type RoomState = (typeof ROOM_STATES)[keyof typeof ROOM_STATES];

export const EVENTS = {
  ROOM: {
    JOIN: 'room:join',
    JOINED: 'room:joined',
    READY: 'room:ready',
    ERROR: 'room:error',
    LEAVE: 'room:leave',
    STATE: 'room:state',
    GROUP_SIZE: 'room:group-size'
  },
  SESSION: {
    START: 'session:start',
    LAYOUT: 'session:layout',
    RESET: 'session:reset',
    LIVE_VC: 'session:live-vc',
    LIVE_CAPTURE: 'session:live-capture'
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
} as const;
