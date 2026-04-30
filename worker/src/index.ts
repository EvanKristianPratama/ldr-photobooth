import { RoomDurableObject } from './adapters/transport/roomDurableObject';

export { RoomDurableObject };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Upgrade, Connection',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    if (url.pathname === '/ws') {
      const roomId = url.searchParams.get('room');
      if (!roomId) {
        return new Response(JSON.stringify({ error: 'Missing room parameter' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (!/^[a-zA-Z0-9]{1,20}$/.test(roomId)) {
        return new Response(JSON.stringify({ error: 'Invalid room code' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const id = env.ROOM.idFromName(roomId.toUpperCase());
      const roomDO = env.ROOM.get(id);
      return roomDO.fetch(request);
    }

    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'ldr-photobooth',
          timestamp: new Date().toISOString()
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // ── COMMUNITY API ──

    // 1. Get all frames
    if (url.pathname === '/api/community/frames' && request.method === 'GET') {
      try {
        const { results } = await env.DB.prepare(
          'SELECT * FROM frames ORDER BY created_at DESC'
        ).all();
        
        return new Response(JSON.stringify(results), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Database error', details: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // 2. Upload a new frame
    if (url.pathname === '/api/community/frames' && request.method === 'POST') {
      try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const title = formData.get('title') as string;
        const author = formData.get('author') as string;
        const tags = formData.get('tags') as string || '';

        if (!file || !title || !author) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const id = crypto.randomUUID();
        const filename = `frames/${id}-${file.name}`;

        // Upload to R2
        await env.BUCKET.put(filename, file.stream(), {
          httpMetadata: { contentType: file.type }
        });

        // Insert into D1
        const publicUrl = `https://frames.ldr-photobooth.workers.dev/${filename}`; // Placeholder URL
        await env.DB.prepare(
          'INSERT INTO frames (id, title, author, tags, url, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(id, title, author, tags, publicUrl, new Date().toISOString()).run();

        return new Response(JSON.stringify({ success: true, id }), {
          status: 201,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Upload failed', details: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    if (url.pathname === '/' || url.pathname === '/api') {
      return new Response(
        JSON.stringify({
          name: 'LDR Photobooth Signaling Server',
          version: '1.0.0',
          endpoints: {
            websocket: '/ws?room=ROOMCODE',
            health: '/health'
          },
          usage: 'Connect via WebSocket to /ws?room=YOUR_ROOM_CODE'
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

interface Env {
  ROOM: DurableObjectNamespace;
  DB: D1Database;
  BUCKET: R2Bucket;
}
