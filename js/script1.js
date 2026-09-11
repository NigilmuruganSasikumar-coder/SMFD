/* ==========================================================================
   SELVAMURUGAN FAST DRILLS — interactions
   Theme toggle · mobile menu · navbar shrink · scroll reveals ·
   stat counters · signature depth-gauge · button ripple · smooth anchors
   ========================================================================== */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------- THEME TOGGLE ---------------------------- */
  const themeBtn = document.getElementById("themeToggle");
  const root = document.documentElement;

  function setTheme(mode) {
    root.setAttribute("data-theme", mode);
    try { localStorage.setItem("smfd-theme", mode); } catch (e) {}
  }

  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const current = root.getAttribute("data-theme") === "light" ? "light" : "dark";
      setTheme(current === "light" ? "dark" : "light");
    });
  }

  /* ---------------------------- MOBILE MENU ------------------------------
     Guarded so it works whether or not the inline HTML script also binds it. */
  const menuBtn = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");
  const overlay = document.getElementById("navOverlay");

  function openMenu() {
    navLinks && navLinks.classList.add("active");
    menuBtn && menuBtn.classList.add("active");
    overlay && overlay.classList.add("active");
    menuBtn && menuBtn.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-open");
  }
  function closeMenu() {
    navLinks && navLinks.classList.remove("active");
    menuBtn && menuBtn.classList.remove("active");
    overlay && overlay.classList.remove("active");
    menuBtn && menuBtn.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  }
  if (menuBtn && !menuBtn.dataset.bound) {
    menuBtn.dataset.bound = "true";
    menuBtn.addEventListener("click", () => {
      navLinks && navLinks.classList.contains("active") ? closeMenu() : openMenu();
    });
    overlay && overlay.addEventListener("click", closeMenu);
    navLinks && navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
  }

  /* ---------------------------- NAVBAR SHRINK ---------------------------- */
  const navbar = document.querySelector(".navbar");
  if (navbar) {
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          navbar.classList.toggle("scrolled", window.scrollY > 40);
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  /* ---------------------------- SMOOTH ANCHOR SCROLL ---------------------- */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        }
      }
    });
  });

  /* ---------------------------- GALLERY: WRAP FOR CAPTION OVERLAY ------------
     Turns each <img> in .gaimg into a .gaimg-item wrapper with a caption pulled
     from its alt text, so the hover overlay/caption in the CSS has somewhere to sit. */
  document.querySelectorAll(".gaimg img").forEach((img) => {
    if (img.closest(".gaimg-item")) return;
    const wrap = document.createElement("div");
    wrap.className = "gaimg-item";
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);
    if (img.alt) {
      const cap = document.createElement("span");
      cap.className = "cap";
      cap.textContent = img.alt;
      wrap.appendChild(cap);
    }
  });

  /* ---------------------------- SCROLL REVEAL ------------------------------ */
  const revealTargets = document.querySelectorAll(
    ".aboutbox, .services, .testimonial-card, .gaimg-item, .service-card, .contcolor button, " +
      "#about, #services1, .calculator-title, .section-title, #faq .section-title, .baccor2 #contact"
  );
  if ("IntersectionObserver" in window && revealTargets.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealTargets.forEach((el, i) => {
      el.style.transitionDelay = reduceMotion ? "0ms" : Math.min(i % 6, 5) * 70 + "ms";
      io.observe(el);
    });
  } else {
    revealTargets.forEach((el) => el.classList.add("in-view"));
  }

  /* ---------------------------- STAT COUNTERS ------------------------------ */
  const statEls = document.querySelectorAll(".stat h3[data-target]");
  function animateCount(el) {
    const target = parseInt(el.getAttribute("data-target"), 10) || 0;
    const suffix = el.getAttribute("data-suffix") || "";
    if (reduceMotion) {
      el.textContent = target + suffix;
      return;
    }
    const duration = 1400;
    const start = performance.now();
    function step(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window && statEls.length) {
    const statIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            statIO.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    statEls.forEach((el) => statIO.observe(el));
  } else {
    statEls.forEach(animateCount);
  }

  /* ---------------------------- CURSOR-FOLLOW GLOW --------------------------- */
  if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll(".aboutbox, .services, .contcolor button").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", e.clientX - rect.left + "px");
        card.style.setProperty("--my", e.clientY - rect.top + "px");
      });
    });
  }

  /* ---------------------------- BUTTON RIPPLE ------------------------------- */
  document.querySelectorAll(".primary-btn, .secondary-btn, .call-btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      if (reduceMotion) return;
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement("span");
      const size = Math.max(rect.width, rect.height);
      ripple.className = "ripple";
      ripple.style.width = ripple.style.height = size + "px";
      ripple.style.left = e.clientX - rect.left - size / 2 + "px";
      ripple.style.top = e.clientY - rect.top - size / 2 + "px";
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
    });
  });

  /* ---------------------------- SIGNATURE: DEPTH GAUGE ------------------------
     Injects a strata cross-section with a descending drill bit + live depth
     readout into the hero, on both edges, without touching the HTML markup. */
  function buildStrataSVG() {
    const bands = [
      { c: "#8B6A3E", h: 12 }, { c: "#6E5330", h: 10 }, { c: "#4E4A3A", h: 14 },
      { c: "#3A5A52", h: 10 }, { c: "#2E4A55", h: 16 }, { c: "#1F313C", h: 12 },
      { c: "#16232C", h: 14 }, { c: "#0F1B22", h: 12 },
    ];
    let y = 0;
    let rects = "";
    bands.forEach((b) => {
      rects += `<rect x="0" y="${y}%" width="100%" height="${b.h}%" fill="${b.c}" opacity="0.55"></rect>`;
      y += b.h;
    });
    return `<svg class="strata-band" width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">${rects}</svg>`;
  }

  function injectDepthGauge() {
    const hero = document.querySelector(".hero");
    if (!hero || hero.querySelector(".depth-gauge")) return;
    hero.style.position = "relative";

    ["left", "right"].forEach((side) => {
      const gauge = document.createElement("div");
      gauge.className = "depth-gauge " + side;
      gauge.setAttribute("aria-hidden", "true");
      gauge.innerHTML =
        buildStrataSVG() +
        '<div class="bit"></div>' +
        '<div class="depth-readout" data-depth>0 FT</div>';
      hero.appendChild(gauge);
    });

    if (reduceMotion) return;

    const readouts = hero.querySelectorAll("[data-depth]");
    let depth = 0;
    const max = 1800;
    setInterval(() => {
      depth = (depth + 37) % max;
      readouts.forEach((r) => (r.textContent = depth + " FT"));
    }, 160);
  }
  injectDepthGauge();

  /* ---------------------------- DISTRICT LIST A11y ------------------------------
     Keep toggleDistrict() (defined inline in the HTML) working; just make sure
     any list without the inline handler still closes on outside click. */
  document.addEventListener("click", (e) => {
    const isServiceBtn = e.target.closest(".service-btn");
    if (isServiceBtn) return;
    if (!e.target.closest(".service-area1")) {
      document.querySelectorAll(".district-list.show").forEach((l) => l.classList.remove("show"));
    }
  });
})();

/* LOADER SEQUENCE — the cinematic intro that plays on first visit, or on repeat visits if CONFIG.skipOnRepeatVisit is false. */
  (function(){
    "use strict";

    /* ========================================================================
       CONFIG — every knob for retiming or restyling the sequence lives here.
       ======================================================================== */
    var CONFIG = {

      // Where the drilling actually happens, as a fraction of the rig
      // image's own box (0–1). Calibrated to the base of the rear
      // stabilizer leg, right under the mast.
      drillPoint: { x: 0.965, y: 0.955 },

      // Duration of each stage, in milliseconds. Edit freely — the code
      // that reads these doesn't care what the numbers are.
      stageDurations: {
        prepare:   1000,
        drilling:  1400,
        dust:      1700,
        found:     1100,
        spreading: 1550,
        flood:     950
      },
      revealDurationMs: 1100, // matches the CSS transition on #loader[data-stage="reveal"]

      // Hard safety net: no matter what happens (slow device, a JS error,
      // fonts stalling), the site is guaranteed to appear by this time.
      maxTotalFallbackMs: 11000,

      // Status copy per stage. Keep it short — this is a status line, not
      // a headline.
      statusText: {
        prepare:   "Preparing to drill…",
        drilling:  "Drilling deeper…",
        dust:      "Drilling deeper…",
        found:     "Water Found 💧",
        spreading: "Water rising to the surface…",
        flood:     "Almost there…"
      },

      dust:     { spawnEveryMs: 150, minSize: 22, maxSize: 46, minDur: 1500, maxDur: 2200 },
      droplets: { count: 6, staggerMs: 90 },
      bubbles:  { spawnEveryMs: 220, minSize: 6, maxSize: 16, minDur: 2600, maxDur: 4200 },

      // If true, visitors who already sat through the full intro this
      // browser session get a short 700ms crossfade instead of the full
      // cinematic sequence on subsequent page loads. Set to false to
      // always play the full sequence.
      skipOnRepeatVisit: true,
      sessionStorageKey: "smfd_intro_seen"
    };

    var reduceMotion = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var loader        = document.getElementById("loader");
    var rigScene      = document.getElementById("rigScene");
    var effectsAnchor = document.getElementById("effectsAnchor");
    var dustField     = document.getElementById("dustField");
    var dropletField  = document.getElementById("dropletField");
    var bubbleField    = document.getElementById("bubbleField");
    var statusText     = document.getElementById("statusText");
    var progressFill    = document.getElementById("progressFill");
    var waterFlood      = document.querySelector(".water-flood");

    var startTime = performance.now();
    var siteLoaded = document.readyState === "complete";
    window.addEventListener("load", function(){ siteLoaded = true; });

    var dustTimer = null;
    var bubbleTimer = null;
    var revealed = false;

    /* ------------------------------------------------------------------
       Position the effects anchor + water flood origin on the actual
       drilling point, in real viewport pixels, so the flood always
       expands from exactly the right spot regardless of screen size.
       ------------------------------------------------------------------ */
    function positionDrillPoint(){
      var rect = rigScene.getBoundingClientRect();
      var px = rect.left + rect.width  * CONFIG.drillPoint.x;
      var py = rect.top  + rect.height * CONFIG.drillPoint.y;

      effectsAnchor.style.left = (CONFIG.drillPoint.x * 100) + "%";
      effectsAnchor.style.top  = (CONFIG.drillPoint.y * 100) + "%";

      loader.style.setProperty("--drill-x", px + "px");
      loader.style.setProperty("--drill-y", py + "px");
    }

    var resizeRaf = null;
    window.addEventListener("resize", function(){
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(positionDrillPoint);
    });

    /* ------------------------------------------------------------------
       Stage 3 — dust particles rising from the drilling point
       ------------------------------------------------------------------ */
    function spawnDustParticle(){
      var el = document.createElement("span");
      el.className = "dust-particle";
      var size = rand(CONFIG.dust.minSize, CONFIG.dust.maxSize);
      var dur  = rand(CONFIG.dust.minDur, CONFIG.dust.maxDur);
      var dx   = rand(-46, 46);
      el.style.setProperty("--size", size + "px");
      el.style.setProperty("--dur", dur + "ms");
      el.style.setProperty("--dx", dx + "px");
      el.style.left = rand(-14, 14) + "px";
      el.addEventListener("animationend", function(){ el.remove(); });
      dustField.appendChild(el);
    }

    function startDust(){
      if (reduceMotion) return;
      spawnDustParticle();
      dustTimer = setInterval(spawnDustParticle, CONFIG.dust.spawnEveryMs);
    }
    function stopDust(){
      if (dustTimer) clearInterval(dustTimer);
      dustTimer = null;
    }

    /* ------------------------------------------------------------------
       Stage 4 — water droplets popping at the drilling point
       ------------------------------------------------------------------ */
    function spawnDroplets(){
      if (reduceMotion) return;
      for (var i = 0; i < CONFIG.droplets.count; i++){
        (function(i){
          setTimeout(function(){
            var el = document.createElement("span");
            el.className = "droplet";
            el.style.setProperty("--dx", rand(-20, 20) + "px");
            el.style.setProperty("--delay", "0s");
            el.addEventListener("animationend", function(){ el.remove(); });
            dropletField.appendChild(el);
          }, i * CONFIG.droplets.staggerMs);
        })(i);
      }
    }

    /* ------------------------------------------------------------------
       Stages 5 & 6 — bubbles rising through the flood water
       ------------------------------------------------------------------ */
    function spawnBubble(){
      var el = document.createElement("span");
      el.className = "bubble";
      var size = rand(CONFIG.bubbles.minSize, CONFIG.bubbles.maxSize);
      el.style.setProperty("--size", size + "px");
      el.style.setProperty("--dur", rand(CONFIG.bubbles.minDur, CONFIG.bubbles.maxDur) + "ms");
      el.style.setProperty("--sway", rand(-26, 26) + "px");
      el.style.setProperty("--x", rand(2, 98) + "%");
      el.addEventListener("animationend", function(){ el.remove(); });
      bubbleField.appendChild(el);
    }
    function startBubbles(){
      if (reduceMotion) return;
      spawnBubble();
      bubbleTimer = setInterval(spawnBubble, CONFIG.bubbles.spawnEveryMs);
    }
    function stopBubbles(){
      if (bubbleTimer) clearInterval(bubbleTimer);
      bubbleTimer = null;
    }

    function rand(min, max){ return Math.random() * (max - min) + min; }

    /* ------------------------------------------------------------------
       Progress line — width tracks elapsed time against the total
       choreographed duration, independent of exact stage boundaries so
       editing CONFIG.stageDurations never needs a second edit here.
       ------------------------------------------------------------------ */
    var totalChoreographedMs = 0;
    Object.keys(CONFIG.stageDurations).forEach(function(k){
      totalChoreographedMs += CONFIG.stageDurations[k];
    });

    var progressRaf = null;
    function tickProgress(){
      var elapsed = performance.now() - startTime;
      var pct = Math.min(100, (elapsed / totalChoreographedMs) * 100);
      progressFill.style.width = pct + "%";
      if (pct < 100 && !revealed){
        progressRaf = requestAnimationFrame(tickProgress);
      }
    }

    /* ------------------------------------------------------------------
       Stage machine — each stage sets data-stage, updates the status
       line, and (de)activates the effects that belong to it. Ordered
       exactly as the brief's seven scenes.
       ------------------------------------------------------------------ */
    function setStage(name){
      loader.setAttribute("data-stage", name);
      if (CONFIG.statusText[name]) statusText.textContent = CONFIG.statusText[name];
    }

    function runFullSequence(){
      positionDrillPoint();
      tickProgress();

      var t = 0;
      var d = CONFIG.stageDurations;

      // Scene 1 — initial loading (already showing: brand + rig fade in)
      setStage("prepare");

      // Scene 2 — rig starts drilling
      t += d.prepare;
      setTimeout(function(){
        setStage("drilling");
        loader.classList.add("is-vibrating");
      }, t);

      // Scene 3 — white drilling dust
      t += d.drilling;
      setTimeout(function(){
        setStage("dust");
        startDust();
      }, t);

      // Scene 4 — water is found
      t += d.dust;
      setTimeout(function(){
        stopDust();
        loader.classList.remove("is-vibrating");
        setStage("found");
        spawnDroplets();
      }, t);

      // Scene 5 — water spreads outward from the drilling point
      t += d.found;
      setTimeout(function(){
        setStage("spreading");
        var diag = Math.sqrt(window.innerWidth * window.innerWidth + window.innerHeight * window.innerHeight);
        waterFlood.style.clipPath = "circle(" + (diag * 0.55) + "px at var(--drill-x) var(--drill-y))";
        startBubbles();
      }, t);

      // Scene 6 — full-screen water transition
      t += d.spreading;
      setTimeout(function(){
        setStage("flood");
        var diag = Math.sqrt(window.innerWidth * window.innerWidth + window.innerHeight * window.innerHeight);
        waterFlood.style.clipPath = "circle(" + (diag * 1.05) + "px at var(--drill-x) var(--drill-y))";
      }, t);

      // Scene 7 — website reveal
      t += d.flood;
      setTimeout(attemptReveal, t);
    }

    function runReducedMotionSequence(){
      // Same story beats, told in one quiet breath: brand, a drilling
      // beat, water found, reveal. No particles, no vibration, no long
      // clip-path chase — just the text and a small local water cue.
      setStage("prepare");
      setTimeout(function(){ setStage("drilling"); }, 300);
      setTimeout(function(){ setStage("found"); }, 600);
      setTimeout(attemptReveal, 950);
    }

    /* ------------------------------------------------------------------
       Reveal — waits (briefly, and only up to the hard cap) for the real
       page to finish loading before it lets the water flow away.
       ------------------------------------------------------------------ */
    function attemptReveal(){
      if (revealed) return;
      var elapsed = performance.now() - startTime;
      if (siteLoaded || elapsed >= CONFIG.maxTotalFallbackMs){
        reveal();
      } else {
        var remaining = CONFIG.maxTotalFallbackMs - elapsed;
        setTimeout(reveal, Math.min(remaining, 1200));
      }
    }

    function reveal(){
      if (revealed) return;
      revealed = true;
      stopDust();
      stopBubbles();
      if (progressRaf) cancelAnimationFrame(progressRaf);
      progressFill.style.width = "100%";
      loader.classList.remove("is-vibrating");
      setStage("reveal");
      document.body.classList.remove("is-loading");

      try {
        if (CONFIG.skipOnRepeatVisit){
          sessionStorage.setItem(CONFIG.sessionStorageKey, "1");
        }
      } catch (e) { /* storage unavailable — fine, just always play the intro */ }

      setTimeout(function(){
        loader.classList.add("is-done");
      }, CONFIG.revealDurationMs + 50);
    }

    // Absolute fallback: whatever else happens, never leave someone stuck.
    setTimeout(function(){ attemptReveal(); }, CONFIG.maxTotalFallbackMs);

    /* ------------------------------------------------------------------
       Kick off
       ------------------------------------------------------------------ */
    var seenBefore = false;
    try {
      seenBefore = CONFIG.skipOnRepeatVisit &&
        sessionStorage.getItem(CONFIG.sessionStorageKey) === "1";
    } catch (e) { seenBefore = false; }

    if (reduceMotion){
      runReducedMotionSequence();
    } else if (seenBefore){
      // Quick, quiet welcome-back crossfade — full story only plays once
      // per browser session. Flip CONFIG.skipOnRepeatVisit to false to
      // always show the complete sequence.
      setStage("prepare");
      setTimeout(attemptReveal, 500);
    } else {
      runFullSequence();
    }

  })();
