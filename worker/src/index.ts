import { RoomDurableObject } from './adapters/transport/roomDurableObject';

export { RoomDurableObject };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // ── CORS PREFLIGHT ──
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

    // ── WEBSOCKET SIGNALING ──
    if (url.pathname === '/ws') {
      const roomId = url.searchParams.get('room');
      if (!roomId) {
        return new Response(JSON.stringify({ error: 'Missing room parameter' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      const id = env.ROOM.idFromName(roomId.toUpperCase());
      const roomDO = env.ROOM.get(id);
      return roomDO.fetch(request);
    }

    // ── HEALTH CHECK ──
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', service: 'ldr-photobooth' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // ── COMMUNITY API ──

    // 1. Frames API
    if (url.pathname === '/api/community/frames' && request.method === 'GET') {
      try {
        const { results } = await env.DB.prepare('SELECT * FROM frames ORDER BY created_at DESC').all();
        return new Response(JSON.stringify(results), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'DB error', details: err.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
      }
    }

    if (url.pathname === '/api/community/frames' && request.method === 'POST') {
      try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const title = formData.get('title') as string;
        const author = formData.get('author') as string;
        const id = crypto.randomUUID();
        const safeFileName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const filename = `frames/${id}-${safeFileName}`;
        await env.BUCKET.put(filename, file.stream(), { httpMetadata: { contentType: file.type } });
        const publicUrl = `${url.origin}/${filename}`; 
        await env.DB.prepare('INSERT INTO frames (id, title, author, url, created_at) VALUES (?, ?, ?, ?, ?)')
          .bind(id, title, author, publicUrl, new Date().toISOString()).run();
        return new Response(JSON.stringify({ success: true, id }), { status: 201, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Upload failed', details: err.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
      }
    }

    // 2. Posts API (Results Gallery)
    if (url.pathname === '/api/community/posts' && request.method === 'GET') {
      try {
        const { results } = await env.DB.prepare('SELECT * FROM posts ORDER BY created_at DESC').all();
        return new Response(JSON.stringify(results), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'DB error', details: err.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
      }
    }

    if (url.pathname === '/api/community/posts' && request.method === 'POST') {
      try {
        const formData = await request.formData();
        const file = formData.get('file') as File; 
        const author = formData.get('author') as string;
        const type = formData.get('type') as string || 'solo';
        const frameId = formData.get('frame_id') as string || '';
        
        const id = crypto.randomUUID();
        const filename = `posts/${id}.png`;
        await env.BUCKET.put(filename, file.stream(), { httpMetadata: { contentType: 'image/png' } });
        const publicUrl = `${url.origin}/${filename}`; 
        await env.DB.prepare('INSERT INTO posts (id, author, url, type, frame_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(id, author, publicUrl, type, frameId, new Date().toISOString()).run();
        return new Response(JSON.stringify({ success: true, id }), { status: 201, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Post failed', details: err.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
      }
    }

    // 3. Like System
    if (url.pathname.endsWith('/like') && request.method === 'POST') {
      try {
        const parts = url.pathname.split('/');
        const type = parts[3]; // 'frames' or 'posts'
        const id = parts[4];
        
        const table = type === 'frames' ? 'frames' : 'posts';
        const column = type === 'frames' ? 'usage_count' : 'likes'; // For frames, we count usage as likes/popularity

        await env.DB.prepare(`UPDATE ${table} SET ${column} = ${column} + 1 WHERE id = ?`).bind(id).run();
        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Like failed' }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
      }
    }

    // 3. Serve images from R2 (Support both /frames/ and /posts/)
    if (url.pathname.startsWith('/frames/') || url.pathname.startsWith('/posts/')) {
      const filename = url.pathname.slice(1);
      const object = await env.BUCKET.get(filename);
      if (!object) {
        return new Response('Image not found', { status: 404 });
      }
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Access-Control-Allow-Origin', '*');
      return new Response(object.body, { headers });
    }

    // ── ROOT / API INFO ──
    if (url.pathname === '/' || url.pathname === '/api') {
      return new Response(
        JSON.stringify({
          name: 'LDR Photobooth Signaling Server',
          version: '1.1.0',
          endpoints: {
            websocket: '/ws?room=ROOMCODE',
            health: '/health',
            community_frames: '/api/community/frames'
          }
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
};

interface Env {
  ROOM: DurableObjectNamespace;
  DB: D1Database;
  BUCKET: R2Bucket;
}
