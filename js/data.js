// js/data.js
// -----------------------------------------------------------------------
// One Firestore fetch per dashboard load (§11 — the analytics modal reuses
// this same fetched data, zero extra reads on open). Also holds every pure
// aggregation function the overview + modal need.
// -----------------------------------------------------------------------

import { db } from "./firebase-init.js";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const ACTIVE_WINDOW_MS = 90 * 1000; // §10 — "Active Sessions (90s heartbeat window)"

// Caps on how much history a single dashboard load reads. Generous for a
// marketing-site's traffic volume, cheap on the Spark plan's read quota.
const SESSIONS_LIMIT = 2000;
const PAGEVIEWS_LIMIT = 5000;
const INTERACTIONS_LIMIT = 5000;
const QUOTES_LIMIT = 2000;

function toDate(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  return new Date(ts);
}

/**
 * Fetches everything the dashboard + modal need in one pass.
 */
export async function fetchDashboardData() {
  const summarySnap = await getDoc(doc(db, "stats", "summary"));
  const summary = summarySnap.exists() ? summarySnap.data() : {};

  const [sessionsSnap, pageviewsSnap, interactionsSnap, quotesSnap] = await Promise.all([
    getDocs(query(collection(db, "sessions"), orderBy("lastSeen", "desc"), limit(SESSIONS_LIMIT))),
    getDocs(query(collection(db, "pageviews"), orderBy("timestamp", "desc"), limit(PAGEVIEWS_LIMIT))),
    getDocs(query(collection(db, "interactions"), orderBy("timestamp", "desc"), limit(INTERACTIONS_LIMIT))),
    getDocs(query(collection(db, "quotes"), orderBy("timestamp", "desc"), limit(QUOTES_LIMIT)))
  ]);

  const sessions = sessionsSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      startedAt: toDate(data.startedAt),
      lastSeen: toDate(data.lastSeen)
    };
  });

  const pageviews = pageviewsSnap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, timestamp: toDate(data.timestamp) };
  });

  const interactions = interactionsSnap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, timestamp: toDate(data.timestamp) };
  });

  const quotes = quotesSnap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, timestamp: toDate(data.timestamp) };
  });

  return { summary, sessions, pageviews, interactions, quotes };
}

// ---------------------------------------------------------------------
// Aggregations — all pure functions over data already in memory.
// ---------------------------------------------------------------------

export function getActiveSessions(sessions, now = new Date()) {
  return sessions.filter((s) => s.lastSeen && now.getTime() - s.lastSeen.getTime() <= ACTIVE_WINDOW_MS);
}

export function computeTrafficTrend(pageviews, days = 7) {
  const buckets = new Map(); // "YYYY-MM-DD" -> count
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  pageviews.forEach((pv) => {
    if (!pv.timestamp) return;
    const key = pv.timestamp.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
  });
  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}

export function computeDeviceSplit(sessions) {
  const split = { mobile: 0, desktop: 0, other: 0 };
  sessions.forEach((s) => {
    const ff = (s.device?.formFactor || "").toLowerCase();
    if (ff.includes("mobile") || ff.includes("phone")) split.mobile++;
    else if (ff.includes("desktop")) split.desktop++;
    else split.other++;
  });
  return split;
}

function tally(items, keyFn) {
  const map = new Map();
  items.forEach((item) => {
    const key = keyFn(item);
    if (!key) return;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

export function computeGeography(sessions) {
  return {
    districts: tally(sessions, (s) => s.geo?.district).slice(0, 10),
    states: tally(sessions, (s) => s.geo?.state),
    countries: tally(sessions, (s) => s.geo?.country)
  };
}

export function computeOSBreakdown(sessions) {
  const buckets = { Android: 0, iOS: 0, Windows: 0, "macOS/Linux": 0, Other: 0 };
  sessions.forEach((s) => {
    const os = (s.device?.os || "").toLowerCase();
    if (os.includes("android")) buckets.Android++;
    else if (os.includes("ios") || os.includes("iphone") || os.includes("ipad")) buckets.iOS++;
    else if (os.includes("windows")) buckets.Windows++;
    else if (os.includes("mac") || os.includes("linux")) buckets["macOS/Linux"]++;
    else buckets.Other++;
  });
  return buckets;
}

export function computeBrowserBreakdown(sessions) {
  const buckets = { Chrome: 0, Safari: 0, Edge: 0, Others: 0 };
  sessions.forEach((s) => {
    const b = (s.device?.browser || "").toLowerCase();
    if (b.includes("edge")) buckets.Edge++;
    else if (b.includes("chrome")) buckets.Chrome++;
    else if (b.includes("safari")) buckets.Safari++;
    else buckets.Others++;
  });
  return buckets;
}

export function computePrimaryDevice(activeSessions) {
  if (!activeSessions.length) return null;
  const formFactor = tally(activeSessions, (s) => s.device?.formFactor)[0]?.key || "Unknown";
  const os = tally(activeSessions, (s) => s.device?.os)[0]?.key || "Unknown";
  return `${formFactor} · ${os}`;
}

export function computeFunnel(summary, pageviews, interactions, quotes) {
  const views = summary.allTimeViews ?? pageviews.length;
  const interactionCount = interactions.length;
  const quoteCount = summary.totalQuotesComputed ?? quotes.length;
  const savedOrWhatsapp = interactions.filter(
    (i) => i.type === "estimate_saved" || i.type === "whatsapp_click"
  ).length;
  return [
    { label: "Page Views", value: views },
    { label: "Interactions", value: interactionCount },
    { label: "Quotes", value: quoteCount },
    { label: "Saved / WhatsApp", value: savedOrWhatsapp }
  ];
}

export function computeEngagement(interactions, sessions) {
  const byType = tally(interactions, (i) => i.type);
  const total = interactions.length || 1;
  const topInteractions = byType.map((t) => ({
    type: t.key,
    count: t.count,
    pct: Math.round((t.count / total) * 100)
  }));

  // Peak 2-hour window across all interaction timestamps.
  const hourCounts = new Array(24).fill(0);
  interactions.forEach((i) => {
    if (i.timestamp) hourCounts[i.timestamp.getHours()]++;
  });
  let peakStart = 0;
  let peakCount = -1;
  for (let h = 0; h < 24; h++) {
    const windowCount = hourCounts[h] + hourCounts[(h + 1) % 24];
    if (windowCount > peakCount) {
      peakCount = windowCount;
      peakStart = h;
    }
  }
  const fmtHour = (h) => {
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12} ${period}`;
  };
  const peakWindowLabel = `${fmtHour(peakStart)} – ${fmtHour((peakStart + 2) % 24)}`;

  // Average session duration (startedAt -> lastSeen) across sessions with both.
  const durations = sessions
    .filter((s) => s.startedAt && s.lastSeen)
    .map((s) => (s.lastSeen.getTime() - s.startedAt.getTime()) / 1000)
    .filter((secs) => secs >= 0 && secs < 24 * 3600); // discard stale/bad data
  const avgSeconds = durations.length
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;

  return { topInteractions, peakWindowLabel, avgSeconds };
}

export function computeLiveStream(interactions, pageviews, count = 25) {
  const combined = [
    ...interactions.map((i) => ({ kind: "interaction", label: i.type, timestamp: i.timestamp })),
    ...pageviews.map((p) => ({ kind: "pageview", label: p.page, timestamp: p.timestamp }))
  ].filter((e) => e.timestamp);
  combined.sort((a, b) => b.timestamp - a.timestamp);
  return combined.slice(0, count);
}

export function relativeTime(date, now = new Date()) {
  const secs = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function formatLakhs(rupees) {
  const value = Number(rupees) || 0;
  const lakhs = value / 100000;
  return `₹${lakhs.toFixed(lakhs < 10 ? 2 : 1)}L`;
}