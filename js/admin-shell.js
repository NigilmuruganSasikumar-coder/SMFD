// js/admin-shell.js
// -----------------------------------------------------------------------
// Shared by every admin/*.html page. Renders the sidebar + topbar (so the
// nav markup lives in exactly one place), and exports small reusable
// building blocks — SVG chart drawing, CSV export, a country-centroid
// lookup for the live map, and the auto-refresh preference used by every
// page's polling interval (set on settings.html).
// -----------------------------------------------------------------------

export const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "fa-gauge-high", href: "dashboard.html" },
  { id: "page-views", label: "Page Views", icon: "fa-file-lines", href: "page-views.html" },
  { id: "visitors", label: "Visitors", icon: "fa-users", href: "visitors.html" },
  { id: "realtime", label: "Real-time", icon: "fa-tower-broadcast", href: "realtime.html" },
  { id: "traffic-sources", label: "Traffic Sources", icon: "fa-diagram-project", href: "top-referrals.html#traffic-sources" },
  { id: "top-pages", label: "Top Pages", icon: "fa-ranking-star", href: "top-referrals.html#top-pages" },
  { id: "referrals", label: "Referrals", icon: "fa-link", href: "top-referrals.html#referrals" },
  { id: "devices", label: "Devices", icon: "fa-mobile-screen", href: "devices-locations.html#devices" },
  { id: "locations", label: "Locations", icon: "fa-location-dot", href: "devices-locations.html#locations" },
  { id: "settings", label: "Settings", icon: "fa-gear", href: "settings.html" }
];

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/**
 * Renders the sidebar + topbar into #sidebarMount / #topbarMount, wires
 * the mobile off-canvas toggle and the logout button. Call once per page,
 * right after DOM is ready.
 *
 * @param {Object} opts
 * @param {string} opts.activeId - which NAV_ITEMS.id is "current"
 * @param {Function} opts.onLogout - called when the Log out button fires
 */
export function renderShell({ activeId, onLogout }) {
  const sidebarMount = document.getElementById("sidebarMount");
  const topbarMount = document.getElementById("topbarMount");
  if (!sidebarMount || !topbarMount) return;

  const navHtml = NAV_ITEMS.map((item) => {
    const isActive = item.id === activeId;
    return `<a href="${item.href}" class="${isActive ? "active" : ""}"><i class="fas ${item.icon}"></i><span>${item.label}</span></a>`;
  }).join("");

  sidebarMount.appendChild(
    el(`
      <aside class="admin-sidebar" id="adminSidebar">
        <div class="sidebar-brand">
          <img src="img/icon-192.png" alt="Selvamurugan Fast Drills logo">
          <div class="sidebar-brand-text">
            <strong>SELVAMURUGAN</strong>
            <strong class="accent">FAST DRILLS</strong>
            <span>Admin Analytics</span>
          </div>
        </div>
        <nav class="sidebar-nav">${navHtml}</nav>
        <div class="sidebar-promo">
          <strong>Powering Water. Building Tomorrow.</strong>
          Live analytics for the public site — refreshed automatically.
        </div>
      </aside>
    `)
  );

  const overlay = el(`<div class="sidebar-overlay" id="sidebarOverlay"></div>`);
  document.body.appendChild(overlay);

  topbarMount.appendChild(
    el(`
      <header class="admin-topbar">
        <button class="topbar-menu-btn" id="sidebarToggle" aria-label="Toggle menu"><i class="fas fa-bars"></i></button>
        <div class="topbar-sync">
          <span>Auto-sync <strong id="syncInterval">30s</strong></span>
          <span>Latency <strong id="syncLatency">—</strong></span>
          <span>Last sync <strong id="syncTimestamp">—</strong></span>
        </div>
        <div class="topbar-spacer"></div>
        <button class="topbar-bell" aria-label="Notifications"><i class="fas fa-bell"></i></button>
        <div class="topbar-admin">
          <div class="topbar-avatar">A</div>
          <div class="topbar-admin-text">
            <strong>Admin</strong>
            <span class="badge-superadmin">Super Admin</span>
          </div>
        </div>
        <button class="btn-logout" id="logoutBtn">Log out</button>
      </header>
    `)
  );

  const sidebar = document.getElementById("adminSidebar");
  const toggleBtn = document.getElementById("sidebarToggle");
  const closeSidebar = () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("open");
  };
  toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("open");
  });
  overlay.addEventListener("click", closeSidebar);
  sidebar.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeSidebar));

  document.getElementById("syncInterval").textContent = `${Math.round(getRefreshIntervalMs() / 1000)}s`;
  document.getElementById("logoutBtn").addEventListener("click", () => {
    if (typeof onLogout === "function") onLogout();
  });
}

/** Sets the topbar's "Latency" / "Last sync" readout after a data refresh. */
export function setSyncStatus(latencyMs) {
  const latencyEl = document.getElementById("syncLatency");
  const tsEl = document.getElementById("syncTimestamp");
  if (latencyEl) latencyEl.textContent = `${Math.round(latencyMs)}ms`;
  if (tsEl) {
    tsEl.textContent = new Date().toLocaleTimeString("en-IN", {
      hour: "numeric", minute: "2-digit", hour12: true
    });
  }
}

/* ---------------------------------------------------------------------
   Auto-refresh interval preference — set on settings.html, read by every
   page's polling loop. Falls back to 30s if never set.
   ------------------------------------------------------------------- */

const REFRESH_KEY = "smfd_admin_refresh_ms";

export function getRefreshIntervalMs() {
  const stored = Number(localStorage.getItem(REFRESH_KEY));
  return Number.isFinite(stored) && stored >= 5000 ? stored : 30000;
}

export function setRefreshIntervalMs(ms) {
  localStorage.setItem(REFRESH_KEY, String(ms));
}


/* ---------------------------------------------------------------------
   CSV export — generic, used by any page with a data table.
   ------------------------------------------------------------------- */

export function exportCSV(filename, headers, rows) {
  const escapeCell = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escapeCell).join(",")].concat(
    rows.map((row) => row.map(escapeCell).join(","))
  );
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}


/* ---------------------------------------------------------------------
   Chart builders — plain inline SVG, no external chart library. Every
   function returns an innerHTML string; the caller sets it on an <svg>.
   ------------------------------------------------------------------- */

/**
 * Multi-series line chart with optional filled area under the first series.
 * @param {Array<{label:string,color:string,values:number[]}>} series
 * @param {string[]} xLabels
 */
export function buildLineChartSVG(series, xLabels, opts = {}) {
  const width = opts.width || 640;
  const height = opts.height || 220;
  const padding = { top: 14, right: 14, bottom: 26, left: 14 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const allValues = series.flatMap((s) => s.values);
  const max = Math.max(1, ...allValues);
  const n = xLabels.length;
  const stepX = n > 1 ? innerW / (n - 1) : 0;

  const toPoints = (values) =>
    values.map((v, i) => ({
      x: padding.left + i * stepX,
      y: padding.top + innerH - (v / max) * innerH
    }));

  const gridLines = [0, 0.25, 0.5, 0.75, 1]
    .map((t) => {
      const y = padding.top + innerH * t;
      return `<line x1="${padding.left}" y1="${y.toFixed(1)}" x2="${width - padding.right}" y2="${y.toFixed(1)}" class="chart-grid" />`;
    })
    .join("");

  const seriesSvg = series
    .map((s, si) => {
      const pts = toPoints(s.values);
      const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
      let areaSvg = "";
      if (si === 0 && opts.fillFirst !== false) {
        const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${padding.top + innerH} L${pts[0].x.toFixed(1)},${padding.top + innerH} Z`;
        areaSvg = `<path d="${areaPath}" fill="url(#chartFill-${opts.uid})" class="chart-area"></path>`;
      }
      const dots = pts
        .map((p, i) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.2" class="chart-dot" style="stroke:${s.color}"><title>${xLabels[i]}: ${s.values[i]}</title></circle>`)
        .join("");
      return `${areaSvg}<path d="${linePath}" class="chart-line" style="stroke:${s.color}"></path>${dots}`;
    })
    .join("");

  const labelStep = n > 8 ? Math.ceil(n / 7) : 1;
  const labels = xLabels
    .map((lbl, i) => {
      if (i % labelStep !== 0 && i !== n - 1) return "";
      const x = padding.left + i * stepX;
      return `<text x="${x.toFixed(1)}" y="${height - 6}" class="chart-axis-label" text-anchor="middle">${lbl}</text>`;
    })
    .join("");

  const defs = series
    .map((s, si) =>
      si === 0
        ? `<linearGradient id="chartFill-${opts.uid}" x1="0" y1="0" x2="0" y2="1">
             <stop offset="0%" stop-color="${s.color}" stop-opacity="0.35" />
             <stop offset="100%" stop-color="${s.color}" stop-opacity="0" />
           </linearGradient>`
        : ""
    )
    .join("");

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" preserveAspectRatio="none"><defs>${defs}</defs>${gridLines}${seriesSvg}${labels}</svg>`;
}

/** Simple vertical bar chart, single series. */
export function buildBarChartSVG(values, xLabels, opts = {}) {
  const width = opts.width || 640;
  const height = opts.height || 200;
  const padding = { top: 10, right: 10, bottom: 24, left: 10 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(1, ...values);
  const n = values.length;
  const gap = 4;
  const barW = Math.max(2, innerW / n - gap);

  const bars = values
    .map((v, i) => {
      const barH = (v / max) * innerH;
      const x = padding.left + i * (innerW / n) + gap / 2;
      const y = padding.top + innerH - barH;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" rx="2" class="chart-bar"><title>${xLabels[i]}: ${v}</title></rect>`;
    })
    .join("");

  const labelStep = n > 8 ? Math.ceil(n / 7) : 1;
  const labels = xLabels
    .map((lbl, i) => {
      if (i % labelStep !== 0 && i !== n - 1) return "";
      const x = padding.left + i * (innerW / n) + innerW / n / 2;
      return `<text x="${x.toFixed(1)}" y="${height - 6}" class="chart-axis-label" text-anchor="middle">${lbl}</text>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" preserveAspectRatio="none">${bars}${labels}</svg>`;
}

/**
 * Donut chart. segments: [{label,value,color}]. Returns an <svg> string;
 * the caller overlays center text via a wrapping div (see
 * devices-locations.js for the pattern).
 */
export function buildDonutSVG(segments, opts = {}) {
  const size = opts.size || 160;
  const stroke = opts.stroke || 22;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;

  let offset = 0;
  const arcs = segments
    .map((s) => {
      const frac = s.value / total;
      const dash = frac * circumference;
      const gap = circumference - dash;
      const rotation = (offset / total) * 360 - 90;
      offset += s.value;
      return `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${stroke}"
                stroke-dasharray="${dash.toFixed(1)} ${gap.toFixed(1)}"
                transform="rotate(${rotation.toFixed(1)} ${c} ${c})"
                stroke-linecap="butt"><title>${s.label}: ${s.value}</title></circle>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${arcs}</svg>`;
}


/* ---------------------------------------------------------------------
   Live map — approximate equirectangular projection over a curated set
   of real country centroids. Only countries we have a centroid for get
   a marker; every country still appears in the accompanying table
   regardless, so nothing is hidden — this is just the visual layer.
   ------------------------------------------------------------------- */

export const COUNTRY_CENTROIDS = {
  "India": [22.0, 79.0], "United States": [39.8, -98.6], "United Kingdom": [54.0, -2.0],
  "Canada": [56.1, -106.3], "Singapore": [1.35, 103.8], "United Arab Emirates": [23.4, 53.8],
  "Australia": [-25.3, 133.8], "Germany": [51.2, 10.5], "France": [46.6, 2.2],
  "China": [35.9, 104.2], "Japan": [36.2, 138.3], "Brazil": [-14.2, -51.9],
  "South Africa": [-30.6, 22.9], "Russia": [61.5, 105.3], "Saudi Arabia": [23.9, 45.1],
  "Malaysia": [4.2, 101.9], "Indonesia": [-0.8, 113.9], "Nepal": [28.4, 84.1],
  "Sri Lanka": [7.9, 80.8], "Bangladesh": [23.7, 90.4], "Pakistan": [30.4, 69.3],
  "Qatar": [25.4, 51.2], "Oman": [21.5, 55.9], "Kuwait": [29.3, 47.5],
  "New Zealand": [-41.0, 174.9], "Netherlands": [52.1, 5.3], "Italy": [41.9, 12.6],
  "Spain": [40.5, -3.7], "Mexico": [23.6, -102.5], "South Korea": [35.9, 127.8]
};

/** lat/lon -> {x,y} percentage position within a 0-100 equirectangular box. */
export function projectLatLon(lat, lon) {
  return { x: ((lon + 180) / 360) * 100, y: ((90 - lat) / 180) * 100 };
}

/** Builds the "Live Visitor Map" panel: a soft dotted backdrop + glowing
 * markers sized by visitor count, for whichever countries we can place. */
export function buildLiveMapSVG(countryCounts, opts = {}) {
  const width = 1000, height = 460;
  const max = Math.max(1, ...countryCounts.map((c) => c.count));

  // Soft decorative dot backdrop (not a literal coastline — a stylised
  // grid consistent with the reference dashboard's "sonar" aesthetic).
  let backdrop = "";
  for (let gx = 0; gx < 50; gx++) {
    for (let gy = 0; gy < 24; gy++) {
      const x = (gx / 49) * width;
      const y = (gy / 23) * height;
      backdrop += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1" fill="rgba(255,255,255,0.05)"></circle>`;
    }
  }

  const markers = countryCounts
    .map((c) => {
      const centroid = COUNTRY_CENTROIDS[c.key];
      if (!centroid) return "";
      const { x, y } = projectLatLon(centroid[0], centroid[1]);
      const px = (x / 100) * width;
      const py = (y / 100) * height;
      const radius = 5 + (c.count / max) * 16;
      const color = opts.color || "#22d3ee";
      return `
        <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(radius * 1.8).toFixed(1)}" fill="${color}" opacity="0.14"></circle>
        <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${radius.toFixed(1)}" fill="${color}" opacity="0.85"><title>${c.key}: ${c.count}</title></circle>
        <text x="${px.toFixed(1)}" y="${(py - radius - 5).toFixed(1)}" class="map-marker-label" text-anchor="middle">${c.key}</text>
      `;
    })
    .join("");

  return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">${backdrop}${markers}</svg>`;
}


/* ---------------------------------------------------------------------
   Small formatting helpers shared across pages.
   ------------------------------------------------------------------- */

export function formatNumber(n) {
  return (Number(n) || 0).toLocaleString("en-IN");
}

export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}m ${rem}s` : `${rem}s`;
}

export function deltaChipHTML(pct) {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) {
    return `<span class="stat-delta flat"><i class="fas fa-minus"></i> No prior data</span>`;
  }
  if (pct === 0) return `<span class="stat-delta flat"><i class="fas fa-minus"></i> 0%</span>`;
  const up = pct > 0;
  return `<span class="stat-delta ${up ? "up" : "down"}"><i class="fas fa-arrow-${up ? "up" : "down"}"></i> ${Math.abs(pct).toFixed(1)}%</span>`;
}
