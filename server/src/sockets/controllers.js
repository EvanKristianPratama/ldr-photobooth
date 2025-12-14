// server/src/sockets/controllers.js
const roomService = require('../services/RoomService');
const { EVENTS, MAX_PARTICIPANTS } = require('../config/constants');

/**
 * Socket Controller
 * Responsibility: Handle incoming events, parse data, call service, emit response.
 */

// Helper to relay data to others provided 'to' or 'roomCode'
const relayToPeer = (socket, data, event) => {
    // WebRTC signaling usually has 'to' (target socket id)
    if (data.to) {
        console.log(`Relaying ${event} from ${socket.id} to ${data.to}`);
        socket.to(data.to).emit(event, {
            ...data,
            from: socket.id
        });
    }
};

const relayToRoom = (socket, roomCode, event, payload) => {
    if (roomCode) {
        socket.to(roomCode).emit(event, payload);
    }
};

module.exports = {

    handleJoin: (io, socket, { code, displayName }) => {
        console.log(`🚪 Join request: ${displayName} → Room ${code}`);

        const { success, room, error } = roomService.joinRoom(code, { id: socket.id, displayName });

        if (!success) {
            socket.emit(EVENTS.ROOM.ERROR, { message: error });
            console.log(`⚠️ Join rejected: ${error}`);
            return;
        }

        // Attach room code to socket for easy lookup later
        socket.join(code);
        socket.data.roomCode = code;

        console.log(`✅ ${displayName} (${socket.id}) joined room ${code}`);

        // Notify everyone
        io.to(code).emit(EVENTS.ROOM.JOINED, { participants: room.participants });

        // Check Ready
        if (room.participants.length >= MAX_PARTICIPANTS) {
            console.log(`🎉 Room ${code} is ready!`);
            io.to(code).emit(EVENTS.ROOM.READY, { ready: true });
        }
    },

    handleDisconnect: (io, socket) => {
        console.log('User disconnected:', socket.id);
        const code = socket.data.roomCode;
        if (code) {
            const result = roomService.leaveRoom(code, socket.id);
            // If room still exists, notify others
            if (result && !result.deleted) {
                io.to(code).emit(EVENTS.ROOM.JOINED, { participants: result.room.participants });
            }
        }
    },

    handleSessionStart: (io, socket, data) => {
        const code = socket.data.roomCode;
        const result = roomService.startSession(code, data?.layout);

        if (result && result.success) {
            console.log(`Session start in room ${code}`);
            io.to(code).emit(EVENTS.SESSION.START, {
                startTime: Date.now() + 1000,
                layout: data.layout
            });
        }
    },

    handleSessionLayout: (io, socket, layout) => {
        const code = socket.data.roomCode;
        if (roomService.updateLayout(code, layout)) {
            io.to(code).emit(EVENTS.SESSION.LAYOUT, layout);
        }
    },

    handleSessionReset: (io, socket) => {
        const code = socket.data.roomCode;
        if (roomService.resetSession(code)) {
            io.to(code).emit(EVENTS.SESSION.RESET);
        }
    },

    // --- WebRTC Relays ---
    handleWebRTC: (socket, type, data) => {
        // type is 'offer', 'answer', 'candidate'
        relayToPeer(socket, data, `webrtc:${type}`);
    },

    // --- Data Relays ---
    handlePhotoSend: (socket, payload) => {
        const code = socket.data.roomCode;
        if (code) {
            console.log(`Relaying photo index ${payload?.index} in room ${code}`);
            relayToRoom(socket, code, EVENTS.PHOTO.RECEIVE, { ...payload, from: socket.id });
        }
    },

    handleLocation: (io, socket, payload) => {
        const code = socket.data.roomCode;
        if (code && typeof payload?.lat === 'number') {
            io.to(code).emit(EVENTS.LOCATION.UPDATE, { from: socket.id, ...payload });
        }
    },

    // Generic passthrough for other simple relays 
    // (photo:meta, photo:transfer-complete)
    handleGenericRelay: (socket, event, data) => {
        const code = socket.data.roomCode;
        if (code) {
            relayToRoom(socket, code, event, data);
        }
    }
};
