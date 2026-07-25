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

    navMenu.querySelectorAll(".nav-dropdown-toggle").forEach((toggle) => {
      const item = toggle.closest(".nav-item");
      toggle.addEventListener("click", (e) => {
        e.preventDefault();
        const willOpen = !item.classList.contains("is-open");
        navMenu.querySelectorAll(".nav-item.is-open").forEach((openItem) => {
          if (openItem !== item) {
            openItem.classList.remove("is-open");
            openItem.querySelector(".nav-dropdown-toggle")?.setAttribute("aria-expanded", "false");
          }
        });
        item.classList.toggle("is-open", willOpen);
        toggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
      });
    });

    document.addEventListener("click", (e) => {
      if (!navMenu.contains(e.target) && e.target !== menuToggle) {
        navMenu.querySelectorAll(".nav-item.is-open").forEach((item) => {
          item.classList.remove("is-open");
          item.querySelector(".nav-dropdown-toggle")?.setAttribute("aria-expanded", "false");
        });
      }
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

  /* ---- Schedule filter (Today / Tomorrow) ---- */
  document.querySelectorAll("[data-schedule-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-schedule-filter]").forEach((el) => {
        const active = el === btn;
        el.classList.toggle("is-active", active);
        el.setAttribute("aria-selected", active ? "true" : "false");
      });
      const filter = btn.getAttribute("data-schedule-filter");
      const embed = document.getElementById("hp-schedule-embed");
      if (embed && filter) {
        embed.setAttribute("default_filter", filter);
      }
    });
  });

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
