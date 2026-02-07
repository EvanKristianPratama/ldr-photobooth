// client/src/lib/SocketAdapter.js

/**
 * Socket.IO API Adapter for Native WebSocket
 * 
 * This adapter provides the same API as Socket.IO client but uses
 * native WebSocket for Cloudflare Workers compatibility.
 * 
 * Usage:
 *   import { io } from './lib/SocketAdapter';
 *   const socket = io(SERVER_URL, options);
 *   socket.on('connect', () => ...);
 *   socket.emit('room:join', { code, displayName });
 */

const RECONNECT_DELAY_BASE = 1000;
const RECONNECT_MAX_DELAY = 30000;

class SocketAdapter {
    constructor(serverUrl, options = {}) {
        this.serverUrl = serverUrl;
        this.options = {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: RECONNECT_DELAY_BASE,
            timeout: 10000,
            ...options
        };

        this.ws = null;
        this.roomCode = null;
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.isManualClose = false;
        this._id = null;
        this._connected = false;
        this._pendingEmits = []; // Queue for emits before connection

        // Data storage (like socket.data in Socket.IO)
        this.data = {};
    }

    /**
     * Get unique client ID (mimics socket.id)
     */
    get id() {
        return this._id;
    }

    /**
     * Check if connected
     */
    get connected() {
        return this._connected && this.ws?.readyState === WebSocket.OPEN;
    }

    /**
     * Connect to server (called automatically on first emit if not connected)
     * For Cloudflare Workers, we connect when joining a room with the room code.
     */
    _connect(roomCode) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }

        if (this.isConnecting) {
            return;
        }

        this.roomCode = roomCode;
        this.isConnecting = true;
        this.isManualClose = false;

        const wsUrl = this._buildWsUrl(roomCode);
        console.log('[Socket] Connecting to:', wsUrl);

        try {
            this.ws = new WebSocket(wsUrl);
            this._setupEventHandlers();
        } catch (err) {
            console.error('[Socket] Connection error:', err);
            this.isConnecting = false;
            this._emit('connect_error', { message: err.message });
            this._scheduleReconnect();
        }
    }

    /**
     * Build WebSocket URL
     */
    _buildWsUrl(roomCode) {
        const url = new URL(this.serverUrl);
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        url.pathname = '/ws';
        url.searchParams.set('room', roomCode);
        return url.toString();
    }

    /**
     * Setup WebSocket event handlers
     */
    _setupEventHandlers() {
        this.ws.onopen = () => {
            console.log('[Socket] Connected');
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            this._connected = true;

            // Generate unique client ID
            this._id = this._generateId();

            this._emit('connect');

            // Process pending emits
            while (this._pendingEmits.length > 0) {
                const { event, data } = this._pendingEmits.shift();
                this._send(event, data);
            }
        };

        this.ws.onclose = (event) => {
            console.log('[Socket] Disconnected:', event.code, event.reason);
            this.isConnecting = false;
            this._connected = false;
            this._emit('disconnect', event.reason || 'Connection closed');

            if (!this.isManualClose && this.options.reconnection) {
                this._scheduleReconnect();
            }
        };

        this.ws.onerror = (error) => {
            console.error('[Socket] Error:', error);
            this._emit('connect_error', { message: 'WebSocket error' });
        };

        this.ws.onmessage = (event) => {
            this._handleMessage(event.data);
        };
    }

    /**
     * Handle incoming message
     */
    _handleMessage(raw) {
        try {
            const { type, payload } = JSON.parse(raw);
            this._emit(type, payload);
        } catch (err) {
            console.error('[Socket] Message parse error:', err);
        }
    }

    /**
     * Emit event to local listeners
     */
    _emit(event, data) {
        const handlers = this.listeners.get(event) || [];
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (err) {
                console.error(`[Socket] Handler error for ${event}:`, err);
            }
        });
    }

    /**
     * Register event listener (Socket.IO API)
     */
    on(event, handler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(handler);
        return this;
    }

    /**
     * Remove event listener (Socket.IO API)
     */
    off(event, handler) {
        if (!handler) {
            this.listeners.delete(event);
        } else {
            const handlers = this.listeners.get(event) || [];
            const idx = handlers.indexOf(handler);
            if (idx !== -1) handlers.splice(idx, 1);
        }
        return this;
    }

    /**
     * Send message to server (Socket.IO API)
     * Special handling for room:join - this triggers the WebSocket connection
     */
    emit(event, data) {
        // Special case: room:join triggers connection with room code
        if (event === 'room:join' && data?.code) {
            this._connect(data.code);
            // Queue the join event to be sent after connection
            this._pendingEmits.push({ event, data });
            return this;
        }

        // If not connected, queue the emit
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('[Socket] Not connected, queueing emit:', event);
            this._pendingEmits.push({ event, data });
            return this;
        }

        this._send(event, data);
        return this;
    }

    /**
     * Actually send the message
     */
    _send(event, data) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            const message = JSON.stringify({ type: event, payload: data });
            this.ws.send(message);
        }
    }

    /**
     * Join a Socket.IO room (compatibility method - not used in CF Workers)
     * In Cloudflare Workers, room joining is implicit in the WebSocket URL
     */
    join(room) {
        // No-op for native WebSocket - room is in URL
        return this;
    }

    /**
     * Emit to specific room/socket (relay via server)
     * In Cloudflare Workers, this is handled by the Durable Object
     */
    to(target) {
        // Return object with emit method that includes target
        return {
            emit: (event, data) => {
                this._send(event, { ...data, to: target });
            }
        };
    }

    /**
     * Disconnect from server
     */
    disconnect() {
        this.isManualClose = true;
        this._connected = false;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        return this;
    }

    /**
     * Schedule reconnection attempt
     */
    _scheduleReconnect() {
        if (!this.roomCode) return;

        if (this.reconnectAttempts >= this.options.reconnectionAttempts) {
            console.log('[Socket] Max reconnection attempts reached');
            return;
        }

        const delay = Math.min(
            this.options.reconnectionDelay * Math.pow(2, this.reconnectAttempts),
            RECONNECT_MAX_DELAY
        );

        console.log(`[Socket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

        setTimeout(() => {
            this.reconnectAttempts++;
            this._connect(this.roomCode);
        }, delay);
    }

    /**
     * Generate unique ID
     */
    _generateId() {
        return crypto.randomUUID ? crypto.randomUUID() :
            'client-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
    }
}

/**
 * Factory function (matches Socket.IO's io() export)
 */
export function io(serverUrl, options) {
    return new SocketAdapter(serverUrl, options);
}

export default SocketAdapter;
