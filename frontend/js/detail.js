const $ = (id) => document.getElementById(id);

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function formatTanggalLengkap(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  const tgl = d.toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const jam = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return `${tgl}, pukul ${jam} WIB`;
}

function renderBadge(untuk) {
  const u = (untuk || "umum").toLowerCase();
  let icon = "fa-users";
  let label = "Umum";
  if (u === "ikhwan") {
    icon = "fa-person";
    label = "Khusus Ikhwan";
  } else if (u === "akhwat") {
    icon = "fa-person-dress";
    label = "Khusus Akhwat";
  }
  return `<span class="badge badge-${esc(u)}"><i class="fa-solid ${icon}"></i> ${label}</span>`;
}

function renderStatusBadge(status) {
  const s = (status || "upcoming").toLowerCase();
  if (s === "selesai") {
    return `<span class="badge" style="background:var(--bg-subtle);color:var(--text-muted);border:1px solid var(--border)"><i class="fa-solid fa-circle-check"></i> Selesai</span>`;
  }
  if (s === "batal") {
    return `<span class="badge" style="background:rgba(220,38,38,0.15);color:#dc2626;border:1px solid rgba(220,38,38,0.3)"><i class="fa-solid fa-circle-xmark"></i> Dibatalkan</span>`;
  }
  return `<span class="badge" style="background:var(--primary-soft);color:var(--primary);border:1px solid var(--primary-border)"><i class="fa-solid fa-clock"></i> Akan Datang</span>`;
}

function showToast(pesan) {
  const toast = $("toast");
  const text = $("toast-text");
  if (!toast) return;
  if (text) text.textContent = pesan;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3200);
}

// Format waktu untuk link Google Calendar
function makeGoogleCalendarUrl(k) {
  if (!k.waktu_mulai) return null;
  const start = new Date(k.waktu_mulai);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // estimasi 2 jam
  const fmt = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
  const dates = `${fmt(start)}/${fmt(end)}`;
  const title = encodeURIComponent(k.judul || "Kajian Salaf");
  const details = encodeURIComponent(
    `Pemateri: ${k.ustadz || "-"}\nTempat: ${k.tempat || "-"}\nSumber: ${window.location.href}`
  );
  const location = encodeURIComponent([k.tempat, k.kota, k.provinsi].filter(Boolean).join(", "));
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
}

async function load() {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    $("error").classList.remove("hidden");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/kajian/${id}`);
    const json = await res.json();
    if (!json.success || !json.data) throw new Error("not found");
    render(json.data);
  } catch (e) {
    $("error").classList.remove("hidden");
  }
}

function render(k) {
  const lokasi = [k.tempat, k.kota, k.provinsi].filter(Boolean).map(esc).join(", ");
  const calUrl = makeGoogleCalendarUrl(k);

  const tombol = [];
  if (k.map_url) {
    tombol.push(`
      <a class="btn btn-ghost" href="${esc(k.map_url)}" target="_blank" rel="noopener">
        <i class="fa-solid fa-map-location-dot"></i> Buka Google Maps
      </a>`);
  }
  if (k.live_url) {
    tombol.push(`
      <a class="btn btn-danger" href="${esc(k.live_url)}" target="_blank" rel="noopener">
        <i class="fa-brands fa-youtube"></i> Tonton Live Streaming
      </a>`);
  }
  if (calUrl) {
    tombol.push(`
      <a class="btn btn-ghost" href="${calUrl}" target="_blank" rel="noopener">
        <i class="fa-regular fa-calendar-plus"></i> Tambah ke Kalender
      </a>`);
  }
  tombol.push(`
    <button class="btn btn-ghost" id="btn-share" type="button">
      <i class="fa-solid fa-share-nodes"></i> Bagikan Jadwal
    </button>`);

  $("detail").innerHTML = `
    <div class="detail-layout">
      <div class="detail-poster-card">
        ${k.poster_url
          ? `<img src="${esc(k.poster_url)}" alt="${esc(k.judul)}" onerror="this.parentElement.innerHTML='<div class=\\'detail-poster-ph\\'><i class=\\'fa-solid fa-mosque\\'></i><span>Poster tidak tersedia</span></div>'">`
          : `<div class="detail-poster-ph"><i class="fa-solid fa-mosque"></i><span>Poster tidak tersedia</span></div>`}
      </div>

      <div class="detail-card">
        <div class="detail-badges">
          ${renderBadge(k.untuk)}
          ${renderStatusBadge(k.status)}
        </div>

        <h1 class="detail-title">${esc(k.judul)}</h1>

        <div class="info-cards-grid">
          ${k.ustadz ? `
            <div class="info-item">
              <div class="info-icon-box"><i class="fa-solid fa-user-tie"></i></div>
              <div class="info-item-content">
                <div class="info-item-label">Pemateri / Ustadz</div>
                <div class="info-item-val">${esc(k.ustadz)}</div>
              </div>
            </div>` : ""}

          <div class="info-item">
            <div class="info-icon-box"><i class="fa-regular fa-clock"></i></div>
            <div class="info-item-content">
              <div class="info-item-label">Waktu Kajian</div>
              <div class="info-item-val">${formatTanggalLengkap(k.waktu_mulai)}</div>
            </div>
          </div>

          ${lokasi ? `
            <div class="info-item">
              <div class="info-icon-box"><i class="fa-solid fa-location-dot"></i></div>
              <div class="info-item-content">
                <div class="info-item-label">Lokasi / Tempat</div>
                <div class="info-item-val">${lokasi}</div>
              </div>
            </div>` : ""}
        </div>

        <div class="btn-row">
          ${tombol.join("")}
        </div>
      </div>
    </div>`;

  document.title = `${k.judul} — Jadwal Kajian Salaf`;

  // Bagikan handler
  const btnShare = $("btn-share");
  if (btnShare) {
    btnShare.addEventListener("click", async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: k.judul,
            text: `Jadwal Kajian: ${k.judul} bersama ${k.ustadz || "Ustadz"}`,
            url: window.location.href,
          });
          return;
        } catch (err) {
          // fallback to clipboard
        }
      }
      
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast("Tautan kajian berhasil disalin ke clipboard!");
      } catch (e) {
        showToast("Gagal menyalin tautan.");
      }
    });
  }
}

load();
