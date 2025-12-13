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

## Auto Versioning

This project uses an automated version bump workflow that increments the root `package.json` patch version on every push to `main`.

- The workflow file is at `.github/workflows/version-bump.yml`.
- It runs `npm version patch` (without git-tag-version), commits the updated `package.json`, pushes the commit and creates a git tag `v<version>`.
- The action uses the repository `GITHUB_TOKEN` so no extra secret is required.

If you want to skip bumping for a particular push, include `[skip bump]` in the commit message, or push to a different branch and open a PR instead.

## Donate QR / E-wallet

You can show a donate QR or e-wallet address in the app. Two options:

Donate modal is QR-only.

- Put your QR image at: `client/public/donate-qr.png`

## 📄 License
MIT
