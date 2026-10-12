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
  const params = new URLSearchParams({ page: page, limit: LIMIT, waktu: waktuAktif });
  if (kota) params.set("kota", kota);

  skeleton();
  emptyEl.classList.add("hidden");
  errorEl.classList.add("hidden");
  $("jadwal-sub").textContent = WAKTU_LABEL[waktuAktif] + (kota ? ` di ${kota}.` : ".");

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
    const params = new URLSearchParams({ waktu: "mendatang", limit: 1, page: 1 });
    if (kota) params.set("kota", kota);
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
    
    const metaParts = [];
    if (k.ustadz) metaParts.push(`<i class="fa-solid fa-user-tie"></i> ${esc(k.ustadz)}`);
    metaParts.push(`<i class="fa-regular fa-clock"></i> ${formatTanggal(k.waktu_mulai)}`);
    if (k.tempat) metaParts.push(`<i class="fa-solid fa-location-dot"></i> ${esc(k.tempat)}`);
    $("f-meta").innerHTML = metaParts.join(' <span style="opacity:0.4">•</span> ');

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

/* ---------- kota ---------- */
function refreshKotaLabel() {
  const kota = localStorage.getItem("kota");
  $("kota-nama").textContent = kota || "Semua kota";
  $("hero-kota-nama").textContent = kota || "Pilih kota";
}

function bukaModalKota() {
  $("modal-kota-input").value = localStorage.getItem("kota") || "";
  $("modal-kota").classList.remove("hidden");
  
  // highlight chip if selected
  const cur = (localStorage.getItem("kota") || "").toLowerCase();
  document.querySelectorAll(".city-chip").forEach(c => {
    c.classList.toggle("active", c.dataset.city.toLowerCase() === cur);
  });
  
  setTimeout(() => $("modal-kota-input").focus(), 80);
}

function tutupModalKota() {
  $("modal-kota").classList.add("hidden");
}

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

// Quick city chips
document.querySelectorAll(".city-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    $("modal-kota-input").value = chip.dataset.city;
    $("modal-kota-simpan").click();
  });
});

$("modal-kota-reset").addEventListener("click", () => {
  localStorage.removeItem("kota");
  tutupModalKota();
  refreshKotaLabel();
  page = 1;
  loadKajian();
  loadFeatured();
});

$("modal-kota-simpan").addEventListener("click", () => {
  const v = $("modal-kota-input").value.trim();
  if (v) localStorage.setItem("kota", v);
  else localStorage.removeItem("kota");
  tutupModalKota();
  refreshKotaLabel();
  page = 1;
  loadKajian();
  loadFeatured();
});

$("modal-kota-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("modal-kota-simpan").click();
});

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
loadKajian();
loadFeatured();
