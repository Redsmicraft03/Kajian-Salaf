// ==========================================================
// Konfigurasi URL API Backend Kajian Salaf
// ==========================================================
// - Default: Menggunakan relative path "/api/v1".
//   Otomatis diteruskan oleh Nginx ke Backend Go Fiber di port 8080.
//   Bekerja langsung di localhost maupun di domain Cloudflare
//   (misal: https://kajian-salaf.akio-server.my.id) tanpa masalah
//   CORS atau Mixed Content (HTTP vs HTTPS).
// - Jika backend di-host di domain/server terpisah, isi PROD_API.
// ==========================================================

const PROD_API = ""; // Opsional, contoh: "https://api.akio-server.my.id/v1"

let API_BASE = "/api/v1";

if (PROD_API) {
  API_BASE = PROD_API;
} else if (window.location.protocol === "file:") {
  API_BASE = "http://localhost:8787/api/v1";
}
