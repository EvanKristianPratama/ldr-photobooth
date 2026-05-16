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
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

    const calculateHotScore = (points: number, createdAt: string) => {
      const hours = (Date.now() - new Date(createdAt).getTime()) / 36e5;
      return (points + 1) / Math.pow(hours + 2, 1.5);
    };

    // ── COMMUNITY API ──

    // 1. Frames API
    if (url.pathname === '/api/community/frames' && request.method === 'GET') {
      try {
        const sort = url.searchParams.get('sort') || 'hot';
        const { results } = await env.DB.prepare('SELECT * FROM frames').all();
        
        let sorted = results as any[];
        if (sort === 'new') {
          sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        } else if (sort === 'top') {
          sorted.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
        } else {
          // hot
          sorted.sort((a, b) => calculateHotScore(b.usage_count || 0, b.created_at) - calculateHotScore(a.usage_count || 0, a.created_at));
        }

        return new Response(JSON.stringify(sorted), {
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
        const publicUrl = `/${filename}`; 
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
        const sort = url.searchParams.get('sort') || 'hot';
        const { results } = await env.DB.prepare('SELECT * FROM posts').all();
        
        let sorted = results as any[];
        if (sort === 'new') {
          sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        } else if (sort === 'top') {
          sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        } else {
          // hot
          sorted.sort((a, b) => calculateHotScore(b.likes || 0, b.created_at) - calculateHotScore(a.likes || 0, a.created_at));
        }

        return new Response(JSON.stringify(sorted), {
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
        const title = formData.get('title') as string || '';
        const type = formData.get('type') as string || 'solo';
        const frameId = formData.get('frame_id') as string || '';
        
        const id = crypto.randomUUID();
        const filename = `posts/${id}.png`;
        await env.BUCKET.put(filename, file.stream(), { httpMetadata: { contentType: 'image/png' } });
        const publicUrl = `/${filename}`; 
        await env.DB.prepare('INSERT INTO posts (id, title, author, url, type, frame_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .bind(id, title, author, publicUrl, type, frameId, new Date().toISOString()).run();
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

    // 4. Comment System
    if (url.pathname.includes('/comments')) {
      const parts = url.pathname.split('/');
      const type = parts[3]; // 'frames' or 'posts'
      const targetId = parts[4];

      if (request.method === 'GET') {
        try {
          const { results } = await env.DB.prepare('SELECT * FROM comments WHERE target_id = ? AND target_type = ? ORDER BY created_at DESC')
            .bind(targetId, type).all();
          return new Response(JSON.stringify(results), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: 'Failed to fetch comments' }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
        }
      }

      if (request.method === 'POST') {
        try {
          const body = await request.json() as any;
          const { author, content } = body;
          if (!author || !content) return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
          
          const id = crypto.randomUUID();
          await env.DB.prepare('INSERT INTO comments (id, target_id, target_type, author, content, created_at) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(id, targetId, type, author, content, new Date().toISOString()).run();
            
          return new Response(JSON.stringify({ success: true, id }), { status: 201, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        } catch (err) {
          return new Response(JSON.stringify({ error: 'Failed to post comment', details: err.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
        }
      }
    }

    // Delete post (CMS only)
    if (url.pathname.match(/^\/api\/community\/posts\/[^/]+$/) && request.method === 'DELETE') {
      try {
        const id = url.pathname.split('/').pop();
        
        // Clean up R2 file if needed (the URL in DB starts with /posts/...)
        const row = await env.DB.prepare('SELECT url FROM posts WHERE id = ?').bind(id).first() as any;
        if (row && row.url) {
          const filename = row.url.startsWith('/') ? row.url.slice(1) : row.url;
          await env.BUCKET.delete(filename);
        }

        await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: 'Delete failed', details: err.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // ── CMS FRAME TEMPLATES API ──

    // List frame templates (with optional photo_count filter)
    if (url.pathname === '/api/cms/frames' && request.method === 'GET') {
      try {
        const photoCount = url.searchParams.get('photo_count');
        const publishedOnly = url.searchParams.get('published') !== '0';
        
        let query = 'SELECT * FROM frame_templates';
        const conditions: string[] = [];
        const bindings: any[] = [];

        if (publishedOnly) {
          conditions.push('is_published = 1');
        }
        if (photoCount) {
          conditions.push('photo_count = ?');
          bindings.push(parseInt(photoCount));
        }

        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY created_at DESC';

        const stmt = env.DB.prepare(query);
        const { results } = bindings.length > 0 ? await stmt.bind(...bindings).all() : await stmt.all();

        // Parse JSON fields for client consumption
        const parsed = (results as any[]).map(r => ({
          ...r,
          slots: JSON.parse(r.slots_json || '[]'),
          text_elements: JSON.parse(r.text_elements_json || '[]'),
          decorations: JSON.parse(r.decorations_json || '[]'),
        }));

        return new Response(JSON.stringify(parsed), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: 'DB error', details: err.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // Get single frame template by ID
    if (url.pathname.match(/^\/api\/cms\/frames\/[^/]+$/) && !url.pathname.endsWith('/like') && request.method === 'GET') {
      try {
        const id = url.pathname.split('/').pop();
        const row = await env.DB.prepare('SELECT * FROM frame_templates WHERE id = ?').bind(id).first() as any;
        if (!row) {
          return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
        const parsed = {
          ...row,
          slots: JSON.parse(row.slots_json || '[]'),
          text_elements: JSON.parse(row.text_elements_json || '[]'),
          decorations: JSON.parse(row.decorations_json || '[]'),
        };
        return new Response(JSON.stringify(parsed), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: 'DB error', details: err.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // Create frame template
    if (url.pathname === '/api/cms/frames' && request.method === 'POST') {
      try {
        const formData = await request.formData();
        const name = formData.get('name') as string;
        const author = formData.get('author') as string || 'Admin';
        const photoCount = parseInt(formData.get('photo_count') as string);
        const canvasWidth = parseInt(formData.get('canvas_width') as string);
        const canvasHeight = parseInt(formData.get('canvas_height') as string);
        const orientation = formData.get('orientation') as string || 'portrait';
        const backgroundColor = formData.get('background_color') as string || '#ffffff';
        const frameMode = formData.get('frame_mode') as string || 'solo';
        const slotsJson = formData.get('slots_json') as string;
        const textElementsJson = formData.get('text_elements_json') as string || '[]';
        const decorationsJson = formData.get('decorations_json') as string || '[]';
        const isPublished = formData.get('is_published') === '1' ? 1 : 0;
        const overlayFile = formData.get('overlay') as File | null;
        const thumbnailFile = formData.get('thumbnail') as File | null;

        if (!name || !photoCount || !canvasWidth || !canvasHeight || !slotsJson) {
          return new Response(JSON.stringify({ error: 'Missing required fields: name, photo_count, canvas_width, canvas_height, slots_json' }), {
            status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        let overlayUrl: string | null = null;
        let thumbnailUrl: string | null = null;

        // Upload overlay PNG to R2
        if (overlayFile && overlayFile.size > 0) {
          const overlayPath = `frame-templates/${id}-overlay.png`;
          await env.BUCKET.put(overlayPath, overlayFile.stream(), { httpMetadata: { contentType: overlayFile.type || 'image/png' } });
          overlayUrl = `/${overlayPath}`;
        }

        // Upload thumbnail to R2
        if (thumbnailFile && thumbnailFile.size > 0) {
          const thumbPath = `frame-templates/${id}-thumb.png`;
          await env.BUCKET.put(thumbPath, thumbnailFile.stream(), { httpMetadata: { contentType: thumbnailFile.type || 'image/png' } });
          thumbnailUrl = `/${thumbPath}`;
        }

        await env.DB.prepare(
          `INSERT INTO frame_templates (id, name, author, photo_count, canvas_width, canvas_height, orientation, background_color, frame_mode, overlay_url, slots_json, text_elements_json, decorations_json, thumbnail_url, is_published, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(id, name, author, photoCount, canvasWidth, canvasHeight, orientation, backgroundColor, frameMode, overlayUrl, slotsJson, textElementsJson, decorationsJson, thumbnailUrl, isPublished, now, now).run();

        return new Response(JSON.stringify({ success: true, id }), {
          status: 201, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: 'Create failed', details: err.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // Update frame template
    if (url.pathname.match(/^\/api\/cms\/frames\/[^/]+$/) && request.method === 'PUT') {
      try {
        const id = url.pathname.split('/').pop();
        const formData = await request.formData();
        const now = new Date().toISOString();

        // Build dynamic update
        const updates: string[] = ['updated_at = ?'];
        const bindings: any[] = [now];

        const fields = ['name', 'author', 'photo_count', 'canvas_width', 'canvas_height', 'orientation', 'background_color', 'frame_mode', 'slots_json', 'text_elements_json', 'decorations_json', 'is_published'];
        for (const field of fields) {
          const val = formData.get(field);
          if (val !== null) {
            updates.push(`${field} = ?`);
            bindings.push(field === 'photo_count' || field === 'canvas_width' || field === 'canvas_height' || field === 'is_published' ? parseInt(val as string) : val);
          }
        }

        // Handle overlay upload
        const overlayFile = formData.get('overlay') as File | null;
        if (overlayFile && overlayFile.size > 0) {
          const overlayPath = `frame-templates/${id}-overlay.png`;
          await env.BUCKET.put(overlayPath, overlayFile.stream(), { httpMetadata: { contentType: overlayFile.type || 'image/png' } });
          updates.push('overlay_url = ?');
          bindings.push(`/${overlayPath}`);
        }

        // Handle thumbnail upload
        const thumbnailFile = formData.get('thumbnail') as File | null;
        if (thumbnailFile && thumbnailFile.size > 0) {
          const thumbPath = `frame-templates/${id}-thumb.png`;
          await env.BUCKET.put(thumbPath, thumbnailFile.stream(), { httpMetadata: { contentType: thumbnailFile.type || 'image/png' } });
          updates.push('thumbnail_url = ?');
          bindings.push(`/${thumbPath}`);
        }

        bindings.push(id);
        await env.DB.prepare(`UPDATE frame_templates SET ${updates.join(', ')} WHERE id = ?`).bind(...bindings).run();

        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: 'Update failed', details: err.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // Delete frame template
    if (url.pathname.match(/^\/api\/cms\/frames\/[^/]+$/) && request.method === 'DELETE') {
      try {
        const id = url.pathname.split('/').pop();
        
        // Clean up R2 files
        const row = await env.DB.prepare('SELECT overlay_url, thumbnail_url FROM frame_templates WHERE id = ?').bind(id).first() as any;
        if (row) {
          if (row.overlay_url) await env.BUCKET.delete(row.overlay_url.slice(1));
          if (row.thumbnail_url) await env.BUCKET.delete(row.thumbnail_url.slice(1));
        }

        await env.DB.prepare('DELETE FROM frame_templates WHERE id = ?').bind(id).run();
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: 'Delete failed', details: err.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // 3. Serve images from R2 (Support /frames/, /posts/, and /frame-templates/)
    if (url.pathname.startsWith('/frames/') || url.pathname.startsWith('/posts/') || url.pathname.startsWith('/frame-templates/')) {
      const filename = url.pathname.slice(1);
      const object = await env.BUCKET.get(filename);
      if (!object) {
        return new Response('Image not found', { status: 404 });
      }
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year cache
      return new Response(object.body, { headers });
    }

    // ── ROOT / API INFO ──
    if (url.pathname === '/' || url.pathname === '/api') {
      return new Response(
        JSON.stringify({
          name: 'LDR Photobooth Signaling Server',
          version: '1.2.0',
          endpoints: {
            websocket: '/ws?room=ROOMCODE',
            health: '/health',
            community_frames: '/api/community/frames',
            cms_frames: '/api/cms/frames'
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
