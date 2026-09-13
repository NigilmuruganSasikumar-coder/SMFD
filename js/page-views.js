// js/page-views.js — Page Views (page 2 of 6)
import { requireLoginOrRedirect, logout } from "./auth.js";
requireLoginOrRedirect();

import { ensureAnonAuth } from "./firebase-init.js";
import {
  fetchDashboardData,
  computeTrafficTrend,
  computeTopPagesTable,
  computeUniquePageViews,
  computeBounceRate,
  computeAvgTimeOnPage,
  computePeriodComparison,
  computeSectionDistribution,
  computePageViewsAndVisitorsTrend
} from "./data.js";
import {
  renderShell,
  setSyncStatus,
  getRefreshIntervalMs,
  buildLineChartSVG,
  exportCSV,
  formatNumber,
  formatDuration,
  deltaChipHTML
} from "./admin-shell.js";

renderShell({ activeId: "page-views", onLogout: logout });

function $(id) { return document.getElementById(id); }
let latestTopPages = [];

function renderStats(data, rangeDays) {
  const totalViews = data.summary.allTimeViews ?? data.pageviews.length;
  $("statTotalViews").textContent = formatNumber(totalViews);
  $("statUniqueViews").textContent = formatNumber(computeUniquePageViews(data.pageviews));
  $("statAvgTime").textContent = formatDuration(computeAvgTimeOnPage(data.pageviews, data.sessions));
  $("statBounce").textContent = `${computeBounceRate(data.pageviews)}%`;

  const compare = computePeriodComparison(data.pageviews, "timestamp", rangeDays);
  $("statTotalViewsDelta").innerHTML = deltaChipHTML(compare.pct);
}

function renderTopPagesTable(pageviews) {
  latestTopPages = computeTopPagesTable(pageviews, 12);
  $("topPagesBody").innerHTML =
    latestTopPages
      .map(
        (row, i) => `
        <tr>
          <td class="rank">${i + 1}</td>
          <td>/${row.key}</td>
          <td>${formatNumber(row.count)}</td>
          <td>${row.pct}%</td>
        </tr>`
      )
      .join("") || `<tr><td colspan="4" class="empty-row">No page views logged yet.</td></tr>`;
}

function renderTrendChart(pageviews, days) {
  const trend = computeTrafficTrend(pageviews, days);
  const xLabels = trend.map((t) => t.date.slice(5));
  $("trendChart").innerHTML = buildLineChartSVG(
    [{ label: "Page Views", color: "#3b82f6", values: trend.map((t) => t.count) }],
    xLabels,
    { uid: "trend", height: 220 }
  );
}

function renderDualChart(pageviews, days) {
  // Real per-day counts: "views" = total pageviews that day, "visitors"
  // (used here as "Unique Views") = distinct sessions that viewed a page
  // that day — both computed straight from the fetched pageviews, no
  // estimated ratio.
  const trend = computePageViewsAndVisitorsTrend(pageviews, days);
  const xLabels = trend.map((t) => t.date.slice(5));
  $("dualChart").innerHTML = buildLineChartSVG(
    [
      { label: "Page Views", color: "#3b82f6", values: trend.map((t) => t.views) },
      { label: "Unique Views", color: "#f5c400", values: trend.map((t) => t.visitors) }
    ],
    xLabels,
    { uid: "dual", height: 220, fillFirst: false }
  );
}

function renderSectionBars(sessions) {
  const sections = computeSectionDistribution(sessions);
  const max = Math.max(1, ...sections.map((s) => s.count));
  $("sectionBars").innerHTML =
    sections
      .map(
        (s) => `
        <div class="bar-row">
          <div class="bar-name">${s.key}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.round((s.count / max) * 100)}%"></div></div>
          <div class="bar-count">${formatNumber(s.count)}</div>
        </div>`
      )
      .join("") || `<div class="empty-state">No section activity recorded yet.</div>`;
}

async function loadAndRender() {
  const rangeDays = Number($("rangeSelect").value) || 30;
  const t0 = performance.now();
  const data = await fetchDashboardData();
  setSyncStatus(performance.now() - t0);

  renderStats(data, rangeDays);
  renderTopPagesTable(data.pageviews);
  renderTrendChart(data.pageviews, rangeDays);
  renderDualChart(data.pageviews, rangeDays);
  renderSectionBars(data.sessions);
}

async function init() {
  try {
    await ensureAnonAuth();
    await loadAndRender();
    setInterval(() => loadAndRender().catch(console.error), getRefreshIntervalMs());
  } catch (err) {
    console.error("Page Views load failed:", err);
    $("pageError").hidden = false;
    $("pageError").textContent = "Couldn't load live data. Check your connection and Firestore rules, then refresh.";
  }
}

$("rangeSelect").addEventListener("change", () => loadAndRender().catch(console.error));
$("exportBtn").addEventListener("click", () => {
  exportCSV(
    "top-pages.csv",
    ["Rank", "Page URL", "Page Views", "% of Total"],
    latestTopPages.map((row, i) => [i + 1, `/${row.key}`, row.count, `${row.pct}%`])
  );
});

init();
