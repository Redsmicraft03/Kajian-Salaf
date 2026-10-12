// Terapkan tema tersimpan sedini mungkin (mencegah kedip / FOUC)
(function () {
  const t = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", t);
})();

function refreshToggleIcon() {
  const t = document.documentElement.getAttribute("data-theme");
  document.querySelectorAll(".theme-toggle").forEach((b) => {
    b.innerHTML = t === "dark" ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    b.setAttribute("title", t === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap");
    b.setAttribute("aria-label", t === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  refreshToggleIcon();
  document.querySelectorAll(".theme-toggle").forEach((b) => {
    b.addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme");
      const next = cur === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
      refreshToggleIcon();
    });
  });
});
