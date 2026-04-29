# LDR Photobooth - Cloudflare Workers Server

Signaling server untuk LDR Photobooth menggunakan Cloudflare Workers dengan Durable Objects.

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- Akun Cloudflare (gratis)

### Local Development

```bash
# Install dependencies
npm install

# Login ke Cloudflare (pertama kali saja)
npx wrangler login

# Jalankan development server
npm run dev
```

Server akan berjalan di `http://localhost:8787`

### Deploy ke Cloudflare

```bash
npm run deploy
```

Setelah deploy, URL worker akan muncul seperti:
`https://ldr-photobooth.<your-subdomain>.workers.dev`

## 📡 API Endpoints

### WebSocket Connection
```
wss://ldr-photobooth.xxx.workers.dev/ws?room=ROOMCODE
```

### Health Check
```
GET https://ldr-photobooth.xxx.workers.dev/health
```

## 📨 Message Format

Semua pesan dikirim dalam format JSON:

```javascript
// Mengirim pesan
{
  "type": "room:join",
  "payload": { "displayName": "User Name" }
}

// Menerima pesan
{
  "type": "room:joined",
  "payload": { "participants": [...] }
}
```

## 📝 Event Types

| Event | Direction | Payload |
|-------|-----------|---------|
| `room:join` | Client → Server | `{ displayName }` |
| `room:joined` | Server → Client | `{ participants }` |
| `room:ready` | Server → Client | `{ ready: true }` |
| `room:error` | Server → Client | `{ message }` |
| `room:leave` | Client → Server | - |
| `session:start` | Bidirectional | `{ layout }` |
| `session:layout` | Bidirectional | `layout` |
| `session:reset` | Bidirectional | - |
| `webrtc:offer` | Relay | `{ sdp, to }` |
| `webrtc:answer` | Relay | `{ sdp, to }` |
| `webrtc:candidate` | Relay | `{ candidate, to }` |
| `photo:send` | Client → Server | `{ index, mime, base64 }` |
| `photo:receive` | Server → Client | `{ index, mime, base64, from }` |
| `location:update` | Bidirectional | `{ lat, lng, accuracy, city, country }` |

## 🏗 Architecture

```
Worker (index.ts)
    │
    ├── /ws?room=ABC → RoomDurableObject (adapters/transport/roomDurableObject.ts)
    │                      │
    │                      ├── WebSocket sessions
    │                      ├── RoomService (application/roomService.ts)
    │                      ├── RoomEngine (domain/room.ts)
    │                      └── Broadcast/Relay logic
    │
    └── /health → Health check response
```

### Durable Objects

Setiap room adalah **satu Durable Object instance**:
- State terisolasi per room
- WebSocket connections terikat ke DO instance
- Automatic scaling dan load balancing

## 💰 Cloudflare Workers Pricing

**Free Tier:**
- 100,000 requests/day
- Unlimited Durable Object requests (with limits on storage)
- Cukup untuk personal use dan MVP

**Paid Plan ($5/month):**
- 10 million requests/month
- More storage dan compute time

## 🔧 Configuration

Edit `wrangler.toml` untuk konfigurasi:

```toml
name = "ldr-photobooth"           # Nama worker
compatibility_date = "2024-01-01"  # Compatibility date
```

## 📄 License

MIT
