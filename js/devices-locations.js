// js/devices-locations.js — Devices & Locations (page 5 of 6)
import { requireLoginOrRedirect, logout } from "./auth.js";
requireLoginOrRedirect();

import { ensureAnonAuth } from "./firebase-init.js";
import {
  fetchDashboardData,
  computeDeviceSplit,
  computeBrowserTable,
  computeOSTable,
  computeLocationsTable
} from "./data.js";
import {
  renderShell,
  setSyncStatus,
  getRefreshIntervalMs,
  buildDonutSVG,
  buildLiveMapSVG,
  formatNumber
} from "./admin-shell.js";

renderShell({ activeId: resolveActiveId(), onLogout: logout });

function resolveActiveId() {
  const hashId = location.hash.replace("#", "");
  return ["devices", "locations"].includes(hashId) ? hashId : "devices";
}

function $(id) { return document.getElementById(id); }

const DEVICE_COLORS = { Mobile: "#3b82f6", Desktop: "#22d3ee", Tablet: "#a855f7", Other: "#5c6a90" };

function renderDeviceDonut(sessions) {
  const split = computeDeviceSplit(sessions);
  const total = split.mobile + split.desktop + split.tablet + split.other || 1;
  const rows = [
    { key: "Mobile", count: split.mobile },
    { key: "Desktop", count: split.desktop },
    { key: "Tablet", count: split.tablet }
  ].filter((r) => r.count > 0);

  $("deviceDonut").innerHTML = buildDonutSVG(
    rows.map((r) => ({ label: r.key, value: r.count, color: DEVICE_COLORS[r.key] })),
    { size: 160, stroke: 24 }
  );
  $("deviceDonutTotal").textContent = formatNumber(total);
  $("deviceLegend").innerHTML =
    rows
      .map(
        (r) => `
        <div class="donut-legend-row">
          <span class="name"><i class="legend-dot" style="background:${DEVICE_COLORS[r.key]}"></i>${r.key}</span>
          <span class="val">${Math.round((r.count / total) * 1000) / 10}%</span>
        </div>`
      )
      .join("") || `<div class="empty-state">No device data yet.</div>`;
}

function renderBars(mountId, rows) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  $(mountId).innerHTML =
    rows
      .map(
        (r) => `
        <div class="bar-row">
          <div class="bar-name">${r.key}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.round((r.count / max) * 100)}%"></div></div>
          <div class="bar-count">${formatNumber(r.count)}</div>
        </div>`
      )
      .join("") || `<div class="empty-state">No data yet.</div>`;
}

function renderLocationsTable(sessions) {
  const locations = computeLocationsTable(sessions);
  $("locationsBody").innerHTML =
    locations
      .map(
        (row, i) => `
        <tr>
          <td class="rank">${i + 1}</td>
          <td>${row.key}</td>
          <td>${formatNumber(row.count)}</td>
          <td>${row.pct}%</td>
        </tr>`
      )
      .join("") || `<tr><td colspan="4" class="empty-row">No location data yet.</td></tr>`;
  return locations;
}

async function loadAndRender() {
  const t0 = performance.now();
  const data = await fetchDashboardData();
  setSyncStatus(performance.now() - t0);

  renderDeviceDonut(data.sessions);
  renderBars("browserBars", computeBrowserTable(data.sessions));
  renderBars("osBars", computeOSTable(data.sessions));
  const locations = renderLocationsTable(data.sessions);
  $("locationMap").innerHTML = buildLiveMapSVG(locations, { color: "#f5c400" });
}

async function init() {
  try {
    await ensureAnonAuth();
    await loadAndRender();
    setInterval(() => loadAndRender().catch(console.error), getRefreshIntervalMs());
  } catch (err) {
    console.error("Devices & Locations load failed:", err);
    $("pageError").hidden = false;
    $("pageError").textContent = "Couldn't load live data. Check your connection and Firestore rules, then refresh.";
  }
}

$("rangeSelect").addEventListener("change", () => loadAndRender().catch(console.error));

init();
