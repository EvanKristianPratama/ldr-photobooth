# LDR Photobooth 📸

Aplikasi photobooth jarak jauh (Long Distance Relationship) dengan teknologi WebRTC P2P.

## 🚀 Fitur
- **P2P Transfer**: Foto ditransfer langsung antar browser tanpa melalui server
- **Layout Pilihan**: 3 pilihan layout (1, 2, atau 3 foto)
- **Synchronized Capture**: Countdown sinkron untuk kedua user
- **Auto Merge**: Gabungan foto otomatis dengan layout yang dipilih

## 🛠 Tech Stack
- **Frontend**: React + Vite
- **Backend**: Node.js + Socket.IO + Express
- **WebRTC**: Peer-to-peer data transfer

## 📦 Installation

### Server
```bash
cd server
npm install
npm start
```

### Client
```bash
cd client
npm install
npm run dev
```

## 🌐 Deployment

### Server (Render.com)
1. Push ke GitHub
2. Buat Web Service di Render.com
3. Connect repository
4. Set environment: `NODE_ENV=production`
5. Deploy!

### Client (Vercel/Netlify)
1. Build: `npm run build`
2. Deploy folder `dist/`
3. Set environment variable: `VITE_SERVER_URL=https://your-server.onrender.com`

## 📝 Environment Variables

### Server
- `PORT`: Server port (default: 3000)
- `CLIENT_URL`: Client URL untuk CORS

### Client
- `VITE_SERVER_URL`: Backend server URL

## 🎯 Usage
1. Buka aplikasi di 2 browser/device
2. Masukkan room code yang sama
3. Connect peers
4. Pilih layout
5. Mulai photobooth!
6. Download hasil foto

## 📄 License
MIT
