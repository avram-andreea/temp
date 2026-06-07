

const obs = new IntersectionObserver(entries =>
  entries.forEach(e => e.isIntersecting && e.target.classList.add("visible"))
);
document.querySelectorAll(".fade-in").forEach(el => obs.observe(el));



document.addEventListener("DOMContentLoaded", function () {

  const carousel = document.querySelector(".classes-grid");
  const nextBtn = document.getElementById("nextBtn");
  const prevBtn = document.getElementById("prevBtn");

  if (!carousel || !nextBtn || !prevBtn) {
    console.error("Carousel elements missing:", {
      carousel,
      nextBtn,
      prevBtn
    });
    return;
  }

  const scrollAmount = () => {
    const card = carousel.querySelector(".classes-card");
    const gap = 32; // 2rem
    return card.offsetWidth + gap;
  };

  nextBtn.addEventListener("click", () => {
    carousel.scrollBy({
      left: scrollAmount(),
      behavior: "smooth"
    });
  });

  prevBtn.addEventListener("click", () => {
    carousel.scrollBy({
      left: -scrollAmount(),
      behavior: "smooth"
    });
  });

});


const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");

menuToggle.addEventListener("click", () => {
  menuToggle.classList.toggle("active");
  navMenu.classList.toggle("open");
});

// close menu when clicking a link
document.querySelectorAll(".nav a").forEach(link => {
  link.addEventListener("click", () => {
    menuToggle.classList.remove("active");
    navMenu.classList.remove("open");
  });
});


