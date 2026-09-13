// js/dashboard.js — Dashboard Overview (page 1 of 6)
import { requireLoginOrRedirect, logout } from "./auth.js";
requireLoginOrRedirect();

import { ensureAnonAuth } from "./firebase-init.js";
import {
  fetchDashboardData,
  getActiveSessions,
  computeDeviceSplit,
  computeFunnel,
  computePrimaryDevice,
  computePageViewsAndVisitorsTrend,
  computeTrafficSources,
  computeAvgSessionDuration,
  computePeriodComparison,
  formatLakhs
} from "./data.js";
import {
  renderShell,
  setSyncStatus,
  getRefreshIntervalMs,
  buildLineChartSVG,
  buildDonutSVG,
  formatNumber,
  formatDuration,
  deltaChipHTML
} from "./admin-shell.js";

renderShell({ activeId: "dashboard", onLogout: logout });

const SOURCE_COLORS = {
  "Organic Search": "#3b82f6",
  "Direct": "#f5c400",
  "Social Media": "#22d3ee",
  "Referral": "#a855f7",
  "Others": "#5c6a90"
};

function $(id) { return document.getElementById(id); }

function renderStatCards(data, activeSessions, rangeDays) {
  const totalViews = data.summary.allTimeViews ?? data.pageviews.length;
  const totalVisitors = data.summary.totalSessions ?? data.sessions.length;

  $("statPageViews").textContent = formatNumber(totalViews);
  $("statVisitors").textContent = formatNumber(totalVisitors);
  $("statOnlineNow").textContent = formatNumber(activeSessions.length);
  $("statAvgSession").textContent = formatDuration(computeAvgSessionDuration(data.sessions));

  const pvCompare = computePeriodComparison(data.pageviews, "timestamp", rangeDays);
  const visitorCompare = computePeriodComparison(data.sessions, "startedAt", rangeDays);
  $("statPageViewsDelta").innerHTML = deltaChipHTML(pvCompare.pct);
  $("statVisitorsDelta").innerHTML = deltaChipHTML(visitorCompare.pct);
}

function renderPVVChart(pageviews, days) {
  const trend = computePageViewsAndVisitorsTrend(pageviews, days);
  const xLabels = trend.map((t) => t.date.slice(5));
  const svg = buildLineChartSVG(
    [
      { label: "Page Views", color: "#3b82f6", values: trend.map((t) => t.views) },
      { label: "Visitors", color: "#f5c400", values: trend.map((t) => t.visitors) }
    ],
    xLabels,
    { uid: "pvv", height: 240 }
  );
  $("pvvChart").innerHTML = svg;
}

function renderSourceDonut(sessions) {
  const sources = computeTrafficSources(sessions);
  const total = sessions.length || 1;
  const segments = sources.map((s) => ({ label: s.key, value: s.count, color: SOURCE_COLORS[s.key] || "#5c6a90" }));
  $("sourceDonut").innerHTML = buildDonutSVG(segments, { size: 160, stroke: 24 });
  $("sourceDonutTotal").textContent = formatNumber(total);
  $("sourceLegend").innerHTML = sources
    .map(
      (s) => `
      <div class="donut-legend-row">
        <span class="name"><i class="legend-dot" style="background:${SOURCE_COLORS[s.key] || "#5c6a90"}"></i>${s.key}</span>
        <span class="val">${s.pct}%</span>
      </div>`
    )
    .join("") || `<div class="empty-state">No traffic yet.</div>`;
}

function renderFunnel(summary, pageviews, interactions, quotes) {
  const steps = computeFunnel(summary, pageviews, interactions, quotes);
  const max = Math.max(1, ...steps.map((s) => s.value));
  $("funnelContainer").innerHTML = steps
    .map((s) => {
      const pct = Math.round((s.value / max) * 100);
      return `
        <div class="bar-row">
          <div class="bar-name">${s.label}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          <div class="bar-count">${formatNumber(s.value)}</div>
        </div>`;
    })
    .join("");
}

function renderDeviceSplit(sessions) {
  const split = computeDeviceSplit(sessions);
  const total = split.mobile + split.desktop + split.tablet + split.other || 1;
  const mobilePct = Math.round((split.mobile / total) * 100);
  const desktopPct = Math.round((split.desktop / total) * 100);
  $("deviceSplitMobileBar").style.width = `${mobilePct}%`;
  $("deviceSplitDesktopBar").style.width = `${desktopPct}%`;
  $("deviceSplitMobileLabel").textContent = `Mobile — ${mobilePct}% (${split.mobile})`;
  $("deviceSplitDesktopLabel").textContent = `Desktop — ${desktopPct}% (${split.desktop})`;
}

function renderLiveIntelligence(activeSessions) {
  $("liveActiveCount").textContent = formatNumber(activeSessions.length);
  $("livePrimaryDevice").textContent = computePrimaryDevice(activeSessions) || "—";
  const sectionCounts = new Map();
  activeSessions.forEach((s) => {
    const section = s.activeSection || "Unknown";
    sectionCounts.set(section, (sectionCounts.get(section) || 0) + 1);
  });
  const topSection = Array.from(sectionCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  $("liveActiveSection").textContent = topSection ? topSection[0] : "—";
}

function renderBusinessMetrics(summary) {
  $("statTotalQuotes").textContent = formatNumber(summary.totalQuotesComputed ?? 0);
  $("statPipelineValue").textContent = formatLakhs(summary.pipelineValue ?? 0);
  $("statAllTimeViews").textContent = formatNumber(summary.allTimeViews ?? 0);
  $("statTotalSessions").textContent = formatNumber(summary.totalSessions ?? 0);
}

async function loadAndRender() {
  const rangeDays = Number($("rangeSelect").value) || 30;
  const t0 = performance.now();
  const data = await fetchDashboardData();
  setSyncStatus(performance.now() - t0);

  const activeSessions = getActiveSessions(data.sessions);
  renderStatCards(data, activeSessions, rangeDays);
  renderPVVChart(data.pageviews, rangeDays);
  renderSourceDonut(data.sessions);
  renderFunnel(data.summary, data.pageviews, data.interactions, data.quotes);
  renderDeviceSplit(data.sessions);
  renderLiveIntelligence(activeSessions);
  renderBusinessMetrics(data.summary);
}

async function init() {
  try {
    await ensureAnonAuth();
    await loadAndRender();
    setInterval(() => loadAndRender().catch(console.error), getRefreshIntervalMs());
  } catch (err) {
    console.error("Dashboard load failed:", err);
    $("pageError").hidden = false;
    $("pageError").textContent = "Couldn't load live data. Check your connection and Firestore rules, then refresh.";
  }
}

$("rangeSelect").addEventListener("change", () => loadAndRender().catch(console.error));

init();
