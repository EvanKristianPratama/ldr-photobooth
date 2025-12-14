// server/src/store/RoomStore.js

/**
 * In-Memory Store for Room Data
 * Responsibility: ONLY CRUD operations on data. No business logic.
 */
class RoomStore {
    constructor() {
        this.rooms = new Map();
    }

    /**
     * Get a room by code
     * @param {string} code 
     * @returns {Object|undefined}
     */
    getRoom(code) {
        return this.rooms.get(code);
    }

    /**
     * Create or overwrite a room
     * @param {string} code 
     * @param {Object} data 
     */
    saveRoom(code, data) {
        this.rooms.set(code, data);
        return this.rooms.get(code);
    }

    /**
     * Delete a room
     * @param {string} code 
     */
    deleteRoom(code) {
        return this.rooms.delete(code);
    }

    /**
     * Get all rooms (debug purpose)
     */
    getAll() {
        return Object.fromEntries(this.rooms);
    }
}

// Singleton instance
module.exports = new RoomStore();
