// js/top-referrals.js — Top Pages & Referrals (page 6 of 6)
import { requireLoginOrRedirect, logout } from "./auth.js";
requireLoginOrRedirect();

import { ensureAnonAuth } from "./firebase-init.js";
import {
  fetchDashboardData,
  computeTrafficSources,
  computeTopPagesTable,
  computeReferralsTable,
  computeSocialMediaTraffic
} from "./data.js";
import {
  renderShell,
  setSyncStatus,
  getRefreshIntervalMs,
  buildDonutSVG,
  exportCSV,
  formatNumber
} from "./admin-shell.js";

renderShell({ activeId: resolveActiveId(), onLogout: logout });

function resolveActiveId() {
  const hashId = location.hash.replace("#", "");
  return ["traffic-sources", "top-pages", "referrals"].includes(hashId) ? hashId : "top-pages";
}

function $(id) { return document.getElementById(id); }

const SOURCE_COLORS = {
  "Organic Search": "#3b82f6", "Direct": "#f5c400", "Social Media": "#22d3ee",
  "Referral": "#a855f7", "Others": "#5c6a90"
};

let latestTopPages = [];
let latestReferrals = [];

function renderSourceDonut(sessions) {
  const sources = computeTrafficSources(sessions);
  const total = sessions.length || 1;
  $("sourceDonut").innerHTML = buildDonutSVG(
    sources.map((s) => ({ label: s.key, value: s.count, color: SOURCE_COLORS[s.key] || "#5c6a90" })),
    { size: 160, stroke: 24 }
  );
  $("sourceDonutTotal").textContent = formatNumber(total);
  $("sourceLegend").innerHTML =
    sources
      .map(
        (s) => `
        <div class="donut-legend-row">
          <span class="name"><i class="legend-dot" style="background:${SOURCE_COLORS[s.key] || "#5c6a90"}"></i>${s.key}</span>
          <span class="val">${s.pct}%</span>
        </div>`
      )
      .join("") || `<div class="empty-state">No traffic yet.</div>`;
}

function renderTopPagesTable(pageviews) {
  latestTopPages = computeTopPagesTable(pageviews, 10);
  $("topPagesBody").innerHTML =
    latestTopPages
      .map(
        (row, i) => `<tr><td class="rank">${i + 1}</td><td>/${row.key}</td><td>${formatNumber(row.count)}</td><td>${row.pct}%</td></tr>`
      )
      .join("") || `<tr><td colspan="4" class="empty-row">No page views logged yet.</td></tr>`;
}

function renderReferralsTable(sessions) {
  latestReferrals = computeReferralsTable(sessions);
  $("referralsBody").innerHTML =
    latestReferrals
      .map(
        (row, i) => `<tr><td class="rank">${i + 1}</td><td>${row.key}</td><td>${formatNumber(row.count)}</td><td>${row.pct}%</td></tr>`
      )
      .join("") || `<tr><td colspan="4" class="empty-row">No referral data yet.</td></tr>`;
}

function renderSocialBars(sessions) {
  const rows = computeSocialMediaTraffic(sessions);
  const max = Math.max(1, ...rows.map((r) => r.count));
  $("socialBars").innerHTML =
    rows
      .map(
        (r) => `
        <div class="bar-row">
          <div class="bar-name">${r.key}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.round((r.count / max) * 100)}%"></div></div>
          <div class="bar-count">${formatNumber(r.count)}</div>
        </div>`
      )
      .join("") || `<div class="empty-state">No social referral traffic yet.</div>`;
}

function downloadReport() {
  const rows = [
    ["Section", "Item", "Count", "Percent"],
    ...latestTopPages.map((r, i) => ["Top Pages", `/${r.key}`, r.count, `${r.pct}%`]),
    ...latestReferrals.map((r) => ["Referrals", r.key, r.count, `${r.pct}%`])
  ];
  exportCSV(`smfd-traffic-report-${new Date().toISOString().slice(0, 10)}.csv`, rows[0], rows.slice(1));
}

async function loadAndRender() {
  const t0 = performance.now();
  const data = await fetchDashboardData();
  setSyncStatus(performance.now() - t0);

  renderSourceDonut(data.sessions);
  renderTopPagesTable(data.pageviews);
  renderReferralsTable(data.sessions);
  renderSocialBars(data.sessions);
}

async function init() {
  try {
    await ensureAnonAuth();
    await loadAndRender();
    setInterval(() => loadAndRender().catch(console.error), getRefreshIntervalMs());
  } catch (err) {
    console.error("Top Pages & Referrals load failed:", err);
    $("pageError").hidden = false;
    $("pageError").textContent = "Couldn't load live data. Check your connection and Firestore rules, then refresh.";
  }
}

$("rangeSelect").addEventListener("change", () => loadAndRender().catch(console.error));
$("reportBtn").addEventListener("click", downloadReport);
$("reportBtn2").addEventListener("click", downloadReport);

init();
