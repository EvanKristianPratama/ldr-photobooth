const { createServer } = require("http");
const { Server } = require("socket.io");
const Client = require("socket.io-client");
const registerSocketHandlers = require("../src/sockets");
const { EVENTS } = require("../src/config/constants");
const roomStore = require("../src/store/RoomStore");

describe("Socket Integration Tests", () => {
    let io, server, clientSocket, clientSocket2;

    beforeAll((done) => {
        server = createServer();
        io = new Server(server);
        registerSocketHandlers(io);

        server.listen(() => {
            const port = server.address().port;
            clientSocket = new Client(`http://localhost:${port}`);
            clientSocket2 = new Client(`http://localhost:${port}`);

            let connectedCount = 0;
            const onConnect = () => {
                connectedCount++;
                if (connectedCount === 2) done();
            };

            clientSocket.on("connect", onConnect);
            clientSocket2.on("connect", onConnect);
        });
    });

    afterAll(() => {
        io.close();
        clientSocket.close();
        clientSocket2.close();
        server.close();
    });

    beforeEach(() => {
        // Reset store
        roomStore.rooms = new Map();
    });

    test("should allow two users to join a room and become ready", (done) => {
        const roomCode = "TESTROOM";

        // User 1 joins
        clientSocket.emit(EVENTS.ROOM.JOIN, { code: roomCode, displayName: "User1" });

        // User 2 joins
        clientSocket2.emit(EVENTS.ROOM.JOIN, { code: roomCode, displayName: "User2" });

        let readyReceived = 0;
        const checkDone = () => {
            readyReceived++;
            if (readyReceived === 2) done();
        };

        clientSocket.on(EVENTS.ROOM.READY, (data) => {
            expect(data.ready).toBe(true);
            checkDone();
        });

        clientSocket2.on(EVENTS.ROOM.READY, (data) => {
            expect(data.ready).toBe(true);
            checkDone();
        });
    });

    test("should relay signalling data (WebRTC)", (done) => {
        // Set up listeners first
        clientSocket2.on(EVENTS.WEBRTC.OFFER, (data) => {
            expect(data.sdp).toBe("dummy-sdp");
            expect(data.from).toBe(clientSocket.id);
            done();
        });

        // Send offer from Client 1 to Client 2
        clientSocket.emit(EVENTS.WEBRTC.OFFER, {
            to: clientSocket2.id,
            sdp: "dummy-sdp"
        });
    });

    test("should relay session start event", (done) => {
        const roomCode = "SESSIONROOM";

        // Join both
        clientSocket.emit(EVENTS.ROOM.JOIN, { code: roomCode, displayName: "U1" });
        clientSocket2.emit(EVENTS.ROOM.JOIN, { code: roomCode, displayName: "U2" });

        // Wait for join logic to settle
        setTimeout(() => {
            // Listen for start
            clientSocket2.on(EVENTS.SESSION.START, (data) => {
                expect(data.layout).toBe("grid-2x2");
                done();
            });

            // Trigger start from Client 1
            clientSocket.emit(EVENTS.SESSION.START, { layout: "grid-2x2" });
        }, 50);
    });
});
