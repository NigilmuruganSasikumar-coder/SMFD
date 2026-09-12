# Admin Panel Setup Guide — Selvamurugan Fast Drills

This gets your new `admin/` folder talking to a real Firebase project and
sending real OTP emails. Do the steps in order — each one unlocks the next.

---

## Step 1 — Create the Firebase project

1. Go to https://console.firebase.google.com and click **Add project**.
2. Name it (e.g. `selvamurugan-fast-drills`). Disable Google Analytics if
   asked (not needed — this panel tracks its own analytics).
3. Once created, click the **`</>`** (web) icon to register a web app.
   Name it "Admin Panel." Firebase shows you a `firebaseConfig` object —
   copy it.
4. Open `admin/js/firebase-init.js` and paste your values over the
   placeholders in `firebaseConfig` (apiKey, authDomain, projectId, etc.).
5. In the left sidebar: **Build → Authentication → Get started**. Under
   **Sign-in method**, enable **Anonymous**. (This is what lets both
   visitors and the admin panel write/read Firestore without a real
   password system.)
6. In the left sidebar: **Build → Firestore Database → Create database**.
   Start in **production mode**, pick a region close to India (e.g.
   `asia-south1`).
7. Go to the **Rules** tab of Firestore and replace the contents with
   everything in `admin/firestore.rules` from this delivery. Click
   **Publish**.

Your project is now live and empty — no tracking data yet, which is
expected until Step 4.

---

## Step 2 — Set up EmailJS (sends the OTP code to your inbox)

1. Go to https://www.emailjs.com and sign up free (200 emails/month on
   the free tier — plenty for one admin logging in).
2. **Email Services** → **Add new service** → connect your Gmail
   (`selvamuruganfastdrill@gmail.com`). Note the **Service ID** it gives you.
3. **Email Templates** → **Create new template**. Set:
   - To email: `{{to_email}}`
   - Subject: `Your Selvamurugan Fast Drills admin code`
   - Body (plain text is fine):
     ```
     Your one-time login code is: {{otp_code}}

     This code expires in {{valid_minutes}} minutes. If you didn't
     request this, you can ignore this email.
     ```
   Save it and note the **Template ID**.
4. **Account → General** → copy your **Public Key**.
5. Paste all three values in TWO places:
   - `admin/login.html` — the `emailjs.init({ publicKey: "..." })` line
   - `admin/js/auth.js` — `EMAILJS_PUBLIC_KEY`, `EMAILJS_SERVICE_ID`,
     `EMAILJS_TEMPLATE_ID` constants at the top

---

## Step 3 — Wire tracking into the public site

The admin dashboard has nothing to show until the public site starts
logging visits. Two small additions to your existing site:

1. Copy the whole `admin/` folder (as delivered) into your site's root,
   next to `index.html`.
2. Copy `tracking.js` (also at the root of this delivery) into your site
   root too.
3. In **`index.html`** and **`quotation.html`**, add this as the very
   last line before `</body>`:
   ```html
   <script type="module" src="tracking.js"></script>
   ```
4. Replace your existing `ui.js` with the updated copy in this delivery —
   it's your original file with one small addition (a hook that logs
   each completed cost-calculation to the dashboard's "Total Quotes
   Computed" and "Pipeline Value" stats). Nothing else in it changed.
5. *(Optional, improves the "Active Section Focus" stat)* — add
   `data-track-section="Calculator"`, `data-track-section="Reviews"`,
   etc. to the section wrapper `<div>`s you already have in `index.html`,
   using names that make sense for your page's actual sections.
6. *(Optional, improves the Engagement tab)* — add
   `data-track-reviews` to whatever element wraps your testimonials/rig
   gallery section, so views of it get logged.

That's it — no other file needs touching. `script.js` (your pricing
math) is never modified, matching how `ui.js` was already built.

---

## Step 4 — Test it

1. Open your live site (or run it locally) in one tab, and browse
   around — open the calculator, click WhatsApp, etc.
2. Open `admin/login.html` in another tab. The email field is
   pre-filled with `selvamuruganfastdrill@gmail.com` — click **Send Login
   Code**.
3. Check that inbox for the 6-digit code, enter it, and you should land
   on `admin/dashboard.html` with real numbers from the tab you browsed
   in step 1.
4. Click **Open Live Visitor Analytics** to see the Geography / Devices
   & OS / Engagement / Live Stream tabs populate.

If a stat card stays at "—", it usually means no matching data exists
yet (e.g. "Not enough days of data yet" on the trend chart until you've
had visits on 2+ different calendar days) — that's expected on a fresh
install, not a bug.

---

## Hardening later (optional)

The honest trade-off of a no-backend setup is explained at the top of
`admin/firestore.rules`. If this business grows and you want the
database to truly enforce "only Nigil can read this," the upgrade path
is:

1. Move to the Blaze (pay-as-you-go) plan — still free at this traffic
   level, it just unlocks Cloud Functions.
2. Write one Cloud Function that verifies the OTP server-side (instead
   of client-side) and sets a custom claim (`isAdmin: true`) on that
   sign-in.
3. Change the Firestore rules' admin-read checks from
   `request.auth != null` to `request.auth.token.isAdmin == true`.

Everything else in this delivery stays the same — only the verification
step moves from the browser to a server.
