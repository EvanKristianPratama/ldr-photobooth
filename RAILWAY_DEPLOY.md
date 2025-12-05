# 🚂 Deploy LDR Photobooth ke Railway

Panduan lengkap deploy aplikasi ke Railway.app (gratis $5 credit/bulan).

## 📋 Persiapan

### 1. Install Railway CLI (Opsional)
```bash
npm install -g @railway/cli
```

### 2. Login Railway
```bash
railway login
```

---

## 🚀 Cara Deploy

### **Opsi A: Via GitHub (Recommended)**

#### 1. Push ke GitHub
```bash
cd /Users/mac/Desktop/Golang
git add .
git commit -m "Initial commit: LDR Photobooth"
git branch -M main
git remote add origin https://github.com/USERNAME/ldr-photobooth.git
git push -u origin main
```

#### 2. Deploy di Railway
1. Buka [railway.app](https://railway.app)
2. Sign up/Login dengan GitHub
3. Klik **"New Project"**
4. Pilih **"Deploy from GitHub repo"**
5. Pilih repository `ldr-photobooth`
6. Railway akan auto-detect dan deploy!

#### 3. Konfigurasi Environment Variables
Di Railway Dashboard → Variables, tambahkan:
```
PORT=3000
NODE_ENV=production
```

#### 4. Generate Domain
- Klik **Settings** → **Networking**
- Klik **Generate Domain**
- Copy URL (misal: `ldr-photobooth-production.up.railway.app`)

---

### **Opsi B: Via Railway CLI**

```bash
cd /Users/mac/Desktop/Golang
railway init
railway up
railway open
```

---

## 🌐 Deploy Client (Vercel/Netlify)

### Vercel
```bash
cd client
npm run build
vercel --prod
```

Set environment variable di Vercel:
```
VITE_SERVER_URL=https://your-app.up.railway.app
```

### Atau Netlify
```bash
cd client
npm run build
netlify deploy --prod --dir=dist
```

---

## 💰 Railway Pricing

- **Free Tier**: $5 credit/bulan
- **Usage**: ~$0.01/jam untuk server kecil
- **Estimasi**: Cukup untuk ~500 jam/bulan (20+ hari non-stop)
- **Sleep**: Tidak ada auto-sleep (selalu aktif)

---

## ✅ Verifikasi Deployment

1. Buka Railway dashboard
2. Cek logs: `railway logs`
3. Test endpoint: `https://your-app.up.railway.app`
4. Seharusnya muncul server running

---

## 🔧 Troubleshooting

### Server tidak start?
```bash
railway logs
```

### Port error?
Pastikan environment variable `PORT` sudah di-set.

### WebSocket error?
Railway otomatis support WebSocket, tidak perlu konfigurasi tambahan.

---

## 📊 Monitoring

```bash
# Lihat logs real-time
railway logs

# Lihat status
railway status

# Restart service
railway restart
```

---

## 🎯 Next Steps

1. Deploy server ke Railway ✅
2. Deploy client ke Vercel ✅
3. Update `VITE_SERVER_URL` di client
4. Test aplikasi!

---

**Happy Deploying! 🚀**
