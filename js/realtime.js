// js/realtime.js — Real-time Visitors (page 4 of 6)
import { requireLoginOrRedirect, logout } from "./auth.js";
requireLoginOrRedirect();

import { ensureAnonAuth } from "./firebase-init.js";
import {
  fetchDashboardData,
  computeRealtimeStats,
  computeLocationsTable,
  computeRecentVisitors,
  computeLiveStream,
  relativeTime
} from "./data.js";
import {
  renderShell,
  setSyncStatus,
  buildLiveMapSVG,
  formatNumber
} from "./admin-shell.js";

renderShell({ activeId: "realtime", onLogout: logout });

// Real-time page refreshes faster than the shared preference — 10s,
// capped so it never goes slower than the user's global setting.
const REALTIME_REFRESH_MS = 10000;

function $(id) { return document.getElementById(id); }

function renderStats(sessions) {
  const stats = computeRealtimeStats(sessions);
  $("statOnlineNow").textContent = formatNumber(stats.onlineNow);
  $("statLast5").textContent = formatNumber(stats.last5Min);
  $("statLast30").textContent = formatNumber(stats.last30Min);
  $("statToday").textContent = formatNumber(stats.todayVisitors);
}

function renderMap(sessions) {
  const locations = computeLocationsTable(sessions);
  $("liveMap").innerHTML = buildLiveMapSVG(locations, { color: "#22d3ee" });
}

function renderRecentVisitors(pageviews, sessions) {
  const recent = computeRecentVisitors(pageviews, sessions, 10);
  const now = new Date();
  $("recentVisitorsBody").innerHTML =
    recent
      .map(
        (r) => `
        <tr>
          <td>${r.time.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })}</td>
          <td>${r.location}</td>
          <td>/${r.page}</td>
        </tr>`
      )
      .join("") || `<tr><td colspan="3" class="empty-row">No visits recorded yet.</td></tr>`;
}

function renderLiveStream(interactions, pageviews) {
  const events = computeLiveStream(interactions, pageviews, 25);
  const now = new Date();
  $("liveStreamList").innerHTML =
    events
      .map(
        (e) => `
        <li style="display:flex;align-items:center;gap:12px;padding:9px 4px;border-bottom:1px solid var(--border-soft);font-size:.84rem;">
          <span class="chip" style="flex-shrink:0;">${e.kind === "pageview" ? "View" : "Event"}</span>
          <span style="flex:1;color:var(--ink-dim);">${e.label || "—"}</span>
          <span style="color:var(--ink-faint);font-size:.76rem;flex-shrink:0;">${relativeTime(e.timestamp, now)}</span>
        </li>`
      )
      .join("") || `<li class="empty-row">No activity yet.</li>`;
}

async function loadAndRender() {
  const t0 = performance.now();
  const data = await fetchDashboardData();
  setSyncStatus(performance.now() - t0);

  renderStats(data.sessions);
  renderMap(data.sessions);
  renderRecentVisitors(data.pageviews, data.sessions);
  renderLiveStream(data.interactions, data.pageviews);

  $("lastUpdated").textContent = new Date().toLocaleTimeString("en-IN", {
    hour: "numeric", minute: "2-digit", hour12: true
  });
}

async function init() {
  try {
    await ensureAnonAuth();
    await loadAndRender();
    setInterval(() => loadAndRender().catch(console.error), REALTIME_REFRESH_MS);
  } catch (err) {
    console.error("Real-time load failed:", err);
    $("pageError").hidden = false;
    $("pageError").textContent = "Couldn't load live data. Check your connection and Firestore rules, then refresh.";
  }
}

init();
