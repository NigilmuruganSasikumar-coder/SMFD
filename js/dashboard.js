// js/dashboard.js
// -----------------------------------------------------------------------
// Overview page logic for dashboard.html (§10). Fetches once, renders
// everything, then re-fetches on an interval. The fetched data is handed
// to analytics-modal.js so opening the modal costs zero extra reads (§11).
// -----------------------------------------------------------------------

import { requireLoginOrRedirect, logout } from "./auth.js";

// Hard stop BEFORE any Firestore call or DOM paint of real data — setting
// location.href alone does not halt script execution, so this must throw.
requireLoginOrRedirect();

import { ensureAnonAuth } from "./firebase-init.js";
import {
  fetchDashboardData,
  getActiveSessions,
  computeTrafficTrend,
  computeDeviceSplit,
  computeFunnel,
  computePrimaryDevice,
  formatLakhs
} from "./data.js";
import { initAnalyticsModal, refreshAnalyticsModal } from "./analytics-modal.js";

const REFRESH_INTERVAL_MS = 30000;

let latestData = null;

function $(id) {
  return document.getElementById(id);
}

function renderStatCards(summary, activeSessions) {
  $("statTotalSessions").textContent = (summary.totalSessions ?? 0).toLocaleString("en-IN");
  $("statActiveSessions").textContent = activeSessions.length.toLocaleString("en-IN");
  $("statTotalQuotes").textContent = (summary.totalQuotesComputed ?? 0).toLocaleString("en-IN");
  $("statPipelineValue").textContent = formatLakhs(summary.pipelineValue ?? 0);
  $("statAllTimeViews").textContent = (summary.allTimeViews ?? 0).toLocaleString("en-IN");
}

function renderTrafficChart(pageviews) {
  const trend = computeTrafficTrend(pageviews, 7);
  const svg = $("trafficChartSvg");
  const width = 640;
  const height = 200;
  const padding = 28;
  const max = Math.max(1, ...trend.map((t) => t.count));
  const stepX = (width - padding * 2) / (trend.length - 1 || 1);

  const points = trend.map((t, i) => {
    const x = padding + i * stepX;
    const y = height - padding - (t.count / max) * (height - padding * 2);
    return { x, y, ...t };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${height - padding} L${points[0].x.toFixed(1)},${height - padding} Z`;

  const dots = points
    .map(
      (p) =>
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" class="chart-dot"><title>${p.date}: ${p.count}</title></circle>`
    )
    .join("");

  const labels = points
    .map(
      (p) =>
        `<text x="${p.x.toFixed(1)}" y="${height - 6}" class="chart-label" text-anchor="middle">${p.date.slice(5)}</text>`
    )
    .join("");

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.innerHTML = `
    <path d="${areaPath}" class="chart-area"></path>
    <path d="${linePath}" class="chart-line"></path>
    ${dots}
    ${labels}
  `;
}

function renderDeviceSplit(sessions) {
  const split = computeDeviceSplit(sessions);
  const total = split.mobile + split.desktop + split.other || 1;
  const mobilePct = Math.round((split.mobile / total) * 100);
  const desktopPct = Math.round((split.desktop / total) * 100);

  $("deviceSplitMobileBar").style.width = `${mobilePct}%`;
  $("deviceSplitDesktopBar").style.width = `${desktopPct}%`;
  $("deviceSplitMobileLabel").textContent = `Mobile — ${mobilePct}% (${split.mobile})`;
  $("deviceSplitDesktopLabel").textContent = `Desktop — ${desktopPct}% (${split.desktop})`;
}

function renderFunnel(summary, pageviews, interactions, quotes) {
  const steps = computeFunnel(summary, pageviews, interactions, quotes);
  const max = Math.max(1, ...steps.map((s) => s.value));
  const container = $("funnelContainer");
  container.innerHTML = steps
    .map((s) => {
      const pct = Math.round((s.value / max) * 100);
      return `
        <div class="funnel-row">
          <div class="funnel-row-label">
            <span>${s.label}</span>
            <span>${s.value.toLocaleString("en-IN")}</span>
          </div>
          <div class="funnel-track">
            <div class="funnel-fill" style="width:${pct}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderLiveIntelligence(activeSessions) {
  $("liveActiveCount").textContent = activeSessions.length.toLocaleString("en-IN");
  $("livePrimaryDevice").textContent = computePrimaryDevice(activeSessions) || "—";

  const sectionCounts = new Map();
  activeSessions.forEach((s) => {
    const section = s.activeSection || "Unknown";
    sectionCounts.set(section, (sectionCounts.get(section) || 0) + 1);
  });
  const topSection = Array.from(sectionCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  $("liveActiveSection").textContent = topSection ? topSection[0] : "—";
}

function setLastSynced(latencyMs) {
  $("syncLatency").textContent = `${Math.round(latencyMs)}ms`;
  $("syncTimestamp").textContent = new Date().toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

async function loadAndRender({ isFirstLoad = false } = {}) {
  const t0 = performance.now();
  const data = await fetchDashboardData();
  const latencyMs = performance.now() - t0;
  latestData = data;

  const activeSessions = getActiveSessions(data.sessions);

  renderStatCards(data.summary, activeSessions);
  renderTrafficChart(data.pageviews);
  renderDeviceSplit(data.sessions);
  renderFunnel(data.summary, data.pageviews, data.interactions, data.quotes);
  renderLiveIntelligence(activeSessions);
  setLastSynced(latencyMs);

  if (isFirstLoad) {
    initAnalyticsModal(() => latestData);
  } else {
    refreshAnalyticsModal();
  }
}

async function init() {
  try {
    await ensureAnonAuth();
    await loadAndRender({ isFirstLoad: true });
    setInterval(() => loadAndRender().catch(console.error), REFRESH_INTERVAL_MS);
  } catch (err) {
    console.error("Dashboard load failed:", err);
    $("dashboardError").hidden = false;
    $("dashboardError").textContent =
      "Couldn't load live data. Check your connection and Firestore rules, then refresh.";
  }
}

$("logoutBtn").addEventListener("click", logout);
$("openAnalyticsModalBtn").addEventListener("click", () => {
  document.dispatchEvent(new CustomEvent("smfd:open-analytics-modal"));
});

init();