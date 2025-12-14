// server/src/index.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const { PORT, SOCKET_OPTIONS } = require('./config/constants');
const registerSocketHandlers = require('./sockets');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, SOCKET_OPTIONS);

// Initialize Socket Handlers
registerSocketHandlers(io);

// Export server for testing or direct running
module.exports = { server, PORT };

// Only listen if strict main execution (prevents testing side effects)
if (require.main === module) {
    server.listen(PORT, () => {
        console.log(`Server structure running on port ${PORT}`);
    });
}
