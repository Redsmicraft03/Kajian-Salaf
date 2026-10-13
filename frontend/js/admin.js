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
  if (status === "selesai") {
    return `<span class="badge" style="background:var(--bg-subtle);color:var(--text-muted);border:1px solid var(--border)"><i class="fa-solid fa-circle-check"></i> Selesai</span>`;
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
  const rememberVal = $("remember-me") ? $("remember-me").checked : false;

  if (!emailVal || !passVal) {
    errText.textContent = "Email dan kata sandi wajib diisi.";
    errBox.classList.remove("hidden");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        email: emailVal, 
        password: passVal,
        remember_me: rememberVal
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Login gagal");
    if (!json.data || !json.data.user || json.data.user.role !== "admin") {
      const currentRole = json.data?.user?.role || "member";
      throw new Error(`Akses ditolak: Akun Anda memiliki role '${currentRole}'. Halaman ini khusus Administrator.`);
    }

    if (rememberVal) {
      localStorage.setItem("remember_email", emailVal);
    } else {
      localStorage.removeItem("remember_email");
    }

    localStorage.setItem("jwt", json.data.token);
    localStorage.setItem("admin_name", json.data.user.name || "Administrator");
    localStorage.setItem("admin_role", json.data.user.role || "admin");
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
  localStorage.removeItem("admin_role");
  window.location.href = "/v1/login";
});

function showLogin() {
  $("app-section").classList.add("hidden");
  $("login-section").classList.remove("hidden");
  document.title = "Login Admin — Jadwal Kajian Salaf";
  if (window.location.pathname !== "/v1/login" && window.location.pathname !== "/login") {
    window.history.replaceState(null, "", "/v1/login");
  }

  // Restore saved email if remember me was active
  const savedEmail = localStorage.getItem("remember_email");
  if (savedEmail && $("email")) {
    $("email").value = savedEmail;
    if ($("remember-me")) $("remember-me").checked = true;
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
  loadMasterWilayah();
  loadList();
  loadPengajuanBadge();
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
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem("jwt");
      localStorage.removeItem("admin_name");
      localStorage.removeItem("admin_role");
      showLogin();
      const errBox = $("login-err");
      const errText = $("login-err-text");
      errText.textContent = json.message || "Akses ditolak: Akun Anda bukan Administrator.";
      errBox.classList.remove("hidden");
      return;
    }
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
    if (k.status === "selesai" || t < nowMs) lewatCount++;
    else if (k.status !== "batal") mendatangCount++;
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
    if (filterWaktu === "mendatang" && !(k.status !== "selesai" && k.status !== "batal" && t >= nowMs)) return false;
    if (filterWaktu === "lewat" && !(k.status === "selesai" || t < nowMs)) return false;

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

/* ================= Master Wilayah Cascading Dropdowns ================= */
let masterWilayahData = [];

async function loadMasterWilayah() {
  if (masterWilayahData.length > 0) return;
  try {
    const res = await fetch(`${API_BASE}/master-wilayah`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      masterWilayahData = json.data;
      renderProvinsiOptions();
    }
  } catch (e) {
    console.error("Gagal memuat master wilayah:", e);
  }
}

function renderProvinsiOptions() {
  const provEl = $("f-provinsi");
  if (!provEl) return;
  const curVal = provEl.value;
  provEl.innerHTML = `<option value="">-- Pilih Provinsi --</option>`;
  masterWilayahData.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.nama;
    opt.textContent = p.nama;
    provEl.appendChild(opt);
  });
  if (curVal) provEl.value = curVal;
}

function populateKotaOptions(provinsiNama, selectedKota = "") {
  const kotaEl = $("f-kota");
  if (!kotaEl) return;
  kotaEl.innerHTML = "";

  if (!provinsiNama) {
    kotaEl.innerHTML = `<option value="">-- Pilih Provinsi Terlebih Dahulu --</option>`;
    return;
  }

  const prov = masterWilayahData.find((p) => p.nama.toLowerCase() === provinsiNama.toLowerCase());
  kotaEl.innerHTML = `<option value="">-- Pilih Kota / Kabupaten --</option>`;

  if (prov && Array.isArray(prov.kota)) {
    prov.kota.forEach((k) => {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = k;
      kotaEl.appendChild(opt);
    });
  }

  if (selectedKota) {
    const exists = Array.from(kotaEl.options).some((o) => o.value.toLowerCase() === selectedKota.toLowerCase());
    if (!exists) {
      const customOpt = document.createElement("option");
      customOpt.value = selectedKota;
      customOpt.textContent = selectedKota;
      kotaEl.appendChild(customOpt);
    }
    kotaEl.value = selectedKota;
  }
}

const provSelect = $("f-provinsi");
if (provSelect) {
  provSelect.addEventListener("change", () => {
    populateKotaOptions(provSelect.value, "");
  });
}

function bukaModalTambah() {
  $("form-kajian").reset();
  $("f-id").value = "";

  // Reset dropdown wilayah
  populateKotaOptions("", "");

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

async function bukaModalEdit(k) {
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

  if (!masterWilayahData.length) {
    await loadMasterWilayah();
  }

  $("f-provinsi").value = k.provinsi || "";
  populateKotaOptions(k.provinsi || "", k.kota || "");

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
    if (!$("modal-bulk").classList.contains("hidden")) tutupModalBulk();
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

/* ================= Modal Bulk Import Excel ================= */
let selectedExcelFile = null;

function bukaModalBulk() {
  selectedExcelFile = null;
  $("f-excel").value = "";
  $("file-info").classList.add("hidden");
  $("dropzone-label").textContent = "Pilih atau seret file Excel ke sini";
  $("bulk-err").classList.add("hidden");
  $("bulk-result").classList.add("hidden");
  $("btn-upload-bulk").disabled = true;
  $("btn-upload-bulk").innerHTML = `<i class="fa-solid fa-upload"></i> Mulai Impor Data`;
  $("modal-bulk").classList.remove("hidden");
}

function tutupModalBulk() {
  $("modal-bulk").classList.add("hidden");
}

function setExcelFile(file) {
  if (!file) return;
  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".csv")) {
    $("bulk-err-text").textContent = "Format file tidak didukung. Harap pilih file .xlsx atau .csv";
    $("bulk-err").classList.remove("hidden");
    return;
  }
  selectedExcelFile = file;
  $("file-name").textContent = file.name + ` (${(file.size / 1024).toFixed(1)} KB)`;
  $("file-info").classList.remove("hidden");
  $("bulk-err").classList.add("hidden");
  $("bulk-result").classList.add("hidden");
  $("btn-upload-bulk").disabled = false;
}

$("btn-bulk").addEventListener("click", bukaModalBulk);
$("btn-close-bulk").addEventListener("click", tutupModalBulk);
$("btn-batal-bulk").addEventListener("click", tutupModalBulk);
$("modal-bulk").addEventListener("click", (e) => {
  if (e.target === $("modal-bulk")) tutupModalBulk();
});

$("btn-pilih-file").addEventListener("click", (e) => {
  e.stopPropagation();
  $("f-excel").click();
});

$("dropzone").addEventListener("click", () => {
  $("f-excel").click();
});

$("f-excel").addEventListener("change", (e) => {
  if (e.target.files && e.target.files[0]) {
    setExcelFile(e.target.files[0]);
  }
});

// Drag and drop event listeners
const dropzone = $("dropzone");
dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.style.borderColor = "var(--primary)";
  dropzone.style.backgroundColor = "var(--primary-soft)";
});

dropzone.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dropzone.style.borderColor = "var(--primary-border)";
  dropzone.style.backgroundColor = "var(--card)";
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.style.borderColor = "var(--primary-border)";
  dropzone.style.backgroundColor = "var(--card)";
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    setExcelFile(e.dataTransfer.files[0]);
  }
});

$("btn-hapus-file").addEventListener("click", (e) => {
  e.stopPropagation();
  selectedExcelFile = null;
  $("f-excel").value = "";
  $("file-info").classList.add("hidden");
  $("btn-upload-bulk").disabled = true;
});

// Konfigurasi Link Unduh Template Excel (Download asli tanpa blob agar nama file berekstensi .xlsx)
function setupTemplateDownloadLinks() {
  const downloadUrl = `${API_BASE}/template-excel`;
  
  const btnQuick = $("btn-quick-template");
  if (btnQuick) {
    btnQuick.href = downloadUrl;
    btnQuick.addEventListener("click", () => {
      showToast("Mengunduh template_import_kajian_salaf.xlsx...");
    });
  }

  const btnModal = $("btn-download-template");
  if (btnModal) {
    btnModal.href = downloadUrl;
    btnModal.addEventListener("click", () => {
      showToast("Mengunduh template_import_kajian_salaf.xlsx...");
    });
  }
}

setupTemplateDownloadLinks();

// Upload & Impor Data Excel
$("btn-upload-bulk").addEventListener("click", async () => {
  if (!selectedExcelFile) return;

  const btn = $("btn-upload-bulk");
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Mengimpor Data...`;
  $("bulk-err").classList.add("hidden");
  $("bulk-result").classList.add("hidden");

  const formData = new FormData();
  formData.append("file", selectedExcelFile);

  try {
    const res = await fetch(`${API_BASE}/admin/bulk-kajian`, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + getToken(),
      },
      body: formData,
    });

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || "Gagal mengimpor data");
    }

    // Tampilkan ringkasan hasil
    const d = json.data || {};
    $("bulk-result-text").innerHTML = `
      <strong>${json.message}</strong><br>
      Total baris: ${d.total_baris || 0} • Berhasil: <span style="color:#10b981;font-weight:700">${d.berhasil || 0}</span> • Dilewati: ${d.dilewati || 0}
    `;

    const errUl = $("bulk-result-errors");
    errUl.innerHTML = "";
    if (d.catatan_error && d.catatan_error.length > 0) {
      d.catatan_error.forEach((msg) => {
        const li = document.createElement("li");
        li.textContent = msg;
        errUl.appendChild(li);
      });
    }

    $("bulk-result").classList.remove("hidden");
    showToast(`Berhasil mengimpor ${d.berhasil || 0} kajian!`);
    loadList(); // Refresh dashboard
  } catch (err) {
    $("bulk-err-text").textContent = err.message;
    $("bulk-err").classList.remove("hidden");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-upload"></i> Mulai Impor Data`;
  }
});

/* ================= Tab Switcher: Jadwal vs Pengajuan ================= */
let activeAdminTab = "jadwal";
let pStatusActive = "menunggu";
let pengajuanDataList = [];
let targetPengajuan = null;

const tabBtnJadwal = $("tab-btn-jadwal");
const tabBtnPengajuan = $("tab-btn-pengajuan");
const viewJadwal = $("view-jadwal");
const viewPengajuan = $("view-pengajuan");

function switchAdminTab(tabName) {
  activeAdminTab = tabName;
  if (tabName === "jadwal") {
    if (tabBtnJadwal) tabBtnJadwal.classList.add("active");
    if (tabBtnPengajuan) tabBtnPengajuan.classList.remove("active");
    if (viewJadwal) viewJadwal.classList.remove("hidden");
    if (viewPengajuan) viewPengajuan.classList.add("hidden");
  } else {
    if (tabBtnJadwal) tabBtnJadwal.classList.remove("active");
    if (tabBtnPengajuan) tabBtnPengajuan.classList.add("active");
    if (viewJadwal) viewJadwal.classList.add("hidden");
    if (viewPengajuan) viewPengajuan.classList.remove("hidden");
    loadPengajuanList();
  }
}

if (tabBtnJadwal) tabBtnJadwal.addEventListener("click", () => switchAdminTab("jadwal"));
if (tabBtnPengajuan) tabBtnPengajuan.addEventListener("click", () => switchAdminTab("pengajuan"));

// Update badge pending usulan pada tab button
async function loadPengajuanBadge() {
  try {
    const res = await fetch(`${API_BASE}/admin/pengajuan?status=menunggu&limit=1`, {
      headers: authHeaders(),
    });
    const json = await res.json();
    if (json.success && json.data && json.data.stats) {
      const pendingCount = json.data.stats.menunggu || 0;
      const badge = $("tab-badge-pengajuan");
      if (badge) {
        badge.textContent = pendingCount;
        badge.classList.toggle("has-pending", pendingCount > 0);
      }
    }
  } catch (e) {
    /* silent */
  }
}

/* ================= Pengajuan Jamaah Data & Moderation ================= */
async function loadPengajuanList() {
  const grid = $("admin-pengajuan-grid");
  const emptyEl = $("admin-pengajuan-empty");
  const errorEl = $("admin-pengajuan-error");

  if (!grid) return;
  grid.innerHTML = "";
  if (emptyEl) emptyEl.classList.add("hidden");
  if (errorEl) errorEl.classList.add("hidden");

  try {
    const res = await fetch(`${API_BASE}/admin/pengajuan?status=${pStatusActive}&limit=50`, {
      headers: authHeaders(),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Gagal memuat usulan");

    const data = json.data?.data || [];
    const stats = json.data?.stats || { menunggu: 0, disetujui: 0, ditolak: 0, total: 0 };
    pengajuanDataList = data;

    // Update stats counters
    if ($("p-stat-menunggu")) $("p-stat-menunggu").textContent = stats.menunggu;
    if ($("p-stat-disetujui")) $("p-stat-disetujui").textContent = stats.disetujui;
    if ($("p-stat-ditolak")) $("p-stat-ditolak").textContent = stats.ditolak;
    if ($("p-stat-total")) $("p-stat-total").textContent = stats.total;

    if ($("p-chip-menunggu")) $("p-chip-menunggu").textContent = stats.menunggu;
    if ($("p-chip-disetujui")) $("p-chip-disetujui").textContent = stats.disetujui;
    if ($("p-chip-ditolak")) $("p-chip-ditolak").textContent = stats.ditolak;
    if ($("p-chip-total")) $("p-chip-total").textContent = stats.total;

    // Update tab badge
    const badge = $("tab-badge-pengajuan");
    if (badge) {
      badge.textContent = stats.menunggu;
      badge.classList.toggle("has-pending", stats.menunggu > 0);
    }

    if (data.length === 0) {
      if (emptyEl) emptyEl.classList.remove("hidden");
      return;
    }

    renderPengajuanCards(data);
  } catch (err) {
    if (errorEl) errorEl.classList.remove("hidden");
  }
}

function renderPengajuanCards(items) {
  const grid = $("admin-pengajuan-grid");
  if (!grid) return;
  grid.innerHTML = "";

  items.forEach((p) => {
    const id = p.ID || p.id;
    const card = document.createElement("div");
    card.className = "pengajuan-card";

    let statusBadge = "";
    if (p.status === "menunggu") {
      statusBadge = `<span class="badge" style="background:rgba(234,179,8,0.15);color:#ca8a04;border:1px solid rgba(234,179,8,0.3)"><i class="fa-solid fa-hourglass-half"></i> Menunggu Review</span>`;
    } else if (p.status === "disetujui") {
      statusBadge = `<span class="badge" style="background:rgba(16,185,129,0.15);color:#059669;border:1px solid rgba(16,185,129,0.3)"><i class="fa-solid fa-circle-check"></i> Telah Disetujui</span>`;
    } else {
      statusBadge = `<span class="badge" style="background:rgba(239,68,68,0.15);color:#dc2626;border:1px solid rgba(239,68,68,0.3)"><i class="fa-solid fa-circle-xmark"></i> Ditolak</span>`;
    }

    const tglPengajuan = p.CreatedAt ? new Date(p.CreatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
    const waktuKajian = p.waktu_mulai ? formatTanggal(p.waktu_mulai) : "-";
    const lokasi = [p.tempat, p.kota, p.provinsi].filter(Boolean).map(esc).join(" • ");

    let actionButtons = "";
    if (p.status === "menunggu") {
      actionButtons = `
        <button type="button" class="btn btn-sm btn-approve" data-id="${id}" style="background:#059669;border-color:#059669;color:#ffffff;">
          <i class="fa-solid fa-check"></i> Setujui & Terbitkan
        </button>
        <button type="button" class="btn btn-sm btn-ghost btn-reject" data-id="${id}" style="color:#dc2626;border-color:rgba(220,38,38,0.35);">
          <i class="fa-solid fa-xmark"></i> Tolak
        </button>
      `;
    } else if (p.status === "disetujui") {
      actionButtons = `
        <span style="font-size:0.85rem;font-weight:700;color:#059669;display:inline-flex;align-items:center;gap:6px;">
          <i class="fa-solid fa-circle-check"></i> Diterbitkan di Jadwal
        </span>
      `;
    } else {
      actionButtons = `
        <span style="font-size:0.85rem;font-weight:700;color:#dc2626;display:inline-flex;align-items:center;gap:6px;">
          <i class="fa-solid fa-circle-xmark"></i> Ditolak
        </span>
      `;
    }

    actionButtons += `
      <button type="button" class="btn btn-ghost btn-sm btn-hapus-pengajuan" data-id="${id}" title="Hapus arsip usulan ini" style="color:var(--text-subtle);margin-left:auto;">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    `;

    card.innerHTML = `
      <div class="pengajuan-card-head">
        <div class="pengajuan-badges">
          ${statusBadge}
          ${renderBadge(p.untuk)}
        </div>
        <span class="pengajuan-tgl"><i class="fa-regular fa-clock"></i> Diajukan: ${tglPengajuan} WIB</span>
      </div>

      <div class="pengusul-banner">
        <div class="pengusul-avatar"><i class="fa-solid fa-user"></i></div>
        <div class="pengusul-meta">
          <div class="pengusul-name">${esc(p.nama_pengusul)}</div>
          <a class="pengusul-email" href="mailto:${esc(p.email_pengusul)}" title="Kirim email manual"><i class="fa-regular fa-envelope"></i> ${esc(p.email_pengusul)}</a>
        </div>
      </div>

      <div class="pengajuan-kajian-body">
        <h3 class="pengajuan-title">${esc(p.judul)}</h3>
        <div class="pengajuan-meta-list">
          ${p.ustadz ? `<div class="meta"><i class="fa-solid fa-user-tie"></i> <strong>${esc(p.ustadz)}</strong></div>` : ""}
          <div class="meta"><i class="fa-regular fa-calendar-check"></i> ${waktuKajian}</div>
          <div class="meta"><i class="fa-solid fa-location-dot"></i> ${lokasi}</div>
        </div>

        ${p.catatan ? `
          <div class="pengusul-catatan">
            <strong><i class="fa-solid fa-comment-dots"></i> Catatan Pengusul:</strong>
            <p>${esc(p.catatan)}</p>
          </div>
        ` : ""}

        ${p.alasan_tolak ? `
          <div class="pengusul-catatan alasan-tolak">
            <strong><i class="fa-solid fa-triangle-exclamation"></i> Alasan Penolakan:</strong>
            <p>${esc(p.alasan_tolak)}</p>
          </div>
        ` : ""}
      </div>

      <div class="pengajuan-actions">
        ${actionButtons}
      </div>
    `;

    grid.appendChild(card);
  });

  // Attach button events
  grid.querySelectorAll(".btn-approve").forEach((b) => {
    b.addEventListener("click", () => {
      const id = b.dataset.id;
      const item = pengajuanDataList.find((p) => String(p.ID || p.id) === String(id));
      if (item) bukaModalApprove(item);
    });
  });

  grid.querySelectorAll(".btn-reject").forEach((b) => {
    b.addEventListener("click", () => {
      const id = b.dataset.id;
      const item = pengajuanDataList.find((p) => String(p.ID || p.id) === String(id));
      if (item) bukaModalReject(item);
    });
  });

  grid.querySelectorAll(".btn-hapus-pengajuan").forEach((b) => {
    b.addEventListener("click", () => {
      const id = b.dataset.id;
      konfirmasiHapusPengajuan(id);
    });
  });
}

// Filter chips & stat cards pengajuan
document.querySelectorAll(".stat-card[data-p-stat]").forEach((card) => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".stat-card[data-p-stat]").forEach((c) => c.classList.remove("active"));
    card.classList.add("active");
    pStatusActive = card.dataset.pStat;
    // Sync chip
    document.querySelectorAll("button[data-p-waktu]").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.pWaktu === pStatusActive);
    });
    loadPengajuanList();
  });
});

document.querySelectorAll("button[data-p-waktu]").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll("button[data-p-waktu]").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    pStatusActive = chip.dataset.pWaktu;
    // Sync stat card
    document.querySelectorAll(".stat-card[data-p-stat]").forEach((card) => {
      card.classList.toggle("active", card.dataset.pStat === pStatusActive);
    });
    loadPengajuanList();
  });
});

/* ================= Modal Approve Pengajuan ================= */
function bukaModalApprove(item) {
  targetPengajuan = item;
  const detailBox = $("approve-detail-box");
  if (detailBox) {
    const waktuKajian = item.waktu_mulai ? formatTanggal(item.waktu_mulai) : "-";
    detailBox.innerHTML = `
      <div style="font-weight:700;font-size:0.95rem;margin-bottom:6px;color:var(--text);">${esc(item.judul)}</div>
      <div style="color:var(--text-muted);margin-bottom:4px;"><i class="fa-solid fa-user-tie"></i> ${esc(item.ustadz || "-")}</div>
      <div style="color:var(--text-muted);margin-bottom:4px;"><i class="fa-regular fa-clock"></i> ${waktuKajian}</div>
      <div style="color:var(--text-muted);margin-bottom:6px;"><i class="fa-solid fa-location-dot"></i> ${esc(item.tempat || "-")}, ${esc(item.kota || "-")}</div>
      <div style="font-size:0.8rem;color:var(--primary);border-top:1px dashed var(--border);padding-top:6px;margin-top:6px;">
        <i class="fa-regular fa-paper-plane"></i> Email konfirmasi akan dikirim ke: <strong>${esc(item.email_pengusul)}</strong>
      </div>
    `;
  }
  $("modal-approve-pengajuan").classList.remove("hidden");
}

function tutupModalApprove() {
  $("modal-approve-pengajuan").classList.add("hidden");
  targetPengajuan = null;
}

const btnBatalApprove = $("btn-batal-approve");
if (btnBatalApprove) btnBatalApprove.addEventListener("click", tutupModalApprove);

const btnKonfirmasiApprove = $("btn-konfirmasi-approve");
if (btnKonfirmasiApprove) {
  btnKonfirmasiApprove.addEventListener("click", async () => {
    if (!targetPengajuan) return;
    const id = targetPengajuan.ID || targetPengajuan.id;
    btnKonfirmasiApprove.disabled = true;
    btnKonfirmasiApprove.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memproses...`;

    try {
      const res = await fetch(`${API_BASE}/admin/pengajuan/${id}/approve`, {
        method: "POST",
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Gagal menyetujui usulan");

      tutupModalApprove();
      showToast("Usulan berhasil disetujui, jadwal diterbitkan, & email notifikasi terkirim!");
      loadPengajuanList();
      loadList(); // Refresh jadwal juga
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      btnKonfirmasiApprove.disabled = false;
      btnKonfirmasiApprove.innerHTML = `<i class="fa-solid fa-check"></i> Ya, Setujui & Terbitkan`;
    }
  });
}

/* ================= Modal Reject Pengajuan ================= */
function bukaModalReject(item) {
  targetPengajuan = item;
  $("reject-alasan-input").value = "";
  $("modal-reject-pengajuan").classList.remove("hidden");
}

function tutupModalReject() {
  $("modal-reject-pengajuan").classList.add("hidden");
  targetPengajuan = null;
}

const btnBatalReject = $("btn-batal-reject");
if (btnBatalReject) btnBatalReject.addEventListener("click", tutupModalReject);

const btnCloseReject = $("btn-close-reject");
if (btnCloseReject) btnCloseReject.addEventListener("click", tutupModalReject);

const btnKonfirmasiReject = $("btn-konfirmasi-reject");
if (btnKonfirmasiReject) {
  btnKonfirmasiReject.addEventListener("click", async () => {
    if (!targetPengajuan) return;
    const id = targetPengajuan.ID || targetPengajuan.id;
    const alasan = $("reject-alasan-input").value.trim();

    btnKonfirmasiReject.disabled = true;
    btnKonfirmasiReject.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Mengirim...`;

    try {
      const res = await fetch(`${API_BASE}/admin/pengajuan/${id}/reject`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ alasan_tolak: alasan }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Gagal menolak usulan");

      tutupModalReject();
      showToast("Usulan kajian ditolak & email pemberitahuan telah dikirimkan ke pengusul.");
      loadPengajuanList();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      btnKonfirmasiReject.disabled = false;
      btnKonfirmasiReject.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Kirim Penolakan`;
    }
  });
}

// Konfirmasi hapus arsip pengajuan
async function konfirmasiHapusPengajuan(id) {
  if (!confirm("Hapus data usulan ini secara permanen dari database?")) return;
  try {
    const res = await fetch(`${API_BASE}/admin/pengajuan/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Gagal menghapus");

    showToast("Data usulan berhasil dihapus.");
    loadPengajuanList();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

/* ================= Init ================= */
if (getToken() && localStorage.getItem("admin_role") === "admin") {
  showApp();
} else {
  localStorage.removeItem("jwt");
  localStorage.removeItem("admin_name");
  localStorage.removeItem("admin_role");
  showLogin();
}
