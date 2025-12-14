const roomService = require('../src/services/RoomService');
const roomStore = require('../src/store/RoomStore');
const { ROOM_STATES } = require('../src/config/constants');

describe('RoomService (Business Logic)', () => {

    beforeEach(() => {
        // Reset store before each test
        roomStore.rooms = new Map();
    });

    test('should create a new room when joining non-existent room', () => {
        const result = roomService.joinRoom('ROOM123', { id: 'socket1', displayName: 'User A' });

        expect(result.success).toBe(true);
        expect(result.room.code).toBe('ROOM123');
        expect(result.room.participants).toHaveLength(1);
        expect(result.room.state).toBe(ROOM_STATES.IDLE);
    });

    test('should allow second user to join', () => {
        roomService.joinRoom('ROOM123', { id: 'socket1', displayName: 'User A' });
        const result = roomService.joinRoom('ROOM123', { id: 'socket2', displayName: 'User B' });

        expect(result.success).toBe(true);
        expect(result.room.participants).toHaveLength(2);
    });

    test('should reject third user (Max Capacity)', () => {
        roomService.joinRoom('ROOM123', { id: 'socket1', displayName: 'User A' });
        roomService.joinRoom('ROOM123', { id: 'socket2', displayName: 'User B' });

        const result = roomService.joinRoom('ROOM123', { id: 'socket3', displayName: 'User C' });

        expect(result.success).toBe(false);
        expect(result.error).toMatch(/full/);
    });

    test('should not add duplicate user', () => {
        roomService.joinRoom('ROOM123', { id: 'socket1', displayName: 'User A' });
        const result = roomService.joinRoom('ROOM123', { id: 'socket1', displayName: 'User A' });

        expect(result.success).toBe(true);
        expect(result.room.participants).toHaveLength(1); // Still 1
    });

    test('should handle user leaving', () => {
        roomService.joinRoom('ROOM123', { id: 'socket1', displayName: 'User A' });
        roomService.joinRoom('ROOM123', { id: 'socket2', displayName: 'User B' });

        const result = roomService.leaveRoom('ROOM123', 'socket1');

        expect(result.deleted).toBe(false);
        expect(result.room.participants).toHaveLength(1);
        expect(result.room.participants[0].displayName).toBe('User B');
    });

    test('should delete room when last user leaves', () => {
        roomService.joinRoom('ROOM123', { id: 'socket1', displayName: 'User A' });
        const result = roomService.leaveRoom('ROOM123', 'socket1');

        expect(result.deleted).toBe(true);
        expect(roomStore.getRoom('ROOM123')).toBeUndefined();
    });

    test('should start session only if IDLE', () => {
        roomService.joinRoom('ROOM123', { id: 's1', displayName: 'A' });

        const startRes = roomService.startSession('ROOM123', 'layout1');
        expect(startRes.success).toBe(true);
        expect(roomStore.getRoom('ROOM123').state).toBe(ROOM_STATES.SESSION);

        // Try start again
        const failRes = roomService.startSession('ROOM123', 'layout2');
        expect(failRes.success).toBe(false);
    });
});
