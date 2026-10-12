const $ = (id) => document.getElementById(id);

let rawItems = [];
let filterWaktu = "semua";
let searchQuery = "";

const NAMA_BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function getToken() { return localStorage.getItem("jwt"); }
function authHeaders() {
  return { "Content-Type": "application/json", "Authorization": "Bearer " + getToken() };
}

function formatTanggal(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  const tgl = d.toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "short", year: "numeric",
  });
  const jam = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return `${tgl}, ${jam} WIB`;
}

function localToRFC3339(v) {
  if (!v) return "";
  const d = new Date(v);
  const pad = (n) => String(n).padStart(2, "0");
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const oh = pad(Math.floor(Math.abs(off) / 60));
  const om = pad(Math.abs(off) % 60);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:00${sign}${oh}:${om}`;
}

function rfcToLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function showToast(pesan) {
  const toast = $("toast");
  const text = $("toast-text");
  if (!toast) return;
  if (text) text.textContent = pesan;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3200);
}

function renderBadge(untuk) {
  const u = (untuk || "umum").toLowerCase();
  let icon = "fa-users";
  let label = "Umum";
  if (u === "ikhwan") {
    icon = "fa-person";
    label = "Ikhwan";
  } else if (u === "akhwat") {
    icon = "fa-person-dress";
    label = "Akhwat";
  }
  return `<span class="badge badge-${esc(u)}"><i class="fa-solid ${icon}"></i> ${label}</span>`;
}

function renderTimeBadge(iso, status) {
  if (status === "batal") {
    return `<span class="badge" style="background:rgba(220,38,38,0.15);color:#dc2626;border:1px solid rgba(220,38,38,0.3)"><i class="fa-solid fa-circle-xmark"></i> Batal</span>`;
  }
  const now = Date.now();
  const target = new Date(iso).getTime();
  const isPast = target < now;
  const isToday = new Date(iso).toDateString() === new Date().toDateString();

  if (isPast) {
    return `<span class="badge" style="background:var(--bg-subtle);color:var(--text-muted);border:1px solid var(--border)"><i class="fa-solid fa-clock-rotate-left"></i> Sudah Lewat</span>`;
  }
  if (isToday) {
    return `<span class="badge" style="background:var(--gold-soft);color:var(--gold);border:1px solid var(--gold-border)"><i class="fa-solid fa-bolt"></i> Hari Ini</span>`;
  }
  return `<span class="badge" style="background:var(--primary-soft);color:var(--primary);border:1px solid var(--primary-border)"><i class="fa-regular fa-clock"></i> Akan Datang</span>`;
}

/* ================= Auth & Navigation ================= */
$("btn-login").addEventListener("click", async () => {
  const errBox = $("login-err");
  const errText = $("login-err-text");
  errBox.classList.add("hidden");

  const emailVal = $("email").value.trim();
  const passVal = $("password").value;

  if (!emailVal || !passVal) {
    errText.textContent = "Email dan kata sandi wajib diisi.";
    errBox.classList.remove("hidden");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailVal, password: passVal }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Login gagal");
    localStorage.setItem("jwt", json.data.token);
    localStorage.setItem("admin_name", json.data.user.name || "Administrator");
    showApp();
    showToast("Berhasil masuk ke panel admin.");
  } catch (e) {
    errText.textContent = e.message || "Gagal melakukan autentikasi.";
    errBox.classList.remove("hidden");
  }
});

$("password").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("btn-login").click();
});

$("btn-logout").addEventListener("click", () => {
  localStorage.removeItem("jwt");
  localStorage.removeItem("admin_name");
  window.location.href = "/v1/login";
});

function showLogin() {
  $("app-section").classList.add("hidden");
  $("login-section").classList.remove("hidden");
  document.title = "Login Admin — Jadwal Kajian Salaf";
  if (window.location.pathname !== "/v1/login" && window.location.pathname !== "/login") {
    window.history.replaceState(null, "", "/v1/login");
  }
}

function showApp() {
  $("login-section").classList.add("hidden");
  $("app-section").classList.remove("hidden");
  $("admin-name").textContent = localStorage.getItem("admin_name") || "Admin";
  document.title = "Admin Dashboard — Jadwal Kajian Salaf";
  if (window.location.pathname !== "/v1/admin" && window.location.pathname !== "/admin") {
    window.history.replaceState(null, "", "/v1/admin");
  }
  loadList();
}

/* ================= Data Loading & Stats Calculation ================= */
async function loadList() {
  const grid = $("admin-grid");
  grid.innerHTML = "";
  for (let i = 0; i < 4; i++) {
    const sk = document.createElement("div");
    sk.className = "skeleton";
    grid.appendChild(sk);
  }
  $("admin-empty").classList.add("hidden");
  $("admin-error").classList.add("hidden");

  try {
    const res = await fetch(`${API_BASE}/admin/kajian?waktu=semua&limit=100`, {
      headers: authHeaders(),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Gagal memuat data");

    rawItems = json.data.data || [];
    calculateStats();
    renderCards();
  } catch (err) {
    grid.innerHTML = "";
    $("admin-error-text").textContent = err.message || "Gagal memuat data jadwal.";
    $("admin-error").classList.remove("hidden");
  }
}

function calculateStats() {
  const now = new Date();
  const nowMs = now.getTime();

  // Hitung pekan ini: Senin 00:00 s/d Minggu 23:59:59
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0, 0).getTime();
  const endOfWeek = startOfWeek + 7 * 24 * 3600 * 1000;
  const sevenDaysAgo = nowMs - 7 * 24 * 3600 * 1000;

  let total = rawItems.length;
  let baruCount = 0;
  let pekanCount = 0;
  let mendatangCount = 0;
  let lewatCount = 0;

  rawItems.forEach((k) => {
    const t = new Date(k.waktu_mulai).getTime();
    const created = new Date(k.CreatedAt || k.created_at || k.waktu_mulai).getTime();
    if (created >= sevenDaysAgo) baruCount++;
    if (t >= startOfWeek && t < endOfWeek) pekanCount++;
    if (t >= nowMs) mendatangCount++;
    else lewatCount++;
  });

  $("stat-total").textContent = total;
  $("stat-baru").textContent = baruCount;
  $("stat-pekan").textContent = pekanCount;
  $("stat-mendatang").textContent = mendatangCount;
  $("stat-lewat").textContent = lewatCount;

  $("chip-total").textContent = total;
  $("chip-baru").textContent = baruCount;
  $("chip-pekan").textContent = pekanCount;
  $("chip-mendatang").textContent = mendatangCount;
  $("chip-lewat").textContent = lewatCount;
}

/* ================= Filter & Render Cards ================= */
function getFilteredItems() {
  const now = new Date();
  const nowMs = now.getTime();
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0, 0).getTime();
  const endOfWeek = startOfWeek + 7 * 24 * 3600 * 1000;
  const sevenDaysAgo = nowMs - 7 * 24 * 3600 * 1000;

  let filtered = rawItems.filter((k) => {
    const t = new Date(k.waktu_mulai).getTime();
    const created = new Date(k.CreatedAt || k.created_at || k.waktu_mulai).getTime();
    
    // Filter waktu
    if (filterWaktu === "baru" && !(created >= sevenDaysAgo)) return false;
    if (filterWaktu === "pekan_ini" && !(t >= startOfWeek && t < endOfWeek)) return false;
    if (filterWaktu === "mendatang" && !(t >= nowMs)) return false;
    if (filterWaktu === "lewat" && !(t < nowMs)) return false;

    // Filter search text
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        (k.judul || "").toLowerCase().includes(q) ||
        (k.ustadz || "").toLowerCase().includes(q) ||
        (k.tempat || "").toLowerCase().includes(q) ||
        (k.kota || "").toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  // Jika menyaring 'baru', urutkan berdasarkan waktu diinput (terbaru ke terlama)
  if (filterWaktu === "baru") {
    filtered.sort((a, b) => {
      const timeA = new Date(a.CreatedAt || a.created_at || a.waktu_mulai).getTime();
      const timeB = new Date(b.CreatedAt || b.created_at || b.waktu_mulai).getTime();
      return timeB - timeA;
    });
  }

  return filtered;
}

function renderCards() {
  const grid = $("admin-grid");
  grid.innerHTML = "";

  const items = getFilteredItems();
  $("admin-empty").classList.toggle("hidden", items.length > 0);
  const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;

  items.forEach((k) => {
    const id = k.id || k.ID;
    const d = new Date(k.waktu_mulai);
    const lokasi = [k.tempat, k.kota].filter(Boolean).map(esc).join(" • ");
    const createdTime = new Date(k.CreatedAt || k.created_at || 0).getTime();
    const isBaru = createdTime >= sevenDaysAgo;

    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="poster-wrap">
        ${k.poster_url
          ? `<img src="${esc(k.poster_url)}" alt="${esc(k.judul)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'poster-ph\\'><i class=\\'fa-solid fa-mosque\\'></i></div>'">`
          : `<div class="poster-ph"><i class="fa-solid fa-mosque"></i></div>`}
        <div class="card-date">
          <div class="d">${d.getDate()}</div>
          <div class="m">${NAMA_BULAN[d.getMonth()]}</div>
        </div>
      </div>
      <div class="card-body">
        <div class="card-badges">
          ${renderTimeBadge(k.waktu_mulai, k.status)}
          ${isBaru ? '<span class="badge" style="background:#f3e8ff;color:#7c3aed;border:1px solid #d8b4fe"><i class="fa-solid fa-circle-plus"></i> Baru</span>' : ''}
          ${renderBadge(k.untuk)}
        </div>
        <h3>${esc(k.judul)}</h3>
        <div class="card-meta-list">
          ${k.ustadz ? `<p class="ustadz"><i class="fa-solid fa-user-tie"></i> ${esc(k.ustadz)}</p>` : ""}
          <p class="meta"><i class="fa-regular fa-clock"></i> ${formatTanggal(k.waktu_mulai)}</p>
          ${lokasi ? `<p class="meta"><i class="fa-solid fa-location-dot"></i> ${lokasi}</p>` : ""}
        </div>
        <div class="admin-card-actions">
          <button class="btn btn-ghost btn-sm" data-edit="${id}" title="Edit kajian">
            <i class="fa-solid fa-pen-to-square"></i> Edit
          </button>
          <button class="btn btn-danger btn-sm" data-hapus="${id}" title="Hapus kajian">
            <i class="fa-solid fa-trash-can"></i> Hapus
          </button>
          <a class="btn btn-ghost btn-sm" href="/detail.html?id=${id}" target="_blank" title="Lihat tampilan di web" style="flex:0 0 auto;padding:7px 11px;">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </a>
        </div>
      </div>`;
    grid.appendChild(card);
  });

  // Wire up event listeners
  grid.querySelectorAll("[data-edit]").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const idTarget = b.dataset.edit;
      const target = rawItems.find((x) => (x.id || x.ID) == idTarget);
      if (target) bukaModalEdit(target);
    })
  );

  grid.querySelectorAll("[data-hapus]").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = b.dataset.hapus;
      const target = rawItems.find((x) => (x.id || x.ID) == id);
      bukaModalHapus(id, target ? target.judul : "");
    })
  );
}

/* ================= Filtering Interactions ================= */
function setWaktuFilter(waktu) {
  filterWaktu = waktu;

  // Sync stat cards active state
  document.querySelectorAll(".stat-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.filter === waktu);
  });

  // Sync toolbar chips active state
  document.querySelectorAll(".chip[data-waktu]").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.waktu === waktu);
  });

  renderCards();
}

// Click on metric/stat cards
document.querySelectorAll(".stat-card").forEach((card) => {
  card.addEventListener("click", () => {
    setWaktuFilter(card.dataset.filter);
  });
});

// Click on toolbar chips
document.querySelectorAll(".chip[data-waktu]").forEach((chip) => {
  chip.addEventListener("click", () => {
    setWaktuFilter(chip.dataset.waktu);
  });
});

// Real-time search
$("admin-search").addEventListener("input", (e) => {
  searchQuery = e.target.value.trim();
  renderCards();
});

/* ================= Modal Form Tambah / Edit ================= */
const NAMA_HARI = ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu"];
const NAMA_BULAN_PANJANG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function formatDateVal(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getPresetDate(preset) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (preset === "hari_ini") {
    return formatDateVal(d);
  }
  if (preset === "besok") {
    d.setDate(d.getDate() + 1);
    return formatDateVal(d);
  }
  if (preset === "sabtu") {
    const day = d.getDay();
    const diff = (6 - day >= 0) ? (6 - day) : (6 - day + 7);
    d.setDate(d.getDate() + diff);
    return formatDateVal(d);
  }
  if (preset === "ahad") {
    const day = d.getDay();
    const diff = (day === 0) ? 0 : (7 - day);
    d.setDate(d.getDate() + diff);
    return formatDateVal(d);
  }
  if (preset === "sabtu_depan") {
    const day = d.getDay();
    const thisSatDiff = (6 - day >= 0) ? (6 - day) : (6 - day + 7);
    d.setDate(d.getDate() + thisSatDiff + 7);
    return formatDateVal(d);
  }
  return formatDateVal(d);
}

function getSholatLabel(jamStr) {
  if (!jamStr) return "";
  const [h, m] = jamStr.split(":").map(Number);
  if (isNaN(h)) return "";
  const mins = h * 60 + (m || 0);
  if (mins >= 270 && mins <= 390) return "Ba'da Subuh";
  if (mins > 390 && mins <= 690) return "Pagi Dhuha";
  if (mins > 690 && mins <= 870) return "Ba'da Zhuhur";
  if (mins > 870 && mins <= 1070) return "Ba'da Ashar";
  if (mins > 1070 && mins <= 1155) return "Ba'da Maghrib";
  if (mins > 1155 && mins <= 1380) return "Ba'da Isya";
  return "";
}

function getRelativeLabel(tglStr) {
  if (!tglStr) return "";
  const now = new Date();
  const todayStr = formatDateVal(now);
  if (tglStr === todayStr) return "Hari Ini";

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomStr = formatDateVal(tomorrow);
  if (tglStr === tomStr) return "Besok";

  const targetDate = new Date(`${tglStr}T00:00:00`);
  const todayDate = new Date(`${todayStr}T00:00:00`);
  const diffDays = Math.round((targetDate - todayDate) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Sudah Lewat";
  if (diffDays === 1) return "Besok";
  return `${diffDays} hari lagi`;
}

function syncDateChips(tglVal) {
  document.querySelectorAll(".date-chip").forEach((chip) => {
    const targetVal = getPresetDate(chip.dataset.date);
    chip.classList.toggle("active", targetVal === tglVal);
  });
}

function syncTimeChips(jamVal) {
  document.querySelectorAll(".time-chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.time === jamVal);
  });
}

function updateDateTimePreview() {
  const tglVal = $("f-tanggal").value;
  const jamVal = $("f-jam").value;
  const previewBox = $("datetime-preview");
  const previewText = $("datetime-preview-text");
  const previewRel = $("datetime-preview-relative");
  const previewSholat = $("datetime-preview-sholat");

  syncDateChips(tglVal);
  syncTimeChips(jamVal);

  if (tglVal) {
    const [y, m, d] = tglVal.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    if (!isNaN(dt.getTime())) {
      const hari = NAMA_HARI[dt.getDay()];
      const bln = NAMA_BULAN_PANJANG[m - 1];
      const jamText = jamVal ? ` — Pukul ${jamVal.replace(":", ".")} WIB` : "";
      previewText.textContent = `${hari}, ${d} ${bln} ${y}${jamText}`;

      const relText = getRelativeLabel(tglVal);
      if (relText) {
        previewRel.textContent = relText;
        previewRel.classList.remove("hidden");
      } else {
        previewRel.classList.add("hidden");
      }

      const sholatText = getSholatLabel(jamVal);
      if (sholatText) {
        previewSholat.textContent = sholatText;
        previewSholat.classList.remove("hidden");
      } else {
        previewSholat.classList.add("hidden");
      }

      previewBox.classList.remove("hidden");
      return;
    }
  }
  previewBox.classList.add("hidden");
}

function bukaModalTambah() {
  $("form-kajian").reset();
  $("f-id").value = "";

  // Set default ke hari ini dan jam 18:30 (Ba'da Maghrib)
  const now = new Date();
  $("f-tanggal").value = formatDateVal(now);
  $("f-jam").value = "18:30";
  updateDateTimePreview();

  $("form-modal-title").innerHTML = `<i class="fa-solid fa-plus" style="color:var(--primary)"></i> Tambah Kajian Baru`;
  $("form-err").classList.add("hidden");
  $("modal-form").classList.remove("hidden");
  setTimeout(() => $("f-judul").focus(), 80);
}

function bukaModalEdit(k) {
  const id = k.id || k.ID;
  $("f-id").value = id;
  $("f-judul").value = k.judul || "";
  $("f-ustadz").value = k.ustadz || "";

  if (k.waktu_mulai) {
    const d = new Date(k.waktu_mulai);
    const pad = (n) => String(n).padStart(2, "0");
    $("f-tanggal").value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const jamStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    $("f-jam").value = jamStr;
    updateDateTimePreview();
  }

  $("f-kota").value = k.kota || "";
  $("f-provinsi").value = k.provinsi || "";
  $("f-tempat").value = k.tempat || "";
  $("f-map").value = k.map_url || "";
  $("f-poster").value = k.poster_url || "";
  $("f-live").value = k.live_url || "";
  $("f-untuk").value = k.untuk || "umum";
  $("f-status").value = k.status || "upcoming";

  $("form-modal-title").innerHTML = `<i class="fa-solid fa-pen-to-square" style="color:var(--primary)"></i> Edit Kajian`;
  $("form-err").classList.add("hidden");
  $("modal-form").classList.remove("hidden");
  setTimeout(() => $("f-judul").focus(), 80);
}

function tutupModalForm() {
  $("modal-form").classList.add("hidden");
}

$("btn-tambah").addEventListener("click", bukaModalTambah);
$("btn-close-modal").addEventListener("click", tutupModalForm);
$("btn-batal-modal").addEventListener("click", tutupModalForm);

$("f-tanggal").addEventListener("change", updateDateTimePreview);
$("f-tanggal").addEventListener("input", updateDateTimePreview);
$("f-tanggal").addEventListener("click", () => {
  if (typeof $("f-tanggal").showPicker === "function") {
    try { $("f-tanggal").showPicker(); } catch (e) {}
  }
});

$("f-jam").addEventListener("input", updateDateTimePreview);
$("f-jam").addEventListener("change", updateDateTimePreview);
$("f-jam").addEventListener("click", () => {
  if (typeof $("f-jam").showPicker === "function") {
    try { $("f-jam").showPicker(); } catch (e) {}
  }
});

document.querySelectorAll(".date-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    $("f-tanggal").value = getPresetDate(chip.dataset.date);
    updateDateTimePreview();
  });
});

document.querySelectorAll(".time-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    $("f-jam").value = chip.dataset.time;
    updateDateTimePreview();
  });
});

$("modal-form").addEventListener("click", (e) => {
  if (e.target === $("modal-form")) tutupModalForm();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!$("modal-form").classList.contains("hidden")) tutupModalForm();
    if (!$("modal-hapus").classList.contains("hidden")) tutupModalHapus();
  }
});

$("form-kajian").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = $("form-err");
  const errText = $("form-err-text");
  errEl.classList.add("hidden");

  const tglVal = $("f-tanggal").value;
  const jamVal = $("f-jam").value || "00:00";

  if (!tglVal) {
    errText.textContent = "Tanggal kajian wajib diisi.";
    errEl.classList.remove("hidden");
    return;
  }

  const id = $("f-id").value;
  const body = {
    judul: $("f-judul").value.trim(),
    ustadz: $("f-ustadz").value.trim(),
    waktu_mulai: localToRFC3339(`${tglVal}T${jamVal}`),
    kota: $("f-kota").value.trim(),
    provinsi: $("f-provinsi").value.trim(),
    tempat: $("f-tempat").value.trim(),
    map_url: $("f-map").value.trim(),
    poster_url: $("f-poster").value.trim(),
    live_url: $("f-live").value.trim(),
    untuk: $("f-untuk").value,
    status: $("f-status").value,
  };

  try {
    const url = id ? `${API_BASE}/admin/kajian/${id}` : `${API_BASE}/admin/tambah-kajian`;
    const res = await fetch(url, {
      method: id ? "PUT" : "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Gagal menyimpan data.");

    tutupModalForm();
    showToast(id ? "Jadwal kajian berhasil diperbarui!" : "Jadwal kajian baru berhasil ditambahkan!");
    loadList();
  } catch (err) {
    errText.textContent = err.message;
    errEl.classList.remove("hidden");
  }
});

let idKajianAkanDihapus = null;

function bukaModalHapus(id, judul) {
  idKajianAkanDihapus = id;
  const teksEl = $("hapus-judul-teks");
  if (teksEl) {
    teksEl.innerHTML = `Apakah Anda yakin ingin menghapus jadwal kajian <strong>"${esc(judul || "ini")}"</strong>?<br><span style="font-size:0.85rem;color:#dc2626;margin-top:6px;display:inline-block">Tindakan ini tidak dapat dibatalkan.</span>`;
  }
  $("modal-hapus").classList.remove("hidden");
}

function tutupModalHapus() {
  idKajianAkanDihapus = null;
  $("modal-hapus").classList.add("hidden");
}

$("btn-batal-hapus").addEventListener("click", tutupModalHapus);
$("modal-hapus").addEventListener("click", (e) => {
  if (e.target === $("modal-hapus")) tutupModalHapus();
});

$("btn-konfirmasi-hapus").addEventListener("click", async () => {
  if (!idKajianAkanDihapus) return;
  const btn = $("btn-konfirmasi-hapus");
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menghapus...`;
  
  try {
    const res = await fetch(`${API_BASE}/admin/kajian/${idKajianAkanDihapus}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    const json = await res.json();
    if (json.success) {
      tutupModalHapus();
      showToast("Jadwal kajian berhasil dihapus.");
      loadList();
    } else {
      alert(json.message || "Gagal menghapus jadwal.");
    }
  } catch (err) {
    alert("Terjadi kesalahan jaringan.");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-trash-can"></i> Ya, Hapus`;
  }
});

/* ================= Init ================= */
if (getToken()) {
  showApp();
} else {
  showLogin();
}
