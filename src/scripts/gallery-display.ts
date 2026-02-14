document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("photoGrid");
  if (!grid) return;

  const imgs = Array.from(grid.querySelectorAll('img')) as HTMLImageElement[];

  const reveal = () => {
    const tryApply = () => {
      if (typeof (window as any) !== 'undefined' && typeof (window as any).setGridStyles === 'function') {
        try { (window as any).setGridStyles(); } catch (e) {}
        grid.classList.remove('opacity-0');
        return true;
      }
      return false;
    };

    if (!tryApply()) {
      // setGridStyles not yet available; wait briefly
      const to = setInterval(() => {
        if (tryApply()) clearInterval(to);
      }, 50);
    }
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
