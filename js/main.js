const obs = new IntersectionObserver(
  entries => entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add("visible");
  }),
  { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
);
document.querySelectorAll(".fade-in").forEach(el => obs.observe(el));

document.addEventListener("DOMContentLoaded", () => {

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
      link.addEventListener("click", (e) => {
        const href = link.getAttribute("href") || "";
        const hash = href.startsWith("#") && href.length > 1 ? href : "";
        const samePageHash =
          hash ||
          (href.includes("#") && !href.startsWith("http")
            ? `#${href.split("#")[1] || ""}`
            : "");
        const target =
          samePageHash && samePageHash !== "#"
            ? document.querySelector(samePageHash)
            : null;

        setMenuOpen(false);
        closeNavDropdowns();

        /* Wait for menu close + body unlock, then scroll with measured header offset */
        if (target && (isMobileNav() || hash)) {
          e.preventDefault();
          const scrollToTarget = () => {
            const announcement = document.querySelector(".announcement-bar");
            const headerEl = document.getElementById("header");
            const offset =
              (announcement && getComputedStyle(announcement).display !== "none"
                ? announcement.offsetHeight
                : 0) +
              (headerEl ? headerEl.offsetHeight : 0) +
              12;
            const top = Math.max(
              0,
              target.getBoundingClientRect().top + window.scrollY - offset
            );
            window.scrollTo({ top, behavior: "smooth" });
            if (samePageHash) {
              history.pushState(null, "", samePageHash);
            }
          };
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              window.setTimeout(scrollToTarget, isMobileNav() ? 80 : 0);
            });
          });
        }
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
    let activeScheduleFilter = "all";

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

    const remountScheduleUpcoming = ({ selectShowAll = false } = {}) => {
      const ribbon = document.getElementById("ribbon-schedule");
      if (!ribbon) return false;

      const oldScript = document.getElementById("hp-schedule-embed");
      const hostId =
        (oldScript && (oldScript.getAttribute("host_id") || oldScript.getAttribute("host-id"))) ||
        SCHEDULE_EMBED.host_id;

      /* Clear previous Momence mount (plugin inserts #momence-plugin-host-schedule beside the script) */
      document.getElementById("momence-plugin-host-schedule")?.remove();
      ribbon.innerHTML = "";
      [...schedulePreview.querySelectorAll(":scope > *:not(#ribbon-schedule)")]
        .forEach((node) => node.remove());

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
      config.setAttribute("tag_ids", (oldScript && oldScript.getAttribute("tag_ids")) || SCHEDULE_EMBED.tag_ids);
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
          /* Fallback: classic module tag without query (may no-op if already evaluated) */
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

    const applyScheduleFilter = (key) => {
      if (key === "all") {
        // Remount, then select Momence "Show all" so it mirrors the Today chip behaviour
        remountScheduleUpcoming({ selectShowAll: true });
        return;
      }
      if (key === "today") {
        if (!clickMomenceControl("Today")) selectDayOffset(0);
        return;
      }
      if (key === "tomorrow") {
        // Momence often has no Tomorrow chip - pick tomorrow on the date strip
        if (!clickMomenceControl("Tomorrow")) selectDayOffset(1);
        return;
      }
      if (key === "megaformer") {
        // If coming from a day filter, reset first so tag filter applies to full upcoming list
        if (activeScheduleFilter === "today" || activeScheduleFilter === "tomorrow") {
          remountScheduleUpcoming();
          whenMomenceReady(() => clickMomenceControl("MEGAFORMER"));
          return;
        }
        clickMomenceControl("MEGAFORMER");
        return;
      }
      if (key === "studio") {
        if (activeScheduleFilter === "today" || activeScheduleFilter === "tomorrow") {
          remountScheduleUpcoming();
          whenMomenceReady(() => clickMomenceControl("STUDIO"));
          return;
        }
        clickMomenceControl("STUDIO");
      }
    };

    document.querySelectorAll("[data-schedule-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-schedule-filter");
        document.querySelectorAll("[data-schedule-filter]").forEach((el) => {
          const active = el === btn;
          el.classList.toggle("is-active", active);
          el.setAttribute("aria-selected", active ? "true" : "false");
        });
        applyScheduleFilter(key);
        activeScheduleFilter = key || "all";
      });
    });

    /* Initial load: All is active, so mark Momence "Show all" once the widget paints */
    whenMomenceReady(clickShowAll);
  }

  /* ---- Studio gallery vertical wave scroll ---- */
  const studioGallery = document.getElementById("studioGallery");
  if (studioGallery) {
    const studioImages = [
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

    const buildFigure = (item) => {
      const figure = document.createElement("figure");
      const img = document.createElement("img");
      img.src = item.src;
      img.alt = item.alt;
      img.loading = "lazy";
      figure.appendChild(img);
      return figure;
    };

    cols.forEach((col, colIndex) => {
      const offset = colIndex;
      const sequence = [
        ...studioImages.slice(offset),
        ...studioImages.slice(0, offset)
      ];
      /* Duplicate the strip so the vertical loop can scroll seamlessly */
      const loopItems = prefersReducedMotion ? sequence.slice(0, 2) : [...sequence, ...sequence];
      col.replaceChildren(...loopItems.map(buildFigure));
      if (!prefersReducedMotion) {
        col.classList.add(motionClasses[colIndex] || motionClasses[0]);
      }
    });
  }

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

  /* ---- Header scroll shadow ---- */
  const header = document.getElementById("header");
  if (header) {
    window.addEventListener("scroll", () => {
      header.classList.toggle("scrolled", window.scrollY > 20);
    }, { passive: true });
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

});
