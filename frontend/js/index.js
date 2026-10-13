const LIMIT = 12;
let page = 1;
let totalPages = 1;
let waktuAktif = "pekan_ini";
let countdownTimer = null;

const $ = (id) => document.getElementById(id);
const listEl = $("list");
const emptyEl = $("empty");
const errorEl = $("error");

const WAKTU_LABEL = {
  pekan_ini: "Menampilkan kajian pekan ini",
  mendatang: "Menampilkan semua kajian yang akan datang",
  lewat: "Menampilkan arsip kajian yang sudah lewat",
  semua: "Menampilkan seluruh arsip kajian",
};

/* ---------- util ---------- */
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function formatTanggal(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  const tgl = d.toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const jam = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return `${tgl}, ${jam} WIB`;
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

const NAMA_BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/* ---------- list kajian ---------- */
function skeleton() {
  listEl.innerHTML = "";
  for (let i = 0; i < 6; i++) {
    const d = document.createElement("div");
    d.className = "skeleton";
    listEl.appendChild(d);
  }
}

async function loadKajian() {
  const kota = localStorage.getItem("kota") || "";
  const provinsi = localStorage.getItem("provinsi") || "";
  const params = new URLSearchParams({ page: page, limit: LIMIT, waktu: waktuAktif });
  if (kota) params.set("kota", kota);
  if (provinsi) params.set("provinsi", provinsi);

  skeleton();
  emptyEl.classList.add("hidden");
  errorEl.classList.add("hidden");

  let wilayahTeks = "";
  if (kota && provinsi) {
    wilayahTeks = ` di ${kota}, ${provinsi}`;
  } else if (kota) {
    wilayahTeks = ` di ${kota}`;
  } else if (provinsi) {
    wilayahTeks = ` di ${provinsi}`;
  }
  $("jadwal-sub").textContent = WAKTU_LABEL[waktuAktif] + wilayahTeks + ".";

  try {
    const res = await fetch(`${API_BASE}/kajian?${params.toString()}`);
    const json = await res.json();
    const { data, total } = json.data;

    totalPages = Math.max(1, Math.ceil(total / LIMIT));
    render(data || []);

    $("page-info").textContent = `Halaman ${page} dari ${totalPages} • Total ${total} Kajian`;
    $("prev").disabled = page <= 1;
    $("next").disabled = page >= totalPages;
  } catch (e) {
    listEl.innerHTML = "";
    errorEl.classList.remove("hidden");
  }
}

function render(items) {
  listEl.innerHTML = "";
  emptyEl.classList.toggle("hidden", items.length > 0);

  items.forEach((k) => {
    const id = k.id || k.ID;
    const d = new Date(k.waktu_mulai);
    const lokasi = [k.tempat, k.kota].filter(Boolean).map(esc).join(" • ");

    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <a class="card-link" href="detail.html?id=${id}">
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
            ${renderBadge(k.untuk)}
            ${k.status === 'batal' ? '<span class="badge" style="background:rgba(220,38,38,0.15);color:#dc2626;border:1px solid rgba(220,38,38,0.3)"><i class="fa-solid fa-circle-xmark"></i> Dibatalkan</span>' : ''}
            ${k.status === 'selesai' ? '<span class="badge" style="background:var(--bg-subtle);color:var(--text-muted);border:1px solid var(--border)"><i class="fa-solid fa-circle-check"></i> Selesai</span>' : ''}
            ${k.live_url ? '<span class="badge" style="background:rgba(239,68,68,0.12);color:#dc2626;border:1px solid rgba(239,68,68,0.3)"><i class="fa-solid fa-tower-broadcast"></i> Live</span>' : ''}
          </div>
          <h3>${esc(k.judul)}</h3>
          <div class="card-meta-list">
            ${k.ustadz ? `<p class="ustadz"><i class="fa-solid fa-user-tie"></i> ${esc(k.ustadz)}</p>` : ""}
            <p class="meta"><i class="fa-regular fa-clock"></i> ${formatTanggal(k.waktu_mulai)}</p>
            ${lokasi ? `<p class="meta"><i class="fa-solid fa-location-dot"></i> ${lokasi}</p>` : ""}
          </div>
          <div class="card-footer-action">
            <span>Lihat Detail <i class="fa-solid fa-arrow-right"></i></span>
          </div>
        </div>
      </a>`;
    listEl.appendChild(card);
  });
}

/* ---------- featured + countdown ---------- */
async function loadFeatured() {
  try {
    const kota = localStorage.getItem("kota") || "";
    const provinsi = localStorage.getItem("provinsi") || "";
    const params = new URLSearchParams({ waktu: "mendatang", limit: 1, page: 1 });
    if (kota) params.set("kota", kota);
    if (provinsi) params.set("provinsi", provinsi);
    const res = await fetch(`${API_BASE}/kajian?${params.toString()}`);
    const json = await res.json();
    const k = (json.data.data || [])[0];
    if (!k) {
      $("featured").classList.add("hidden");
      return;
    }

    const id = k.id || k.ID;
    $("featured").classList.remove("hidden");
    $("f-judul").textContent = k.judul;
    
    const lokasiParts = [k.tempat, k.kota].filter(Boolean);
    const lokasiTeks = lokasiParts.map(esc).join(" • ");

    const metaParts = [];
    if (k.ustadz) {
      metaParts.push(`<span class="f-meta-item"><i class="fa-solid fa-user-tie"></i> <span>${esc(k.ustadz)}</span></span>`);
    }
    metaParts.push(`<span class="f-meta-item"><i class="fa-regular fa-clock"></i> <span>${formatTanggal(k.waktu_mulai)}</span></span>`);
    if (lokasiTeks) {
      if (k.map_url) {
        metaParts.push(`<span class="f-meta-item"><i class="fa-solid fa-location-dot"></i> <a href="${esc(k.map_url)}" target="_blank" rel="noopener" class="f-meta-link" title="Buka Google Maps">${lokasiTeks}</a></span>`);
      } else {
        metaParts.push(`<span class="f-meta-item"><i class="fa-solid fa-location-dot"></i> <span>${lokasiTeks}</span></span>`);
      }
    }
    $("f-meta").innerHTML = metaParts.join('<span class="f-meta-sep">•</span>');

    $("f-judul").style.cursor = "pointer";
    $("f-judul").onclick = () => (window.location = `detail.html?id=${id}`);

    const target = new Date(k.waktu_mulai).getTime();
    clearInterval(countdownTimer);
    const tick = () => {
      let selisih = Math.max(0, target - Date.now());
      const d = Math.floor(selisih / 864e5);
      const h = Math.floor((selisih % 864e5) / 36e5);
      const m = Math.floor((selisih % 36e5) / 6e4);
      const s = Math.floor((selisih % 6e4) / 1e3);
      $("cd-d").textContent = d;
      $("cd-h").textContent = String(h).padStart(2, "0");
      $("cd-m").textContent = String(m).padStart(2, "0");
      $("cd-s").textContent = String(s).padStart(2, "0");
    };
    tick();
    countdownTimer = setInterval(tick, 1000);
  } catch (e) {
    /* featured opsional, gagal diam-diam */
    $("featured").classList.add("hidden");
  }
}

/* ---------- data lokasi & modal filter ---------- */
let lokasiData = { provinsi: [], kota: [] };
let tempProvinsi = "";
let tempKota = "";

async function fetchLokasi() {
  try {
    const res = await fetch(`${API_BASE}/lokasi`);
    const json = await res.json();
    if (json.success && json.data) {
      lokasiData = {
        provinsi: json.data.provinsi || [],
        kota: json.data.kota || []
      };
    }
  } catch (e) {
    console.error("Gagal memuat data lokasi:", e);
  }
}

function refreshKotaLabel() {
  const kota = localStorage.getItem("kota") || "";
  const provinsi = localStorage.getItem("provinsi") || "";

  let label = "Semua wilayah";
  let heroLabel = "Pilih kota";

  if (kota) {
    label = kota;
    heroLabel = kota;
  } else if (provinsi) {
    label = provinsi;
    heroLabel = provinsi;
  }

  $("kota-nama").textContent = label;
  $("hero-kota-nama").textContent = heroLabel;
}

function updateCurrentLokasiBar() {
  const valEl = $("lokasi-current-value");
  const clearBtn = $("lokasi-clear-selection");

  if (tempKota && tempProvinsi) {
    valEl.textContent = `${tempKota} (${tempProvinsi})`;
    if (clearBtn) clearBtn.classList.remove("hidden");
  } else if (tempKota) {
    valEl.textContent = tempKota;
    if (clearBtn) clearBtn.classList.remove("hidden");
  } else if (tempProvinsi) {
    valEl.textContent = `Provinsi ${tempProvinsi}`;
    if (clearBtn) clearBtn.classList.remove("hidden");
  } else {
    valEl.textContent = "Semua Wilayah";
    if (clearBtn) clearBtn.classList.add("hidden");
  }
}

function renderProvinsiChips() {
  const container = $("provinsi-chips-wrap");
  const badge = $("provinsi-count-badge");
  if (!container) return;
  container.innerHTML = "";

  const provList = lokasiData.provinsi || [];
  if (badge) badge.textContent = `${provList.length} Provinsi`;

  if (provList.length === 0) {
    container.innerHTML = `<div class="lokasi-empty-hint"><i class="fa-solid fa-circle-info"></i> Belum ada data provinsi.</div>`;
    return;
  }

  // Chip "Semua Provinsi"
  const allChip = document.createElement("button");
  allChip.type = "button";
  allChip.className = "lokasi-chip" + (!tempProvinsi ? " active" : "");
  allChip.innerHTML = `<i class="fa-solid fa-globe"></i> Semua`;
  allChip.onclick = () => {
    tempProvinsi = "";
    renderProvinsiChips();
    renderKotaChips($("modal-kota-input") ? $("modal-kota-input").value.trim() : "");
    updateCurrentLokasiBar();
  };
  container.appendChild(allChip);

  provList.forEach((p) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lokasi-chip" + (tempProvinsi.toLowerCase() === p.nama.toLowerCase() ? " active" : "");
    btn.innerHTML = `<span>${esc(p.nama)}</span> <span class="chip-count">${p.total}</span>`;
    btn.onclick = () => {
      if (tempProvinsi.toLowerCase() === p.nama.toLowerCase()) {
        tempProvinsi = "";
      } else {
        tempProvinsi = p.nama;
        if (tempKota) {
          const matching = (lokasiData.kota || []).find(
            (k) => k.nama.toLowerCase() === tempKota.toLowerCase() && (k.provinsi || "").toLowerCase() === p.nama.toLowerCase()
          );
          if (!matching) tempKota = "";
        }
      }
      renderProvinsiChips();
      renderKotaChips($("modal-kota-input") ? $("modal-kota-input").value.trim() : "");
      updateCurrentLokasiBar();
    };
    container.appendChild(btn);
  });
}

function renderKotaChips(searchFilter = "") {
  const container = $("kota-chips-wrap");
  const badge = $("kota-count-badge");
  if (!container) return;
  container.innerHTML = "";

  let list = lokasiData.kota || [];

  // Filter berdasarkan provinsi jika ada provinsi yang dipilih
  if (tempProvinsi) {
    list = list.filter((k) => (k.provinsi || "").toLowerCase() === tempProvinsi.toLowerCase());
  }

  // Filter berdasarkan teks pencarian
  if (searchFilter) {
    const q = searchFilter.toLowerCase();
    list = list.filter((k) => k.nama.toLowerCase().includes(q) || (k.provinsi && k.provinsi.toLowerCase().includes(q)));
  }

  if (badge) badge.textContent = `${list.length} Kota`;

  if (list.length === 0) {
    container.innerHTML = `<div class="lokasi-empty-hint"><i class="fa-solid fa-circle-info"></i> Tidak ada kota yang sesuai.</div>`;
    return;
  }

  list.forEach((k) => {
    const btn = document.createElement("button");
    btn.type = "button";
    const isActive = tempKota.toLowerCase() === k.nama.toLowerCase();
    btn.className = "lokasi-chip" + (isActive ? " active" : "");
    btn.innerHTML = `<span>${esc(k.nama)}</span> <span class="chip-count">${k.total}</span>`;
    btn.title = k.provinsi ? `${k.nama}, ${k.provinsi}` : k.nama;
    btn.onclick = () => {
      tempKota = k.nama;
      if (k.provinsi) tempProvinsi = k.provinsi;
      simpanDanTerapkanLokasi();
    };
    container.appendChild(btn);
  });
}

async function bukaModalKota() {
  if (!lokasiData.provinsi.length && !lokasiData.kota.length) {
    await fetchLokasi();
  }

  tempProvinsi = localStorage.getItem("provinsi") || "";
  tempKota = localStorage.getItem("kota") || "";

  const inputEl = $("modal-kota-input");
  if (inputEl) inputEl.value = "";
  const clearInputBtn = $("modal-kota-clear");
  if (clearInputBtn) clearInputBtn.classList.add("hidden");

  renderProvinsiChips();
  renderKotaChips("");
  updateCurrentLokasiBar();

  $("modal-kota").classList.remove("hidden");
  if (inputEl) setTimeout(() => inputEl.focus(), 80);
}

function tutupModalKota() {
  $("modal-kota").classList.add("hidden");
}

function simpanDanTerapkanLokasi() {
  if (tempKota) {
    localStorage.setItem("kota", tempKota);
  } else {
    localStorage.removeItem("kota");
  }

  if (tempProvinsi) {
    localStorage.setItem("provinsi", tempProvinsi);
  } else {
    localStorage.removeItem("provinsi");
  }

  tutupModalKota();
  refreshKotaLabel();
  page = 1;
  loadKajian();
  loadFeatured();
}

function resetSemuaLokasi() {
  localStorage.removeItem("kota");
  localStorage.removeItem("provinsi");
  tempKota = "";
  tempProvinsi = "";
  tutupModalKota();
  refreshKotaLabel();
  page = 1;
  loadKajian();
  loadFeatured();
}

// Event Listeners Lokasi
$("hero-kota").addEventListener("click", bukaModalKota);
$("btn-ganti-kota").addEventListener("click", bukaModalKota);

const btnTutupModal = $("modal-kota-tutup");
if (btnTutupModal) btnTutupModal.addEventListener("click", tutupModalKota);

$("modal-kota").addEventListener("click", (e) => {
  if (e.target === $("modal-kota")) tutupModalKota();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("modal-kota").classList.contains("hidden")) {
    tutupModalKota();
  }
});

const clearSelectionBtn = $("lokasi-clear-selection");
if (clearSelectionBtn) {
  clearSelectionBtn.addEventListener("click", () => {
    tempKota = "";
    tempProvinsi = "";
    renderProvinsiChips();
    renderKotaChips($("modal-kota-input") ? $("modal-kota-input").value.trim() : "");
    updateCurrentLokasiBar();
  });
}

const inputKota = $("modal-kota-input");
const btnClearSearch = $("modal-kota-clear");

if (inputKota) {
  inputKota.addEventListener("input", () => {
    const v = inputKota.value.trim();
    if (btnClearSearch) btnClearSearch.classList.toggle("hidden", !v);
    renderKotaChips(v);
  });

  inputKota.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const v = inputKota.value.trim();
      if (v) {
        // Cari apakah ada kota yang cocok
        const match = (lokasiData.kota || []).find(
          (k) => k.nama.toLowerCase() === v.toLowerCase()
        );
        if (match) {
          tempKota = match.nama;
          if (match.provinsi) tempProvinsi = match.provinsi;
        } else {
          tempKota = v;
        }
      }
      simpanDanTerapkanLokasi();
    }
  });
}

if (btnClearSearch) {
  btnClearSearch.addEventListener("click", () => {
    if (inputKota) {
      inputKota.value = "";
      inputKota.focus();
    }
    btnClearSearch.classList.add("hidden");
    renderKotaChips("");
  });
}

$("modal-kota-reset").addEventListener("click", resetSemuaLokasi);
$("modal-kota-simpan").addEventListener("click", simpanDanTerapkanLokasi);

/* ---------- chips & pagination ---------- */
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    waktuAktif = chip.dataset.waktu;
    page = 1;
    loadKajian();
  });
});

$("prev").addEventListener("click", () => {
  if (page > 1) {
    page--;
    loadKajian();
    document.getElementById("jadwal").scrollIntoView({ behavior: "smooth" });
  }
});

$("next").addEventListener("click", () => {
  if (page < totalPages) {
    page++;
    loadKajian();
    document.getElementById("jadwal").scrollIntoView({ behavior: "smooth" });
  }
});

/* ---------- init ---------- */
refreshKotaLabel();
fetchLokasi();
loadKajian();
loadFeatured();
