// tracking.js
// -----------------------------------------------------------------------
// Public-site visitor tracking for Selvamurugan Fast Drills.
// Loaded as: <script type="module" src="tracking.js"></script>
// — the LAST line before </body>, after the existing classic <script>
// tags (script1.js, script.js, ui.js, pwa.js). Module scripts defer
// automatically, so this ordering is safe and intentional (§6.1).
//
// Wires itself to markup that already exists on the site — see §6.2/6.3
// for the real selectors/IDs this expects. If a selector isn't found,
// this script simply skips that hook rather than throwing.
// -----------------------------------------------------------------------

import { db, ensureAnonAuth } from "./js/firebase-init.js";
import {
  doc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const HEARTBEAT_MS = 20000;
const SECTION_OBSERVER_THRESHOLD = 0.5;

function getSessionId() {
  let id = sessionStorage.getItem("smfd_session_id");
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem("smfd_session_id", id);
  }
  return id;
}

function parseDevice() {
  const ua = navigator.userAgent || "";
  const formFactor = /Mobi|Android/i.test(ua) ? "Mobile" : "Desktop";

  let os = "Other";
  if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "Other";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";

  return { formFactor, os, browser };
}

async function fetchGeo() {
  try {
    const res = await fetch("https://ipwho.is/");
    const data = await res.json();
    if (!data || data.success === false) return { country: null, state: null, district: null };
    return {
      country: data.country || null,
      state: data.region || null,
      district: data.city || null
    };
  } catch {
    return { country: null, state: null, district: null };
  }
}

const sessionId = getSessionId();
const sessionRef = doc(db, "sessions", sessionId);
const summaryRef = doc(db, "stats", "summary");

let ready = false;
const readyQueue = [];
function whenReady(fn) {
  if (ready) fn();
  else readyQueue.push(fn);
}

async function init() {
  try {
    await ensureAnonAuth();

    const isNewSession = !sessionStorage.getItem("smfd_session_initialized");

    if (isNewSession) {
      const [device, geo] = [parseDevice(), await fetchGeo()];
      await setDoc(sessionRef, {
        startedAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        active: true,
        device,
        geo,
        activeSection: null
      });
      await updateDoc(summaryRef, { totalSessions: increment(1) }).catch(async () => {
        // stats/summary doesn't exist yet — create it.
        await setDoc(summaryRef, { totalSessions: 1 }, { merge: true });
      });
      sessionStorage.setItem("smfd_session_initialized", "true");
    } else {
      await updateDoc(sessionRef, { lastSeen: serverTimestamp(), active: true });
    }

    await recordPageview();
    startHeartbeat();
    wireInteractionTracking();
    wireSectionTracking();

    ready = true;
    readyQueue.splice(0).forEach((fn) => fn());
  } catch (err) {
    console.error("smfd tracking init failed:", err);
  }
}

async function recordPageview() {
  await addDoc(collection(db, "pageviews"), {
    sessionId,
    page: location.pathname.replace(/^\//, "") || "index.html",
    timestamp: serverTimestamp()
  });
  await updateDoc(summaryRef, { allTimeViews: increment(1) }).catch(() => {});
}

function startHeartbeat() {
  const beat = () => {
    if (document.visibilityState === "visible") {
      updateDoc(sessionRef, { lastSeen: serverTimestamp(), active: true }).catch(() => {});
    }
  };
  setInterval(beat, HEARTBEAT_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      updateDoc(sessionRef, { lastSeen: serverTimestamp(), active: false }).catch(() => {});
    } else {
      updateDoc(sessionRef, { lastSeen: serverTimestamp(), active: true }).catch(() => {});
    }
  });
}

async function recordInteraction(type) {
  await addDoc(collection(db, "interactions"), {
    sessionId,
    type,
    timestamp: serverTimestamp()
  });
  await updateDoc(summaryRef, { [`interactions.${type}`]: increment(1) }).catch(() => {});
}

function trackClicks(selector, type) {
  document.querySelectorAll(selector).forEach((el) => {
    el.addEventListener("click", () => whenReady(() => recordInteraction(type)));
  });
}

function wireInteractionTracking() {
  trackClicks("#whatsappBtn", "whatsapp_click");
  trackClicks(".whatsapp-float", "whatsapp_click");
  trackClicks("#downloadBtn", "download_click");
  trackClicks("a[href^='tel:']", "call_click");
}

function wireSectionTracking() {
  const sections = document.querySelectorAll("[data-track-section]");
  if (!sections.length) return;

  let currentSection = null;
  let updateTimer = null;

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;

      const name = visible.target.getAttribute("data-track-section");
      if (name && name !== currentSection) {
        currentSection = name;
        clearTimeout(updateTimer);
        updateTimer = setTimeout(() => {
          whenReady(() => updateDoc(sessionRef, { activeSection: name }).catch(() => {}));
        }, 400);
      }

      if (visible.target.hasAttribute("data-track-reviews") && !visible.target.dataset.smfdReviewLogged) {
        visible.target.dataset.smfdReviewLogged = "true";
        whenReady(() => recordInteraction("review_view"));
      }
    },
    { threshold: SECTION_OBSERVER_THRESHOLD }
  );

  sections.forEach((el) => observer.observe(el));
}

/**
 * Called by ui.js's calculateAndDisplay() via a trackQuoteComputed()
 * helper that no-ops if this script hasn't loaded yet. See §6.4 — do not
 * rename this without updating that call site.
 */
window.smfdTrackQuote = function smfdTrackQuote(depth, total) {
  whenReady(async () => {
    try {
      await addDoc(collection(db, "quotes"), {
        sessionId,
        depth,
        total,
        timestamp: serverTimestamp()
      });
      await updateDoc(summaryRef, {
        totalQuotesComputed: increment(1),
        pipelineValue: increment(Number(total) || 0)
      }).catch(() => {});
    } catch (err) {
      console.error("smfd quote tracking failed:", err);
    }
  });
};

init();