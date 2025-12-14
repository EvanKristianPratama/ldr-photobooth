// server/src/services/RoomService.js
const roomStore = require('../store/RoomStore');
const { MAX_PARTICIPANTS, ROOM_STATES } = require('../config/constants');

/**
 * Service Layer for Room Logic
 * Responsibility: Handle business rules (validation, limits, state changes).
 */
class RoomService {

    /**
     * Attempt to join a room
     * @param {string} code 
     * @param {Object} participant { id, displayName }
     * @returns {Object} { success, room?, error? }
     */
    joinRoom(code, participant) {
        let room = roomStore.getRoom(code);

        // 1. Create if doesn't exist
        if (!room) {
            room = {
                code,
                participants: [],
                state: ROOM_STATES.IDLE,
                layout: null
            };
            roomStore.saveRoom(code, room);
        }

        // 2. Check duplicates
        const existing = room.participants.find(p => p.id === participant.id);
        if (existing) {
            return { success: true, room };
        }

        // 3. Check Capacity
        if (room.participants.length >= MAX_PARTICIPANTS) {
            return {
                success: false,
                error: `Room is full (max ${MAX_PARTICIPANTS} participants)`
            };
        }

        // 4. Add Participant
        room.participants.push(participant);
        // Save back (not strictly needed for object Ref, but good practice for store abstraction)
        roomStore.saveRoom(code, room);

        return { success: true, room };
    }

    /**
     * Handle participant disconnection
     * @param {string} code 
     * @param {string} socketId 
     * @returns {Object|null} Updated room or null if deleted
     */
    leaveRoom(code, socketId) {
        const room = roomStore.getRoom(code);
        if (!room) return null;

        // Remove participant
        room.participants = room.participants.filter(p => p.id !== socketId);

        // If empty, delete room
        if (room.participants.length === 0) {
            roomStore.deleteRoom(code);
            return { deleted: true };
        }

        roomStore.saveRoom(code, room);
        return { deleted: false, room };
    }

    /**
     * Update room state (e.g. Start Session)
     */
    startSession(code, layout) {
        const room = roomStore.getRoom(code);
        if (!room) return null;

        if (room.state !== ROOM_STATES.IDLE) {
            return { success: false, error: 'Session already active' };
        }

        room.state = ROOM_STATES.SESSION;
        // room.layout = layout; // Typically stored here if persistent
        roomStore.saveRoom(code, room);

        return { success: true };
    }

    /**
     * Update room layout
     */
    updateLayout(code, layout) {
        const room = roomStore.getRoom(code);
        if (!room || room.state !== ROOM_STATES.IDLE) return false;

        room.layout = layout;
        roomStore.saveRoom(code, room);
        return true;
    }

    resetSession(code) {
        const room = roomStore.getRoom(code);
        if (!room) return false;

        room.state = ROOM_STATES.IDLE;
        room.layout = null;
        roomStore.saveRoom(code, room);
        return true;
    }
}

module.exports = new RoomService();
