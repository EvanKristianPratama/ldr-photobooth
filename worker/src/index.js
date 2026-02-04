// worker/src/index.js

/**
 * Cloudflare Worker Entry Point
 * Routes incoming requests to appropriate Durable Objects
 */

export { RoomDurableObject } from './room-do.js';

export default {
    /**
     * Main fetch handler
     */
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // CORS headers for preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Upgrade, Connection',
                    'Access-Control-Max-Age': '86400',
                }
            });
        }

        // WebSocket endpoint: /ws?room=ROOMCODE
        if (url.pathname === '/ws') {
            const roomId = url.searchParams.get('room');

            if (!roomId) {
                return new Response(JSON.stringify({ error: 'Missing room parameter' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Validate room code (alphanumeric, max 20 chars)
            if (!/^[a-zA-Z0-9]{1,20}$/.test(roomId)) {
                return new Response(JSON.stringify({ error: 'Invalid room code' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Get Durable Object by room ID
            const id = env.ROOM.idFromName(roomId.toUpperCase());
            const roomDO = env.ROOM.get(id);

            // Forward request to Durable Object
            return roomDO.fetch(request);
        }

        // Health check endpoint
        if (url.pathname === '/health') {
            return new Response(JSON.stringify({
                status: 'ok',
                service: 'ldr-photobooth',
                timestamp: new Date().toISOString()
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // API info endpoint
        if (url.pathname === '/' || url.pathname === '/api') {
            return new Response(JSON.stringify({
                name: 'LDR Photobooth Signaling Server',
                version: '1.0.0',
                endpoints: {
                    websocket: '/ws?room=ROOMCODE',
                    health: '/health'
                },
                usage: 'Connect via WebSocket to /ws?room=YOUR_ROOM_CODE'
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // 404 for other routes
        return new Response(JSON.stringify({ error: 'Not Found' }), {
            status: 404,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
};
