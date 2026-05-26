import { RoomDurableObject } from './adapters/transport/roomDurableObject';
import { SignJWT } from 'jose';

export { RoomDurableObject };

const liveKitSecretEncoder = new TextEncoder();

async function createLiveKitToken({
  apiKey,
  apiSecret,
  roomName,
  participantIdentity,
  participantName
}: {
  apiKey: string;
  apiSecret: string;
  roomName: string;
  participantIdentity: string;
  participantName: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    name: participantName,
    metadata: '',
    video: {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishSources: ['camera']
    }
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(apiKey)
    .setSubject(participantIdentity)
    .setIssuedAt(now)
    .setNotBefore(now - 10)
    .setExpirationTime(now + 60 * 60)
    .sign(liveKitSecretEncoder.encode(apiSecret));
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // ── CORS PREFLIGHT ──
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
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

    if (url.pathname === '/api/livekit/token' && request.method === 'POST') {
      try {
        const apiKey = env.LIVEKIT_API_KEY;
        const apiSecret = env.LIVEKIT_API_SECRET;
        const liveKitUrl = env.LIVEKIT_URL;

        if (!apiKey || !apiSecret || !liveKitUrl) {
          return new Response(JSON.stringify({ error: 'LiveKit is not configured on the worker' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const body = await request.json() as {
          room_name?: string;
          participant_identity?: string;
          participant_name?: string;
        };

        const roomName = body.room_name?.trim();
        const participantIdentity = body.participant_identity?.trim();
        const participantName = body.participant_name?.trim() || participantIdentity;

        if (!roomName || !participantIdentity || !participantName) {
          return new Response(JSON.stringify({ error: 'room_name and participant_identity are required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const participantToken = await createLiveKitToken({
          apiKey,
          apiSecret,
          roomName,
          participantIdentity,
          participantName
        });

        return new Response(JSON.stringify({
          server_url: liveKitUrl,
          participant_token: participantToken
        }), {
          status: 201,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: 'Failed to create LiveKit token', details: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
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
      } catch (err: any) {
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
      } catch (err: any) {
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
      } catch (err: any) {
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
      } catch (err: any) {
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
      } catch (err: any) {
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
        } catch (err: any) {
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
        } catch (err: any) {
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

    // ── RAJAONGKIR MOCK PROXY ──
    const PROVINCES = [
      { province_id: '6', province: 'DKI Jakarta' },
      { province_id: '9', province: 'Jawa Barat' },
      { province_id: '10', province: 'Jawa Tengah' },
      { province_id: '11', province: 'Jawa Timur' },
      { province_id: '3', province: 'Banten' },
      { province_id: '5', province: 'DI Yogyakarta' },
      { province_id: '1', province: 'Bali' },
      { province_id: '21', province: 'Sumatera Utara' },
      { province_id: '24', province: 'Sumatera Selatan' },
      { province_id: '28', province: 'Sulawesi Selatan' },
    ];
    const CITIES: Record<string, any[]> = {
      '6': [
        { city_id: '152', city_name: 'Jakarta Pusat', type: 'Kota', postal_code: '10110' },
        { city_id: '153', city_name: 'Jakarta Selatan', type: 'Kota', postal_code: '12190' },
        { city_id: '151', city_name: 'Jakarta Barat', type: 'Kota', postal_code: '11210' },
        { city_id: '154', city_name: 'Jakarta Utara', type: 'Kota', postal_code: '14110' },
        { city_id: '155', city_name: 'Jakarta Timur', type: 'Kota', postal_code: '13110' },
      ],
      '9': [
        { city_id: '23', city_name: 'Bandung', type: 'Kota', postal_code: '40111' },
        { city_id: '78', city_name: 'Bogor', type: 'Kota', postal_code: '16111' },
        { city_id: '115', city_name: 'Depok', type: 'Kota', postal_code: '16411' },
        { city_id: '55', city_name: 'Bekasi', type: 'Kota', postal_code: '17111' },
        { city_id: '182', city_name: 'Karawang', type: 'Kabupaten', postal_code: '41311' },
        { city_id: '272', city_name: 'Tasikmalaya', type: 'Kota', postal_code: '46111' },
        { city_id: '275', city_name: 'Cimahi', type: 'Kota', postal_code: '40511' },
      ],
      '10': [
        { city_id: '399', city_name: 'Semarang', type: 'Kota', postal_code: '50111' },
        { city_id: '427', city_name: 'Surakarta (Solo)', type: 'Kota', postal_code: '57111' },
        { city_id: '177', city_name: 'Purwokerto', type: 'Kota', postal_code: '53111' },
      ],
      '11': [
        { city_id: '444', city_name: 'Surabaya', type: 'Kota', postal_code: '60111' },
        { city_id: '255', city_name: 'Malang', type: 'Kota', postal_code: '65111' },
        { city_id: '294', city_name: 'Jember', type: 'Kabupaten', postal_code: '68111' },
      ],
      '3': [
        { city_id: '457', city_name: 'Tangerang', type: 'Kota', postal_code: '15111' },
        { city_id: '455', city_name: 'Tangerang Selatan', type: 'Kota', postal_code: '15310' },
        { city_id: '88', city_name: 'Cilegon', type: 'Kota', postal_code: '42411' },
      ],
      '5': [
        { city_id: '501', city_name: 'Yogyakarta', type: 'Kota', postal_code: '55111' },
        { city_id: '113', city_name: 'Sleman', type: 'Kabupaten', postal_code: '55511' },
        { city_id: '27', city_name: 'Bantul', type: 'Kabupaten', postal_code: '55711' },
      ],
      '1': [
        { city_id: '114', city_name: 'Denpasar', type: 'Kota', postal_code: '80111' },
        { city_id: '1', city_name: 'Badung', type: 'Kabupaten', postal_code: '80351' },
      ],
      '21': [{ city_id: '318', city_name: 'Medan', type: 'Kota', postal_code: '20111' }],
      '24': [{ city_id: '404', city_name: 'Palembang', type: 'Kota', postal_code: '30111' }],
      '28': [{ city_id: '456', city_name: 'Makassar', type: 'Kota', postal_code: '90111' }],
    };
    const mockShipping = (cityId: string): number => {
      if (['23','275'].includes(cityId)) return 9000; // Same city (Bandung / Cimahi)
      if (['78','115','55','182','272','457','455','88'].includes(cityId)) return 11000; // West Java & Banten
      if (['151','152','153','154','155'].includes(cityId)) return 15000; // Jakarta / Jabodetabek
      if (['399','427','177','501','113','27'].includes(cityId)) return 22000; // Central Java & DIY
      if (['444','255','294'].includes(cityId)) return 28000; // East Java
      if (['114','1'].includes(cityId)) return 38000; // Bali
      if (['318','404','456'].includes(cityId)) return 48000; // Sumatra / Sulawesi
      return 25000;
    };

    if (url.pathname === '/api/rajaongkir/provinces' && request.method === 'GET') {
      return new Response(JSON.stringify({ success: true, provinces: PROVINCES }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    if (url.pathname === '/api/rajaongkir/cities' && request.method === 'GET') {
      const pid = url.searchParams.get('provinceId') || '';
      return new Response(JSON.stringify({ success: true, cities: CITIES[pid] || [] }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // ── ORDERS API ──
    if (url.pathname === '/api/orders' && request.method === 'POST') {
      try {
        const formData = await request.formData();
        const photoFile = formData.get('photo') as File | null;
        const address1Json = formData.get('address1') as string;
        const address2Json = formData.get('address2') as string;
        const frameId = formData.get('frameId') as string || '';
        const sessionMode = formData.get('sessionMode') as string || 'duo';
        const cityId1 = formData.get('cityId1') as string || '';
        const cityId2 = sessionMode === 'solo' ? '' : (formData.get('cityId2') as string || '');
        const qty1Str = formData.get('qty1') as string || '1';
        const qty2Str = formData.get('qty2') as string || '1';
        const finishUrl = formData.get('finishUrl') as string || '';

        const qty1 = parseInt(qty1Str, 10) || 1;
        const qty2 = sessionMode === 'solo' ? 0 : (parseInt(qty2Str, 10) || 1);

        const shippingCost1 = mockShipping(cityId1);
        const shippingCost2 = sessionMode === 'solo' ? 0 : mockShipping(cityId2);

        const isSolo = sessionMode === 'solo';
        const BASE_PACKAGE_PRICE = isSolo ? 35000 : 50000;

        // Rp15,000 per extra print
        const extraQty1 = Math.max(0, qty1 - 1);
        const extraQty2 = isSolo ? 0 : Math.max(0, qty2 - 1);
        const extraPrintsCost = (extraQty1 + extraQty2) * 15000;

        const totalBasePrice = BASE_PACKAGE_PRICE + extraPrintsCost;
        const ADMIN_FEE = 1000;
        const totalPrice = totalBasePrice + shippingCost1 + shippingCost2 + ADMIN_FEE;

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        let photoUrl = '';
        if (photoFile && photoFile.size > 0) {
          const photoPath = `orders/${id}.jpg`;
          await env.BUCKET.put(photoPath, photoFile.stream(), { httpMetadata: { contentType: photoFile.type || 'image/jpeg' } });
          photoUrl = `/${photoPath}`;
        }

        // Store qty1 & qty2 inside address structures in D1 to stay backward-compatible without DB migration
        const parsedAddress1 = JSON.parse(address1Json || '{}');
        parsedAddress1.qty = qty1;

        let parsedAddress2: any = {};
        if (!isSolo) {
          parsedAddress2 = JSON.parse(address2Json || '{}');
          parsedAddress2.qty = qty2;
        }

        // ── MIDTRANS INTEGRATION ──
        let snapToken = '';
        let snapUrl = '';
        let midtransDebugPayload: any = null;
        try {
          const serverKey = env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-BWUE1Wzf_X6lBLEWqGHSpvah';
          const base64Key = btoa(serverKey + ':');
          const midtransBody: any = {
            transaction_details: {
              order_id: id,
              gross_amount: totalPrice
            },
            credit_card: {
              secure: true
            },
            customer_details: {
              first_name: parsedAddress1.fullName || 'User LDR',
              phone: parsedAddress1.phone || '08123456789'
            }
          };
          if (finishUrl) {
            midtransBody.callbacks = {
              finish: finishUrl,
              unfinish: finishUrl,
              error: finishUrl
            };
          }
          const midtransResp = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Basic ${base64Key}`
            },
            body: JSON.stringify(midtransBody)
          });
          const midtransResult = await midtransResp.json() as any;
          midtransDebugPayload = midtransResult;
          if (midtransResult && midtransResult.token) {
            snapToken = midtransResult.token;
            snapUrl = midtransResult.redirect_url;
          } else {
            console.error('Midtrans failed to return a token. Response payload:', JSON.stringify(midtransResult));
          }
        } catch (midtransErr: any) {
          console.error('Midtrans direct token integration error:', midtransErr?.message || midtransErr);
          midtransDebugPayload = { error: midtransErr?.message || String(midtransErr) };
        }

        // If Midtrans Snap token generation failed, reject the order creation
        if (!snapToken) {
          const errMsg = midtransDebugPayload?.error_messages?.join(', ') || midtransDebugPayload?.error || 'Gagal membuat transaksi pembayaran dengan Midtrans';
          return new Response(JSON.stringify({ 
            success: false, 
            error: `Midtrans Payment Error: ${errMsg}`,
            midtransDebug: midtransDebugPayload
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        await env.DB.prepare(
          `INSERT INTO orders (id, photo_url, frame_id, total_price, shipping_cost_1, shipping_cost_2, admin_fee, status, shipping_address_1, shipping_address_2, session_mode, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?)`
        ).bind(id, photoUrl, frameId, totalPrice, shippingCost1, shippingCost2, ADMIN_FEE, JSON.stringify(parsedAddress1), JSON.stringify(parsedAddress2), sessionMode, now, now).run();
        
        return new Response(JSON.stringify({ 
          success: true, 
          orderId: id, 
          totalPrice, 
          snapToken,
          snapUrl,
          midtransDebug: midtransDebugPayload,
          pricing: { 
            basePrice: totalBasePrice, 
            shippingCost1, 
            shippingCost2, 
            adminFee: ADMIN_FEE,
            qty1,
            qty2
          } 
        }), {
          status: 201, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: 'Create order failed', details: err.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    if (url.pathname === '/api/orders' && request.method === 'GET') {
      try {
        const statusFilter = url.searchParams.get('status');
        let query = 'SELECT * FROM orders';
        const bindings: any[] = [];
        if (statusFilter) { query += ' WHERE status = ?'; bindings.push(statusFilter); }
        query += ' ORDER BY created_at DESC';
        const stmt = env.DB.prepare(query);
        const { results } = bindings.length > 0 ? await stmt.bind(...bindings).all() : await stmt.all();
        return new Response(JSON.stringify(results), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: 'DB error', details: err.message }), {
          status: 500, headers: { 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    if (url.pathname.match(/^\/api\/orders\/[^/]+$/) && request.method === 'GET') {
      try {
        const id = url.pathname.split('/').pop();
        const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
        if (!order) {
          return new Response(JSON.stringify({ error: 'Order not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
        return new Response(JSON.stringify(order), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: 'Get order failed', details: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    if (url.pathname.match(/^\/api\/orders\/[^/]+$/) && request.method === 'PATCH') {
      try {
        const id = url.pathname.split('/').pop();
        const body = await request.json() as any;
        const { status } = body;
        const valid = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'CANCELLED'];
        if (!valid.includes(status)) {
          return new Response(JSON.stringify({ error: 'Invalid status' }), { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
        }
        const now = new Date().toISOString();
        await env.DB.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').bind(status, now, id).run();
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: 'Update failed', details: err.message }), {
          status: 500, headers: { 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // ── MIDTRANS PAYMENT WEBHOOK ──
    if (url.pathname === '/api/payment-webhook' && request.method === 'POST') {
      try {
        const body = await request.json() as any;
        console.log('Payment webhook received:', body);
        const orderId = body.order_id;
        const transactionStatus = body.transaction_status;
        const fraudStatus = body.fraud_status;

        let status = 'PENDING';
        if (transactionStatus === 'capture') {
          if (fraudStatus === 'challenge') {
            status = 'PENDING';
          } else if (fraudStatus === 'accept') {
            status = 'PAID';
          }
        } else if (transactionStatus === 'settlement') {
          status = 'PAID';
        } else if (['cancel', 'deny', 'expire'].includes(transactionStatus)) {
          status = 'CANCELLED';
        } else if (transactionStatus === 'pending') {
          status = 'PENDING';
        }

        if (orderId && status !== 'PENDING') {
          const now = new Date().toISOString();
          await env.DB.prepare(
            `UPDATE orders SET status = ?, updated_at = ? WHERE id = ?`
          ).bind(status, now, orderId).run();
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: 'Webhook processing failed', details: err.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // ── CMS SETTINGS API ──
    if (url.pathname === '/api/cms/settings' && request.method === 'GET') {
      try {
        const { results } = await env.DB.prepare('SELECT * FROM system_settings').all();
        const settingsObj: Record<string, string> = {};
        for (const row of (results || []) as any[]) {
          settingsObj[row.key] = row.value;
        }
        
        // Add defaults if they are missing
        if (!settingsObj.android_photo_choices) settingsObj.android_photo_choices = '1,3,4';
        if (!settingsObj.receipt_title) settingsObj.receipt_title = 'LDR THERMAL BOOTH';
        if (!settingsObj.receipt_subtitle) settingsObj.receipt_subtitle = 'STORE #9821 // ZURICH CO-OP STUDIO';
        if (!settingsObj.receipt_slogan) settingsObj.receipt_slogan = 'THANK YOU FOR YOUR VISIT!';

        return new Response(JSON.stringify(settingsObj), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (err: any) {
        // Fallback if table doesn't exist yet
        return new Response(JSON.stringify({
          android_photo_choices: '1,3,4',
          receipt_title: 'LDR THERMAL BOOTH',
          receipt_subtitle: 'STORE #9821 // ZURICH CO-OP STUDIO',
          receipt_slogan: 'THANK YOU FOR YOUR VISIT!'
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    if (url.pathname === '/api/cms/settings' && request.method === 'POST') {
      try {
        const body = await request.json() as Record<string, string>;
        
        // Let's iterate over keys and values and insert/update
        for (const [key, value] of Object.entries(body)) {
          await env.DB.prepare(
            'INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?'
          ).bind(key, value, value).run();
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: 'Failed to save settings', details: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // 3. Serve images from R2 (Support /frames/, /posts/, /frame-templates/, /orders/)
    if (url.pathname.startsWith('/frames/') || url.pathname.startsWith('/posts/') || url.pathname.startsWith('/frame-templates/') || url.pathname.startsWith('/orders/')) {
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
  LIVEKIT_URL?: string;
  LIVEKIT_API_KEY?: string;
  LIVEKIT_API_SECRET?: string;
  MIDTRANS_CLIENT_KEY?: string;
  MIDTRANS_SERVER_KEY?: string;
}
