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

    menuToggle.addEventListener("click", () => {
      setMenuOpen(!navMenu.classList.contains("open"));
    });

    navMenu.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => setMenuOpen(false));
    });

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

    const applyScheduleFilter = (key) => {
      if (key === "today") {
        if (!clickMomenceControl("Today")) selectDayOffset(0);
        return;
      }
      if (key === "tomorrow") {
        // Momence often has no Tomorrow chip — pick tomorrow on the date strip
        if (!clickMomenceControl("Tomorrow")) selectDayOffset(1);
        return;
      }
      if (key === "megaformer") {
        clickMomenceControl("MEGAFORMER");
        return;
      }
      if (key === "studio") {
        clickMomenceControl("STUDIO");
      }
    };

    document.querySelectorAll("[data-schedule-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-schedule-filter]").forEach((el) => {
          const active = el === btn;
          el.classList.toggle("is-active", active);
          el.setAttribute("aria-selected", active ? "true" : "false");
        });
        applyScheduleFilter(btn.getAttribute("data-schedule-filter"));
      });
    });
  }

  /* ---- Studio gallery collage slideshow ---- */
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
    const slots = [...studioGallery.querySelectorAll("[data-studio-slot]")];
    const intervalMs = Number(studioGallery.dataset.interval) || 4500;
    let startIndex = 0;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderStudioSlides = () => {
      slots.forEach((img, slotIndex) => {
        const item = studioImages[(startIndex + slotIndex) % studioImages.length];
        img.classList.add("is-fading");
        window.setTimeout(() => {
          img.src = item.src;
          img.alt = item.alt;
          img.classList.remove("is-fading");
        }, 220);
      });
      startIndex = (startIndex + 1) % studioImages.length;
    };

    // Preload remaining images
    studioImages.forEach((item) => {
      const preload = new Image();
      preload.src = item.src;
    });

    if (!prefersReducedMotion && slots.length) {
      window.setInterval(renderStudioSlides, intervalMs);
    }
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
