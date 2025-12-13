const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for now (can restrict later)
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true // Support older clients
});

// Store room state: { [roomCode]: { participants: [] } }
const rooms = {};

io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);
    console.log('📊 Total connections:', io.engine.clientsCount);

    socket.on('room:join', ({ code, displayName }) => {
        console.log(`🚪 Join request: ${displayName} → Room ${code}`);

        if (rooms[code]?.participants.length >= 2) {
            socket.emit('room:error', { message: 'Room is full (max 2 participants)' });
            console.log(`⚠️ Join rejected: ${displayName} -> Room ${code} is full`);
            return;
        }

        socket.join(code);

        if (!rooms[code]) {
            rooms[code] = {
                participants: [],
                state: 'IDLE', // IDLE, SESSION
                layout: null
            };
        }

        // Add participant
        const participant = { id: socket.id, displayName };
        rooms[code].participants.push(participant);

        console.log(`✅ ${displayName} (${socket.id}) joined room ${code}`);
        console.log(`👥 Room ${code} now has ${rooms[code].participants.length} participants:`,
            rooms[code].participants.map(p => p.displayName).join(', '));

        // Notify room
        io.to(code).emit('room:joined', { participants: rooms[code].participants });

        // Check readiness (2 participants)
        if (rooms[code].participants.length >= 2) {
            console.log(`🎉 Room ${code} is ready!`);
            io.to(code).emit('room:ready', { ready: true });
        }
    });

    // Relay Signaling
    socket.on('webrtc:offer', (data) => {
        // data: { to, sdp }
        console.log(`Relaying offer from ${socket.id} to ${data.to}`);
        socket.to(data.to).emit('webrtc:offer', {
            sdp: data.sdp,
            from: socket.id
        });
    });

    socket.on('webrtc:answer', (data) => {
        console.log(`Relaying answer from ${socket.id} to ${data.to}`);
        socket.to(data.to).emit('webrtc:answer', {
            sdp: data.sdp,
            from: socket.id
        });
    });

    socket.on('webrtc:candidate', (data) => {
        console.log(`Relaying candidate from ${socket.id} to ${data.to}`);
        socket.to(data.to).emit('webrtc:candidate', {
            candidate: data.candidate,
            from: socket.id
        });
    });

    // Photo Metadata Broadcast
    socket.on('photo:meta', (data) => {
        // Broadcast to room (excluding sender)
        // Find room of socket
        const roomCode = Object.keys(rooms).find(code =>
            rooms[code].participants.find(p => p.id === socket.id)
        );

        if (roomCode) {
            console.log(`Photo meta in room ${roomCode}:`, data.filename);
            socket.to(roomCode).emit('photo:meta', data);
        }
    });

    // Photo relay via Socket.IO (fallback when not using WebRTC)
    socket.on('photo:send', (payload) => {
        const roomCode = Object.keys(rooms).find(code =>
            rooms[code].participants.find(p => p.id === socket.id)
        );

        if (!roomCode) return;

        const forward = {
            ...payload,
            from: socket.id
        };

        console.log(`Relaying photo index ${payload?.index ?? '?'} in room ${roomCode}`);
        socket.to(roomCode).emit('photo:receive', forward);
    });

    // Location relay (coordinates only)
    socket.on('location:update', (payload) => {
        const roomCode = Object.keys(rooms).find(code =>
            rooms[code].participants.find(p => p.id === socket.id)
        );
        if (!roomCode) return;

        const lat = payload?.lat;
        const lng = payload?.lng;
        const accuracy = payload?.accuracy;
        const city = payload?.city;
        const country = payload?.country;

        if (typeof lat !== 'number' || typeof lng !== 'number') return;

        io.to(roomCode).emit('location:update', {
            from: socket.id,
            lat,
            lng,
            accuracy,
            city: typeof city === 'string' ? city : undefined,
            country: typeof country === 'string' ? country : undefined
        });
    });

    // Session Synchronization (LDR Booth)
    socket.on('session:start', (data) => {
        // data might contain settings, countdown duration etc.
        const roomCode = Object.keys(rooms).find(code =>
            rooms[code].participants.find(p => p.id === socket.id)
        );
        if (roomCode) {
            const room = rooms[roomCode];
            if (room.state !== 'IDLE') {
                console.log(`⚠️ Session start ignored in room ${roomCode} (State: ${room.state})`);
                return;
            }

            console.log(`Session start in room ${roomCode}`);
            room.state = 'SESSION';

            // Broadcast to everyone in room including sender
            io.to(roomCode).emit('session:start', {
                startTime: Date.now() + 1000,
                layout: data.layout
            });
        }
    });

    socket.on('session:layout', (input) => {
        const roomCode = Object.keys(rooms).find(code =>
            rooms[code].participants.find(p => p.id === socket.id)
        );
        if (roomCode) {
            const room = rooms[roomCode];
            // Only allow layout changes in IDLE state
            if (room.state !== 'IDLE') {
                return;
            }

            room.layout = input;
            // Broadcast to others (or all) to update UI state
            io.to(roomCode).emit('session:layout', input);
        }
    });

    socket.on('session:reset', () => {
        const roomCode = Object.keys(rooms).find(code =>
            rooms[code].participants.find(p => p.id === socket.id)
        );
        if (roomCode) {
            rooms[roomCode].state = 'IDLE';
            rooms[roomCode].layout = null;
            io.to(roomCode).emit('session:reset');
        }
    });

    // Transfer Confirmation
    socket.on('photo:transfer-complete', (data) => {
        const roomCode = Object.keys(rooms).find(code =>
            rooms[code].participants.find(p => p.id === socket.id)
        );
        if (roomCode) {
            console.log(`Photo transfer complete in room ${roomCode}`);
            socket.to(roomCode).emit('photo:transferred', data);
        }
    });

    // Cleanup on disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        for (const code in rooms) {
            const idx = rooms[code].participants.findIndex(p => p.id === socket.id);
            if (idx !== -1) {
                rooms[code].participants.splice(idx, 1);
                io.to(code).emit('room:joined', { participants: rooms[code].participants });
                // Optional: emit room:not-ready if drops below 2
                if (rooms[code].participants.length < 2) {
                    // Logic handled by client (peer disconnected)
                }
                if (rooms[code].participants.length === 0) {
                    delete rooms[code];
                }
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}`);
});
