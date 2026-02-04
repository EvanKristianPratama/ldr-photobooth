// worker/src/engine/RoomEngine.js

import { ROOM_STATES } from '../constants.js';

/**
 * Pure logic class for room management.
 * Portable and testable without transport layer.
 */
export class RoomEngine {
    constructor() {
        this.participants = new Map(); // id -> { displayName }
        this.state = ROOM_STATES.IDLE;
        this.layout = null;
    }

    /**
     * Add participant to room
     * @param {string} id - Session ID
     * @param {string} displayName - User display name
     * @returns {boolean} Success
     */
    join(id, displayName) {
        this.participants.set(id, { displayName });
        return true;
    }

    /**
     * Remove participant from room
     * @param {string} id - Session ID
     */
    leave(id) {
        this.participants.delete(id);
        // Reset state if less than 2 participants
        if (this.participants.size < 2) {
            this.state = ROOM_STATES.IDLE;
            this.layout = null;
        }
    }

    /**
     * Check if participant exists
     * @param {string} id - Session ID
     * @returns {boolean}
     */
    hasParticipant(id) {
        return this.participants.has(id);
    }

    /**
     * Get participant count
     * @returns {number}
     */
    getParticipantCount() {
        return this.participants.size;
    }

    /**
     * Start a session with given layout
     * @param {string} layout - Layout type
     * @returns {boolean} Success
     */
    startSession(layout) {
        if (this.state !== ROOM_STATES.IDLE) return false;
        this.state = ROOM_STATES.SESSION;
        this.layout = layout;
        return true;
    }

    /**
     * Update layout (only in IDLE state)
     * @param {string} layout - Layout type
     * @returns {boolean} Success
     */
    updateLayout(layout) {
        if (this.state !== ROOM_STATES.IDLE) return false;
        this.layout = layout;
        return true;
    }

    /**
     * Reset session to IDLE
     * @returns {boolean} Success
     */
    resetSession() {
        this.state = ROOM_STATES.IDLE;
        this.layout = null;
        return true;
    }

    /**
     * Get current state snapshot
     * @returns {Object}
     */
    getState() {
        return {
            participants: [...this.participants.entries()].map(([id, p]) => ({ id, ...p })),
            state: this.state,
            layout: this.layout
        };
    }
}
