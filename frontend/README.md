# Frontend Jadwal Kajian

Frontend statis (HTML + CSS + JS murni, tanpa framework / tanpa build step) untuk backend Kajian-Salaf.

Fitur:
- Hero + countdown live ke kajian terdekat
- Filter chips (pekan ini / akan datang / sudah lewat / semua) + filter kota
- Dark mode (tersimpan di localStorage)
- Skeleton loading + animasi reveal on scroll
- Halaman detail + halaman admin (login JWT, CRUD kajian)

## Struktur

```
index.html   → daftar kajian + filter kota/waktu + pagination
detail.html  → detail satu kajian (?id=...)
admin.html   → login + dashboard CRUD kajian
css/style.css
js/config.js → URL backend (WAJIB disesuaikan)
js/index.js, js/detail.js, js/admin.js
```

## Cara pakai lokal

1. Jalankan backend (`go run main.go`, default di `http://localhost:8080`).
2. Buka `index.html` langsung di browser, atau lebih baik via live server:
   ```
   npx serve .
   ```
3. Kalau backend di URL/port lain, ubah `API_BASE` di `js/config.js`.

## Deploy ke Vercel

1. Ubah `API_BASE` di `js/config.js` ke URL backend production.
2. Pastikan backend mengizinkan origin frontend (CORS).
3. Upload folder ini sebagai project baru di Vercel (atau `vercel --prod` dari folder ini).

## Catatan

- Kota pilihan user disimpan di `localStorage`.
- Token JWT admin disimpan di `localStorage` setelah login.
- Halaman admin butuh endpoint: `POST /admin/tambah-kajian`, `PUT /admin/kajian/:id`,
  `DELETE /admin/kajian/:id`, `GET /admin/kajian`, `POST /login` — semua dengan prefix `/v1` (atau `/api/v1`).
