const revealFadeIns = () => {
  document.querySelectorAll(".fade-in:not(.visible)").forEach((el) => {
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    /* Reveal if any part is in (or just about to enter) the viewport */
    if (rect.top < vh + 80 && rect.bottom > -40) {
      el.classList.add("visible");
    }
  });
};

const obs = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        obs.unobserve(e.target);
      }
    }),
  { threshold: 0.01, rootMargin: "80px 0px 80px 0px" }
);
document.querySelectorAll(".fade-in").forEach((el) => obs.observe(el));
revealFadeIns();
window.addEventListener("load", revealFadeIns);
window.addEventListener("scroll", revealFadeIns, { passive: true });

/* ---- Reliable in-page hash scrolling (nav / footer / direct URLs) ---- */
let hashScrollToken = 0;

const getFixedChromeOffset = () => {
  const announcement = document.querySelector(".announcement-bar");
  const headerEl = document.getElementById("header");
  const annH =
    announcement && getComputedStyle(announcement).display !== "none"
      ? announcement.offsetHeight
      : 0;
  const headerH = headerEl ? headerEl.offsetHeight : 0;
  return annH + headerH + 12;
};

const snapRevealFadeInsThrough = (target) => {
  if (!target) return;
  document.querySelectorAll(".fade-in").forEach((el) => {
    const isAfter =
      el !== target &&
      !!(target.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
    if (isAfter) return;
    /* Skip transition so translateY(20px) cannot skew getBoundingClientRect */
    const prev = el.style.transition;
    el.style.transition = "none";
    el.classList.add("visible");
    void el.offsetWidth;
    el.style.transition = prev;
  });
};

const scrollToHashTarget = (hash, { behavior = "smooth", updateHistory = false } = {}) => {
  if (!hash || hash === "#") return false;
  let target = null;
  try {
    target = document.querySelector(hash);
  } catch {
    return false;
  }
  if (!target) return false;

  const token = ++hashScrollToken;
  snapRevealFadeInsThrough(target);

  const measureTop = () =>
    Math.max(0, target.getBoundingClientRect().top + window.scrollY - getFixedChromeOffset());

  const jump = (mode) => {
    if (token !== hashScrollToken) return;
    window.scrollTo({ top: measureTop(), behavior: mode });
  };

  let ro = null;
  let settleTimer = 0;
  let releaseTimer = 0;

  const teardown = () => {
    if (settleTimer) window.clearTimeout(settleTimer);
    if (releaseTimer) window.clearTimeout(releaseTimer);
    settleTimer = 0;
    releaseTimer = 0;
    if (ro) {
      ro.disconnect();
      ro = null;
    }
    window.removeEventListener("wheel", onUserIntent, true);
    window.removeEventListener("touchmove", onUserIntent, true);
    window.removeEventListener("keydown", onUserKey, true);
  };

  const cancelFollow = () => {
    if (token !== hashScrollToken) return;
    hashScrollToken += 1; /* invalidate this follow without starting a new scroll */
    teardown();
  };

  const onUserIntent = () => cancelFollow();
  const onUserKey = (e) => {
    const keys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Spacebar"];
    if (keys.includes(e.key)) cancelFollow();
  };

  /* Stop auto-correct as soon as the user tries to scroll away */
  window.addEventListener("wheel", onUserIntent, { passive: true, capture: true });
  window.addEventListener("touchmove", onUserIntent, { passive: true, capture: true });
  window.addEventListener("keydown", onUserKey, { capture: true });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      jump(behavior);
    });
  });

  /* Brief settle only — long follow loops were yanking users back to #pricing */
  let tries = 0;
  const maxTries = 8;
  const settle = () => {
    if (token !== hashScrollToken) return;
    const desired = measureTop();
    if (Math.abs(desired - window.scrollY) > 8) {
      jump(tries < 2 ? "smooth" : "auto");
    }
    tries += 1;
    if (tries < maxTries) {
      settleTimer = window.setTimeout(settle, tries < 4 ? 120 : 200);
    } else {
      teardown();
    }
  };
  settleTimer = window.setTimeout(settle, 80);

  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(() => {
      if (token !== hashScrollToken) {
        teardown();
        return;
      }
      if (Math.abs(measureTop() - window.scrollY) > 10) jump("auto");
    });
    ro.observe(document.documentElement);
    const scheduleEl = document.getElementById("schedule");
    const reviewsEl = document.getElementById("reviews");
    if (scheduleEl) ro.observe(scheduleEl);
    if (reviewsEl) ro.observe(reviewsEl);
    releaseTimer = window.setTimeout(() => {
      if (token === hashScrollToken) teardown();
    }, 1800);
  } else {
    releaseTimer = window.setTimeout(() => {
      if (token === hashScrollToken) teardown();
    }, 1800);
  }

  if (updateHistory && window.location.hash !== hash) {
    history.pushState(null, "", hash);
  }
  return true;
};

const handleSamePageHashClick = (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
    return;
  }
  const link = e.target.closest("a[href]");
  if (!link) return;
  const href = link.getAttribute("href") || "";
  if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

  let hash = "";
  if (href.startsWith("#") && href.length > 1) {
    hash = href;
  } else if (href.includes("#")) {
    const [path, frag] = href.split("#");
    const cleanPath = (path || "").replace(/^\.\//, "");
    const page = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
    const targetPage = (cleanPath.split("/").pop() || page).toLowerCase() || "index.html";
    const samePage =
      targetPage === page ||
      targetPage === "" ||
      (page === "index.html" && (targetPage === "" || targetPage === "index.html")) ||
      ((page === "" || page === "/") && (targetPage === "" || targetPage === "index.html"));
    if (frag && samePage) {
      hash = `#${frag}`;
    }
  }
  if (!hash) return;

  let target = null;
  try {
    target = document.querySelector(hash);
  } catch {
    return;
  }
  if (!target) return;

  e.preventDefault();
  scrollToHashTarget(hash, { behavior: "smooth", updateHistory: true });
};

document.addEventListener("click", handleSamePageHashClick);

const syncHashOnLoad = () => {
  const hash = window.location.hash;
  if (!hash || hash === "#") return;
  try {
    history.scrollRestoration = "manual";
  } catch {
    /* ignore */
  }
  /* One corrected jump + one short post-load settle — avoid repeated yank loops */
  scrollToHashTarget(hash, { behavior: "auto", updateHistory: false });
};

window.addEventListener("hashchange", () => {
  revealFadeIns();
  scrollToHashTarget(window.location.hash, { behavior: "smooth", updateHistory: false });
});
window.addEventListener("DOMContentLoaded", syncHashOnLoad);
window.addEventListener("load", () => {
  revealFadeIns();
  if (window.location.hash && window.location.hash !== "#") {
    scrollToHashTarget(window.location.hash, { behavior: "auto", updateHistory: false });
  }
});

document.addEventListener("DOMContentLoaded", () => {

  /* ---- Shared mobile snap carousels (sessions / formats / reviews) ---- */
  const bindSnapCarousel = (scroller, prevBtn, nextBtn, stepEl) => {
    if (!scroller || !prevBtn || !nextBtn) return null;

    const cardStep = () => {
      if (typeof stepEl === "function") return stepEl();
      const card = typeof stepEl === "string"
        ? scroller.querySelector(stepEl)
        : stepEl;
      return card ? card.getBoundingClientRect().width : scroller.clientWidth;
    };

    const syncArrows = () => {
      const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      prevBtn.disabled = scroller.scrollLeft <= 4;
      nextBtn.disabled = scroller.scrollLeft >= maxScroll - 4;
    };

    const scrollByDir = (dir) => {
      scroller.scrollBy({ left: dir * cardStep(), behavior: "smooth" });
      window.setTimeout(syncArrows, 320);
    };

    prevBtn.addEventListener("click", () => scrollByDir(-1));
    nextBtn.addEventListener("click", () => scrollByDir(1));
    scroller.addEventListener("scroll", syncArrows, { passive: true });
    window.addEventListener("resize", syncArrows, { passive: true });
    syncArrows();
    return { syncArrows, scrollByDir };
  };

  bindSnapCarousel(
    document.getElementById("moveCarousel"),
    document.getElementById("movePrevBtn"),
    document.getElementById("moveNextBtn"),
    ".move-card"
  );

  bindSnapCarousel(
    document.getElementById("formatsCarousel"),
    document.getElementById("formatsPrevBtn"),
    document.getElementById("formatsNextBtn"),
    ".format-card"
  );

  /* ---- Carousel (continuous loop) ---- */
  const carousel = document.getElementById("classesCarousel");
  const nextBtn = document.getElementById("nextBtn");
  const prevBtn = document.getElementById("prevBtn");

  if (carousel && nextBtn && prevBtn) {
    const originals = [...carousel.querySelectorAll(".classes-card")];

    originals.forEach((card) => {
      const clone = card.cloneNode(true);
      clone.classList.add("classes-card--clone");
      clone.setAttribute("aria-hidden", "true");
      clone.querySelectorAll("a, button").forEach((el) => {
        el.setAttribute("tabindex", "-1");
      });
      carousel.appendChild(clone);
    });

    let loopWidth = 0;
    let paused = false;
    let rafId = null;

    const getGap = () => {
      const gap = parseFloat(getComputedStyle(carousel).columnGap || getComputedStyle(carousel).gap);
      return Number.isFinite(gap) ? gap : 16;
    };

    const scrollStep = () => {
      const card = carousel.querySelector(".classes-card");
      return card ? card.offsetWidth + getGap() : 280;
    };

    const measureLoop = () => {
      loopWidth = originals.reduce((sum, card, index) => {
        const gap = index > 0 ? getGap() : 0;
        return sum + card.offsetWidth + gap;
      }, 0);
    };

    const normalizeScroll = () => {
      if (loopWidth <= 0) return;
      while (carousel.scrollLeft >= loopWidth) {
        carousel.scrollLeft -= loopWidth;
      }
      while (carousel.scrollLeft < 0) {
        carousel.scrollLeft += loopWidth;
      }
    };

    measureLoop();
    window.addEventListener("resize", measureLoop);

    carousel.addEventListener("scroll", normalizeScroll, { passive: true });

    carousel.addEventListener("mouseenter", () => { paused = true; });
    carousel.addEventListener("mouseleave", () => { paused = false; });
    carousel.addEventListener("focusin", () => { paused = true; });
    carousel.addEventListener("focusout", (e) => {
      if (!carousel.contains(e.relatedTarget)) paused = false;
    });

    nextBtn.addEventListener("click", () => {
      paused = true;
      carousel.scrollBy({ left: scrollStep(), behavior: "smooth" });
      setTimeout(() => { paused = false; }, 600);
    });

    prevBtn.addEventListener("click", () => {
      paused = true;
      if (carousel.scrollLeft <= 1) {
        carousel.scrollLeft += loopWidth;
      }
      carousel.scrollBy({ left: -scrollStep(), behavior: "smooth" });
      setTimeout(() => { paused = false; }, 600);
    });

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!prefersReducedMotion) {
      const tick = () => {
        if (!paused && loopWidth > 0) {
          carousel.scrollLeft += 0.45;
          normalizeScroll();
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);

      window.addEventListener("pagehide", () => {
        if (rafId) cancelAnimationFrame(rafId);
      });
    }
  }

  /* ---- Session links → booking section ---- */
  document.querySelectorAll(".session-link, a[href^='#booking-']").forEach(link => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#booking")) return;
      e.preventDefault();
      const booking = document.getElementById("booking");
      const target = document.querySelector(href);
      (target || booking)?.scrollIntoView({ behavior: "smooth" });
    });
  });

  /* ---- Mobile menu + nav dropdowns ---- */
  const menuToggle = document.getElementById("menuToggle");
  const navMenu = document.getElementById("navMenu");

  if (menuToggle && navMenu) {
    const setMenuOpen = (open) => {
      menuToggle.classList.toggle("active", open);
      navMenu.classList.toggle("open", open);
      menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
    };

    const isMobileNav = () => window.matchMedia("(max-width: 768px)").matches;

    const closeNavDropdowns = (except = null) => {
      navMenu.querySelectorAll(".nav-item.has-dropdown").forEach((openItem) => {
        if (except && openItem === except) return;
        openItem.classList.remove("is-open");
        const toggle = openItem.querySelector(".nav-dropdown-toggle");
        toggle?.setAttribute("aria-expanded", "false");
        if (toggle && document.activeElement === toggle) toggle.blur();
      });
    };

    menuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      setMenuOpen(!navMenu.classList.contains("open"));
    });

    navMenu.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        setMenuOpen(false);
        closeNavDropdowns();
      });
    });

    navMenu.querySelectorAll(".nav-item.has-dropdown").forEach((item) => {
      const toggle = item.querySelector(".nav-dropdown-toggle");
      if (!toggle) return;

      toggle.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const willOpen = !item.classList.contains("is-open");
        closeNavDropdowns(item);
        item.classList.toggle("is-open", willOpen);
        toggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
        if (!willOpen) toggle.blur();
      });

      /* Desktop: don't leave click-focus pinning the menu open after hover ends */
      item.addEventListener("mouseleave", () => {
        if (isMobileNav()) return;
        item.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        if (document.activeElement === toggle) toggle.blur();
      });

      item.addEventListener("focusout", (e) => {
        if (item.contains(e.relatedTarget)) return;
        item.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("click", (e) => {
      const insideDropdownItem = e.target.closest(".nav-item.has-dropdown");
      if (!insideDropdownItem) closeNavDropdowns();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeNavDropdowns();
    });
  }

  /* ---- Pricing tabs ---- */
  const priceTabs = document.querySelectorAll("[data-price-tab]");
  if (priceTabs.length) {
    priceTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const key = tab.getAttribute("data-price-tab");
        priceTabs.forEach((t) => {
          const selected = t === tab;
          t.classList.toggle("is-active", selected);
          t.setAttribute("aria-selected", selected ? "true" : "false");
        });
        document.querySelectorAll(".price-panel").forEach((panel) => {
          const match = panel.id === `price-panel-${key}`;
          panel.classList.toggle("is-active", match);
          panel.hidden = !match;
        });
      });
    });
  }

  /* ---- Schedule filters → drive the live Momence widget UI ---- */
  const schedulePreview = document.getElementById("schedulePreview");
  if (schedulePreview) {
    const norm = (value) => value.replace(/\s+/g, " ").trim().toUpperCase();
    let activeScheduleFilter = "today";

    const clickMomenceControl = (label) => {
      if (!label) return false;
      const needle = norm(label);
      const match = [...schedulePreview.querySelectorAll("button, a, [role='button'], [role='tab']")]
        .find((el) => norm(el.textContent) === needle);
      if (!match) return false;
      match.click();
      return true;
    };

    const selectDayOffset = (offsetDays) => {
      const d = new Date();
      d.setDate(d.getDate() + offsetDays);
      const dayNum = String(d.getDate());
      const weekday = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
      const exact = `${weekday} ${dayNum}`;

      if (clickMomenceControl(exact)) return true;

      const match = [...schedulePreview.querySelectorAll("button, a, [role='button'], [role='tab'], div, span")]
        .find((el) => {
          const t = norm(el.textContent);
          return t === exact || (t.includes(weekday) && t.includes(dayNum) && t.length <= 12);
        });
      if (!match) return false;
      match.click();
      return true;
    };

    const whenMomenceReady = (fn, attempts = 24) => {
      const tick = () => {
        if (fn()) return;
        if (attempts-- <= 0) return;
        window.setTimeout(tick, 150);
      };
      window.setTimeout(tick, 100);
    };

    const clickShowAll = () =>
      clickMomenceControl("Show all") ||
      clickMomenceControl("SHOW ALL") ||
      clickMomenceControl("Upcoming");

    /* Hard reset back to default upcoming / all sessions (avoids sticky Today chip) */
    const SCHEDULE_EMBED = {
      host_id: "259434",
      teacher_ids: "[]",
      location_ids: "[]",
      tag_ids: "[]",
      lite_mode: "true",
      hide_drop_in_price: "true",
      default_filter: "upcoming",
      locale: "en",
      src: "https://momence.com/plugin/host-schedule/host-schedule.js"
    };

    const clearSchedulePreview = () => {
      const ribbon = document.getElementById("ribbon-schedule");
      document.getElementById("momence-plugin-host-schedule")?.remove();
      document.getElementById("hp-pod-booking")?.remove();
      if (ribbon) ribbon.innerHTML = "";
      [...schedulePreview.querySelectorAll(":scope > *:not(#ribbon-schedule)")]
        .forEach((node) => node.remove());
    };

    const showPodBooking = () => {
      clearSchedulePreview();
      const wrap = document.createElement("div");
      wrap.id = "hp-pod-booking";
      wrap.className = "hp-pod-booking";
      wrap.innerHTML = `
        <p class="hp-pod-booking__lead">Book a private grip.pod session.</p>
        <iframe
          id="iframe_appointments_259434_hp"
          src="https://momence.com/appointments/259434?boardId=209471"
          style="width:100%;border:0;min-height:640px;"
          allowfullscreen="true"
          title="Book the grip.pod at grip.">
        </iframe>
        <p class="center" style="margin-top:1rem;">
          <a href="sessions/grip-pod.html" class="btn btn-ghost">About grip.pod</a>
        </p>
      `;
      schedulePreview.appendChild(wrap);

      const onMsg = (e) => {
        const height = +e.data?.height;
        const type = e.data?.type;
        const iframe = document.querySelector("#iframe_appointments_259434_hp");
        if (!type || !String(type).match("iframe_appointments_259434") || isNaN(height) || !iframe) return;
        iframe.style.height = `${height}px`;
      };
      window.addEventListener("message", onMsg);
    };

    const remountScheduleUpcoming = ({ selectShowAll = false } = {}) => {
      const ribbon = document.getElementById("ribbon-schedule");
      if (!ribbon) return false;

      const oldScript = document.getElementById("hp-schedule-embed");
      const hostId =
        (oldScript && (oldScript.getAttribute("host_id") || oldScript.getAttribute("host-id"))) ||
        SCHEDULE_EMBED.host_id;

      clearSchedulePreview();

      /*
        Momence reads config from: script[host_id][src$="host-schedule.js"]
        A cache-bust ?v= on that same script breaks the selector (host becomes NaN).
        Keep an inert attribute bearer that still ends in host-schedule.js, then
        import a cache-busted module URL so the widget actually remounts.
      */
      const config = document.createElement("script");
      config.id = "hp-schedule-embed";
      config.type = "text/plain";
      config.setAttribute("host_id", hostId);
      config.setAttribute("teacher_ids", (oldScript && oldScript.getAttribute("teacher_ids")) || SCHEDULE_EMBED.teacher_ids);
      config.setAttribute("location_ids", (oldScript && oldScript.getAttribute("location_ids")) || SCHEDULE_EMBED.location_ids);
      config.setAttribute("tag_ids", SCHEDULE_EMBED.tag_ids);
      config.setAttribute("lite_mode", (oldScript && oldScript.getAttribute("lite_mode")) || SCHEDULE_EMBED.lite_mode);
      config.setAttribute(
        "hide_drop_in_price",
        (oldScript && oldScript.getAttribute("hide_drop_in_price")) || SCHEDULE_EMBED.hide_drop_in_price
      );
      config.setAttribute("default_filter", SCHEDULE_EMBED.default_filter);
      config.setAttribute("locale", (oldScript && oldScript.getAttribute("locale")) || SCHEDULE_EMBED.locale);
      config.setAttribute("src", SCHEDULE_EMBED.src);
      schedulePreview.appendChild(config);

      const afterMount = () => {
        if (selectShowAll) whenMomenceReady(clickShowAll);
      };

      import(`${SCHEDULE_EMBED.src}?v=${Date.now()}`)
        .then(afterMount)
        .catch(() => {
          const next = document.createElement("script");
          next.async = true;
          next.type = "module";
          next.setAttribute("host_id", hostId);
          next.setAttribute("teacher_ids", config.getAttribute("teacher_ids"));
          next.setAttribute("location_ids", config.getAttribute("location_ids"));
          next.setAttribute("tag_ids", config.getAttribute("tag_ids"));
          next.setAttribute("lite_mode", config.getAttribute("lite_mode"));
          next.setAttribute("hide_drop_in_price", config.getAttribute("hide_drop_in_price"));
          next.setAttribute("default_filter", "upcoming");
          next.setAttribute("locale", config.getAttribute("locale"));
          next.src = SCHEDULE_EMBED.src;
          schedulePreview.appendChild(next);
          afterMount();
        });

      return true;
    };

    const ensureClassSchedule = (thenFn) => {
      if (document.getElementById("hp-pod-booking") || !document.getElementById("hp-schedule-embed")) {
        remountScheduleUpcoming();
        whenMomenceReady(() => {
          thenFn?.();
          return true;
        });
        return;
      }
      thenFn?.();
    };

    const applyScheduleFilter = (key) => {
      if (key === "pod") {
        showPodBooking();
        return;
      }

      if (key === "all") {
        remountScheduleUpcoming({ selectShowAll: true });
        return;
      }
      if (key === "today") {
        ensureClassSchedule(() => {
          if (!clickMomenceControl("Today")) selectDayOffset(0);
        });
        return;
      }
      if (key === "tomorrow") {
        ensureClassSchedule(() => {
          if (!clickMomenceControl("Tomorrow")) selectDayOffset(1);
        });
        return;
      }
      if (key === "megaformer") {
        if (activeScheduleFilter === "pod" || activeScheduleFilter === "today" || activeScheduleFilter === "tomorrow") {
          remountScheduleUpcoming();
          whenMomenceReady(() => clickMomenceControl("MEGAFORMER"));
          return;
        }
        ensureClassSchedule(() => clickMomenceControl("MEGAFORMER"));
        return;
      }
      if (key === "studio") {
        if (activeScheduleFilter === "pod" || activeScheduleFilter === "today" || activeScheduleFilter === "tomorrow") {
          remountScheduleUpcoming();
          whenMomenceReady(() => clickMomenceControl("STUDIO"));
          return;
        }
        ensureClassSchedule(() => clickMomenceControl("STUDIO"));
      }
    };

    const setActiveScheduleFilter = (key) => {
      const btn = document.querySelector(`[data-schedule-filter="${key}"]`);
      if (!btn) return;
      document.querySelectorAll("[data-schedule-filter]").forEach((el) => {
        const active = el === btn;
        el.classList.toggle("is-active", active);
        el.setAttribute("aria-selected", active ? "true" : "false");
      });
      applyScheduleFilter(key);
      activeScheduleFilter = key || "all";
    };

    document.querySelectorAll("[data-schedule-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-schedule-filter");
        setActiveScheduleFilter(key);
      });
    });

    /* Book grip.pod etc. → jump to schedule and select Pod filter */
    document.querySelectorAll("[data-schedule-jump]").forEach((link) => {
      link.addEventListener("click", () => {
        const key = link.getAttribute("data-schedule-jump");
        if (!key) return;
        window.setTimeout(() => setActiveScheduleFilter(key), 80);
      });
    });

    /* Deep link: ?filter=pod#schedule (from grip.pod Book buttons) */
    const scheduleFilterParam = new URLSearchParams(window.location.search).get("filter");
    const startWithPod = scheduleFilterParam === "pod";

    if (startWithPod) {
      setActiveScheduleFilter("pod");
    } else {
      /* Initial load: Today is active — Pod stays deselected by default */
      whenMomenceReady(() => {
        if (clickMomenceControl("Today")) return true;
        return selectDayOffset(0);
      });
    }
  }

  /* ---- Studio gallery vertical wave scroll ---- */
  const studioGallery = document.getElementById("studioGallery");
  if (studioGallery) {
    const studioImages = [
      { src: "images/studio/studio-lounge.jpg", alt: "Studio lounge seating with members" },
      { src: "images/studio/studio-mat-class.jpg", alt: "Mat class in the studio" },
      { src: "images/studio/studio-megaformer-class.jpg", alt: "Megaformer class in the studio" },
      { src: "images/studio/studio-06-reception.png", alt: "grip. reception desk" },
      { src: "images/studio/studio-05-window.png", alt: "Studio window seating with grip. branding" },
      { src: "images/studio/studio-03-megaformer.png", alt: "Megaformer studio floor" },
      { src: "images/studio/studio-01-lounge.png", alt: "Studio lounge seating" },
      { src: "images/studio/studio-02-mirrors.png", alt: "Studio mirrors and mat room" },
      { src: "images/studio/studio-04-coffee.png", alt: "Studio coffee and wellness station" }
    ];
    const cols = [...studioGallery.querySelectorAll("[data-wave-col]")];
    const motionClasses = ["studio-wave__col--up", "studio-wave__col--down", "studio-wave__col--up-slow"];
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const preloadImage = (item) =>
      new Promise((resolve) => {
        const probe = new Image();
        probe.onload = () => resolve(item);
        probe.onerror = () => resolve(null);
        probe.src = item.src;
      });

    const buildFigure = (item) => {
      const figure = document.createElement("figure");
      figure.classList.add("is-ready");
      const img = document.createElement("img");
      img.src = item.src;
      img.alt = item.alt;
      img.loading = "eager";
      img.decoding = "async";
      img.addEventListener("error", () => figure.remove());
      figure.appendChild(img);
      return figure;
    };

    const mountGallery = (usable) => {
      if (!usable.length) {
        studioGallery.hidden = true;
        return;
      }
      cols.forEach((col, colIndex) => {
        const offset = colIndex % usable.length;
        const sequence = [...usable.slice(offset), ...usable.slice(0, offset)];
        /* Duplicate the strip so the vertical loop can scroll seamlessly */
        const loopItems = prefersReducedMotion ? sequence.slice(0, 2) : [...sequence, ...sequence];
        col.replaceChildren(...loopItems.map(buildFigure));
        if (!prefersReducedMotion) {
          col.classList.add(motionClasses[colIndex] || motionClasses[0]);
        }
      });
    };

    Promise.all(studioImages.map(preloadImage)).then((results) => {
      mountGallery(results.filter(Boolean));
    });
  }

  /* ---- Momence schedule: hide tag chips we don't offer as filters ---- */
  const HIDDEN_SCHEDULE_TAGS = ["stretch"];
  const hideScheduleTagChips = () => {
    document.querySelectorAll(".momence-host_dashboard-tags_row [role='switch']").forEach((chip) => {
      if (HIDDEN_SCHEDULE_TAGS.includes(chip.textContent.trim().toLowerCase())) {
        chip.style.setProperty("display", "none", "important");
      }
    });
  };

  /* ---- Momence schedule: add a Pod chip (pod is booked via appointments, not a class tag) ---- */
  let podChipActive = false;

  const podPanelHtml = `
    <iframe
      id="iframe_appointments_259434_chip"
      src="https://momence.com/appointments/259434?boardId=209471"
      style="width:100%;border:0;min-height:640px;"
      allowfullscreen="true"
      title="Book the grip.pod at grip.">
    </iframe>
  `;

  window.addEventListener("message", (e) => {
    const height = +e.data?.height;
    const type = e.data?.type;
    const iframe = document.getElementById("iframe_appointments_259434_chip");
    if (!iframe || !type || !String(type).match("iframe_appointments_259434") || isNaN(height)) return;
    iframe.style.height = `${height}px`;
  });

  const setPodChipState = (row, active) => {
    podChipActive = active;
    const chip = row.querySelector("[data-grip-pod-chip]");
    chip?.setAttribute("aria-checked", active ? "true" : "false");
    chip?.classList.toggle("is-grip-pod-active", active);

    let sibling = row.nextElementSibling;
    while (sibling) {
      if (!sibling.hasAttribute("data-grip-pod-panel")) {
        sibling.style.display = active ? "none" : "";
      }
      sibling = sibling.nextElementSibling;
    }

    const existing = row.parentElement?.querySelector("[data-grip-pod-panel]");
    if (active && !existing) {
      const panel = document.createElement("div");
      panel.setAttribute("data-grip-pod-panel", "");
      panel.className = "grip-pod-chip-panel";
      panel.innerHTML = podPanelHtml;
      row.after(panel);
    } else if (!active) {
      existing?.remove();
    }
  };

  const addPodScheduleChip = () => {
    document.querySelectorAll(".momence-host_dashboard-tags_row").forEach((row) => {
      if (!row.querySelector("[data-grip-pod-chip]")) {
        const template = row.querySelector("[role='switch']");
        if (!template) return;
        const chip = template.cloneNode(false);
        chip.setAttribute("data-grip-pod-chip", "");
        chip.setAttribute("aria-checked", "false");
        chip.removeAttribute("id");
        chip.textContent = "Pod";
        chip.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const homePodTab = document.querySelector("[data-schedule-filter='pod']");
          if (homePodTab) {
            homePodTab.click();
            return;
          }
          setPodChipState(row, !podChipActive);
        });
        row.appendChild(chip);
      }

      if (podChipActive) {
        let sibling = row.nextElementSibling;
        while (sibling) {
          if (!sibling.hasAttribute("data-grip-pod-panel") && sibling.style.display !== "none") {
            sibling.style.display = "none";
          }
          sibling = sibling.nextElementSibling;
        }
      }
    });
  };

  document.addEventListener("click", (e) => {
    if (!podChipActive) return;
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-grip-pod-chip], [data-grip-pod-panel]")) return;
    if (!target.closest(".momence-host_schedule")) return;
    const row = document.querySelector(".momence-host_dashboard-tags_row");
    if (row) setPodChipState(row, false);
  });

  const syncScheduleChips = () => {
    hideScheduleTagChips();
    addPodScheduleChip();
  };
  new MutationObserver(syncScheduleChips).observe(document.body, { childList: true, subtree: true });
  syncScheduleChips();

  /* ---- Copyright year ---- */
  const yearEl = document.getElementById("copyrightYear");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---- Final CTA newsletter trigger ---- */
  document.getElementById("openNewsletter")?.addEventListener("click", () => {
    const popup = document.getElementById("newsletterPopup");
    if (!popup) return;
    popup.classList.add("is-open");
    popup.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  });

  document.getElementById("finalEmailForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    /* Replace with Momence / CRM API when ready */
  });

  /* ---- Header scroll shadow + mobile compact bar ---- */
  const header = document.getElementById("header");
  if (header) {
    const syncHeaderCompact = () => {
      const compact = window.scrollY > 24;
      header.classList.toggle("scrolled", compact);
      document.body.classList.toggle(
        "header-compact",
        compact && window.matchMedia("(max-width: 768px)").matches
      );
    };
    window.addEventListener("scroll", syncHeaderCompact, { passive: true });
    window.addEventListener("resize", syncHeaderCompact, { passive: true });
    syncHeaderCompact();
  }

  /* ---- Back to top ---- */
  const backToTop = document.getElementById("backToTop");
  if (backToTop) {
    window.addEventListener("scroll", () => {
      backToTop.classList.toggle("visible", window.scrollY > 600);
    }, { passive: true });

    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---- Newsletter popup (first visit per day / each new visit) ---- */
  const popup = document.getElementById("newsletterPopup");
  const popupClose = document.getElementById("popupClose");
  const popupForm = document.getElementById("popupForm");
  const POPUP_SESSION_KEY = "grip-newsletter-seen";
  const POPUP_DAY_KEY = "grip-newsletter-last-seen";

  const markPopupSeen = () => {
    const today = new Date().toDateString();
    sessionStorage.setItem(POPUP_SESSION_KEY, "true");
    localStorage.setItem(POPUP_DAY_KEY, today);
  };

  const isDirectSectionAccess = () => {
    const hash = window.location.hash;
    if (!hash || hash === "#") return false;
    try {
      return !!document.querySelector(hash);
    } catch {
      return false;
    }
  };

  const shouldShowPopup = () => {
    if (isDirectSectionAccess()) return false;
    const today = new Date().toDateString();
    const seenThisSession = sessionStorage.getItem(POPUP_SESSION_KEY);
    const seenToday = localStorage.getItem(POPUP_DAY_KEY) === today;
    return !seenThisSession || !seenToday;
  };

  const openPopup = () => {
    if (!popup) return;
    popup.classList.add("is-open");
    popup.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    markPopupSeen();
  };

  const closePopup = () => {
    if (!popup) return;
    popup.classList.remove("is-open");
    popup.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    markPopupSeen();
  };

  if (popup && shouldShowPopup()) {
    setTimeout(openPopup, 800);
  }

  popupClose?.addEventListener("click", closePopup);

  popup?.addEventListener("click", (e) => {
    if (e.target === popup) closePopup();
  });

  popupForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    /* Replace with your Momence / CRM API when ready */
    closePopup();
  });

  const alertsForm = document.getElementById("crm-email-widget");
  alertsForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    /* Replace with your Momence / CRM API when ready */
  });

  /* ---- Mobile reviews: force Momence embed into a one-card horizontal carousel ---- */
  const reviewsRoot = document.getElementById("momence-plugin-reviews");
  const reviewsPrevBtn = document.getElementById("reviewsPrevBtn");
  const reviewsNextBtn = document.getElementById("reviewsNextBtn");
  let reviewsCarouselApi = null;

  if (reviewsRoot) {
    const isMobileReviews = () => window.matchMedia("(max-width: 768px)").matches;

    const findReviewsList = (root) => {
      let best = null;
      let bestCount = 0;
      root.querySelectorAll("div").forEach((el) => {
        const kids = [...el.children].filter((n) => n.nodeType === 1);
        if (kids.length < 2) return;
        const cardLike = kids.filter((k) => k.querySelectorAll("*").length >= 3).length;
        if (cardLike < 2 || cardLike < kids.length) return;
        if (kids.length > bestCount) {
          best = el;
          bestCount = kids.length;
        }
      });
      return best;
    };

    const applyReviewsCarousel = () => {
      const list = findReviewsList(reviewsRoot);
      if (!list) return false;

      if (!isMobileReviews()) {
        list.style.removeProperty("display");
        list.style.removeProperty("flex-direction");
        list.style.removeProperty("flex-wrap");
        list.style.removeProperty("width");
        list.style.removeProperty("max-width");
        list.style.removeProperty("gap");
        [...list.children].forEach((card) => {
          card.style.removeProperty("flex");
          card.style.removeProperty("width");
          card.style.removeProperty("min-width");
          card.style.removeProperty("max-width");
          card.style.removeProperty("scroll-snap-align");
          card.style.removeProperty("background");
          card.style.removeProperty("border");
        });
        return true;
      }

      const cardWidth = Math.round(reviewsRoot.clientWidth) || Math.round(window.innerWidth);
      reviewsRoot.style.setProperty("--reviews-card-width", `${cardWidth}px`);
      reviewsRoot.style.setProperty("overflow-x", "auto", "important");
      reviewsRoot.style.setProperty("overflow-y", "hidden", "important");
      reviewsRoot.style.setProperty("scroll-snap-type", "x mandatory");
      reviewsRoot.style.setProperty("scroll-behavior", "smooth");
      reviewsRoot.style.setProperty("background", "transparent", "important");

      /* Flatten Momence outer shells so they don't paint a narrower white panel */
      let node = list.parentElement;
      while (node && node !== reviewsRoot) {
        node.style.setProperty("width", "100%", "important");
        node.style.setProperty("max-width", "100%", "important");
        node.style.setProperty("min-width", "0", "important");
        node.style.setProperty("background", "transparent", "important");
        node.style.setProperty("box-shadow", "none", "important");
        node.style.setProperty("padding", "0", "important");
        node.style.setProperty("margin", "0", "important");
        node = node.parentElement;
      }

      list.style.setProperty("display", "flex", "important");
      list.style.setProperty("flex-direction", "row", "important");
      list.style.setProperty("flex-wrap", "nowrap", "important");
      list.style.setProperty("gap", "0", "important");
      list.style.setProperty("width", "max-content", "important");
      list.style.setProperty("max-width", "none", "important");
      list.style.setProperty("background", "transparent", "important");
      list.style.setProperty("padding", "0", "important");
      list.style.setProperty("margin", "0", "important");

      [...list.children].forEach((card) => {
        card.style.setProperty("flex", `0 0 ${cardWidth}px`, "important");
        card.style.setProperty("width", `${cardWidth}px`, "important");
        card.style.setProperty("min-width", `${cardWidth}px`, "important");
        card.style.setProperty("max-width", `${cardWidth}px`, "important");
        card.style.setProperty("scroll-snap-align", "start");
        card.style.setProperty("scroll-snap-stop", "always");
        card.style.setProperty("box-sizing", "border-box", "important");
        card.style.setProperty("background", "#fffefc", "important");
        card.style.setProperty("overflow", "hidden", "important");
      });

      if (!reviewsCarouselApi) {
        reviewsCarouselApi = bindSnapCarousel(
          reviewsRoot,
          reviewsPrevBtn,
          reviewsNextBtn,
          () => reviewsRoot.clientWidth || window.innerWidth
        );
      } else {
        reviewsCarouselApi.syncArrows();
      }
      return true;
    };

    const reviewsObs = new MutationObserver(() => {
      applyReviewsCarousel();
    });
    reviewsObs.observe(reviewsRoot, { childList: true, subtree: true });
    applyReviewsCarousel();
    window.setTimeout(applyReviewsCarousel, 800);
    window.setTimeout(applyReviewsCarousel, 2000);
    window.addEventListener("resize", applyReviewsCarousel);
  }

});
