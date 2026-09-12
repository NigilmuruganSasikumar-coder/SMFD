// js/firebase-init.js
// -----------------------------------------------------------------------
// Shared Firebase config + anonymous-auth helper.
// Loaded by: tracking.js (public site), login.html, dashboard.html
//
// ⚠️ Anonymous sign-in must be manually enabled in the Firebase Console:
//    Authentication → Sign-in method → Anonymous → Enable.
//    It is OFF by default. Until it's turned on, every call below fails
//    with auth/configuration-not-found.
// -----------------------------------------------------------------------

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// Selvamurugan Fast Drills — project: selvamurugan-fast-drills
// Real, already-provisioned config. Do not regenerate or replace with placeholders.
const firebaseConfig = {
  apiKey: "AIzaSyBPbRM0A7SZB0Lg1XHaDFj_3trp7gwV44w",
  authDomain: "selvamurugan-fast-drills.firebaseapp.com",
  projectId: "selvamurugan-fast-drills",
  storageBucket: "selvamurugan-fast-drills.firebasestorage.app",
  messagingSenderId: "592830006705",
  appId: "1:592830006705:web:789418ba594136e95a6990",
  measurementId: "G-89LVDDG8SR"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Resolves once there is an anonymous-authenticated user, signing one in
 * if none exists yet. Every page that touches Firestore calls this first,
 * since the security rules gate every read/write on `request.auth != null`.
 *
 * IMPORTANT TRADE-OFF (see SETUP-GUIDE.md and firestore.rules): this is a
 * UX-level gate, not a database-enforced admin check. There are no custom
 * claims possible on the Spark (free) plan without a Cloud Function, so
 * `request.auth != null` is true for any visitor's anonymous session and
 * for the admin alike. Anyone who calls signInAnonymously() themselves
 * satisfies the same check a determined attacker would need. The OTP
 * screen in login.html is what actually gates *reaching* the dashboard UI;
 * it does not change what Firestore itself will allow.
 */
export function ensureAnonAuth() {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          unsubscribe();
          resolve(user);
        } else {
          signInAnonymously(auth).catch((err) => {
            unsubscribe();
            reject(err);
          });
        }
      },
      (err) => {
        unsubscribe();
        reject(err);
      }
    );
  });
}