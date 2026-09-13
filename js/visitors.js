// js/visitors.js — Visitors (page 3 of 6)
import { requireLoginOrRedirect, logout } from "./auth.js";
requireLoginOrRedirect();

import { ensureAnonAuth } from "./firebase-init.js";
import {
  fetchDashboardData,
  computeNewReturning,
  computeVisitorTrend,
  computeAvgSessionDuration,
  computePeriodComparison,
  computeGeography,
  computeDeviceSplit
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

renderShell({ activeId: "visitors", onLogout: logout });

function $(id) { return document.getElementById(id); }

function renderStats(data, rangeDays) {
  const totalVisitors = data.summary.totalSessions ?? data.sessions.length;
  const { newCount, returningCount } = computeNewReturning(data.sessions);
  const total = newCount + returningCount || 1;

  $("statTotalVisitors").textContent = formatNumber(totalVisitors);
  $("statNewVisitors").textContent = formatNumber(newCount);
  $("statReturningVisitors").textContent = formatNumber(returningCount);
  $("statNewPct").textContent = `${Math.round((newCount / total) * 100)}% of visitors`;
  $("statReturningPct").textContent = `${Math.round((returningCount / total) * 100)}% of visitors`;
  $("statAvgSession").textContent = formatDuration(computeAvgSessionDuration(data.sessions));

  const compare = computePeriodComparison(data.sessions, "startedAt", rangeDays);
  $("statTotalVisitorsDelta").innerHTML = deltaChipHTML(compare.pct);
}

function renderVisitorTrendChart(sessions, days) {
  const trend = computeVisitorTrend(sessions, days);
  const xLabels = trend.map((t) => t.date.slice(5));
  $("visitorTrendChart").innerHTML = buildLineChartSVG(
    [
      { label: "New", color: "#3b82f6", values: trend.map((t) => t.newVisitors) },
      { label: "Returning", color: "#f5c400", values: trend.map((t) => t.returningVisitors) }
    ],
    xLabels,
    { uid: "visitortrend", height: 230 }
  );
}

function renderNRDonut(sessions) {
  const { newCount, returningCount } = computeNewReturning(sessions);
  const total = newCount + returningCount || 1;
  $("nrDonut").innerHTML = buildDonutSVG(
    [
      { label: "New Visitors", value: newCount, color: "#3b82f6" },
      { label: "Returning Visitors", value: returningCount, color: "#f5c400" }
    ],
    { size: 160, stroke: 24 }
  );
  $("nrDonutTotal").textContent = formatNumber(total);
  $("nrLegend").innerHTML = `
    <div class="donut-legend-row"><span class="name"><i class="legend-dot" style="background:#3b82f6"></i>New Visitors</span><span class="val">${Math.round((newCount / total) * 1000) / 10}%</span></div>
    <div class="donut-legend-row"><span class="name"><i class="legend-dot" style="background:#f5c400"></i>Returning Visitors</span><span class="val">${Math.round((returningCount / total) * 1000) / 10}%</span></div>
  `;
}

function renderStateBars(sessions) {
  const geo = computeGeography(sessions);
  const states = geo.states.slice(0, 8);
  const max = Math.max(1, ...states.map((s) => s.count));
  $("stateBars").innerHTML =
    states
      .map(
        (s) => `
        <div class="bar-row">
          <div class="bar-name">${s.key}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.round((s.count / max) * 100)}%"></div></div>
          <div class="bar-count">${formatNumber(s.count)}</div>
        </div>`
      )
      .join("") || `<div class="empty-state">No state data yet.</div>`;
}

function renderDeviceBars(sessions) {
  const split = computeDeviceSplit(sessions);
  const rows = [
    { key: "Mobile", count: split.mobile },
    { key: "Desktop", count: split.desktop },
    { key: "Tablet", count: split.tablet }
  ];
  const max = Math.max(1, ...rows.map((r) => r.count));
  $("deviceBars").innerHTML = rows
    .map(
      (r) => `
      <div class="bar-row">
        <div class="bar-name">${r.key}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round((r.count / max) * 100)}%"></div></div>
        <div class="bar-count">${formatNumber(r.count)}</div>
      </div>`
    )
    .join("");
}

async function loadAndRender() {
  const rangeDays = Number($("rangeSelect").value) || 30;
  const t0 = performance.now();
  const data = await fetchDashboardData();
  setSyncStatus(performance.now() - t0);

  renderStats(data, rangeDays);
  renderVisitorTrendChart(data.sessions, rangeDays);
  renderNRDonut(data.sessions);
  renderStateBars(data.sessions);
  renderDeviceBars(data.sessions);
}

async function init() {
  try {
    await ensureAnonAuth();
    await loadAndRender();
    setInterval(() => loadAndRender().catch(console.error), getRefreshIntervalMs());
  } catch (err) {
    console.error("Visitors load failed:", err);
    $("pageError").hidden = false;
    $("pageError").textContent = "Couldn't load live data. Check your connection and Firestore rules, then refresh.";
  }
}

$("rangeSelect").addEventListener("change", () => loadAndRender().catch(console.error));

init();
