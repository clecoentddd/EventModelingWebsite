// script.js

document.addEventListener('DOMContentLoaded', () => {
  // ===== Load header =====
  fetch("/header.html")
    .then(res => res.text())
    .then(data => {
      document.getElementById("header").innerHTML = data;

      const menuToggle = document.getElementById("menuToggle");
      const navMenu = document.getElementById("navMenu");

      if (menuToggle && navMenu) {
        navMenu.classList.remove("show"); // menu always closed on load

        menuToggle.addEventListener("click", () => {
          navMenu.classList.toggle("show");
        });

        navMenu.querySelectorAll("a").forEach(link => {
          link.addEventListener("click", () => {
            navMenu.classList.remove("show");
          });
        });
      }
    });

  // ===== Load footer =====
  fetch("/footer.html")
    .then(res => res.text())
    .then(data => {
      document.getElementById("footer").innerHTML = data;
    });

  // ===== Zoomable images =====
  document.querySelectorAll('.zoomable').forEach(img => {
    img.addEventListener('click', () => {
      img.classList.toggle('active');
    });

    img.addEventListener('mouseleave', () => {
      img.classList.remove('active');
    });
  });
});
