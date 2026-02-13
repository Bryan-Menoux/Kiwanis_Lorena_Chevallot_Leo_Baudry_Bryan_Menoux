/**
 * Minimal gallery display script: wait for images, then call window.setGridStyles()
 * and reveal the grid. No layout logic here; resize & click are handled in gallery.js.
 */

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("photoGrid");
  if (!grid) return;

  const imgs = Array.from(grid.querySelectorAll('img')) as HTMLImageElement[];

  const reveal = () => {
    if (typeof (window as any) !== 'undefined' && typeof (window as any).setGridStyles === 'function') {
      (window as any).setGridStyles();
    }
    grid.classList.remove('opacity-0');
  };

  if (imgs.length === 0) {
    reveal();
    return;
  }

  let loaded = 0;
  imgs.forEach((img) => {
    if (img.complete && img.naturalWidth) {
      loaded++;
      if (loaded === imgs.length) reveal();
    } else {
      img.addEventListener('load', () => { loaded++; if (loaded === imgs.length) reveal(); }, { once: true });
    }
  });
});
