// server/index.js (Bootstrapper)
const path = require('path');

// Redirect to src/index.js logic
// This preserves the "npm start" -> "node index.js" behavior
// while keeping the actual logic in src/

const { server, PORT } = require('./src/index');

server.listen(PORT, () => {
    console.log(`🚀 Signaling server running on port ${PORT} (Bootstrapped via src)`);
});
