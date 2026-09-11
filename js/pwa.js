/* ==========================================================================
   SELVAMURUGAN FAST DRILLS — PWA ENHANCEMENT SCRIPT
   Paste this at the END of your existing script1.js,
   or link it as a separate <script src="pwa.js"> before </body>.
   ========================================================================== */

(function () {
  'use strict';

  /* ── 1. SERVICE WORKER REGISTRATION ───────────────────────────────────── */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js')
        .then(function (reg) {
          console.log('[PWA] Service Worker registered:', reg.scope);
        })
        .catch(function (err) {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    });
  }

  /* ── 2. BOTTOM NAV — active link highlight on scroll ──────────────────── */
  var pwaLinks = document.querySelectorAll('[data-pwa-nav]');
  var sections = [];

  pwaLinks.forEach(function (link) {
    var id = link.getAttribute('href').replace('#', '');
    var el = document.getElementById(id);
    if (el) sections.push({ id: id, el: el, link: link });
  });

  function updateActiveNav() {
    var scrollY = window.scrollY + window.innerHeight * 0.35;
    var current = sections[0];

    sections.forEach(function (s) {
      if (s.el.offsetTop <= scrollY) current = s;
    });

    pwaLinks.forEach(function (l) { l.classList.remove('active'); });
    if (current) current.link.classList.add('active');
  }

  if (sections.length) {
    window.addEventListener('scroll', updateActiveNav, { passive: true });
    updateActiveNav();
  }

  /* ── 3. INSTALL BANNER ────────────────────────────────────────────────── */
  var deferredPrompt = null;
  var installBanner  = document.getElementById('pwaInstallBanner');
  var installBtn     = document.getElementById('pwaInstallBtn');
  var dismissBtn     = document.getElementById('pwaInstallDismiss');

  /* Only show once per session; respect user dismissal */
  var dismissed = sessionStorage.getItem('pwa-banner-dismissed');

  /* Already running as an installed app? Never show the install banner. */
  var isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true; /* iOS Safari */

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;

    if (!dismissed && !isStandalone && installBanner) {
      setTimeout(function () {
        installBanner.classList.add('pwa-install-banner--visible');
      }, 4000); /* show after 4 s — not immediately intrusive */
    }
  });

  /* Hide the banner (and don't show it again this session) once the
     app has actually been installed — whether via our button or the
     browser's own install UI. */
  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    if (installBanner) installBanner.classList.remove('pwa-install-banner--visible');
    sessionStorage.setItem('pwa-banner-dismissed', '1');
    console.log('[PWA] App installed');
  });

  if (installBtn) {
    installBtn.addEventListener('click', function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (choice) {
        console.log('[PWA] Install choice:', choice.outcome);
        deferredPrompt = null;
        installBanner.classList.remove('pwa-install-banner--visible');
      });
    });
  }

  if (dismissBtn) {
    dismissBtn.addEventListener('click', function () {
      installBanner.classList.remove('pwa-install-banner--visible');
      sessionStorage.setItem('pwa-banner-dismissed', '1');
    });
  }

  /* ── 4. OFFLINE / ONLINE TOAST ────────────────────────────────────────── */
  var offlineToast = document.getElementById('pwaOfflineToast');

  function showOffline(offline) {
    if (!offlineToast) return;
    if (offline) {
      offlineToast.classList.add('pwa-offline-toast--visible');
    } else {
      offlineToast.classList.remove('pwa-offline-toast--visible');
    }
  }

  window.addEventListener('offline', function () { showOffline(true); });
  window.addEventListener('online',  function () { showOffline(false); });

  /* Show immediately if already offline at page load */
  if (!navigator.onLine) showOffline(true);

})();