# Panduan Deploy Kajian Salaf ke Cloudflare

Panduan lengkap untuk mendeploy aplikasi **Jadwal Kajian Salaf** (Backend Go Fiber + PostgreSQL + Frontend) ke ekosistem **Cloudflare** menggunakan Docker langsung dari **Laptop Server Pribadi** Anda (atau VPS).

> [!NOTE]
> **Kenapa Cloudflare Tunnel sangat cocok untuk Laptop Server Pribadi?**
> - **Tidak perlu IP Publik Statis / Bebas CGNAT:** Provider internet rumah/tethering (Indihome, Biznet, dll.) tidak memberikan IP publik langsung. Cloudflare Tunnel membuat koneksi keluar (*outbound*), sehingga website Anda bisa diakses dari internet tanpa utak-atik router WiFi / port forwarding sama sekali.
> - **Aman & Privasi Terjaga:** IP asli laptop server Anda disembunyikan di balik proteksi DDoS dan SSL/HTTPS Cloudflare.
> - **Fleksibel:** Laptop terhubung ke WiFi rumah, tethering HP, atau di mana saja, website tetap langsung terhubung ke domain Anda.

---

## 🏗️ Pilihan Arsitektur

### Opsi 1: Frontend di Cloudflare Pages + Backend di Laptop Docker (Direkomendasikan ⭐)
- **Frontend**: Dihosting gratis di **Cloudflare Pages** (Global CDN, otomatis SSL HTTPS, build otomatis via Git).
- **Backend & Database**: Dijalankan di Docker laptop Anda (`backend` + `postgres`).
- **Koneksi**: Subdomain backend (misal: `api.domainkamu.com`) diarahkan ke laptop via **Cloudflare Tunnel (`cloudflared`)** tanpa buka port router.

### Opsi 2: Full Docker di Laptop Server + Cloudflare Tunnel
- Seluruh stack (**Frontend Nginx**, **Backend Go**, **PostgreSQL**, dan **Cloudflare Tunnel**) berjalan bersamaan di laptop via `docker-compose.yml`.
- Cloudflare Tunnel meneruskan trafik:
  - `domainkamu.com` ➔ Container Frontend (`localhost:3012` atau `frontend:80`)
  - `api.domainkamu.com` ➔ Container Backend (`localhost:8787` atau `backend:8080`)

---

## 🚀 Langkah 1: Persiapan di Laptop Server (Backend & Database)

### 1. File `.env` Sudah Tersedia
File `.env` di folder utama sudah dibuatkan otomatis dan dikonfigurasi dengan port yang aman agar tidak bentrok dengan project lain di laptop Anda:
```env
# Port Mapping Host VPS
BACKEND_PORT=8787
FRONTEND_PORT=3012
DB_HOST_PORT=5434

# Database
DB_USER=postgres
DB_PASSWORD=password_database_anda_yang_kuat
DB_NAME=kajian_salaf
DB_SSLMODE=disable

# JWT Secret
JWT_SECRET=rahasia_jwt_acak_panjang_dan_aman

# CORS (Domain Frontend Anda di Cloudflare)
# Contoh: https://kajian-salaf.pages.dev,https://domainkamu.com atau gunakan *
CORS_ORIGIN=*

# Token Cloudflare Tunnel (Didapat pada Langkah 2)
CLOUDFLARE_TUNNEL_TOKEN=
```

### 2. Jalankan Container
- **Untuk Opsi 1 (Hanya Backend & DB di VPS)**:
  ```bash
  docker compose up -d postgres backend
  ```
- **Untuk Opsi 2 (Full Stack termasuk Frontend Nginx)**:
  ```bash
  docker compose up -d postgres backend frontend
  ```

Periksa status container:
```bash
docker compose ps
docker compose logs -f backend
```

---

## 🌐 Langkah 2: Setup Cloudflare Tunnel (`cloudflared`)

Cloudflare Tunnel memungkinkan server/VPS Anda terhubung ke domain Cloudflare secara aman tanpa perlu IP publik statis atau membuka port firewall.

1. Buka [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/).
2. Masuk ke menu **Networks** ➔ **Tunnels** ➔ Klik **Create a tunnel**.
3. Pilih tipe **Cloudflare Tunnel** ➔ Beri nama (misal: `kajian-salaf-tunnel`).
4. Pada halaman *Install and run a connector*, pilih environment **Docker**.
5. Salin token dari perintah yang ditampilkan, yaitu teks setelah `--token` (panjang, diawali `eyJh...`).
6. Masukkan token tersebut ke dalam `.env` di VPS:
   ```env
   CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoi...token_anda...
   ```
7. Jalankan Cloudflare Tunnel di VPS:
   ```bash
   docker compose --profile tunnel up -d
   ```
8. Kembali ke dashboard Cloudflare, buka tab **Public Hostnames** pada tunnel tersebut dan tambahkan:
   - **Hostname Backend**:
     - Subdomain: `api`
     - Domain: `domainkamu.com`
     - Service Type: `HTTP`
     - URL: `backend:8080` (atau `localhost:8787`)
   - *(Jika menggunakan Opsi 2 Full Docker)* **Hostname Frontend**:
     - Subdomain: `@` (atau `www`)
     - Domain: `domainkamu.com`
     - Service Type: `HTTP`
     - URL: `frontend:80` (atau `localhost:3012`)

9. Tes akses backend:
   Buka di browser atau curl: `https://api.domainkamu.com/health` ➔ Harus merespon:
   ```json
   {"service":"kajian-salaf-backend","status":"healthy"}
   ```

---

## ⚡ Langkah 3: Deploy Frontend ke Cloudflare Pages (Opsi 1)

Jika memilih Opsi 1 (Frontend di Cloudflare Pages):

### 1. Update URL API di Frontend
Buka [frontend/js/config.js](file:///home/akio/Kajian-Salaf/frontend/js/config.js):
```javascript
const PROD_API = "https://api.domainkamu.com/v1"; // Isi dengan URL API backend Anda
```
Simpan dan push commit ke repositori Git Anda.

### 2. Hubungkan ke Cloudflare Pages
1. Buka [Cloudflare Dashboard](https://dash.cloudflare.com/) ➔ Masuk ke **Compute (Workers & Pages)**.
2. Klik **Create application** ➔ Pilih tab **Pages** ➔ Klik **Connect to Git**.
3. Pilih repositori `Kajian-Salaf`.
4. Konfigurasikan Build Settings:
   - **Framework preset**: `None`
   - **Build command**: *(kosongkan)*
   - **Build output directory**: `frontend`
   - **Root directory**: `/` (default)
5. Klik **Save and Deploy**.

Cloudflare Pages akan otomatis mendistribusikan website ke seluruh edge CDN global dengan HTTPS aktif. File [frontend/_redirects](file:///home/akio/Kajian-Salaf/frontend/_redirects) yang sudah disediakan akan otomatis menangani clean URL untuk `/login`, `/admin`, dan `/detail`.

---

## 🛠️ Perintah Berguna (Cheat Sheet)

| Perintah | Deskripsi |
| :--- | :--- |
| `docker compose up -d` | Menjalankan DB, Backend, dan Frontend |
| `docker compose --profile tunnel up -d` | Menjalankan seluruh stack + Cloudflare Tunnel |
| `docker compose ps` | Melihat status container & healthcheck |
| `docker compose logs -f backend` | Memantau log backend Go secara realtime |
| `docker compose restart backend` | Merestart backend |
| `docker compose down` | Menghentikan semua container |
| `docker compose down -v` | Menghentikan container dan menghapus volume database *(Hati-hati: data terhapus!)* |
