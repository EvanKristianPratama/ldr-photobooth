// server/src/sockets/index.js
const { EVENTS } = require('../config/constants');
const controller = require('./controllers');

module.exports = (io) => {
    io.on(EVENTS.CONNECTION, (socket) => {
        console.log('✅ User connected:', socket.id);

        // Room
        socket.on(EVENTS.ROOM.JOIN, (data) => controller.handleJoin(io, socket, data));
        socket.on(EVENTS.ROOM.LEAVE, () => controller.handleLeave(io, socket));
        socket.on(EVENTS.DISCONNECT, () => controller.handleDisconnect(io, socket));

        // Session
        socket.on(EVENTS.SESSION.START, (data) => controller.handleSessionStart(io, socket, data));
        socket.on(EVENTS.SESSION.LAYOUT, (data) => controller.handleSessionLayout(io, socket, data));
        socket.on(EVENTS.SESSION.RESET, () => controller.handleSessionReset(io, socket));

        // WebRTC
        socket.on(EVENTS.WEBRTC.OFFER, (data) => controller.handleWebRTC(socket, 'offer', data));
        socket.on(EVENTS.WEBRTC.ANSWER, (data) => controller.handleWebRTC(socket, 'answer', data));
        socket.on(EVENTS.WEBRTC.CANDIDATE, (data) => controller.handleWebRTC(socket, 'candidate', data));

        // Photo
        socket.on(EVENTS.PHOTO.SEND, (data) => controller.handlePhotoSend(socket, data));
        socket.on(EVENTS.PHOTO.META, (data) => controller.handleGenericRelay(socket, EVENTS.PHOTO.META, data));
        socket.on(EVENTS.PHOTO.TRANSFER_COMPLETE, (data) => controller.handleGenericRelay(socket, EVENTS.PHOTO.TRANSFERRED, data));

        // Location
        socket.on(EVENTS.LOCATION.UPDATE, (data) => controller.handleLocation(io, socket, data));
    });
};
