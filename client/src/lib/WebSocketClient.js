// client/src/lib/WebSocketClient.js

/**
 * WebSocket Client Adapter
 * Provides Socket.IO-like API using native WebSocket for Cloudflare Workers compatibility.
 */

const RECONNECT_DELAY_BASE = 1000;
const RECONNECT_MAX_DELAY = 30000;
const RECONNECT_MAX_ATTEMPTS = 10;

export class WebSocketClient {
    constructor(serverUrl, options = {}) {
        this.serverUrl = serverUrl;
        this.options = {
            reconnection: true,
            reconnectionAttempts: RECONNECT_MAX_ATTEMPTS,
            reconnectionDelay: RECONNECT_DELAY_BASE,
            ...options
        };

        this.ws = null;
        this.roomCode = null;
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.isManualClose = false;
        this._id = null;
    }

    /**
     * Get unique client ID (generated on connect)
     */
    get id() {
        return this._id;
    }

    /**
     * Connect to a room
     * @param {string} roomCode - Room code to join
     */
    connect(roomCode) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('[WS] Already connected');
            return;
        }

        if (this.isConnecting) {
            console.log('[WS] Connection in progress');
            return;
        }

        this.roomCode = roomCode;
        this.isConnecting = true;
        this.isManualClose = false;

        // Build WebSocket URL
        const wsUrl = this.buildWsUrl(roomCode);
        console.log('[WS] Connecting to:', wsUrl);

        try {
            this.ws = new WebSocket(wsUrl);
            this._setupEventHandlers();
        } catch (err) {
            console.error('[WS] Connection error:', err);
            this.isConnecting = false;
            this._emit('connect_error', { message: err.message });
            this._scheduleReconnect();
        }
    }

    /**
     * Build WebSocket URL from server URL
     */
    buildWsUrl(roomCode) {
        const url = new URL(this.serverUrl);
        // Convert http(s) to ws(s)
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
            console.log('[WS] Connected');
            this.isConnecting = false;
            this.reconnectAttempts = 0;

            // Generate unique client ID
            this._id = this._generateId();

            this._emit('connect');
        };

        this.ws.onclose = (event) => {
            console.log('[WS] Disconnected:', event.code, event.reason);
            this.isConnecting = false;
            this._emit('disconnect', event.reason || 'Connection closed');

            if (!this.isManualClose && this.options.reconnection) {
                this._scheduleReconnect();
            }
        };

        this.ws.onerror = (error) => {
            console.error('[WS] Error:', error);
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
            console.error('[WS] Message parse error:', err);
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
                console.error(`[WS] Handler error for ${event}:`, err);
            }
        });
    }

    /**
     * Register event listener (Socket.IO-like API)
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    on(event, handler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(handler);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} handler - Optional specific handler to remove
     */
    off(event, handler) {
        if (!handler) {
            this.listeners.delete(event);
        } else {
            const handlers = this.listeners.get(event) || [];
            const idx = handlers.indexOf(handler);
            if (idx !== -1) handlers.splice(idx, 1);
        }
    }

    /**
     * Send event to server (Socket.IO-like API)
     * @param {string} event - Event name
     * @param {any} payload - Event payload
     */
    emit(event, payload) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('[WS] Cannot emit, not connected');
            return;
        }

        const message = JSON.stringify({ type: event, payload });
        this.ws.send(message);
    }

    /**
     * Disconnect from server
     */
    disconnect() {
        this.isManualClose = true;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Schedule reconnection attempt
     */
    _scheduleReconnect() {
        if (this.reconnectAttempts >= this.options.reconnectionAttempts) {
            console.log('[WS] Max reconnection attempts reached');
            return;
        }

        const delay = Math.min(
            this.options.reconnectionDelay * Math.pow(2, this.reconnectAttempts),
            RECONNECT_MAX_DELAY
        );

        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

        setTimeout(() => {
            this.reconnectAttempts++;
            this.connect(this.roomCode);
        }, delay);
    }

    /**
     * Generate unique ID
     */
    _generateId() {
        return 'client-' + Math.random().toString(36).substr(2, 9);
    }
}

/**
 * Factory function (Socket.IO-like)
 */
export function createWebSocketClient(serverUrl, options) {
    return new WebSocketClient(serverUrl, options);
}

export default WebSocketClient;
