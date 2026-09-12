// js/analytics-modal.js
// -----------------------------------------------------------------------
// "Live Visitor Analytics" modal (§11). Zero extra Firestore reads on
// open — dashboard.js hands us a getData() closure over its already-
// fetched data, and calls refreshAnalyticsModal() after each re-fetch.
// -----------------------------------------------------------------------

import {
  computeGeography,
  computeDeviceSplit,
  computeOSBreakdown,
  computeBrowserBreakdown,
  computeEngagement,
  computeLiveStream,
  relativeTime
} from "./data.js";

let getData = () => null;
let activeTab = "geography";

function $(id) {
  return document.getElementById(id);
}

function renderGeography(data) {
  const geo = computeGeography(data.sessions);
  const maxDistrict = Math.max(1, ...geo.districts.map((d) => d.count));

  $("geoDistrictList").innerHTML = geo.districts
    .map((d, i) => {
      const pct = Math.round((d.count / maxDistrict) * 100);
      return `
        <li class="geo-row">
          <span class="geo-rank">${i === 0 ? '<span class="badge-top">#1</span>' : `#${i + 1}`}</span>
          <span class="geo-name">${d.key}</span>
          <span class="geo-bar-track"><span class="geo-bar-fill" style="width:${pct}%"></span></span>
          <span class="geo-count">${d.count}</span>
        </li>
      `;
    })
    .join("") || `<li class="empty-row">No district data yet.</li>`;

  $("geoStateChips").innerHTML =
    geo.states.map((s) => `<span class="chip">${s.key} · ${s.count}</span>`).join("") ||
    `<span class="empty-row">No state data yet.</span>`;

  $("geoCountryChips").innerHTML =
    geo.countries.map((c) => `<span class="chip">${c.key} · ${c.count}</span>`).join("") ||
    `<span class="empty-row">No country data yet.</span>`;
}

function renderDevices(data) {
  const split = computeDeviceSplit(data.sessions);
  const total = split.mobile + split.desktop + split.other || 1;
  const mobilePct = Math.round((split.mobile / total) * 100);
  const desktopPct = Math.round((split.desktop / total) * 100);

  $("modalDeviceSplitBar").innerHTML = `
    <div class="split-bar">
      <div class="split-segment split-mobile" style="width:${mobilePct}%">${mobilePct}%</div>
      <div class="split-segment split-desktop" style="width:${desktopPct}%">${desktopPct}%</div>
    </div>
    <div class="split-legend">
      <span><i class="dot dot-mobile"></i> Mobile (${split.mobile})</span>
      <span><i class="dot dot-desktop"></i> Desktop (${split.desktop})</span>
    </div>
  `;

  const os = computeOSBreakdown(data.sessions);
  const osMax = Math.max(1, ...Object.values(os));
  $("modalOsBreakdown").innerHTML = Object.entries(os)
    .map(
      ([label, count]) => `
        <li class="breakdown-row">
          <span>${label}</span>
          <span class="breakdown-track"><span class="breakdown-fill" style="width:${Math.round((count / osMax) * 100)}%"></span></span>
          <span>${count}</span>
        </li>`
    )
    .join("");

  const browsers = computeBrowserBreakdown(data.sessions);
  const brMax = Math.max(1, ...Object.values(browsers));
  $("modalBrowserBreakdown").innerHTML = Object.entries(browsers)
    .map(
      ([label, count]) => `
        <li class="breakdown-row">
          <span>${label}</span>
          <span class="breakdown-track"><span class="breakdown-fill" style="width:${Math.round((count / brMax) * 100)}%"></span></span>
          <span>${count}</span>
        </li>`
    )
    .join("");
}

function renderEngagement(data) {
  const eng = computeEngagement(data.interactions, data.sessions);

  $("engagementTopSections").innerHTML =
    eng.topInteractions
      .map(
        (t) => `
        <li class="breakdown-row">
          <span>${t.type}</span>
          <span class="breakdown-track"><span class="breakdown-fill" style="width:${t.pct}%"></span></span>
          <span>${t.pct}%</span>
        </li>`
      )
      .join("") || `<li class="empty-row">No interactions logged yet.</li>`;

  $("engagementPeakWindow").textContent = eng.peakWindowLabel;

  const mins = Math.floor(eng.avgSeconds / 60);
  const secs = Math.round(eng.avgSeconds % 60);
  $("engagementAvgDuration").textContent = eng.avgSeconds > 0 ? `${mins}m ${secs}s` : "—";
}

function renderLiveStream(data) {
  const events = computeLiveStream(data.interactions, data.pageviews, 30);
  const now = new Date();
  $("liveStreamList").innerHTML =
    events
      .map(
        (e) => `
        <li class="stream-row">
          <span class="stream-kind stream-kind-${e.kind}">${e.kind === "pageview" ? "View" : "Event"}</span>
          <span class="stream-label">${e.label || "—"}</span>
          <span class="stream-time">${relativeTime(e.timestamp, now)}</span>
        </li>`
      )
      .join("") || `<li class="empty-row">No activity yet.</li>`;
}

function renderAll() {
  const data = getData();
  if (!data) return;
  renderGeography(data);
  renderDevices(data);
  renderEngagement(data);
  renderLiveStream(data);
}

function setActiveTab(tab) {
  activeTab = tab;
  document.querySelectorAll(".modal-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  document.querySelectorAll(".modal-panel").forEach((panel) => {
    panel.hidden = panel.dataset.panel !== tab;
  });
}

function openModal() {
  renderAll();
  $("analyticsModal").hidden = false;
  document.body.classList.add("modal-open");
}

function closeModal() {
  $("analyticsModal").hidden = true;
  document.body.classList.remove("modal-open");
}

export function initAnalyticsModal(getDataFn) {
  getData = getDataFn;

  document.querySelectorAll(".modal-tab").forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });
  setActiveTab(activeTab);

  $("analyticsModalCloseBtn").addEventListener("click", closeModal);
  $("analyticsModal").addEventListener("click", (e) => {
    if (e.target === $("analyticsModal")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("analyticsModal").hidden) closeModal();
  });
  document.addEventListener("smfd:open-analytics-modal", openModal);
}

export function refreshAnalyticsModal() {
  if (!$("analyticsModal").hidden) renderAll();
}