// Script minimal d'affichage de galerie : attendre les images, puis appeler window.setGridStyles()
// et révéler la grille. Aucune logique de mise en page ici ; resize et clic sont gérés dans gallery.js.

document.addEventListener("DOMContentLoaded", function () {
  var grid = document.getElementById("photoGrid");
  if (!grid) return;

  var imgs = Array.from(grid.querySelectorAll('img'));

  var reveal = function () {
    if (typeof window !== 'undefined' && typeof window.setGridStyles === 'function') {
      window.setGridStyles();
    }
    grid.classList.remove('opacity-0');
  };

  if (imgs.length === 0) {
    reveal();
    return;
  }

  var loaded = 0;
  imgs.forEach(function (img) {
    if (img.complete && img.naturalWidth) {
      loaded++;
      if (loaded === imgs.length) reveal();
    } else {
      img.addEventListener('load', function () { loaded++; if (loaded === imgs.length) reveal(); }, { once: true });
    }
  });
});

// Logique de la modale
(function () {
  var modal = document.getElementById('imageModal');
  var modalImage = document.getElementById('modalImage');
  var closeButton = document.getElementById('closeButton');
  var prevButton = document.getElementById('prevButton');
  var nextButton = document.getElementById('nextButton');
  var currentIndex = 0;
  var photoUrls = [];

  function getPhotoUrls() {
    var grid = document.getElementById('photoGrid');
    if (!grid) return [];
    return Array.from(grid.querySelectorAll('[data-photo-url]')).map(function (el) {
      return el.getAttribute('data-photo-url');
    });
  }

  var previousBodyOverflow;
  var previousHtmlOverflow;
  var previousBodyPosition;
  var previousBodyTop;
  var previousBodyWidth;
  var lockedScrollY = 0;
  var isScrollLocked = false;

  window.openModal = function (url) {
    photoUrls = getPhotoUrls();
    currentIndex = photoUrls.indexOf(url);
    if (currentIndex === -1) currentIndex = 0;
    if (!modal || !modalImage) return;
    modalImage.src = url;
    // Verrouiller le scroll une seule fois, puis restaurer exactement à la fermeture.
    if (!isScrollLocked) {
      lockedScrollY = window.scrollY || window.pageYOffset || 0;
      previousBodyOverflow = document.body.style.overflow;
      previousHtmlOverflow = document.documentElement.style.overflow;
      previousBodyPosition = document.body.style.position;
      previousBodyTop = document.body.style.top;
      previousBodyWidth = document.body.style.width;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = (-lockedScrollY) + 'px';
      document.body.style.width = '100%';
      document.documentElement.style.overflow = 'hidden';
      isScrollLocked = true;
    }
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  };

  function closeModal() {
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    if (modalImage) modalImage.src = '';
    // Restaurer l'état du scroll.
    if (isScrollLocked) {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      document.documentElement.style.overflow = previousHtmlOverflow;
      previousBodyOverflow = undefined;
      previousHtmlOverflow = undefined;
      previousBodyPosition = undefined;
      previousBodyTop = undefined;
      previousBodyWidth = undefined;
      isScrollLocked = false;
      window.scrollTo(0, lockedScrollY);
    }
  }

  function showIndex(index) {
    photoUrls = getPhotoUrls();
    if (!photoUrls.length || !modalImage) return;
    currentIndex = (index + photoUrls.length) % photoUrls.length;
    modalImage.src = photoUrls[currentIndex];
  }

  if (closeButton) closeButton.addEventListener('click', closeModal);
  if (prevButton) prevButton.addEventListener('click', function () { showIndex(currentIndex - 1); });
  if (nextButton) nextButton.addEventListener('click', function () { showIndex(currentIndex + 1); });
  if (modal) modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });

  document.addEventListener('keydown', function (e) {
    if (!modal || modal.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft') showIndex(currentIndex - 1);
    if (e.key === 'ArrowRight') showIndex(currentIndex + 1);
  });
})();
