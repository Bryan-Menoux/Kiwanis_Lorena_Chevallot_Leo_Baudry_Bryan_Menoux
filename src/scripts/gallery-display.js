// Minimal gallery display script: wait for images, then call window.setGridStyles()
// and reveal the grid. No layout logic here; resize & click are handled in gallery.js.

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

// Modal logic
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

  window.openModal = function (url) {
    photoUrls = getPhotoUrls();
    currentIndex = photoUrls.indexOf(url);
    if (currentIndex === -1) currentIndex = 0;
    if (!modal || !modalImage) return;
    modalImage.src = url;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  };

  function closeModal() {
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    if (modalImage) modalImage.src = '';
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
