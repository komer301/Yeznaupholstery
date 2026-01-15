window.onscroll = function () {
  stickNavbar();
};

const navbar = document.getElementById("navbar");
const sticky = navbar.offsetTop + 40;

function stickNavbar() {
  if (window.scrollY > sticky) navbar.classList.add("sticky");
  else navbar.classList.remove("sticky");
}

const slides = document.querySelectorAll(".slideshow .slide");
let currentSlide = 0;

function showNextSlide() {
  slides[currentSlide].classList.remove("active");
  currentSlide = (currentSlide + 1) % slides.length;
  slides[currentSlide].classList.add("active");
}
setInterval(showNextSlide, 4000);

document.querySelectorAll(".nav-links a").forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const targetId = this.getAttribute("href").substring(1);
    const targetSection = document.getElementById(targetId);

    window.scrollTo({
      top: targetSection.offsetTop - 70,
      behavior: "smooth",
    });
  });
});

window.addEventListener("scroll", () => {
  const sections = document.querySelectorAll("section");
  const navLinks = document.querySelectorAll(".nav-links a");
  let activeSection = null;

  sections.forEach((section) => {
    const sectionTop = section.offsetTop - 80;
    const sectionBottom = sectionTop + section.clientHeight;
    if (window.scrollY >= sectionTop && window.scrollY < sectionBottom) {
      activeSection = section.getAttribute("id");
    }
  });

  navLinks.forEach((link) => {
    link.classList.remove("active");
    if (activeSection && link.getAttribute("href").includes(activeSection)) {
      link.classList.add("active");
    }
  });

  if (!activeSection) {
    navLinks.forEach((link) => {
      if (link.getAttribute("href") === "#home") link.classList.add("active");
    });
  }
});
const bannerEl = document.createElement("div");
bannerEl.id = "notice-banner";
document.body.appendChild(bannerEl);
let bannerTimer;

function showBanner(msg, ok) {
  bannerEl.textContent = msg;
  bannerEl.className = `notice-banner ${ok ? "success" : "error"} show`;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => {
    bannerEl.classList.remove("show");
  }, 4000);
}

const formEl = document.getElementById("contact-form");

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!window.grecaptcha) {
    showBanner("CAPTCHA failed to load. Refresh and try again.", false);
    return;
  }

  const formData = new FormData(formEl);
  const token = grecaptcha.getResponse();

  if (!token) {
    showBanner("Please complete the CAPTCHA.", false);
    return;
  }
  formData.set("g-recaptcha-response", token);

  try {
    const response = await fetch("/api/send-email", {
      method: "POST",
      body: formData,
    });

    const bodyText = await response.text();

    grecaptcha.reset();

    if (response.ok) {
      showBanner("Message sent successfully!", true);
      formEl.reset();
    } else {
      showBanner(`Error: ${bodyText}`, false);
    }
  } catch (err) {
    if (window.grecaptcha) grecaptcha.reset();
    showBanner("Network error. Try again.", false);
  }
});
