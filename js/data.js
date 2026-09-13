// js/data.js
// -----------------------------------------------------------------------
// One Firestore fetch per admin page load. Every function below is a pure
// aggregation over that already-fetched data — no page does its own
// Firestore reads beyond the initial fetchDashboardData() call, so
// switching tabs/pages costs nothing extra per render.
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

const ACTIVE_WINDOW_MS = 90 * 1000;      // "Online Now" heartbeat window
const LAST_5_MIN_MS = 5 * 60 * 1000;
const LAST_30_MIN_MS = 30 * 60 * 1000;

// Caps on how much history a single page load reads. Generous for a
// marketing-site's traffic volume, cheap on the Spark plan's read quota.
const SESSIONS_LIMIT = 3000;
const PAGEVIEWS_LIMIT = 8000;
const INTERACTIONS_LIMIT = 8000;
const QUOTES_LIMIT = 3000;

function toDate(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  return new Date(ts);
}

/** Fetches everything every admin page needs, in one pass. */
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
    return { id: d.id, ...data, startedAt: toDate(data.startedAt), lastSeen: toDate(data.lastSeen) };
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
// Generic helpers
// ---------------------------------------------------------------------

export function tally(items, keyFn) {
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

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

function dateBuckets(days, endDate = new Date()) {
  const buckets = new Map();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    buckets.set(dayKey(d), 0);
  }
  return buckets;
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

/**
 * Compares the count of `items` (filtered by dateField within the last
 * `days`) against the same-length period immediately before it. Real
 * period-over-period comparison over actually-fetched data — returns
 * null (not 0) when there's no prior-period data to compare against, so
 * callers can render "no prior data" instead of a misleading "0%".
 */
export function computePeriodComparison(items, dateField, days) {
  const now = new Date();
  const periodMs = days * 24 * 60 * 60 * 1000;
  const currentStart = new Date(now.getTime() - periodMs);
  const previousStart = new Date(now.getTime() - periodMs * 2);

  let current = 0;
  let previous = 0;
  let hasPriorData = false;

  items.forEach((item) => {
    const d = item[dateField];
    if (!d) return;
    if (d >= currentStart && d <= now) current++;
    else if (d >= previousStart && d < currentStart) {
      previous++;
      hasPriorData = true;
    }
  });

  if (!hasPriorData || previous === 0) return { current, previous, pct: null };
  const pct = ((current - previous) / previous) * 100;
  return { current, previous, pct };
}

// ---------------------------------------------------------------------
// Sessions / active / device / geography
// ---------------------------------------------------------------------

export function getActiveSessions(sessions, now = new Date()) {
  return sessions.filter((s) => s.lastSeen && now.getTime() - s.lastSeen.getTime() <= ACTIVE_WINDOW_MS);
}

export function computeRealtimeStats(sessions, now = new Date()) {
  const onlineNow = sessions.filter((s) => s.lastSeen && now - s.lastSeen <= ACTIVE_WINDOW_MS).length;
  const last5Min = sessions.filter((s) => s.lastSeen && now - s.lastSeen <= LAST_5_MIN_MS).length;
  const last30Min = sessions.filter((s) => s.lastSeen && now - s.lastSeen <= LAST_30_MIN_MS).length;
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayVisitors = sessions.filter((s) => s.startedAt && s.startedAt >= todayStart).length;
  return { onlineNow, last5Min, last30Min, todayVisitors };
}

export function computeDeviceSplit(sessions) {
  const split = { mobile: 0, desktop: 0, tablet: 0, other: 0 };
  sessions.forEach((s) => {
    const ff = (s.device?.formFactor || "").toLowerCase();
    if (ff.includes("tablet")) split.tablet++;
    else if (ff.includes("mobile") || ff.includes("phone")) split.mobile++;
    else if (ff.includes("desktop")) split.desktop++;
    else split.other++;
  });
  return split;
}

export function computeOSTable(sessions) {
  return tally(sessions, (s) => s.device?.os || "Other");
}

export function computeBrowserTable(sessions) {
  return tally(sessions, (s) => s.device?.browser || "Other");
}

export function computePrimaryDevice(activeSessions) {
  if (!activeSessions.length) return null;
  const formFactor = tally(activeSessions, (s) => s.device?.formFactor)[0]?.key || "Unknown";
  const os = tally(activeSessions, (s) => s.device?.os)[0]?.key || "Unknown";
  return `${formFactor} · ${os}`;
}

export function computeGeography(sessions) {
  return {
    districts: tally(sessions, (s) => s.geo?.district).slice(0, 10),
    states: tally(sessions, (s) => s.geo?.state),
    countries: tally(sessions, (s) => s.geo?.country)
  };
}

export function computeLocationsTable(sessions) {
  const withGeo = sessions.filter((s) => s.geo?.country);
  const total = withGeo.length || 1;
  return tally(withGeo, (s) => s.geo.country).map((row) => ({
    ...row,
    pct: Math.round((row.count / total) * 1000) / 10
  }));
}

// ---------------------------------------------------------------------
// Visitors — new vs returning
// ---------------------------------------------------------------------

export function computeNewReturning(sessions) {
  let newCount = 0;
  let returningCount = 0;
  sessions.forEach((s) => {
    if (s.newVisitor === false) returningCount++;
    else newCount++; // undefined (older sessions pre-dating this field) counts as new
  });
  return { newCount, returningCount };
}

export function computeVisitorTrend(sessions, days = 30) {
  const buckets = dateBuckets(days);
  const newBuckets = new Map(buckets);
  const returningBuckets = new Map(buckets);
  sessions.forEach((s) => {
    if (!s.startedAt) return;
    const key = dayKey(s.startedAt);
    if (!buckets.has(key)) return;
    if (s.newVisitor === false) returningBuckets.set(key, returningBuckets.get(key) + 1);
    else newBuckets.set(key, newBuckets.get(key) + 1);
  });
  return Array.from(buckets.keys()).map((date) => ({
    date,
    newVisitors: newBuckets.get(date),
    returningVisitors: returningBuckets.get(date)
  }));
}

// ---------------------------------------------------------------------
// Page views
// ---------------------------------------------------------------------

export function computeTrafficTrend(pageviews, days = 7) {
  const buckets = dateBuckets(days);
  pageviews.forEach((pv) => {
    if (!pv.timestamp) return;
    const key = dayKey(pv.timestamp);
    if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
  });
  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}

export function computePageViewsAndVisitorsTrend(pageviews, days = 30) {
  const viewBuckets = dateBuckets(days);
  const visitorSets = new Map();
  Array.from(viewBuckets.keys()).forEach((k) => visitorSets.set(k, new Set()));

  pageviews.forEach((pv) => {
    if (!pv.timestamp) return;
    const key = dayKey(pv.timestamp);
    if (!viewBuckets.has(key)) return;
    viewBuckets.set(key, viewBuckets.get(key) + 1);
    visitorSets.get(key).add(pv.sessionId);
  });

  return Array.from(viewBuckets.keys()).map((date) => ({
    date,
    views: viewBuckets.get(date),
    visitors: visitorSets.get(date).size
  }));
}

export function computeTopPagesTable(pageviews, topN = 12) {
  const total = pageviews.length || 1;
  return tally(pageviews, (pv) => pv.page || "/").slice(0, topN).map((row) => ({
    ...row,
    pct: Math.round((row.count / total) * 1000) / 10
  }));
}

export function computeUniquePageViews(pageviews) {
  return new Set(pageviews.map((pv) => pv.sessionId)).size;
}

export function computeBounceRate(pageviews) {
  const perSession = new Map();
  pageviews.forEach((pv) => {
    perSession.set(pv.sessionId, (perSession.get(pv.sessionId) || 0) + 1);
  });
  if (!perSession.size) return 0;
  const singlePage = Array.from(perSession.values()).filter((c) => c === 1).length;
  return Math.round((singlePage / perSession.size) * 1000) / 10;
}

/**
 * Avg. time on page — for sessions with 2+ pageviews, averages the gap
 * between consecutive views (a real, if approximate, per-page dwell
 * time). Sessions with a single view fall back to that session's overall
 * duration, so the average isn't skewed to zero by single-page visits.
 */
export function computeAvgTimeOnPage(pageviews, sessions) {
  const bySession = new Map();
  pageviews.forEach((pv) => {
    if (!pv.timestamp) return;
    if (!bySession.has(pv.sessionId)) bySession.set(pv.sessionId, []);
    bySession.get(pv.sessionId).push(pv.timestamp);
  });

  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const durations = [];

  bySession.forEach((timestamps, sessionId) => {
    timestamps.sort((a, b) => a - b);
    if (timestamps.length >= 2) {
      for (let i = 1; i < timestamps.length; i++) {
        const gap = (timestamps[i] - timestamps[i - 1]) / 1000;
        if (gap > 0 && gap < 3600) durations.push(gap);
      }
    } else {
      const s = sessionById.get(sessionId);
      if (s?.startedAt && s?.lastSeen) {
        const gap = (s.lastSeen - s.startedAt) / 1000;
        if (gap > 0 && gap < 3600) durations.push(gap);
      }
    }
  });

  if (!durations.length) return 0;
  return durations.reduce((a, b) => a + b, 0) / durations.length;
}

// ---------------------------------------------------------------------
// Traffic sources / referrals
// ---------------------------------------------------------------------

export function computeTrafficSources(sessions) {
  const total = sessions.length || 1;
  return tally(sessions, (s) => s.source || "Direct").map((row) => ({
    ...row,
    pct: Math.round((row.count / total) * 1000) / 10
  }));
}

export function computeReferralsTable(sessions) {
  const total = sessions.length || 1;
  return tally(sessions, (s) => s.referrerLabel || "Direct").map((row) => ({
    ...row,
    pct: Math.round((row.count / total) * 1000) / 10
  }));
}

const SOCIAL_LABELS = new Set(["Instagram", "Facebook", "YouTube", "Twitter / X", "WhatsApp"]);

export function computeSocialMediaTraffic(sessions) {
  return computeReferralsTable(sessions).filter((row) => SOCIAL_LABELS.has(row.key));
}

// ---------------------------------------------------------------------
// Recent / live visitor stream
// ---------------------------------------------------------------------

export function computeRecentVisitors(pageviews, sessions, count = 10) {
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  return pageviews
    .filter((pv) => pv.timestamp)
    .slice(0, count)
    .map((pv) => {
      const session = sessionById.get(pv.sessionId);
      const geo = session?.geo || {};
      const location = geo.district && geo.country ? `${geo.district}, ${geo.country}` : geo.country || "Unknown";
      return { time: pv.timestamp, location, page: pv.page || "/" };
    });
}

export function computeLiveStream(interactions, pageviews, count = 30) {
  const combined = [
    ...interactions.map((i) => ({ kind: "interaction", label: i.type, timestamp: i.timestamp })),
    ...pageviews.map((p) => ({ kind: "pageview", label: p.page, timestamp: p.timestamp }))
  ].filter((e) => e.timestamp);
  combined.sort((a, b) => b.timestamp - a.timestamp);
  return combined.slice(0, count);
}

// ---------------------------------------------------------------------
// Engagement / funnel (dashboard overview)
// ---------------------------------------------------------------------

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

  const hourCounts = new Array(24).fill(0);
  interactions.forEach((i) => {
    if (i.timestamp) hourCounts[i.timestamp.getHours()]++;
  });
  let peakStart = 0;
  let peakCount = -1;
  for (let h = 0; h < 24; h++) {
    const windowCount = hourCounts[h] + hourCounts[(h + 1) % 24];
    if (windowCount > peakCount) { peakCount = windowCount; peakStart = h; }
  }
  const fmtHour = (h) => {
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12} ${period}`;
  };
  const peakWindowLabel = `${fmtHour(peakStart)} – ${fmtHour((peakStart + 2) % 24)}`;

  const durations = sessions
    .filter((s) => s.startedAt && s.lastSeen)
    .map((s) => (s.lastSeen.getTime() - s.startedAt.getTime()) / 1000)
    .filter((secs) => secs >= 0 && secs < 24 * 3600);
  const avgSeconds = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  return { topInteractions, peakWindowLabel, avgSeconds };
}

/** Distribution of sessions' most-recently-observed active section. Since
 * activeSection only stores the latest value per session (not a full
 * history), this is "where sessions currently/last sat" rather than a
 * true per-visit pageview count — still real data, just coarser. */
export function computeSectionDistribution(sessions) {
  const withSection = sessions.filter((s) => s.activeSection);
  return tally(withSection, (s) => s.activeSection);
}

export function computeAvgSessionDuration(sessions) {
  const durations = sessions
    .filter((s) => s.startedAt && s.lastSeen)
    .map((s) => (s.lastSeen.getTime() - s.startedAt.getTime()) / 1000)
    .filter((secs) => secs >= 0 && secs < 24 * 3600);
  return durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
}
