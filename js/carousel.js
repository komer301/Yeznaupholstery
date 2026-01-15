document.addEventListener("DOMContentLoaded", () => {
  let isModalOpen = false;

  const swiper = new Swiper(".swiper-container", {
    slidesPerView: 1,
    pagination: {
      el: ".swiper-pagination",
      clickable: true,
    },
    autoplay: {
      delay: 3000,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    },
    speed: 1000,
    lazy: {
      loadPrevNext: true,
    },
    keyboard: {
      enabled: true,
    },
  });

  const modal = document.getElementById("imageModal");
  const modalImage = document.getElementById("modalImage");

  document.querySelectorAll(".swiper-slide img").forEach((img) => {
    img.addEventListener("click", (e) => {
      modalImage.src = e.target.src;
      modal.style.display = "flex";
      isModalOpen = true;
      swiper.autoplay.stop();
    });
  });

  modal.addEventListener("click", () => {
    modal.style.display = "none";
    isModalOpen = false;
    swiper.autoplay.start();
  });
});
