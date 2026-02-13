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
