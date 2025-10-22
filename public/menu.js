window.addEventListener('load', () => {
  const menuToggle = document.getElementById('menuToggle');
  const navMenu = document.getElementById('navMenu');

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('show');
    });
  }

  // Optional: Handle dropdowns on click for touch screens
  const dropdowns = document.querySelectorAll('.dropdown');
  dropdowns.forEach(drop => {
    const button = drop.querySelector('.dropbtn');
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      drop.classList.toggle('open');
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
  });
});
