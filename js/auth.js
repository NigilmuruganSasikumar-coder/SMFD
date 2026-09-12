// js/auth.js
// -----------------------------------------------------------------------
// Numeric 6-digit OTP login, gated to a single admin email. Used only by
// login.html. Not Firebase's built-in email-link auth — the OTP itself is
// hand-rolled (stored in Firestore, emailed via EmailJS) purely as a UX
// gate; see firebase-init.js for the real security trade-off.
//
// EmailJS SDK (window.emailjs) must be loaded via a classic <script> tag
// in login.html BEFORE this module runs — see login.html for the tag.
// -----------------------------------------------------------------------

import { db, ensureAnonAuth } from "./firebase-init.js";
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

export const ADMIN_EMAIL = "selvamuruganfastdrill@gmail.com";

// EmailJS — real, already-provisioned values. Do not regenerate.
const EMAILJS_SERVICE_ID = "service_70nc5zd";
const EMAILJS_TEMPLATE_ID = "template_vmvk9i5";
const EMAILJS_PUBLIC_KEY = "o7qI-fDYt7iTMfvP4";

// Matches the EmailJS template's hardcoded "valid for 15 minutes" wording.
// If the template copy is ever changed, this constant must change with it.
const OTP_TTL_MINUTES = 15;

/**
 * Strips invisible/zero-width characters that copy-paste or browser
 * autofill can silently introduce (NBSP, zero-width space, BOM), then
 * trims and lowercases. Always run BOTH sides of an email comparison
 * through this before using === , or visually-identical emails can
 * fail to match.
 */
export function normalizeEmail(raw) {
  return String(raw || "")
    .replace(/[\u00A0\u200B\uFEFF]/g, " ")
    .trim()
    .toLowerCase();
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function formatClockTime(date) {
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata"
  }) + " IST";
}

/**
 * Sends a fresh OTP to `rawEmail` if (and only if) it normalizes to the
 * single allowed admin address. Throws on any failure; the caller
 * (login.html's inline script) is responsible for turning that into the
 * inline error messaging §9 asks for.
 */
export async function sendOtp(rawEmail) {
  const email = normalizeEmail(rawEmail);

  if (email !== normalizeEmail(ADMIN_EMAIL)) {
    // Deliberately vague — never confirm/deny which emails are valid.
    throw new Error("unauthorized-email");
  }

  await ensureAnonAuth();

  const code = generateOtp();
  const now = new Date();
  const expiresAtDate = new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000);

  await setDoc(doc(db, "otp_codes", email), {
    code,
    email,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAtDate)
  });

  if (!window.emailjs) {
    throw new Error("emailjs-not-loaded");
  }

  // ⚠️ These three variable names MUST match the EmailJS template exactly:
  // {{to_email}}, {{passcode}}, {{time}}. EmailJS does not error on unknown
  // variable names — it silently sends the literal "{{passcode}}" text
  // instead of substituting it, so a mismatch here fails silently, not loudly.
  await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    to_email: email,
    passcode: code,
    time: formatClockTime(expiresAtDate)
  }, EMAILJS_PUBLIC_KEY);

  return { expiresAt: expiresAtDate };
}

/**
 * Verifies a typed code against the stored OTP doc. On success, deletes
 * the doc (one-time use) and sets the sessionStorage login flag — nothing
 * about the OTP itself persists client-side beyond that boolean flag.
 */
export async function verifyOtp(rawEmail, rawCode) {
  const email = normalizeEmail(rawEmail);
  const code = String(rawCode || "").trim();

  if (email !== normalizeEmail(ADMIN_EMAIL)) {
    throw new Error("unauthorized-email");
  }

  await ensureAnonAuth();

  const ref = doc(db, "otp_codes", email);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("no-active-code");
  }

  const data = snap.data();
  const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);

  if (Date.now() > expiresAt.getTime()) {
    await deleteDoc(ref).catch(() => {});
    throw new Error("expired-code");
  }

  if (String(data.code) !== code) {
    throw new Error("wrong-code");
  }

  await deleteDoc(ref);
  sessionStorage.setItem("smfd_admin_logged_in", "true");
  return true;
}

export function isLoggedIn() {
  return sessionStorage.getItem("smfd_admin_logged_in") === "true";
}

/**
 * Call at the very top of dashboard.html's inline script. Must hard-stop
 * execution on failure — setting location.href alone does not halt the
 * rest of the script, so an unauthenticated visitor's browser could
 * briefly fetch and paint real dashboard data before the redirect lands.
 */
export function requireLoginOrRedirect() {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
    throw new Error("not-logged-in");
  }
}

export function logout() {
  sessionStorage.removeItem("smfd_admin_logged_in");
  window.location.href = "login.html";
}